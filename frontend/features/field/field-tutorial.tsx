import { motion } from "framer-motion";
import PixelIcon from "../../components/pixel-icon";

const lessons = [
  { title: "Follow the trail", body: "Tap the ground to walk, or use the direction pad, WASD, or arrow keys. A tap beside the trail takes you to the nearest reachable spot." },
  { title: "Meet a local", body: "Tap the highlighted local or walk up and press E. Choose the first observation to hear a sentence and see what each word does." },
  { title: "Try a reply", body: "Drag the words into order to answer with an English word and the local phrase. Then listen for the reaction and follow-up." },
  { title: "Check your journal", body: "Open Journal or press J to replay clues and review the grammar you’ve uncovered." },
  { title: "Report to the ship", body: "Collect the remaining observations, then return to the survey ship for your translation check." },
];

export const tutorialLength = lessons.length;

export default function FieldTutorial({ step, reducedMotion, onBack, onNext, onClose }: {
  step: number; reducedMotion: boolean | null;
  onBack: () => void; onNext: () => void; onClose: () => void;
}) {
  const lesson = lessons[step];
  if (!lesson) return null;
  return (
    <motion.aside className="field-tutorial" aria-label="Expedition tutorial"
      initial={reducedMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <div aria-live="polite" aria-atomic="true">
        <p className="field-label"><PixelIcon name="hint" /> Tutorial {step + 1}/{lessons.length}</p>
        <h2>{lesson.title}</h2>
        <p>{lesson.body}</p>
      </div>
      <div className="field-tutorial-actions">
        {step > 0 && <button type="button" className="game-button" onClick={onBack}>Back</button>}
        <button type="button" className="game-button" onClick={onNext}>{step === lessons.length - 1 ? "Done" : "Next tip"}</button>
        {step < lessons.length - 1 && <button type="button" className="game-button" onClick={onClose}>Skip</button>}
      </div>
    </motion.aside>
  );
}
