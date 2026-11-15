import SignalPerformance from "./signal-performance";
import SentenceWords, { sentenceTokens } from "./sentence-words";
import clsx from "clsx";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import NavigationMenu from "../../components/navigation-menu";
import PixelIcon from "../../components/pixel-icon";
import type { Character } from "../../lib/character";
import type { Progress } from "../../lib/api/saves";
import { ApiError } from "../../lib/api/client";
import { getHint, submitAnswer, type Clue, type QuizResult, type Scene } from "../../lib/api/world";
import { getAudioUrl, recognizeSpeech } from "../../lib/api/speech";
import FieldWalk from "./field-walk";
import FieldTutorial, { tutorialLength } from "./field-tutorial";
import RocketDeparture from "./rocket-departure";
import { recordPhrase } from "./record-phrase";
import PhotoCapture from "../scrapbook/photo-capture";
import type { NasaPhoto } from "../../lib/api/photos";

const tutorialKey = "voices-field-tutorial-v1";

export default function FieldScene({ scene, character, progress, saveStatus, reducedMotion, save, openMap, musicControl, duckMusic, onCapture, openScrapbook }: {
  scene: Scene; character: Character; progress: Progress; saveStatus: string; reducedMotion: boolean | null;
  save: (progress: Progress) => void; openMap: () => void; musicControl: ReactNode; duckMusic: (quiet: boolean) => void;
  onCapture: (photo: NasaPhoto) => void; openScrapbook: () => void;
}) {
  const journal = useRef<HTMLDialogElement>(null);
  const quiz = useRef<HTMLDialogElement>(null);
  const locationHeading = useRef<HTMLHeadingElement>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [departing, setDeparting] = useState(false);
  const [landing, setLanding] = useState(true);
  const [journalOpen, setJournalOpen] = useState(false);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [hypotheses, setHypotheses] = useState<Record<string, string>>({});
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [result, setResult] = useState<(QuizResult & { choices: number[] }) | null>(null);
  const [reviewAll, setReviewAll] = useState(false);
  const [photoMoment, setPhotoMoment] = useState(false);
  const [testChoices, setTestChoices] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [audioMessage, setAudioMessage] = useState("");
  const [playingClue, setPlayingClue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tutorial, setTutorial] = useState<number | null>(null);
  const action = useRef<AbortController | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const voiceTimeout = useRef<number | undefined>(undefined);
  const getVoice = useCallback((id: string) => player.current?.dataset.line === id ? player.current : null, []);
  const question = scene.questions?.[testChoices.length];
  const hasSpokenClues = scene.clues.some((clue) => !clue.signal);
  const observed = scene.clues.filter(({ id }) => progress.observed.includes(id));
  const shipReady = observed.length === scene.clues.length && scene.questions.length > 0;
  const onTutorialWalk = useCallback(() => setTutorial((step) => step === 0 ? 1 : step), []);

  useEffect(() => {
    if (scene.id !== "market") return;
    try {
      if (localStorage.getItem(tutorialKey)) return;
    } catch { /* The tutorial can still be used without storage. */ }
    setTutorial(0);
  }, [scene.id]);

  function closeTutorial() {
    setTutorial(null);
    try { localStorage.setItem(tutorialKey, "done"); } catch { /* Dismiss for this visit. */ }
  }

  function boardShip() {
    if (!shipReady || !quiz.current || quiz.current.open || transmitting) return;
    stopAudio();
    if (tutorial !== null) closeTutorial();
    setAudioMessage("");
    setMessage("");
    if (scene.mission && !reducedMotion && !result && !testChoices.length) {
      setTransmitting(true);
      return;
    }
    openQuiz();
  }

  function openQuiz() {
    setTransmitting(false);
    if (!quiz.current || quiz.current.open) return;
    quiz.current.showModal();
    setQuizOpen(true);
  }
  const newWordsByClue = new Map<string, ReadonlySet<string>>();
  const seenWords = new Set<string>();
  const observedById = new Map(observed.map((clue) => [clue.id, clue]));
  for (const id of progress.observed) {
    const clue = observedById.get(id);
    if (!clue) continue;
    const newWords = new Set<string>();
    sentenceTokens(clue.phrase).forEach(({ word }) => {
      if (!seenWords.has(word)) newWords.add(word);
      seenWords.add(word);
    });
    newWordsByClue.set(id, newWords);
  }
  const previousQuizWords = new Set(scene.questions.slice(0, testChoices.length)
    .flatMap(({ phrase }) => phrase ? sentenceTokens(phrase).map(({ word }) => word) : []));
  const questionTokens = question?.phrase ? sentenceTokens(question.phrase) : [];
  const vocabulary = new Map<string, { id: string; word: string; meaning: string; pronunciation?: string }>();
  for (const clue of observed) {
    clue.practice?.forEach((entry, index) => {
      const key = entry.word.toLowerCase();
      const meaning = clue.glosses?.[index];
      if (meaning && !vocabulary.has(key)) vocabulary.set(key, { ...entry, meaning });
    });
  }

  useEffect(() => () => {
    action.current?.abort();
    window.clearTimeout(voiceTimeout.current);
    player.current?.pause();
    player.current = null;
  }, []);

  useEffect(() => {
    duckMusic(Boolean(playingClue || busy));
    return () => duckMusic(false);
  }, [playingClue, busy, duckMusic]);

  useEffect(() => {
    if (!landing) locationHeading.current?.focus({ preventScroll: true });
  }, [landing]);

  function launchRocket() {
    if (!result?.correct || departing) return;
    quiz.current?.close();
    stopAudio();
    setDeparting(true);
  }

  function stopAudio() {
    window.clearTimeout(voiceTimeout.current);
    player.current?.pause();
    player.current = null;
    setPlayingClue(null);
  }

  function leaveField() {
    stopAudio();
    openMap();
  }

  function listen(clue: Clue) {
    setTutorial((step) => step === 1 ? 2 : step);
    if (!progress.observed.includes(clue.id)) save({ ...progress, observed: [...progress.observed, clue.id] });
    if (!clue.signal) playSentence(clue.id);
  }

  function playSentence(id: string) {
    if (busy) return;
    setAudioMessage("");
    stopAudio();
    const audio = new Audio(getAudioUrl(id, scene.audioRevision));
    audio.dataset.line = id;
    player.current = audio;
    audio.onplaying = () => {
      if (player.current !== audio) return;
      window.clearTimeout(voiceTimeout.current);
      setPlayingClue(id);
    };
    audio.onended = () => { if (player.current === audio) stopAudio(); };
    const showAudioError = () => {
      if (player.current !== audio) return;
      stopAudio();
      setAudioMessage("Voice audio unavailable. You can still read the line.");
    };
    voiceTimeout.current = window.setTimeout(showAudioError, 12_000);
    audio.onwaiting = () => {
      if (player.current !== audio) return;
      window.clearTimeout(voiceTimeout.current);
      voiceTimeout.current = window.setTimeout(showAudioError, 12_000);
      setPlayingClue(null);
    };
    audio.onerror = showAudioError;
    void audio.play().catch(showAudioError);
  }

  async function askHint() {
    await runAction(async (signal) => {
      const result = await getHint(scene.id, observed.map(({ id }) => id), signal);
      signal.throwIfAborted();
      setMessage(result.hint);
    }, "Compare two clues that show different quantities. Which part of the phrase changes?");
  }

  async function answer(choice: number) {
    if (!question) return;
    const choices = [...testChoices, choice];
    if (choices.length < scene.questions.length) {
      setSelectedChoice(null);
      setResult(null);
      setTestChoices(choices);
      setMessage("");
      return;
    }
    await runAction(async (signal) => {
      const result = await submitAnswer(scene.id, choices, signal);
      signal.throwIfAborted();
      setSelectedChoice(null);
      setResult({ ...result, choices });
      setReviewAll(result.correct);
      setTestChoices([]);
      if (result.correct) {
        stopAudio();
        if (!progress.badges.includes(scene.id)) save({ ...progress, badges: [...progress.badges, scene.id] });
        setPhotoMoment(!progress.photos?.some((photo) => photo.sceneId === scene.id));
        setAudioMessage("");
        setMessage(`${result.score}/${result.total}. Badge earned. Choose an unlocked planet to continue.`);
      } else {
        setMessage("Review the missed answers below before trying again.");
      }
    }, "Checking answers requires a connection to the game server.");
  }

  async function speak() {
    if (!window.isSecureContext) {
      setMessage("Microphone access needs HTTPS or localhost. You can still read the clues here.");
      return;
    }
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
    }, "Speech input unavailable. Check microphone access and try again.", true);
  }

  async function runAction(work: (signal: AbortSignal) => Promise<void>, fallback: string, explainServerError = false,
    reportError: (message: string) => void = setMessage) {
    if (action.current) return;
    const controller = new AbortController();
    action.current = controller;
    setBusy(true);
    try {
      await work(controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) {
        reportError(error instanceof ApiError && (explainServerError || error.status < 500) ? error.message : fallback);
      }
    } finally {
      action.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function openJournal() {
    if (transmitting || !journal.current || journal.current.open) return;
    journal.current.showModal();
    setTutorial((step) => step === 3 ? 4 : step);
    setJournalOpen(true);
  }

  useEffect(() => {
    function toggleJournal(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "j" || landing || departing || transmitting || quiz.current?.open || event.repeat || event.ctrlKey || event.metaKey || event.altKey
        || (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]"))) return;
      const panel = journal.current;
      if (!panel) return;
      if (panel.open) panel.close();
      else openJournal();
    }
    window.addEventListener("keydown", toggleJournal);
    return () => window.removeEventListener("keydown", toggleJournal);
  }, [departing, landing, transmitting]);

  function replay(clue: Clue) {
    if (playingClue === clue.id) stopAudio();
    else listen(clue);
  }

  return (
    <>
      <header className="field-hud" inert={landing || transmitting}>
        <button className="game-button field-map-link" aria-label="Star map" disabled={busy} onClick={leaveField}>
          <PixelIcon name="back" /> <span>Star map</span>
        </button>
        <div className="field-location">
          <h1 ref={locationHeading} tabIndex={-1}>{scene.title}</h1>
          <p className="field-label">{scene.language}</p>
        </div>
        <div className="field-hud-actions">
          <button className="game-button" aria-haspopup="dialog" aria-controls="field-journal" aria-label={`Journal, ${observed.length} of ${scene.clues.length} clues`} onClick={openJournal}>
            <PixelIcon name="journal" /> <span className="field-journal-label">Journal</span> <span className="field-label">{observed.length}/{scene.clues.length}</span>
          </button>
          <NavigationMenu>
            <button type="button" className="game-button" aria-pressed={tutorial !== null}
              onClick={() => { if (tutorial === null) setTutorial(0); else closeTutorial(); }}>
              <PixelIcon name="hint" /> Tutorial
            </button>
            {musicControl}
          </NavigationMenu>
        </div>
      </header>
      <FieldWalk key={scene.id} scene={scene} character={character} observed={progress.observed} busy={busy} paused={journalOpen || quizOpen || departing || transmitting}
        playingClue={playingClue} getVoice={getVoice} reducedMotion={reducedMotion} onListen={listen} onStopAudio={stopAudio} onPlayAudio={playSentence}
        newWordsByClue={newWordsByClue}
        landing={landing} onLand={() => setLanding(false)} shipReady={shipReady} onBoard={boardShip}
        onWalk={onTutorialWalk} onPractice={() => setTutorial((step) => step === 2 ? 3 : step)} />
      {tutorial !== null && !landing && !journalOpen && !quizOpen && !departing && !transmitting && (
        <FieldTutorial step={tutorial} reducedMotion={reducedMotion} onClose={closeTutorial}
          onBack={() => setTutorial(tutorial - 1)}
          onNext={() => { if (tutorial >= tutorialLength - 1) closeTutorial(); else setTutorial(tutorial + 1); }} />
      )}
      <p className="field-audio-status" role="status">{audioMessage}</p>
      {saveStatus && <p className="field-save-status" role="status">{saveStatus}</p>}
      
      <dialog ref={journal} id="field-journal" className="field-journal" aria-labelledby="field-journal-title" onClose={() => setJournalOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        <section className="field-journal-content">
          <header className="field-journal-header">
            <h2 id="field-journal-title" className="journal-heading"><span className="journal-sprite" aria-hidden="true" />Journal</h2>
            <button className="game-button" onClick={() => journal.current?.close()}><PixelIcon name="back" /> Close</button>
          </header>
          <p className="field-label">{scene.title} · {scene.language}</p>
          {scene.mission && <p className="field-label mt-2">Grammar · {scene.mission.grammar}</p>}
          <p className="mt-2 text-sm">{hasSpokenClues
            ? "Collect sentences from each local. Tap a highlighted word to see its meaning at its first appearance. Tap any word to hear the full line again."
            : "Replay the Basin signals and compare each one with what happened at the station."}</p>
          <p className="journal-audio-status" role="status">{audioMessage}</p>
          <div className="clue-meter" role="progressbar" aria-label="Clues collected"
            aria-valuenow={observed.length} aria-valuemax={scene.clues.length}>
            {scene.clues.map((clue) => (
              <motion.span key={clue.id} className="meter-cell" animate={{
                opacity: progress.observed.includes(clue.id) ? 1 : 0.22,
              }} transition={{ duration: reducedMotion ? 0 : 0.25 }} />
            ))}
          </div>
          {observed.length === 0 && <p className="mt-3 text-[#bdc9d6]">Visit a local to collect your first clue.</p>}
          {vocabulary.size > 0 && <details className="journal-vocabulary">
            <summary>Vocabulary collected ({vocabulary.size})</summary>
            <dl>
              {[...vocabulary.values()].map(({ id, word, meaning, pronunciation }) => (
                <div key={id}>
                  <dt><strong>{word}</strong>{pronunciation && <span className="field-label"> /{pronunciation}/</span>}</dt>
                  <dd>{meaning}</dd>
                  <button type="button" className="game-button" aria-label={`Hear ${word}`} disabled={busy}
                    onClick={() => playSentence(id)}><PixelIcon name="sound" /></button>
                </div>
              ))}
            </dl>
          </details>}
          <ul className="mt-3 space-y-3">
            {observed.map((clue) => (
              <li key={clue.id} className="journal-entry">
                <div>
                  <p className="field-label">{clue.speaker}</p>
                  <p className="story-beat"><span>What happens</span>{clue.context}</p>
                  {clue.signal ? <SignalPerformance signal={clue.signal} /> : <SentenceWords phrase={clue.phrase} glosses={clue.glosses} newWords={newWordsByClue.get(clue.id)}
                    onPick={(term) => { setWord(term); setMeaning(hypotheses[term] ?? ""); playSentence(clue.id); }} />}
                  {clue.pronunciation && <p className="field-label">/{clue.pronunciation}/</p>}
                </div>
                {!clue.signal && <button className="game-button" disabled={busy} onClick={() => replay(clue)}
                  aria-label={`${playingClue === clue.id ? "Stop" : "Replay"}: ${clue.phrase}`}>
                  <PixelIcon name="sound" /> {playingClue === clue.id ? "Stop" : "Replay"}
                </button>}
              </li>
            ))}
          </ul>
          {observed.some((clue) => !clue.signal) && (
            <form className="decoding-notes" onSubmit={(event) => {
              event.preventDefault();
              if (word && meaning.trim()) setHypotheses((previous) => ({ ...previous, [word]: meaning.trim() }));
            }}>
              <h3>Decoding notes</h3>
              <p className="field-label">Compare what locals say with what they do. Pick a word above to record what you think it means.</p>
              {word && <div className="decoding-input">
                <label>Meaning of “{word}”
                  <input value={meaning} maxLength={100} onChange={(event) => setMeaning(event.target.value)} />
                </label>
                <button className="game-button" disabled={!meaning.trim()}><PixelIcon name="save" /> Record guess</button>
              </div>}
              {Object.keys(hypotheses).length > 0 && <dl>
                {Object.entries(hypotheses).map(([token, guess]) => (
                  <div key={token}><dt>{token}</dt><dd>{guess}</dd></div>
                ))}
              </dl>}
            </form>
          )}
          {shipReady && <p className="field-label mt-4">All clues collected. Meet the survey pilot to take your translation check.</p>}
            <div className="answer-grid mt-4">
              <button className="game-button" disabled={busy} onClick={askHint}><PixelIcon name="hint" /> Ask for a hint</button>
              {hasSpokenClues && <button className="game-button" disabled={busy} onClick={speak}><PixelIcon name="mic" /> Speak a phrase</button>}
            </div>
            <div role="status" className="feedback">
              {message && <motion.p key={message} initial={reducedMotion ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}>{message}</motion.p>}
            </div>
        </section>
      </dialog>
      <dialog ref={quiz} className="field-journal survey-quiz" aria-labelledby="survey-quiz-title"
        onClose={() => { setQuizOpen(false); setMessage(""); }}>
        <section className="field-journal-content quiz-content">
          <header className="field-journal-header quiz-header">
            <div>
              <p className="field-label">Survey ship · {scene.title}</p>
              <h2 id="survey-quiz-title" className="journal-heading">Translation check</h2>
            </div>
            <button className="game-button" disabled={busy} onClick={() => quiz.current?.close()}><PixelIcon name="back" /> Return to field</button>
          </header>
          <div className="quiz-body">
            {progress.badges.includes(scene.id) && <p className="field-label quiz-badge"><PixelIcon name="badge" /> Badge earned</p>}
            {result && photoMoment ? <PhotoCapture sceneId={scene.id} character={character} reducedMotion={reducedMotion}
              onCapture={onCapture} onFinish={() => setPhotoMoment(false)} /> : result ? (
              <motion.div className={clsx("quiz-result", result.correct && "is-passed")}
                initial={reducedMotion ? false : { opacity: 0, scale: .93 }} animate={{ opacity: 1, scale: 1 }}>
                <strong>{result.score} / {result.total}</strong>
                <p>{result.correct ? "Translation verified" : "Review your evidence and try again"}</p>
                {Array.isArray(result.missed) && (
                  <section className="quiz-review" aria-labelledby="quiz-review-title">
                    <h3 id="quiz-review-title">Review your answers</h3>
                    <div className="quiz-review-filters" role="group" aria-label="Filter answers">
                      <button type="button" className="game-button" aria-pressed={!reviewAll}
                        onClick={() => setReviewAll(false)}>Missed ({result.missed.length})</button>
                      <button type="button" className="game-button" aria-pressed={reviewAll}
                        onClick={() => setReviewAll(true)}>All ({result.total})</button>
                    </div>
                    {!reviewAll && !result.missed.length && <p>Every answer was correct.</p>}
                    <ul>
                      {scene.questions.map((item, index) => {
                        const missed = result.missed.find((entry) => entry.index === index);
                        if (!reviewAll && !missed) return null;
                        const selected = result.choices[index];
                        return (
                          <motion.li key={index} className={clsx("quiz-review-card", missed ? "is-missed" : "is-correct")}
                            initial={reducedMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: reducedMotion ? 0 : .18 }}>
                            <details open={Boolean(missed)}>
                              <summary>
                                <span>Question {index + 1}</span>
                                <span className="quiz-review-status">
                                  <PixelIcon name={missed ? "retry" : "check"} />{missed ? "Missed" : "Correct"}
                                </span>
                              </summary>
                              <h4>{item.prompt}</h4>
                              {item.signal && <SignalPerformance signal={item.signal} />}
                              {item.phrase && <p className="spoken-phrase">{item.phrase}</p>}
                              <dl>
                                <div><dt>{missed ? "Your answer" : "Your correct answer"}</dt><dd>{item.options[selected]}</dd></div>
                                {missed && <div><dt>Correct answer</dt><dd>{item.options[missed.answer]}</dd></div>}
                              </dl>
                              {item.audioId && <button className="game-button" onClick={() => { if (item.audioId) playSentence(item.audioId); }}>
                                <PixelIcon name="sound" /> Replay sentence
                              </button>}
                            </details>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </section>
                )}
                {result.correct ? <div className="reply-actions">
                  <button className="game-button primary" onClick={launchRocket}><PixelIcon name="launch" /> Board and launch</button>
                  <button className="game-button" onClick={openScrapbook}><PixelIcon name="camera" /> View scrapbook</button>
                </div>
                  : <button className="game-button" onClick={() => { setResult(null); setMessage(""); }}>Try another pass</button>}
              </motion.div>
            ) : question && (
              <motion.div key={testChoices.length} initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}>
                <div className="quiz-meter" aria-hidden="true">
                  {scene.questions.map((_, index) => <motion.span key={index}
                    animate={{ opacity: index <= testChoices.length ? 1 : .24, scaleY: index === testChoices.length ? 1.5 : 1 }}
                    transition={{ duration: reducedMotion ? 0 : .22 }} />)}
                </div>
                <p className="field-label">Question {testChoices.length + 1} of {scene.questions.length}</p>
                <h3 className="quiz-question">{question.prompt}</h3>
                <div className="quiz-transmission">
                {question.signal && <SignalPerformance signal={question.signal} />}
                {question.phrase && <SentenceWords phrase={question.phrase}
                  glosses={question.glosses?.map((gloss) => gloss ?? undefined)}
                  newWords={new Set(questionTokens.map(({ word }) => word)
                    .filter((word) => !seenWords.has(word) && !previousQuizWords.has(word)))}
                  onPick={() => { if (question.audioId) playSentence(question.audioId); }} />}
                {question.pronunciation && <p className="field-label">/{question.pronunciation}/</p>}
                {question.audioId && <button className="game-button quiz-listen" disabled={busy}
                  onClick={() => { if (question.audioId) playSentence(question.audioId); }}>
                  <PixelIcon name="sound" /> Play full sentence
                </button>}
                </div>
                <div className="test-options quiz-options" role="group" aria-label="Translation choices">
                  {question.options.map((option, index) => (
                    <motion.button key={option} type="button" className={clsx("clue-button", selectedChoice === index && "is-selected")}
                      initial={reducedMotion ? false : { opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: reducedMotion ? 0 : .2, delay: reducedMotion ? 0 : index * .045 }}
                      aria-pressed={selectedChoice === index} whileTap={reducedMotion || busy ? undefined : { scale: .97 }}
                      disabled={busy} onClick={() => setSelectedChoice(index)}>
                      <span className="quiz-option-letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                      <span>{option}</span>
                      {selectedChoice === index && <PixelIcon name="check" />}
                    </motion.button>
                  ))}
                </div>
                <div className="quiz-actions">
                  {testChoices.length > 0 && <button className="game-button quiz-previous" disabled={busy}
                    onClick={() => { setSelectedChoice(testChoices.at(-1) ?? null); setTestChoices((choices) => choices.slice(0, -1)); }}>
                    <PixelIcon name="back" /> Previous question
                  </button>}
                  <button className="game-button primary quiz-confirm" disabled={busy || selectedChoice === null}
                    onClick={() => { if (selectedChoice !== null) void answer(selectedChoice); }}>
                    {busy ? "Working…" : testChoices.length + 1 === scene.questions.length ? "Check translation" : "Confirm answer"}
                  </button>
                </div>
              </motion.div>
            )}
            <p className="journal-audio-status" role="status">{audioMessage}</p>
            <div role="status" className="feedback">
              {message && <motion.p key={message} initial={reducedMotion ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}>{message}</motion.p>}
            </div>
          </div>
        </section>
      </dialog>
      {transmitting && (
        <section className="survey-transmission" aria-labelledby="survey-transmission-title">
          <motion.div className="survey-transmission-card"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }}>
            <p className="field-label"><PixelIcon name="launch" /> Survey ship receiving</p>
            <h2 id="survey-transmission-title">Uploading your field notes</h2>
            <div className="survey-transmission-meter" aria-hidden="true">
              <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.5, ease: "linear" }}
                onAnimationComplete={openQuiz} />
            </div>
            <button className="game-button" type="button" autoFocus onClick={openQuiz}>Skip to translation check</button>
          </motion.div>
        </section>
      )}
      {departing && <RocketDeparture character={character} planet={scene.title} reducedMotion={reducedMotion} onFinish={leaveField} />}
    </>
  );
}
