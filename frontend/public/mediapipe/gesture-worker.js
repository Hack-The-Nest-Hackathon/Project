/* MediaPipe inference runs in this worker. Frames remain on this device. */
let recognizer;
self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    try {
      importScripts("./vendor/1.2.3/vision_bundle.js");
      const vision = await Vision.FilesetResolver.forVisionTasks(new URL("./vendor/1.2.3/wasm", self.location.href).href);
      const response = await fetch(new URL("./gesture-recognizer.task", self.location.href), { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error("Model unavailable");
      recognizer = await Vision.GestureRecognizer.createFromOptions(vision, {
        baseOptions: { modelAssetBuffer: new Uint8Array(await response.arrayBuffer()), delegate: "CPU" },
        runningMode: "VIDEO", numHands: 2,
        minHandDetectionConfidence: .6, minHandPresenceConfidence: .6, minTrackingConfidence: .6,
        cannedGesturesClassifierOptions: { scoreThreshold: .65 },
      });
      self.postMessage({ type: "ready" });
    } catch {
      self.postMessage({ type: "error", message: "The gesture model could not load. You can still complete the meaning activities." });
    }
  }
  if (data.type === "frame") {
    try {
      if (!recognizer) throw new Error("Recognizer not ready");
      const result = recognizer.recognizeForVideo(data.image, data.timestamp);
      self.postMessage({ type: "result", timestamp: data.timestamp,
        hands: result.gestures.map((categories, index) => ({
          name: categories[0]?.categoryName ?? "None", score: categories[0]?.score ?? 0,
          landmarks: result.landmarks[index] ?? [],
        })) });
    } catch {
      self.postMessage({ type: "error", message: "Camera tracking stopped. Try starting the camera again." });
    } finally { data.image.close(); }
  }
};
