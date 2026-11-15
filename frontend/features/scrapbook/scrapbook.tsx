import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import PixelIcon from "../../components/pixel-icon";
import { getAchievements, type StickerAchievement } from "../../lib/api/achievements";
import { getNasaPhoto, type NasaPhoto } from "../../lib/api/photos";
import type { Progress } from "../../lib/api/saves";
import type { Scene } from "../../lib/api/world";
import PhotoPrint from "./photo-print";

const stickerIcons = {
  rocket: "rocket",
  "red-planet": "ringedPlanet",
  star: "marker",
  "nasa-patch": "badge",
  meteor: "meteor",
  moon: "crescent",
  "shooting-star": "shootingStar",
  "blue-planet": "planet",
} as const;

export default function Scrapbook({ accountId, flushSaves, progress, world, reducedMotion, onCapture, onClose }: {
  accountId: string;
  flushSaves: () => Promise<boolean>;
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
  const [view, setView] = useState<"photos" | "achievements">("photos");
  const [stickers, setStickers] = useState<StickerAchievement[] | null>(null);
  const [stickerAttempt, setStickerAttempt] = useState(0);
  const [stickerError, setStickerError] = useState("");
  const sceneId = progress.badges[page];
  const photo = progress.photos?.find((item) => item.sceneId === sceneId);
  const name = world.find(({ id }) => id === sceneId)?.title ?? "Survey stop";

  useEffect(() => {
    dialog.current?.showModal();
    return () => request.current?.abort();
  }, []);

  useEffect(() => {
    if (view !== "achievements") return;
    const controller = new AbortController();
    async function loadStickers() {
      try {
        await flushSaves();
        controller.signal.throwIfAborted();
        const catalog = await getAchievements(accountId, controller.signal);
        if (!controller.signal.aborted) setStickers(catalog);
      } catch {
        if (!controller.signal.aborted) setStickerError("Achievements couldn't be loaded.");
      }
    }
    void loadStickers();
    return () => controller.abort();
  }, [accountId, flushSaves, stickerAttempt, view]);

  function openAchievements() {
    setStickerError("");
    setView("achievements");
  }

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
        if (view === "photos" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          event.preventDefault();
          flip(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}>
      <header>
        <h2 id="scrapbook-title"><PixelIcon name="journal" /> Expedition scrapbook</h2>
        <button type="button" className="game-button" onClick={() => dialog.current?.close()}>Close</button>
      </header>
      <nav className="scrapbook-tabs" aria-label="Scrapbook sections">
        <button type="button" className="game-button" aria-pressed={view === "photos"} onClick={() => setView("photos")}>
          <PixelIcon name="camera" /> Photos
        </button>
        <button type="button" className="game-button" aria-pressed={view === "achievements"} onClick={openAchievements}>
          <PixelIcon name="badge" /> Achievements
        </button>
      </nav>
      {view === "achievements" ? <motion.section className="scrapbook-leaf achievement-leaf"
        initial={reducedMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
        aria-labelledby="sticker-heading">
        <div className="achievement-heading">
          <h3 id="sticker-heading">Achievement stickers</h3>
          {stickers && <p>{stickers.filter(({ earnedAt }) => earnedAt).length} / {stickers.length} earned</p>}
        </div>
        {stickerError && <div className="flex flex-wrap items-center gap-2">
          <p role="status">{stickerError}</p>
          <button type="button" className="game-button" onClick={() => {
            setStickerError("");
            setStickerAttempt((attempt) => attempt + 1);
          }}>Retry</button>
        </div>}
        {!stickers && !stickerError && <p role="status">Loading achievements…</p>}
        {stickers && <ul className="achievement-grid">{stickers.map((sticker) => {
          const earned = Boolean(sticker.earnedAt);
          const count = earned ? sticker.threshold : Math.min(sticker.progress, sticker.threshold);
          const icon = stickerIcons[sticker.stickerId as keyof typeof stickerIcons] ?? "badge";
          return <li key={sticker.id} className="achievement-card" data-earned={earned}>
            <span className="achievement-art" data-sticker={sticker.stickerId}><PixelIcon name={icon} /></span>
            <div className="achievement-info">
              <strong>{sticker.title}</strong>
              <p>{sticker.description}</p>
              <div className="achievement-progress">
                <progress aria-label={sticker.title} value={count} max={sticker.threshold} />
                <span>{earned ? "Earned" : `${count} / ${sticker.threshold}`}</span>
              </div>
            </div>
          </li>;
        })}</ul>}
      </motion.section> : <div className="scrapbook-pages">
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
            </> : <p>Pass a planet’s translation check to add your first NASA photo.</p>}
          </motion.section>
        </AnimatePresence>
      </div>}
      {view === "photos" && progress.badges.length > 0 && <nav className="scrapbook-pagination" aria-label="Scrapbook pages">
        <button type="button" className="game-button" onClick={() => flip(-1)} disabled={loading || page === 0}><PixelIcon name="left" /> Previous</button>
        <span aria-live="polite">{page + 1} / {progress.badges.length}</span>
        <button type="button" className="game-button" onClick={() => flip(1)} disabled={loading || page === progress.badges.length - 1}>Next <PixelIcon name="right" /></button>
      </nav>}
    </dialog>
  );
}
