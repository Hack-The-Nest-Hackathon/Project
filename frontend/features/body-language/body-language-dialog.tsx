import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import PixelIcon from "../../components/pixel-icon";
import { bodyLanguageLessons, type SignalId } from "../../lib/body-language";
import type { Progress } from "../../lib/api/saves";
import GestureIllustration from "./gesture-illustration";
import { useGestureCamera } from "./use-gesture-camera";

type Lesson = typeof bodyLanguageLessons[number];

function CameraPractice({ lesson, practiced, complete }: { lesson: Lesson; practiced: boolean; complete: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const camera = useGestureCamera(video, canvas, lesson.gesture, complete);
  const on = camera.state === "loading" || camera.state === "running";
  return (
    <section className="signal-practice" aria-labelledby="signal-practice-title">
      <div className="signal-section-heading"><h3 id="signal-practice-title">Try communicating it</h3>
        {practiced && <span className="signal-check"><PixelIcon name="check" /> Matched with camera</span>}</div>
      <p>{lesson.instruction}</p>
      <p className="field-label">The camera checks the hand shape. The situation gives it meaning.</p>
      <div className={clsx("signal-camera", on && "is-on")} style={{ aspectRatio: camera.aspectRatio }}>
        <video ref={video} autoPlay playsInline muted aria-label="Your mirrored camera preview" />
        <canvas ref={canvas} width={640} height={480} aria-hidden="true" />
        {!on && <div className="signal-camera-placeholder"><GestureIllustration gesture={lesson.gesture} />
          <span>{camera.matched ? "Gesture matched" : "Optional camera practice"}</span></div>}
      </div>
      <div className="signal-hold"><span style={{ width: `${camera.hold * 100}%` }} /></div>
      <p className="signal-camera-status" role="status">{camera.message}</p>
      <div className="signal-actions">
        <button type="button" className="game-button primary" onClick={on ? camera.stop : camera.start}>
          <PixelIcon name="gesture" /> {on ? "Stop camera" : camera.matched ? "Practise again" : "Start camera practice"}
        </button>
      </div>
      <p className="signal-privacy">Camera frames stay in your browser. No video or audio is recorded or uploaded. The camera turns off when you finish, change lessons, leave this activity, or hide the tab.</p>
      <details className="signal-no-camera"><summary>Practise without a camera</summary>
        <p>Try the hand shape shown above, or describe how you would use it to a partner. Your meaning activity is already saved; camera practice is optional.</p></details>
    </section>
  );
}

export default function BodyLanguageDialog({ open, onClose, progress, save, saveStatus }: {
  open: boolean; onClose: () => void; progress: Progress; save: (progress: Progress) => void; saveStatus: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<SignalId>("welcome");
  const [answer, setAnswer] = useState<number | null>(null);
  const lesson = bodyLanguageLessons.find(({ id }) => id === selected)!;
  const learned = progress.bodyLanguage?.learned ?? [];
  const practiced = progress.bodyLanguage?.practiced ?? [];
  const correct = answer === lesson.answer;

  useEffect(() => {
    const panel = dialog.current;
    if (open && panel && !panel.open) panel.showModal();
    else if (!open && panel?.open) panel.close();
  }, [open]);

  function complete(id: SignalId, kind: "learned" | "practiced") {
    const current = progress.bodyLanguage ?? { learned: [], practiced: [] };
    if (current[kind].includes(id)) return;
    save({ ...progress, bodyLanguage: { ...current, [kind]: [...current[kind], id] } });
  }

  function chooseLesson(id: SignalId) { setSelected(id); setAnswer(null); }

  return (
    <dialog ref={dialog} className="signal-dialog" aria-labelledby="signal-title" onClose={onClose}>
      {open && <>
        <header className="signal-header">
          <div><p className="field-label">Communication lab</p><h2 id="signal-title">Beyond words</h2></div>
          <button type="button" className="game-button" onClick={() => dialog.current?.close()}><PixelIcon name="back" /> Back to game</button>
        </header>
        <div className="signal-intro"><p>A hand shape can greet, ask, answer, or set a boundary. Read the situation, then try a reply without words.</p>
          <span className="signal-progress">{learned.length} / {bodyLanguageLessons.length} meanings explored</span></div>
        <div className="signal-layout">
          <nav className="signal-lessons" aria-label="Body-language activities">
            {bodyLanguageLessons.map((item, index) => <button type="button" key={item.id}
              className={clsx("signal-lesson", selected === item.id && "is-selected")} aria-current={selected === item.id ? "step" : undefined}
              onClick={() => chooseLesson(item.id)}><span className="signal-lesson-number">0{index + 1}</span>
              <span><strong>{item.title}</strong><small>{learned.includes(item.id) ? "Meaning understood" : "Read the situation"}</small></span>
              {learned.includes(item.id) && <PixelIcon name="check" />}</button>)}
          </nav>
          <article className="signal-content" key={lesson.id}>
            <section className="signal-situation" aria-labelledby="signal-lesson-title">
              <div className="signal-demonstration"><GestureIllustration gesture={lesson.gesture} greeting={lesson.id === "welcome"} />
                <span className="field-label">{lesson.gestureLabel}</span></div>
              <div><p className="field-label">Look at the whole situation</p><h3 id="signal-lesson-title">{lesson.title}</h3>
                <p>{lesson.context}</p></div>
            </section>
            <section className="signal-question" aria-labelledby="signal-question-title">
              <h3 id="signal-question-title">What is being communicated?</h3>
              <div className="signal-options">{lesson.options.map((option, index) => <button key={option} type="button"
                className={clsx("game-button", answer === index && "is-selected", correct && answer === index && "is-correct")}
                aria-pressed={answer === index} onClick={() => { setAnswer(index); if (index === lesson.answer) complete(lesson.id, "learned"); }}>
                <span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>
              {answer !== null && <div className={clsx("signal-feedback", correct && "is-correct")} role="status">
                <strong>{correct ? "Meaning understood." : "Look at the context again."}</strong>
                <p>{correct ? lesson.explanation : "Who is speaking, what just happened, and what response would make sense here? Try another interpretation."}</p>
              </div>}
            </section>
            {correct && <><div className="signal-response"><PixelIcon name="chat" /><p>{lesson.response}</p></div>
              <CameraPractice key={lesson.id} lesson={lesson} practiced={practiced.includes(lesson.id)} complete={() => complete(lesson.id, "practiced")} />
              <div className="signal-actions signal-next"><button type="button" className="game-button"
                onClick={() => { const next = bodyLanguageLessons[(bodyLanguageLessons.indexOf(lesson) + 1) % bodyLanguageLessons.length]; chooseLesson(next.id); }}>
                <PixelIcon name="right" /> Next situation</button></div></>}
          </article>
        </div>
        <footer className="signal-footer"><p>These scenes establish their own shared signals. Meanings vary between people and cultures; context and asking are part of communication.</p>
          {saveStatus && <p role="status">{saveStatus}</p>}</footer>
      </>}
    </dialog>
  );
}
