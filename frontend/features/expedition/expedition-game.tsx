"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import NavigationMenu from "../../components/navigation-menu";
import PixelIcon from "../../components/pixel-icon";
import { defaultCharacter } from "../../lib/character";
import { getWorld, type Scene } from "../../lib/api/world";
import { getPlanetMusicUrl } from "../../lib/api/speech";
import FieldScene from "../field/field-scene";
import MapMenu from "../map/map-menu";
import CharacterEditor from "../profile/character-editor";
import SaveMenu from "../saves/save-menu";
import { useSaveSlot } from "../saves/use-save-slot";
import TitleMenu from "../title/title-menu";
import BriefingLink from "../title/briefing-link";
import InstallPrompt from "../title/install-prompt";
import { useGameMusic } from "./use-game-music";
import { useAccount } from "../auth/account-gate";
import FriendsPanel from "../social/friends-panel";
import Scrapbook from "../scrapbook/scrapbook";
import type { NasaPhoto } from "../../lib/api/photos";

export default function ExpeditionGame() {
  const [screen, setScreen] = useState<"title" | "slots" | "profile" | "map" | "field">("title");
  const reducedMotion = useReducedMotion();
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [scrapbookOpen, setScrapbookOpen] = useState(false);
  const screenMotion = {
    initial: "hidden",
    animate: "enter",
    exit: "leave",
    variants: {
      hidden: { opacity: 0, y: reducedMotion ? 0 : 12 },
      enter: { opacity: 1, y: 0 },
      leave: { opacity: 0, y: reducedMotion ? 0 : -8 },
    },
    transition: { duration: reducedMotion ? 0 : 0.24 },
  };
  const [world, setWorld] = useState<Scene[]>([]);
  const { account, signOut } = useAccount();
  const { progress, savedSlots, slot, selectSlot, saveStatus, slotLoading, loadFailed, retryLoad, save, flushSaves, syncFailed } = useSaveSlot(account.id);
  const [signingOut, setSigningOut] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const character = progress.character ?? defaultCharacter;
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const screenRef = useRef<HTMLElement>(null);
  const scene = world.find(({ id }) => id === progress.planet);
  const music = useGameMusic(screen === "field" && scene ? getPlanetMusicUrl(scene.id)
    : screen === "map" ? "/map-theme.wav" : "/menu-theme.wav");
  const musicControl = (
    <div className="game-music-control" data-menu-keep-open>
      <button className="game-button" onClick={music.toggle} aria-pressed={music.state === "playing"}>
        <PixelIcon name="sound" /> {music.state === "loading" ? "Cancel music" : music.state === "playing" ? "Music on" : music.state === "waiting" ? "Start music" : "Music"}
      </button>
      {music.state === "error" && <p className="field-label" role="status">Soundtrack unavailable. Tap Music to retry.</p>}
    </div>
  );

  function focusScreen(animation: unknown) {
    if (animation !== "enter") return;
    window.scrollTo(0, 0);
    screenRef.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  }

  useEffect(() => {
    const controller = new AbortController();
    getWorld(controller.signal)
      .then((scenes) => {
        if (controller.signal.aborted) return;
        setWorld(scenes);
        setPhase("ready");
      })
      .catch(() => { if (!controller.signal.aborted) setPhase("error"); });
    return () => controller.abort();
  }, [attempt]);

  function travel(planet: string) {
    const visited = progress.visited ?? (progress.planet === "market" ? [] : [progress.planet]);
    if (planet !== progress.planet || !visited.includes(planet)) {
      save({ ...progress, planet, visited: [...new Set([...visited, planet])] });
    }
    setScreen("field");
  }

  function openMap() {
    if (!slotLoading) setScreen(progress.character ? "map" : "profile");
  }

  function retryWorld() {
    setPhase("loading");
    setAttempt((current) => current + 1);
  }

  async function leaveAccount() {
    setSigningOut(true);
    setAccountMessage("");
    try {
      if (!(await flushSaves())) {
        setAccountMessage("Your latest progress is still waiting to sync. Retry sign-out when connected.");
        return;
      }
      await signOut();
    } catch {
      setAccountMessage("Could not sign out. Try again.");
    } finally {
      setSigningOut(false);
    }
  }

  function savePhoto(photo: NasaPhoto) {
    if (!progress.badges.includes(photo.sceneId) || progress.photos?.some((item) => item.sceneId === photo.sceneId)) return;
    save({ ...progress, photos: [...(progress.photos ?? []), photo] });
  }

  return (
    <main ref={screenRef} className="game-shell">
      {screen !== "field" && <nav className="expedition-nav" aria-label="Expedition navigation">
        <button type="button" className="game-button" aria-haspopup="dialog" onClick={() => setFriendsOpen(true)}>
          <PixelIcon name="profile" /> Friends
        </button>
        <NavigationMenu key={screen}>
          {screen === "map" && <>
            <button type="button" className="game-button" onClick={() => setScreen("slots")}>
              <PixelIcon name="save" /> Save files
            </button>
          </>}
          {screen === "title" && <BriefingLink href="/about" className="game-button navigation-link">
            <PixelIcon name="journal" /> Mission briefing
          </BriefingLink>}
          <button type="button" className="game-button" aria-haspopup="dialog" onClick={() => setScrapbookOpen(true)}>
            <PixelIcon name="journal" /> Scrapbook
          </button>
          {musicControl}
          <button type="button" className="game-button" disabled={signingOut} onClick={() => void leaveAccount()}>
            <PixelIcon name="back" /> {signingOut ? "Signing out." : "Sign out"}
          </button>
        </NavigationMenu>
      </nav>}
      <AnimatePresence mode="wait" initial={false}>
        {screen === "title" && (
          <motion.section key="title" {...screenMotion} onAnimationComplete={focusScreen} className="title-scene" aria-labelledby="game-title">
            {loadFailed && <div className="mb-4 grid justify-items-start gap-2">
              <p role="status">{saveStatus}</p>
              <button className="game-button" onClick={retryLoad}>Retry loading saves</button>
            </div>}
            <TitleMenu progress={progress} slotLoading={slotLoading} reducedMotion={reducedMotion}
              openMap={openMap} openSlots={() => setScreen("slots")} />
          </motion.section>
        )}
        {screen === "slots" && (
          <motion.section key="slots" {...screenMotion} onAnimationComplete={focusScreen} className="terminal save-screen">
            <SaveMenu progress={progress} savedSlots={savedSlots} slot={slot} slotLoading={slotLoading}
              saveStatus={saveStatus} reducedMotion={reducedMotion} selectSlot={selectSlot} openMap={openMap}
              openProfile={() => setScreen("profile")} openTitle={() => setScreen("title")} />
          </motion.section>
        )}
        {screen === "profile" && (
          <motion.section key="profile" {...screenMotion} onAnimationComplete={focusScreen} className="terminal save-screen">
            <button className="game-button" onClick={() => setScreen("slots")}><PixelIcon name="back" /> Save files</button>
            <h1 tabIndex={-1} className="screen-heading">{progress.character ? "Explorer profile" : "Create your explorer"}</h1>
            <CharacterEditor character={character} isNew={!progress.character} reducedMotion={reducedMotion} onSave={(next) => {
              save({ ...progress, character: next });
              if (progress.character) setScreen("slots");
              else setScreen("map");
            }} />
          </motion.section>
        )}
        {screen === "map" && progress.character && (
          <motion.section key="map" {...screenMotion} onAnimationComplete={focusScreen} className="terminal map-screen">
            <MapMenu world={world} phase={phase} progress={progress} reducedMotion={reducedMotion}
              travel={travel} retry={retryWorld} />
          </motion.section>
        )}
        {screen === "field" && progress.character && scene && !slotLoading && (
          <motion.div key={scene.id} {...screenMotion} className="field-game" onAnimationComplete={focusScreen}>
            <FieldScene scene={scene} character={progress.character} progress={progress} saveStatus={saveStatus}
              reducedMotion={reducedMotion} save={save} openMap={openMap} musicControl={musicControl} duckMusic={music.duck}
              onCapture={savePhoto} openScrapbook={() => setScrapbookOpen(true)} />
          </motion.div>
        )}
      </AnimatePresence>
      {friendsOpen && <FriendsPanel accountId={account.id} reducedMotion={reducedMotion} close={() => setFriendsOpen(false)} />}
      {scrapbookOpen && <Scrapbook accountId={account.id} flushSaves={flushSaves} progress={progress} world={world} reducedMotion={reducedMotion}
        onCapture={savePhoto} onClose={() => setScrapbookOpen(false)} />}
      {syncFailed && <button className="game-button fixed bottom-4 right-4 z-20" onClick={() => void flushSaves()}>
        Retry save sync
      </button>}
      {accountMessage && <p className="field-save-status" role="status">{accountMessage}</p>}
      <InstallPrompt visible={screen === "title"} reducedMotion={reducedMotion} />
    </main>
  );
}
