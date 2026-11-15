"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
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
import InstallPrompt from "../title/install-prompt";
import { useGameMusic } from "./use-game-music";

export default function ExpeditionGame() {
  const [screen, setScreen] = useState<"title" | "slots" | "profile" | "map" | "field">("title");
  const reducedMotion = useReducedMotion();
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
  const { progress, savedSlots, slot, selectSlot, saveStatus, slotLoading, save } = useSaveSlot();
  const character = progress.character ?? defaultCharacter;
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const screenRef = useRef<HTMLElement>(null);
  const scene = world.find(({ id }) => id === progress.planet);
  const music = useGameMusic(screen === "field" && scene ? getPlanetMusicUrl(scene.id)
    : screen === "map" ? "/map-theme.wav" : "/menu-theme.wav");
  const musicControl = (
    <div className="game-music-control">
      <button className="game-button" onClick={music.toggle} aria-pressed={music.state === "playing"}>
        <PixelIcon name="sound" /> {music.state === "loading" ? "Cancel music" : music.state === "playing" ? "Music on" : "Music"}
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
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

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
    if (planet !== progress.planet) save({ ...progress, planet });
    setScreen("field");
  }

  function openMap() {
    if (!slotLoading) setScreen(progress.character ? "map" : "profile");
  }

  function retryWorld() {
    setPhase("loading");
    setAttempt((current) => current + 1);
  }

  return (
    <main ref={screenRef} className="game-shell">
      {screen !== "field" && <div className="menu-music-control">{musicControl}</div>}
      <AnimatePresence mode="wait" initial={false}>
        {screen === "title" && (
          <motion.section key="title" {...screenMotion} onAnimationComplete={focusScreen} className="title-scene" aria-labelledby="game-title">
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
              travel={travel} retry={retryWorld} openSlots={() => setScreen("slots")} />
          </motion.section>
        )}
        {screen === "field" && progress.character && scene && !slotLoading && (
          <motion.div key={scene.id} {...screenMotion} className="field-game" onAnimationComplete={focusScreen}>
            <FieldScene scene={scene} character={progress.character} progress={progress} saveStatus={saveStatus}
              reducedMotion={reducedMotion} save={save} openMap={openMap} musicControl={musicControl} duckMusic={music.duck} />
          </motion.div>
        )}
      </AnimatePresence>
      <InstallPrompt visible={screen === "title"} reducedMotion={reducedMotion} />
    </main>
  );
}
