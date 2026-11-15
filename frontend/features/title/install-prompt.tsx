import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import PixelIcon from "../../components/pixel-icon";

type InstallEvent = Event & {
  prompt: () => Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt({ visible, reducedMotion }: {
  visible: boolean; reducedMotion: boolean | null;
}) {
  const pending = useRef<InstallEvent | null>(null);
  const [availability, setAvailability] = useState<"native" | "manual" | null>(null);
  const [appleMobile, setAppleMobile] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [instructions, setInstructions] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const navigator = window.navigator as Navigator & { standalone?: boolean };
    function updateDisplayMode() {
      setInstalled(standalone.matches || Boolean(navigator.standalone));
    }
    function capture(event: Event) {
      event.preventDefault();
      pending.current = event as InstallEvent;
      setAvailability("native");
    }
    function finish() {
      pending.current = null;
      setAvailability(null);
      setInstalled(true);
    }
    updateDisplayMode();
    setAppleMobile(/iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    standalone.addEventListener("change", updateDisplayMode);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", finish);
    return () => {
      standalone.removeEventListener("change", updateDisplayMode);
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", finish);
    };
  }, []);

  async function install() {
    const event = pending.current;
    if (!event) {
      setInstructions((open) => !open);
      return;
    }
    pending.current = null;
    try {
      const { outcome } = await event.prompt();
      if (outcome === "accepted") setInstalled(true);
      else setDismissed(true);
    } catch {
      setDismissed(true);
    } finally {
      if (!pending.current) setAvailability((current) => current === "native" ? "manual" : current);
    }
  }

  const nativeReady = availability === "native";
  if (!visible || installed || (!availability && !appleMobile)) return null;
  if (dismissed) return (
    <button type="button" className="game-button install-reopen" onClick={() => setDismissed(false)}>
      <PixelIcon name="land" /> Install game
    </button>
  );

  return (
    <motion.aside className="install-card" aria-labelledby="install-title"
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : .25 }}>
      <span className="install-icon" aria-hidden="true" />
      <div className="install-copy">
        <h2 id="install-title">Install Voices beyond Stars</h2>
        <p>Launch your expedition from your home screen.</p>
        {!nativeReady && instructions && (
          <p>{appleMobile
            ? <>In Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. If you see <strong>Open as Web App</strong>, turn it on.</>
            : <>Look for <strong>Install</strong> in your browser’s address bar or app menu.</>}</p>
        )}
      </div>
      <div className="install-actions">
        <button type="button" className="game-button primary" onClick={install}
          aria-expanded={nativeReady ? undefined : instructions}>
          <PixelIcon name="land" /> {nativeReady ? "Install game" : "Show steps"}
        </button>
        <button type="button" className="game-button" onClick={() => { setInstructions(false); setDismissed(true); }}>Not now</button>
      </div>
    </motion.aside>
  );
}
