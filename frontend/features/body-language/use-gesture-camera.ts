import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { gestureLabels, type GestureName } from "../../lib/body-language";

type Point = { x: number; y: number };
type Hand = { name: string; score: number; landmarks: Point[] };
type Session = {
  worker: Worker; stream?: MediaStream; timer?: ReturnType<typeof setTimeout>;
  deadline?: ReturnType<typeof setTimeout>; stopped: boolean; pending: boolean; lastTime: number;
};
const connections = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];

export function useGestureCamera(video: RefObject<HTMLVideoElement | null>, canvas: RefObject<HTMLCanvasElement | null>,
  expected: GestureName, onMatch: () => void) {
  const [state, setState] = useState<"off" | "loading" | "running" | "error">("off");
  const [message, setMessage] = useState("The camera is off.");
  const [hold, setHold] = useState(0);
  const [matched, setMatched] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(4 / 3);
  const session = useRef<Session | null>(null);
  const mounted = useRef(true);
  const callback = useRef(onMatch);
  callback.current = onMatch;

  const stop = useCallback(() => {
    const current = session.current;
    session.current = null;
    if (current) {
      current.stopped = true;
      clearTimeout(current.timer);
      clearTimeout(current.deadline);
      current.stream?.getTracks().forEach(track => track.stop());
      current.worker.terminate();
    }
    if (video.current) { video.current.pause(); video.current.srcObject = null; }
    const surface = canvas.current;
    surface?.getContext("2d")?.clearRect(0, 0, surface.width, surface.height);
    if (mounted.current) { setState("off"); setHold(0); setMessage("The camera is off."); }
  }, [video, canvas]);

  useEffect(() => {
    mounted.current = true;
    const hide = () => { if (document.hidden) stop(); };
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", hide);
    return () => {
      mounted.current = false;
      stop();
      window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [stop]);

  function start() {
    stop();
    setMatched(false);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setState("error"); setMessage("Camera practice needs HTTPS or localhost and a browser with camera access. You can still complete every meaning activity.");
      return;
    }
    if (!("Worker" in window) || !("OffscreenCanvas" in window) || !("createImageBitmap" in window)) {
      setState("error"); setMessage("This browser cannot run camera practice. Try a current version of Chrome, Edge, or Safari, or continue with the meaning activities.");
      return;
    }
    setState("loading"); setMessage("Preparing gesture recognition…"); setHold(0);
    let worker: Worker;
    try { worker = new Worker("/mediapipe/gesture-worker.js"); }
    catch { setState("error"); setMessage("Gesture recognition could not start. The meaning activities still work."); return; }
    const current: Session = { worker, stopped: false, pending: false, lastTime: -1 };
    session.current = current;
    let since: number | null = null;
    const active = () => mounted.current && session.current === current && !current.stopped;
    const fail = (reason: string) => {
      if (!active()) return;
      stop(); setState("error"); setMessage(reason);
    };
    const schedule = () => { if (active()) current.timer = setTimeout(() => { void frame(); }, 125); };
    async function frame() {
      if (!active()) return;
      const element = video.current;
      if (!element || element.readyState < 2 || current.pending || element.currentTime === current.lastTime) { schedule(); return; }
      current.lastTime = element.currentTime;
      current.pending = true;
      try {
        const bitmap = await createImageBitmap(element, {
          resizeWidth: 480, resizeHeight: Math.max(1, Math.round(480 * element.videoHeight / element.videoWidth)),
        });
        if (!active()) { bitmap.close(); return; }
        current.worker.postMessage({ type: "frame", image: bitmap, timestamp: performance.now() }, [bitmap]);
      } catch { fail("The camera frame could not be read. Stop the camera and try again."); }
    }
    current.deadline = setTimeout(() => fail("The gesture model took too long to load. Try again, or complete the meaning activities without a camera."), 30000);
    worker.onerror = () => fail("Gesture recognition stopped. Try starting the camera again.");
    worker.onmessage = async ({ data }: MessageEvent) => {
      if (!active()) return;
      if (data.type === "error") { fail(data.message); return; }
      if (data.type === "ready") {
        clearTimeout(current.deadline);
        setMessage("Allow camera access to practise. You can cancel at any time.");
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
          if (!active()) { stream.getTracks().forEach(track => track.stop()); return; }
          current.stream = stream;
          const element = video.current;
          if (!element) { stop(); return; }
          element.srcObject = stream;
          await element.play();
          if (!active()) return;
          setAspectRatio(element.videoWidth / element.videoHeight || 4 / 3);
          if (canvas.current) { canvas.current.width = element.videoWidth; canvas.current.height = element.videoHeight; }
          for (const track of stream.getVideoTracks()) track.onended = () => fail("The camera was disconnected. Reconnect it and try again.");
          setState("running"); setMessage("Show your whole hand, with your palm well lit.");
          schedule();
        } catch (error) {
          const name = error instanceof DOMException ? error.name : "";
          fail(name === "NotAllowedError" ? "Camera access was not granted. You can retry or complete the meaning activities without it."
            : name === "NotFoundError" ? "No camera was found. You can still complete the meaning activities."
              : "The camera could not start. Close other camera apps and try again.");
        }
      }
      if (data.type === "result") {
        current.pending = false;
        const hands = data.hands as Hand[];
        const target = hands.find(hand => hand.name === expected && hand.score >= .65);
        const surface = canvas.current;
        const context = surface?.getContext("2d");
        if (surface && context) {
          context.clearRect(0, 0, surface.width, surface.height);
          for (const hand of hands) {
            context.strokeStyle = hand === target ? "#96f0d0" : "#f4cf87";
            context.fillStyle = context.strokeStyle; context.lineWidth = 3;
            for (const [a, b] of connections) {
              const from = hand.landmarks[a]; const to = hand.landmarks[b];
              if (!from || !to) continue;
              context.beginPath(); context.moveTo(from.x * surface.width, from.y * surface.height);
              context.lineTo(to.x * surface.width, to.y * surface.height); context.stroke();
            }
            for (const point of hand.landmarks) {
              context.beginPath(); context.arc(point.x * surface.width, point.y * surface.height, 3, 0, Math.PI * 2); context.fill();
            }
          }
        }
        if (target) {
          const timestamp = Number(data.timestamp);
          since ??= timestamp;
          const fraction = Math.min(1, (timestamp - since) / 1000);
          setHold(fraction); setMessage(`Detected ${gestureLabels[expected]}. Hold it steady…`);
          if (fraction >= 1) {
            stop(); setHold(1); setMatched(true); setMessage("Gesture matched. Your camera has been turned off."); callback.current();
            return;
          }
        } else {
          since = null; setHold(0);
          const detected = hands.find(hand => gestureLabels[hand.name]);
          setMessage(detected ? `I see ${gestureLabels[detected.name]}. Try ${gestureLabels[expected]}.`
            : "Show your whole hand with your palm well lit, then hold the shape steady.");
        }
        schedule();
      }
    };
    worker.postMessage({ type: "init" });
  }

  return { state, message, hold, matched, aspectRatio, start, stop };
}
