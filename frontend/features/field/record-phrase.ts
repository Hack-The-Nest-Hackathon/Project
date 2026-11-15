export async function recordPhrase(
  signal: AbortSignal,
  onRecording: () => void,
) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  try {
    signal.throwIfAborted();
    const mimeType = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"]
      .find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 48_000 });
    const chunks: Blob[] = [];
    const audio = await new Promise<Blob>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 4_000);
      function cleanup() {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
      }
      function abort() {
        cleanup();
        if (recorder.state !== "inactive") recorder.stop();
        reject(signal.reason);
      }
      signal.addEventListener("abort", abort, { once: true });
      recorder.ondataavailable = ({ data }) => {
        if (data.size) chunks.push(data);
      };
      recorder.onstop = () => {
        cleanup();
        const format = (chunks[0]?.type || recorder.mimeType || mimeType || "").split(";")[0].toLowerCase();
        resolve(new Blob(chunks, { type: format }));
      };
      recorder.onerror = () => {
        cleanup();
        reject(new Error("Recording failed"));
      };
      try {
        recorder.start();
        onRecording();
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
    signal.throwIfAborted();
    if (!audio.size || audio.size > 1_048_576)
      throw new Error("Invalid recording size");
    const encoded = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      const abort = () => reader.abort();
      signal.addEventListener("abort", abort, { once: true });
      reader.onloadend = () => {
        signal.removeEventListener("abort", abort);
        if (typeof reader.result !== "string") {
          reject(reader.error ?? signal.reason ?? new Error("Unable to read recording"));
          return;
        }
        resolve(reader.result.split(",")[1]);
      };
      reader.readAsDataURL(audio);
    });
    signal.throwIfAborted();
    return { audio: encoded, mime: audio.type };
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}
