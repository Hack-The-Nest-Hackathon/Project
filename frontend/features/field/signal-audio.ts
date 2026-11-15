export const acousticLead = .12;
export const acousticBeat = .58;

export function createAcousticClip(beats: readonly ("click" | "chime")[]) {
  const sampleRate = 24_000;
  const frames = Math.ceil(sampleRate * (acousticLead + acousticBeat * beats.length + .12));
  const buffer = new ArrayBuffer(44 + frames * 2);
  const wav = new DataView(buffer);
  for (const [offset, tag] of [[0, "RIFF"], [8, "WAVE"], [12, "fmt "], [36, "data"]] as const) {
    for (let i = 0; i < tag.length; i++) wav.setUint8(offset + i, tag.charCodeAt(i));
  }
  wav.setUint32(4, wav.byteLength - 8, true);
  wav.setUint32(16, 16, true);
  wav.setUint16(20, 1, true);
  wav.setUint16(22, 1, true);
  wav.setUint32(24, sampleRate, true);
  wav.setUint32(28, sampleRate * 2, true);
  wav.setUint16(32, 2, true);
  wav.setUint16(34, 16, true);
  wav.setUint32(40, frames * 2, true);

  beats.forEach((beat, index) => {
    const start = Math.round((acousticLead + index * acousticBeat) * sampleRate);
    const duration = beat === "click" ? .085 : .47;
    for (let frame = 0; frame < Math.floor(duration * sampleRate); frame++) {
      const t = frame / sampleRate;
      const attack = Math.min(1, t * 650);
      const signal = beat === "click"
        ? .55 * Math.sin(2 * Math.PI * (1100 * t - 2400 * t * t)) * Math.exp(-t * 53)
        : (.42 * Math.sin(2 * Math.PI * 676 * t) + .14 * Math.sin(2 * Math.PI * 1014 * t)) * Math.exp(-t * 6);
      wav.setInt16(44 + (start + frame) * 2, Math.round(32_767 * signal * attack), true);
    }
  });
  return new Blob([buffer], { type: "audio/wav" });
}
