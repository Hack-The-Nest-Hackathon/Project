import clsx from "clsx";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import CharacterSprite from "../../components/character-sprite";
import PixelIcon from "../../components/pixel-icon";
import type { Character } from "../../lib/character";
import type { Clue } from "../../lib/api/world";
import SentenceWords, { sentenceTokens } from "./sentence-words";
import DialogueTiles from "./dialogue-tiles";
import { recordPhrase } from "./record-phrase";
import { recognizeSpeech } from "../../lib/api/speech";

type Turn = "hello" | "greet" | "listen" | "ask" | "prompt" | "build" | "reply" | "react" | "speak" | "bridge" | "followup" | "interpret";

type Beat = { text?: string; audio?: string; player?: boolean; local?: boolean; next?: string };

type Props = {
  clue: Clue;
  languageName: string;
  sceneId: string;
  canSpeak: boolean;
  disableSpeaking: () => void;
  stopAudio: () => void;
  reducedMotion: boolean | null;
  newWords?: ReadonlySet<string>;
  character: Character;
  playingClue: string | null;
  getVoice: (id: string) => HTMLAudioElement | null;
  speakerIndex: number;
  busy: boolean;
  playAudio: (id: string) => void;
  listen: () => void;
  onPractice: () => void;
  continueConversation: () => void;
  leave: () => void;
  hasNextObservation: boolean;
};

