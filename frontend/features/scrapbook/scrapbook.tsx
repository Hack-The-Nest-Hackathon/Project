import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import PixelIcon from "../../components/pixel-icon";
import { getAchievements, type StickerAchievement } from "../../lib/api/achievements";
import { getNasaPhoto, type NasaPhoto } from "../../lib/api/photos";
import type { Progress } from "../../lib/api/saves";
import type { Scene } from "../../lib/api/world";
import PhotoPrint from "./photo-print";

const stickerArt: Record<string, string> = {
  rocket: "🚀",
  "red-planet": "🪐",
  star: "⭐",
  "nasa-patch": "NASA",
  meteor: "☄️",
  moon: "🌙",
  "shooting-star": "🌠",
  "blue-planet": "🌎",
};

export default function Scrapbook({ accountId, progress, world, reducedMotion, onCapture, onClose }: {
  accountId: string;
  progress: Progress;
  world: Scene[];
  reducedMotion: boolean | null;
  onCapture: (photo: NasaPhoto) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const [page, setPage] = useState(Math.max(0, progress.badges.length - 1));
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stickers, setStickers] = useState<StickerAchievement[]>([]);
  const [stickerError, setStickerError] = useState("");
  const sceneId = progress.badges[page];
  const photo = progress.photos?.find((item) => item.sceneId === sceneId);
  const name = world.find(({ id }) => id === sceneId)?.title ?? "Survey stop";

  useEffect(() => {
    dialog.current?.showModal();
    const controller = new AbortController();
    getAchievements(accountId, controller.signal).then(setStickers).catch(() => {
      if (!controller.signal.aborted) setStickerError("Earned stickers couldn't be loaded. Close and reopen your scrapbook to retry.");
    });
    return () => {
      request.current?.abort();
      controller.abort();
    };
  }, [accountId]);

  function flip(offset: number) {
    if (loading || page + offset < 0 || page + offset >= progress.badges.length) return;
    setError("");
    setDirection(offset);
    setPage(page + offset);
  }

  async function develop() {
    if (!sceneId || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const photo = await getNasaPhoto(sceneId, controller.signal);
      if (!controller.signal.aborted) onCapture(photo);
    } catch {
      if (!controller.signal.aborted) setError("The NASA archive couldn't send this photo. Try again in a moment.");
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <dialog ref={dialog} className="expedition-scrapbook" aria-labelledby="scrapbook-title" onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          flip(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}>
      <header>
        <h2 id="scrapbook-title"><PixelIcon name="journal" /> Expedition scrapbook</h2>
        <button type="button" className="game-button" onClick={() => dialog.current?.close()}>Close</button>
      </header>
      <div className="scrapbook-pages">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.section key={sceneId ?? "empty"} className="scrapbook-leaf" custom={direction}
            variants={{
              enter: (side: number) => ({ rotateY: reducedMotion ? 0 : side * -42, opacity: reducedMotion ? 1 : 0 }),
              open: { rotateY: 0, opacity: 1 },
              exit: (side: number) => ({ rotateY: reducedMotion ? 0 : side * 42, opacity: reducedMotion ? 1 : 0 }),
            }}
            initial="enter" animate="open" exit="exit" transition={{ duration: reducedMotion ? 0 : .24 }}>
            {sceneId ? <>
              <h3>{name}</h3>
              <p className="scrapbook-archive-label">NASA archive photo</p>
              {photo ? <PhotoPrint key={photo.nasaId} photo={photo} /> : <>
                <p>This page is ready for its archive photo.</p>
                <button type="button" className="game-button primary" disabled={loading} onClick={develop}>
                  {loading ? "Contacting NASA…" : "Develop photo"}
                </button>
                {error && <p role="status">{error}</p>}
              </>}
              {photo && <section className="scrapbook-stickers" aria-label="Earned achievement stickers">
                <h4>Achievement stickers</h4>
                {stickerError ? <p role="status">{stickerError}</p> : stickers.length
                  ? <ul>{stickers.map((sticker) => <li key={sticker.id} title={`${sticker.title}: ${sticker.description}`}>
                    <span className="scrapbook-sticker-art" data-sticker={sticker.stickerId} aria-hidden="true">
                      {stickerArt[sticker.stickerId] ?? "✦"}
                    </span>
                    <span>{sticker.stickerName}</span>
                    <small>{sticker.title}</small>
                    <small>{sticker.description}</small>
                  </li>)}</ul>
                  : <p>Earn achievements to collect space stickers.</p>}
              </section>}
            </> : <p>Pass a planet’s translation check to add your first NASA photo.</p>}
          </motion.section>
        </AnimatePresence>
      </div>
      {progress.badges.length > 0 && <nav className="scrapbook-pagination" aria-label="Scrapbook pages">
        <button type="button" className="game-button" onClick={() => flip(-1)} disabled={loading || page === 0}><PixelIcon name="left" /> Previous</button>
        <span aria-live="polite">{page + 1} / {progress.badges.length}</span>
        <button type="button" className="game-button" onClick={() => flip(1)} disabled={loading || page === progress.badges.length - 1}>Next <PixelIcon name="right" /></button>
      </nav>}
    </dialog>
  );
}
