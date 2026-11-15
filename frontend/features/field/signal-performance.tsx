import { useEffect, useRef, useState } from "react";
import PixelIcon from "../../components/pixel-icon";
import type { Signal } from "../../lib/api/world";
import { acousticBeat, acousticLead, createAcousticClip } from "./signal-audio";

type Pose = "left" | "right" | "wait";

const glyphIcons = { bring: "hookGlyph", check: "eye", lantern: "lantern", marker: "marker" } as const;
const glyphNames = { bring: "hook", check: "eye", lantern: "lantern", marker: "trail marker" } as const;
const poses = { left: "Points screen-left", right: "Points screen-right", wait: "Crouches" } as const;
const labels = { sound: "Play signal", gesture: "Watch gesture", glyph: "Watch inscription" } as const;

export default function SignalPerformance({ signal, onComplete, onGesture }: {
  signal: Signal;
  onComplete?: () => void;
  onGesture?: (pose: Pose | null) => void;
}) {
  const stop = useRef<(() => void) | null>(null);
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);

  useEffect(() => () => stop.current?.(), []);

  function start() {
    if (stop.current) return;
    const interval = signal.kind === "sound" ? acousticBeat : signal.kind === "glyph" ? .67 : 1.25;
    const lead = signal.kind === "sound" ? acousticLead : .3;
    let clip: HTMLAudioElement | null = null;
    let url: string | undefined;
    let frame = 0;
    let previousStep = -1;
    let started = performance.now();
    let cancelled = false;

    function dispose() {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      clip?.pause();
      if (url) URL.revokeObjectURL(url);
      stop.current = null;
    }

    function tick(now: number) {
      const elapsed = clip ? clip.currentTime : (now - started) / 1000;
      const index = Math.min(signal.beats.length - 1, Math.max(-1, Math.floor((elapsed - lead) / interval)));
      if (index !== previousStep) {
        previousStep = index;
        setStep(index);
        if (signal.kind === "gesture") onGesture?.(signal.beats[index] ?? null);
      }
      if (clip?.ended || (!clip && elapsed >= lead + signal.beats.length * interval + .15)) {
        dispose();
        setPlaying(false);
        onGesture?.(null);
        onComplete?.();
      } else {
        frame = window.requestAnimationFrame(tick);
      }
    }

    function fallback() {
      if (cancelled || !clip) return;
      clip.onerror = null;
      clip.pause();
      clip = null;
      started = performance.now() - Math.max(0, lead + previousStep * interval) * 1000;
      setAudioUnavailable(true);
    }

    stop.current = dispose;
    onGesture?.(null);
    setStep(-1);
    setPlaying(true);
    setAudioUnavailable(false);
    if (signal.kind === "sound") {
      try {
        url = URL.createObjectURL(createAcousticClip(signal.beats));
        clip = new Audio(url);
        clip.onerror = fallback;
        void clip.play().catch(fallback);
      } catch {
        clip = null;
        setAudioUnavailable(true);
      }
    }
    frame = window.requestAnimationFrame(tick);
  }

  const pose = signal.kind === "gesture" && step >= 0 ? signal.beats[step] : null;
  return (
    <div className="signal-performance">
      {signal.kind === "sound" && <div className="signal-sequence" aria-label="Acoustic signal">
        {signal.beats.map((beat, index) => (
          <span className="signal-beat" key={index} data-revealed={index <= step} data-current={playing && index === step}>
            {index <= step && <><PixelIcon name={beat === "click" ? "marker" : "sound"} />{beat}</>}
          </span>
        ))}
      </div>}
      {signal.kind === "gesture" && <div className="signal-stage">
        <div className="signal-gesture-view" data-pose={pose ?? "ready"} aria-hidden="true">
          <span className="walk-sprite npc-1 signal-ghost" />
          <span className="walk-sprite npc-1 signal-mover" />
          {pose && <span className="signal-direction">
            {pose === "wait" ? <i className="signal-pause" /> : <PixelIcon name={pose} />}
          </span>}
        </div>
        <div className="signal-pose-log" aria-label="Gesture sequence" aria-live="polite">
          {signal.beats.slice(0, step + 1).map((beat, index) => (
            <span data-current={index === step} key={index}>{index + 1}. {poses[beat]}</span>
          ))}
        </div>
      </div>}
      {signal.kind === "glyph" && <div className="signal-tablet" aria-label="Stone inscription">
        {signal.beats.map((beat, index) => (
          <span className="signal-glyph" key={index}>
            {index <= step && <span className="signal-engraving">
              <PixelIcon name={glyphIcons[beat]} /><span className="sr-only">{glyphNames[beat]}</span>
            </span>}
          </span>
        ))}
      </div>}
      {audioUnavailable && <p className="field-label">Audio is unavailable. Read the signal above.</p>}
      <button type="button" className="game-button" disabled={playing} onClick={start}>
        <PixelIcon name={signal.kind === "sound" ? "sound" : "eye"} />
        {playing ? "Playing…" : step >= 0 ? "Replay" : labels[signal.kind]}
      </button>
    </div>
  );
}
