import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import PixelIcon from "../../components/pixel-icon";
import CharacterSprite from "../../components/character-sprite";
import type { Character } from "../../lib/character";
import { getNasaPhoto, type NasaPhoto } from "../../lib/api/photos";
import PhotoPrint from "./photo-print";

export default function PhotoCapture({ sceneId, character, reducedMotion, onCapture, onFinish }: {
  sceneId: string; character: Character; reducedMotion: boolean | null;
  onCapture: (photo: NasaPhoto) => void; onFinish: () => void;
}) {
  const request = useRef<AbortController | null>(null);
  const [photo, setPhoto] = useState<NasaPhoto>();
  const [phase, setPhase] = useState<"ready" | "developing" | "error" | "done">("ready");

  useEffect(() => () => request.current?.abort(), []);

  async function capture() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPhase("developing");
    const shutter = new Audio("/shutter.wav");
    shutter.volume = .42;
    void shutter.play().catch(() => {});
    try {
      const photo = await getNasaPhoto(sceneId, controller.signal);
      if (controller.signal.aborted) return;
      onCapture(photo);
      setPhoto(photo);
      setPhase("done");
    } catch {
      if (!controller.signal.aborted) setPhase("error");
    } finally {
      request.current = null;
    }
  }

  return (
    <section className="photo-capture" aria-labelledby="photo-capture-title">
      <h3 id="photo-capture-title">One for the scrapbook</h3>
      <div className="photo-viewfinder">
        {photo ? <motion.div initial={reducedMotion ? false : { opacity: 0, y: -12, rotate: -4 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}><PhotoPrint photo={photo} /></motion.div>
          : <div className="photo-lens" aria-hidden="true">
            <motion.div className="photo-explorer"
              initial={reducedMotion ? false : { y: 13, opacity: 0 }}
              animate={phase === "developing" && !reducedMotion ? { y: [0, -6, 0], opacity: 1 } : { y: 0, opacity: 1 }}>
              <CharacterSprite character={character} />
            </motion.div>
            <PixelIcon name="camera" />
          </div>}
        {phase !== "ready" && phase !== "error" && !reducedMotion && <motion.span className="photo-flash"
          initial={{ opacity: .65 }} animate={{ opacity: 0 }} transition={{ duration: .25 }} aria-hidden="true" />}
      </div>
      <p role="status">{phase === "done" ? "Photo saved to your scrapbook." : phase === "developing"
        ? "Developing a photo from the NASA archive…" : phase === "error"
          ? "NASA’s archive couldn’t send the photo. You can try again here or from the scrapbook."
          : "Translation verified. Take an archive photo to mark this stop."}</p>
      <div className="reply-actions">
        {(phase === "ready" || phase === "error") && <button className="game-button primary" type="button" onClick={capture}>
          <PixelIcon name="camera" /> {phase === "ready" ? "Take photo" : "Try again"}
        </button>}
        <button className="game-button" type="button" onClick={onFinish}>{phase === "done" ? "Continue" : "Later"}</button>
      </div>
    </section>
  );
}
