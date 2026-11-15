import { useEffect, useRef, useState } from "react";
import PixelIcon from "../../components/pixel-icon";
import type { Signal } from "../../lib/api/world";

const glyphIcons = { bring: "hookGlyph", check: "eye", lantern: "lantern", marker: "marker" } as const;
const glyphNames = { bring: "hook", check: "eye", lantern: "lantern", marker: "trail marker" } as const;
const poses = { left: "Points screen-left", right: "Points screen-right", wait: "Crouches" } as const;
const labels = { sound: "Play signal", gesture: "Watch gesture", glyph: "Watch inscription" } as const;

function scheduleSound(context: AudioContext, beat: "click" | "chime", time: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const duration = beat === "click" ? .045 : .46;
  oscillator.type = beat === "click" ? "square" : "sine";
  oscillator.frequency.setValueAtTime(beat === "click" ? 1720 : 690, time);
  if (beat === "click") oscillator.frequency.exponentialRampToValueAtTime(280, time + duration);
  gain.gain.setValueAtTime(beat === "click" ? .13 : .21, time);
  gain.gain.exponentialRampToValueAtTime(.001, time + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(time);
  oscillator.stop(time + duration);
}

export default function SignalPerformance({ signal, onComplete }: {
  signal: Signal;
  onComplete?: () => void;
}) {
  const timers = useRef<number[]>([]);
  const audio = useRef<AudioContext | null>(null);
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);

  useEffect(() => () => {
    timers.current.forEach(window.clearTimeout);
    if (audio.current) void audio.current.close();
  }, []);

  function start() {
    if (playing) return;
    const interval = signal.kind === "sound" ? 430 : signal.kind === "glyph" ? 670 : 820;
    setStep(-1);
    setPlaying(true);
    setAudioUnavailable(false);
    if (signal.kind === "sound") {
      try {
        const context = new AudioContext();
        audio.current = context;
        void context.resume().catch(() => { if (audio.current === context) setAudioUnavailable(true); });
        const startTime = context.currentTime + .09;
        signal.beats.forEach((beat, index) => scheduleSound(context, beat, startTime + index * interval / 1000));
      } catch {
        setAudioUnavailable(true);
      }
    }
    timers.current = signal.beats.map((_, index) => window.setTimeout(() => setStep(index), 90 + index * interval));
    timers.current.push(window.setTimeout(() => {
      setPlaying(false);
      timers.current = [];
      if (audio.current) {
        void audio.current.close();
        audio.current = null;
      }
      onComplete?.();
    }, 90 + signal.beats.length * interval + 80));
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
        <div className="signal-mover" data-pose={pose ?? "ready"} aria-hidden="true">
          <i className="signal-head" /><i className="signal-torso" /><i className="signal-arm signal-arm-left" />
          <i className="signal-arm signal-arm-right" /><i className="signal-legs" />
        </div>
        <div className="signal-pose-log" aria-label="Gesture sequence">
          {signal.beats.slice(0, step + 1).map((beat, index) => <span key={index}>{poses[beat]}</span>)}
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