export default function ObservationBeat({
  clue, languageName, sceneId, canSpeak, disableSpeaking, stopAudio, reducedMotion, newWords, character, playingClue, getVoice, speakerIndex, busy,
  playAudio, listen, onPractice, continueConversation, leave, hasNextObservation,
}: Props) {
  const [turn, setTurn] = useState<Turn>(clue.opening ? "hello" : "listen");
  const [revealed, setRevealed] = useState(0);
  const [chosen, setChosen] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const recording = useRef<AbortController | null>(null);
  const [voiceState, setVoiceState] = useState<"idle" | "working" | "done">("idle");
  useEffect(() => () => recording.current?.abort(), []);

  const reply = clue.replies?.[0];
  const followUp = clue.followUp;
  const building = turn === "build";
  const targetWords = reply ? sentenceTokens(reply.phrase) : [];
  const targetLength = targetWords.length;
  const ordered = chosen.length === targetLength && chosen.every((id, index) => targetWords[id].word === targetWords[index].word);
  const wrapLabel = hasNextObservation ? "Next topic" : "Finish talking";
  const beats: Record<Turn, Beat> = {
    hello: { text: clue.opening?.npc, audio: clue.opening && `${clue.id}-hello` },
    greet: { text: clue.opening?.player, audio: clue.opening && `${clue.id}-you`, player: true },
    listen: { text: clue.phrase, audio: clue.id, local: true, next: "Respond" },
    ask: { text: clue.opening?.question, audio: clue.opening && `${clue.id}-ask`, player: true },
    prompt: { text: reply?.prompt, audio: reply?.promptAudioId, next: "Build my reply" },
    build: { player: true },
    reply: { text: reply?.phrase, audio: reply?.id, player: true, local: true },
    react: { text: reply?.acknowledgment, audio: reply?.acknowledgmentAudioId, next: followUp || hasNextObservation ? "Keep going" : wrapLabel },
    speak: { text: clue.opening?.speak, audio: `${clue.id}-speak` },
    bridge: { text: clue.opening?.bridge, audio: clue.opening && `${clue.id}-bridge`, player: true },
    followup: { text: followUp?.phrase, audio: followUp?.id, local: true, next: "Respond in English" },
    interpret: { text: followUp?.translation, audio: followUp && clue.opening && `${clue.id}-meaning`, player: true, next: wrapLabel },
  };
  const beat = beats[turn];
  const letters = Array.from(beat.text ?? "");
  const length = letters.length;
  const typing = !reducedMotion && revealed < length;
  const speaking = beat.audio ? playingClue === beat.audio : typing;
  const source = turn === "reply" ? reply : turn === "followup" ? followUp : clue;
  const focusPane = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    element.closest(".field-conversation")?.scrollTo({ top: 0 });
    element.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!typing) return;
    let fallbackStart: number | undefined;
    let frame = 0;
    let heardVoice = false;
    let lastVisible = 0;
    const id = beat.audio;
    function tick(now: number) {
      const voice = id ? getVoice(id) : null;
      let count = 0;
      if (voice) {
        if (voice.currentTime > 0 && Number.isFinite(voice.duration) && voice.duration > 0) {
          heardVoice = true;
          count = Math.ceil(length * voice.currentTime / voice.duration);
        }
      } else if (heardVoice) {
        count = length;
      } else {
        fallbackStart ??= now;
        count = 1 + Math.floor((now - fallbackStart) / 22);
      }
      const visible = Math.min(length, count);
      if (visible > lastVisible) {
        lastVisible = visible;
        setRevealed((current) => Math.max(current, visible));
      }
      if (visible < length) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [turn, typing, length, beat.audio, getVoice]);

  function go(next: Turn) {
    setRevealed(0);
    setMessage("");
    setTurn(next);
    if (next === "listen") listen();
    else {
      const audio = beats[next].audio;
      if (audio) playAudio(audio);
    }
  }

  function keepGoing() {
    setVoiceState("idle");
    if (followUp) go(clue.opening ? "bridge" : "followup");
    else continueConversation();
  }

  function skipSpeaking(disable: boolean) {
    recording.current?.abort();
    if (disable) disableSpeaking();
    keepGoing();
  }

  async function speak() {
    if (!reply || recording.current) return;
    stopAudio();
    const controller = new AbortController();
    recording.current = controller;
    setVoiceState("working");
    setMessage("Waiting for microphone access…");
    try {
      const { audio, mime } = await recordPhrase(controller.signal, () => {
        setMessage("Listening for four seconds. Read the line aloud.");
      });
      controller.signal.throwIfAborted();
      setMessage("Checking what the guide heard…");
      const result = await recognizeSpeech(sceneId, audio, mime, controller.signal, reply.id);
      if (controller.signal.aborted) return;
      setMessage(result.recognized ? "Nice work! I recognized that line."
        : result.transcript ? `I heard “${result.transcript}”. That was good practice.`
        : "I couldn't hear a line that time. You can try again or keep going.");
      setVoiceState(result.transcript || result.recognized ? "done" : "idle");
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof DOMException && ["NotAllowedError", "NotFoundError", "SecurityError", "NotReadableError"].includes(error.name)) {
        disableSpeaking();
        setMessage("Microphone unavailable. You can continue without speaking.");
        setVoiceState("done");
      } else {
        setMessage("I couldn't check that recording. Try again or keep going.");
        setVoiceState("idle");
      }
    } finally {
      if (recording.current === controller) recording.current = null;
    }
  }

  function advance() {
    if (busy) return;
    if (typing) { setRevealed(length); return; }
    switch (turn) {
      case "hello": go("greet"); break;
      case "greet": go("listen"); break;
      case "listen":
        if (reply) go(clue.opening ? "ask" : "prompt");
        else if (followUp) go("followup");
        else continueConversation();
        break;
      case "ask": go("prompt"); break;
      case "prompt": go("build"); break;
      case "build":
        if (!ordered) {
          setMessage("Almost. Try the words in the order you heard them.");
        } else {
          onPractice();
          go("reply");
        }
        break;
      case "reply": go("react"); break;
      case "react":
        if (canSpeak && reply && clue.opening?.speak) go("speak");
        else keepGoing();
        break;
      case "speak":
        if (voiceState === "idle") void speak();
        else if (voiceState === "done") keepGoing();
        break;
      case "bridge": go("followup"); break;
      case "followup": go("interpret"); break;
      case "interpret": continueConversation(); break;
    }
  }

  return (
    <>
      <div className="minimal-conversation-header">
        <div className="conversation-cast" aria-hidden="true">
          <span className={clsx("cast-member", !beat.player && "is-active")}>
            <span className={clsx("walk-sprite", `npc-${speakerIndex}`, !beat.player && speaking && "is-speaking")} />
          </span>
          <span className={clsx("cast-member", beat.player && "is-active")}>
            <span className={clsx("reply-portrait", beat.player && speaking && "is-speaking")}><CharacterSprite character={character} /></span>
          </span>
        </div>
        <div>
          <strong>{beat.player ? "You" : clue.speaker}</strong>
          <p className="field-label">{building || beat.local ? languageName : "English"}</p>
        </div>
        <button type="button" className="conversation-link" onClick={leave}>Leave</button>
      </div>
      <motion.div key={turn} ref={focusPane} tabIndex={-1} className="minimal-conversation-pane"
        initial={reducedMotion ? false : { opacity: 0, x: beat.player ? 8 : -8 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reducedMotion ? 0 : .1 }}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            advance();
          }
        }}>
        {turn === "listen" && <p className="conversation-context">{clue.context}</p>}
        {turn === "listen" && (clue.translation || clue.emotionalContext) && <section className="translation-context" aria-label="Translation and emotional context">
          {clue.translation && <div><span className="field-label">Direct translation</span><strong lang="en">{clue.translation}</strong></div>}
          {clue.emotionalContext && <div><span className="field-label">Emotional context · {clue.emotionalContext.tone}</span><p>{clue.emotionalContext.reading}</p></div>}
        </section>}
        {building && reply ? (
          <>
            <p className="reply-target"><span className="field-label">Say it in {languageName}</span><strong>{reply.translation}</strong></p>
            <DialogueTiles phrase={reply.phrase} glosses={reply.glosses} chosen={chosen}
              onChange={(next) => { setChosen(next); setMessage(""); }} disabled={busy} reducedMotion={reducedMotion} />
          </>
        ) : (
          <div className={clsx("conversation-bubble expedition-dialogue", beat.player ? "is-you" : "is-local")}>
            {typing ? <div className="dialogue-typewriter" aria-hidden="true">
              <p className="spoken-phrase">{beat.text}</p>
              <p className="spoken-phrase">{letters.slice(0, revealed).join("")}<span className="dialogue-cursor" /></p>
            </div>
              : beat.local && beat.text ? <SentenceWords phrase={beat.text} glosses={source?.glosses}
                newWords={turn === "listen" ? newWords : undefined}
                onPick={beat.audio ? () => playAudio(beat.audio!) : undefined} />
              : <p className="spoken-phrase">{beat.text}</p>}
            <span className="sr-only" role="status">{typing ? beat.text : ""}</span>
            {!typing && beat.local && source?.pronunciation && <p className="field-label">/{source.pronunciation}/</p>}
            {turn === "listen" && clue.observation && <span className="observation-props" role="img" aria-label={clue.observation.label}>
              {Array.from({ length: clue.observation.count }, (_, index) => <PixelIcon key={index} name={clue.observation!.prop} />)}
            </span>}
          </div>
        )}
        {turn === "speak" && !typing && reply && <p className="reply-target">
          <span className="field-label">{languageName}</span>
          <strong>{reply.phrase}</strong>
          {reply.pronunciation && <span className="field-label">/{reply.pronunciation}/</span>}
        </p>}
        {message && <p role="status" className="reply-feedback">{message}</p>}
        <div className="expedition-dialogue-actions">
          {beat.audio && <button type="button" className="game-button dialogue-replay" disabled={busy || voiceState === "working"}
            aria-label="Replay full line" onClick={() => playAudio(beat.audio!)}><PixelIcon name="sound" /></button>}
          {!typing && turn === "react" && (followUp || hasNextObservation) && (
            <button type="button" className="conversation-link" onClick={leave}>Finish for now</button>
          )}
          {!typing && turn === "speak" && voiceState !== "done" && <>
            <button type="button" className="conversation-link" onClick={() => skipSpeaking(false)}>Skip this line</button>
            <button type="button" className="conversation-link" onClick={() => skipSpeaking(true)}>I can’t speak</button>
          </>}
          <button type="button" className="game-button primary"
            disabled={busy || voiceState === "working" || (building && chosen.length !== targetLength)}
            onClick={advance}>
            {typing ? "Show full line" : building ? "Send reply" : turn === "speak"
              ? voiceState === "working" ? "Listening…" : voiceState === "done" ? "Continue" : "Record reply"
              : beat.next ?? "Continue"}
          </button>
        </div>
      </motion.div>
    </>
  );
}
