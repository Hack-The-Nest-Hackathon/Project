"use client";

import clsx from "clsx";
import StarChart from "./star-chart";
import FieldWalk from "./field-walk";
import CharacterEditor from "./character-editor";
import CharacterSprite from "./character-sprite";
import { defaultCharacter } from "../lib/character";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api/client";
import { getHint, getWorld, submitAnswer, type Clue, type Scene } from "../lib/api/world";
import { getAudioUrl, recognizeSpeech } from "../lib/api/speech";
import { useSaveSlot } from "./use-save-slot";
import { recordPhrase } from "./record-phrase";

export default function Page() {
  const [screen, setScreen] = useState<"title" | "slots" | "profile" | "map" | "field">("title");
  const [destination, setDestination] = useState<string | null>(null);
  const [testChoices, setTestChoices] = useState<number[]>([]);
  const [fieldView, setFieldView] = useState<"explore" | "journal">("explore");
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
  const [message, setMessage] = useState("");
  const [audioMessage, setAudioMessage] = useState("");
  const [playingClue, setPlayingClue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const action = useRef<AbortController | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const screenRef = useRef<HTMLElement>(null);
  const scene = world.find(({ id }) => id === progress.planet);
  const target = world.find(({ id }) => id === destination) ?? scene ?? world[0];
  const targetLocked = target ? target.requiredBadges > progress.badges.length : true;
  const question = scene?.questions?.[testChoices.length];
  const observed = scene?.clues.filter(({ id }) => progress.observed.includes(id)) ?? [];

  function focusScreen(animation: unknown) {
    if (animation !== "enter") return;
    window.scrollTo(0, 0);
    screenRef.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      action.current?.abort();
      player.current?.pause();
      player.current = null;
    };
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

  function stopAudio() {
    player.current?.pause();
    player.current = null;
    setPlayingClue(null);
  }

  function travel(planet: string) {
    stopAudio();
    setAudioMessage("");
    setMessage("");
    if (planet !== progress.planet) save({ ...progress, planet });
    setTestChoices([]);
    setFieldView("explore");
    setScreen("field");
  }

  function listen(clue: Clue) {
    if (!progress.observed.includes(clue.id)) save({ ...progress, observed: [...progress.observed, clue.id] });
    setAudioMessage("");
    stopAudio();
    const audio = new Audio(getAudioUrl(clue.id));
    player.current = audio;
    audio.onplaying = () => { if (player.current === audio) setPlayingClue(clue.id); };
    audio.onended = () => { if (player.current === audio) stopAudio(); };
    const showAudioError = () => {
      if (player.current !== audio) return;
      stopAudio();
      setAudioMessage("Audio unavailable. The transcript is in your journal.");
    };
    audio.onerror = showAudioError;
    void audio.play().catch(showAudioError);
  }

  async function askHint() {
    if (!scene) return;
    await runAction(async (signal) => {
      const result = await getHint(scene.id, observed.map(({ id }) => id), signal);
      signal.throwIfAborted();
      setMessage(result.hint);
    }, "Compare two clues that show different quantities. Which part of the phrase changes?");
  }

  async function answer(choice: number) {
    if (!scene || !question) return;
    const choices = [...testChoices, choice];
    if (choices.length < scene.questions.length) {
      setTestChoices(choices);
      setMessage("");
      return;
    }
    await runAction(async (signal) => {
      const result = await submitAnswer(scene.id, choices, signal);
      signal.throwIfAborted();
      setTestChoices([]);
      if (result.correct) {
        stopAudio();
        if (!progress.badges.includes(scene.id)) save({ ...progress, badges: [...progress.badges, scene.id] });
        setAudioMessage("");
        setMessage(`${result.score}/${result.total}. Badge earned. Choose an unlocked planet to continue.`);
      } else {
        setMessage(`${result.score}/${result.total}. Review your journal and try the check again.`);
      }
    }, "Checking answers requires a connection to the game server.");
  }

  async function speak() {
    if (!scene) return;
    await runAction(async (signal) => {
      stopAudio();
      setMessage("Allow microphone access to start.");
      const { audio, mime } = await recordPhrase(signal, () => {
        setMessage("Listening for four seconds. Say a phrase from this planet.");
      });
      setMessage("Checking what the guide heard.");
      const result = await recognizeSpeech(scene.id, audio, mime, signal);
      signal.throwIfAborted();
      setMessage(result.recognized
        ? `Heard "${result.transcript}". The guide recognized "${result.recognized.phrase}".`
        : result.transcript
          ? `Heard "${result.transcript}". The guide didn't recognize that phrase.`
          : "No speech was recognized. Try again.");
    }, "Speech input unavailable. Check microphone access and try again.");
  }

  async function runAction(work: (signal: AbortSignal) => Promise<void>, fallback: string) {
    if (action.current) return;
    const controller = new AbortController();
    action.current = controller;
    setBusy(true);
    try {
      await work(controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessage(error instanceof ApiError && error.status < 500 ? error.message : fallback);
      }
    } finally {
      action.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function openMap() {
    if (slotLoading) return;
    if (!progress.character) {
      setScreen("profile");
      return;
    }
    showMap();
  }

  function showMap() {
    stopAudio();
    setAudioMessage("");
    setMessage("");
    setDestination(progress.planet);
    setScreen("map");
  }

  function switchFieldView(view: "explore" | "journal") {
    if (view === fieldView) return;
    setFieldView(view);
    window.scrollTo(0, 0);
  }

  return (
    <main ref={screenRef} className="game-shell">
      <AnimatePresence mode="wait" initial={false}>
        {screen === "title" && (
          <motion.section key="title" {...screenMotion} onAnimationComplete={focusScreen} className="title-scene" aria-labelledby="game-title">
            <div className="title-art" aria-hidden="true">
              <div className="starfield" />
              <div className="orbit-trail" />
              <div className="comet" />
              <div className="ship" />
            </div>
            <div className="title-content">
              <motion.h1 id="game-title" tabIndex={-1} className="pixel-title"
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
                FIELD <span>NOTES</span>
              </motion.h1>
              <motion.p className="title-description"
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : .12, duration: .3 }}>
                Visit distant worlds and learn their languages, one clue at a time.
              </motion.p>
              <motion.button className="game-button primary launch-button"
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reducedMotion ? 0 : .17, duration: .25 }}
                whileTap={reducedMotion ? undefined : { scale: .96, transition: { duration: .08 } }}
                onClick={() => setScreen("slots")}>
                <span className="launch-icon" aria-hidden="true" />
                Begin expedition
              </motion.button>
              <details className="title-help">
                <summary>How to play</summary>
                <p>Pick a world, listen to its locals, and collect phrases in your journal. Use those clues to pass a test and unlock more worlds.</p>
              </details>
            </div>
          </motion.section>
        )}
        {screen === "slots" && (
          <motion.section key="slots" {...screenMotion} onAnimationComplete={focusScreen} className="terminal save-screen">
            <button className="game-button" onClick={() => setScreen("title")}>← Title</button>
            <h1 tabIndex={-1} className="screen-heading">Save files</h1>
            <div className="save-rack">
              {[1, 2, 3].map((number) => (
                <motion.button key={number} className={clsx("slot-card", slot === number && "is-selected")}
                  aria-pressed={slot === number} onClick={() => selectSlot(number)}
                  initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : number * .055 }}
                  whileTap={reducedMotion ? undefined : { scale: .97 }}>
                  {savedSlots[number]?.character
                    ? <span className="slot-portrait"><CharacterSprite character={savedSlots[number].character} /></span>
                    : <span className="cartridge-sprite" aria-hidden="true" />}
                  <strong>0{number}</strong>
                  <span>{savedSlots[number]?.character?.name ?? (slot === number && slotLoading ? "Reading save…" : "New explorer")}</span>
                  {slot === number && !slotLoading && <span className="field-label">{progress.badges.length} badges</span>}
                </motion.button>
              ))}
            </div>
            <p className="field-label mt-4 min-h-5" role="status">{saveStatus}</p>
            <div className="answer-grid mt-3">
              {progress.character && <button className="game-button" disabled={slotLoading}
                onClick={() => setScreen("profile")}>Edit profile</button>}
              <motion.button className="game-button primary" disabled={slotLoading} onClick={openMap}
                whileTap={reducedMotion ? undefined : { scale: .96 }}>
                {progress.character ? "Open star map" : "Create profile"} →
              </motion.button>
            </div>
          </motion.section>
        )}
        {screen === "profile" && (
          <motion.section key="profile" {...screenMotion} onAnimationComplete={focusScreen} className="terminal save-screen">
            <button className="game-button" onClick={() => setScreen("slots")}>← Save files</button>
            <h1 tabIndex={-1} className="screen-heading">{progress.character ? "Explorer profile" : "Create your explorer"}</h1>
            <CharacterEditor character={character} isNew={!progress.character} reducedMotion={reducedMotion} onSave={(next) => {
              save({ ...progress, character: next });
              if (progress.character) setScreen("slots");
              else showMap();
            }} />
          </motion.section>
        )}
        {screen === "map" && progress.character && (
          <motion.section key="map" {...screenMotion} onAnimationComplete={focusScreen} className="terminal map-screen">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button className="game-button" onClick={() => setScreen("slots")}>← Save files</button>
              <span className="field-label">{progress.badges.length} / {world.length} badges</span>
            </div>
            <h1 tabIndex={-1} className="screen-heading">Star map</h1>
            {phase === "loading" && <p role="status">Scanning for destinations…</p>}
            {phase === "error" && (
              <div>
                <p role="status">The star map couldn't reach the game server.</p>
                <button className="game-button mt-3" onClick={() => { setPhase("loading"); setAttempt((current) => current + 1); }}>Retry scan</button>
              </div>
            )}
            {target && phase === "ready" && (
              <div className="map-console">
                <aside className="destination-preview" aria-label="Selected destination">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={target.id} initial={reducedMotion ? false : { opacity: 0, scale: .94 }}
                      animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .2 }}>
                      <span className="destination-sprite" style={{ backgroundImage: `url(/worlds/${encodeURIComponent(target.id)}.png)` }} aria-hidden="true" />
                      <h2>{target.title}</h2>
                      <p>{targetLocked ? `Requires ${target.requiredBadges} badges` : target.language}</p>
                      <button className="game-button primary" disabled={targetLocked} onClick={() => travel(target.id)}>Land here</button>
                    </motion.div>
                  </AnimatePresence>
                </aside>
                <StarChart worlds={world} current={progress.planet} selected={target.id}
                  badges={progress.badges} reducedMotion={reducedMotion} onSelect={setDestination} />
              </div>
            )}
          </motion.section>
        )}
        {screen === "field" && progress.character && scene && !slotLoading && (
          <motion.div key={scene.id} {...screenMotion} onAnimationComplete={focusScreen}>
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <button className="game-button" disabled={busy} onClick={openMap}>← Star map</button>
              <span className="field-label" role="status">{saveStatus || `SAVE 0${slot} · ${progress.badges.length} BADGES`}</span>
            </header>

            <nav aria-label="Field views" className="field-switch">
              <button className="game-button" aria-pressed={fieldView === "explore"} onClick={() => switchFieldView("explore")}>Explore</button>
              <button className="game-button" aria-pressed={fieldView === "journal"} onClick={() => switchFieldView("journal")}>
                Journal <span className="field-label">{observed.length}/{scene.clues.length}</span>
              </button>
            </nav>
            <div className="field-layout" data-view={fieldView}>
              <section className="field-panel explore-pane p-4 sm:p-6">
                <div className={clsx("scene-art mb-5 p-6 sm:p-8", scene.id === "market" ? "market" : "outpost")}>
                  <div aria-hidden="true" className="starfield" />
                  <p className="field-label uppercase">{scene.language}</p>
                  <h1 tabIndex={-1} className="mt-2 text-4xl tracking-tight">{scene.title}</h1>
                  <p className="mt-3 max-w-sm text-[#d4dde8]">{scene.description}</p>
                </div>
                <FieldWalk key={scene.id} scene={scene} character={character} observed={progress.observed} busy={busy}
                  playingClue={playingClue} reducedMotion={reducedMotion} onListen={listen} />
                <p className="mt-3 text-sm text-[#e1c889]" role="status">{audioMessage}</p>
              </section>
              <section className="field-panel journal-pane p-4 sm:p-6">
                <h2 className="journal-heading"><span className="journal-sprite" aria-hidden="true" />Journal</h2>
                <div className="clue-meter" role="progressbar" aria-label="Clues collected"
                  aria-valuenow={observed.length} aria-valuemax={scene.clues.length}>
                  {scene.clues.map((clue) => (
                    <motion.span key={clue.id} className="meter-cell" animate={{
                      opacity: progress.observed.includes(clue.id) ? 1 : 0.22,
                    }} transition={{ duration: reducedMotion ? 0 : 0.25 }} />
                  ))}
                </div>
                {observed.length === 0 && <p className="mt-3 text-[#bdc9d6]">Talk to a local to collect your first clue.</p>}
                <ul className="mt-3 space-y-3">
                  {observed.map((clue) => (
                    <motion.li key={clue.id} initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }} className="journal-entry">
                      <p lang={scene.id === "market" ? "fr" : undefined} className="text-lg text-[#f4bf77]">{clue.phrase}</p>
                      {clue.pronunciation && <p className="field-label">/{clue.pronunciation}/</p>}
                      <p className="text-sm text-[#bdc9d6]">{clue.context}</p>
                    </motion.li>
                  ))}
                </ul>
                <div className="mt-6 border-t border-[#394866] pt-5">
                  <motion.p key={progress.badges.includes(scene.id) ? "earned" : "test"}
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }} className={clsx("field-label mb-2",
                      progress.badges.includes(scene.id) && "earned-badge")}>
                    {progress.badges.includes(scene.id) ? "★ Badge earned" : "Competency test"}
                  </motion.p>
                  {observed.length < scene.clues.length ? (
                    <p className="mt-2 text-sm text-[#bdc9d6]">Gather all {scene.clues.length} observations to take the test.</p>
                  ) : question && (
                    <motion.div key={testChoices.length} initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}>
                      <p className="field-label">Question {testChoices.length + 1} of {scene.questions.length}</p>
                      <h3 className="mb-3 text-xl">{question.prompt}</h3>
                      {question.phrase && <p className="spoken-phrase mb-2">{question.phrase}</p>}
                      {question.pronunciation && <p className="field-label mb-3">/{question.pronunciation}/</p>}
                      <div className="answer-grid test-options">
                        {question.options.map((option, index) => (
                          <motion.button key={option} type="button" className="clue-button"
                            whileTap={reducedMotion || busy ? undefined : { scale: .97 }}
                            disabled={busy} onClick={() => answer(index)}>{option}</motion.button>
                        ))}
                      </div>
                      {testChoices.length > 0 && <button className="game-button mt-3" disabled={busy}
                        onClick={() => setTestChoices((choices) => choices.slice(0, -1))}>Previous question</button>}
                    </motion.div>
                  )}
                  <div className="answer-grid mt-4">
                    <button className="game-button" disabled={busy} onClick={askHint}>Ask for a hint</button>
                    <button className="game-button" disabled={busy} onClick={speak}>Speak a phrase</button>
                  </div>
                  <div role="status" className="feedback">
                    {message && <motion.p key={message} initial={reducedMotion ? false : { opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}>{message}</motion.p>}
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
