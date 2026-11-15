"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import clsx from "clsx";
import PixelIcon from "../../components/pixel-icon";
import BriefingLink from "./briefing-link";

const expressions = [
  { id: "smile", label: "Smile", cue: "The local smiles and nods.", tone: 1 },
  { id: "neutral", label: "Still face", cue: "The local’s face stays still.", tone: 0 },
  { id: "frown", label: "Frown", cue: "The local frowns and knits their brows.", tone: -1 },
] as const;

const examples = [
  { label: "Move a crate", phrase: "Keshi nal.", literal: "You moved it.",
    actions: [
      { label: "Clear a doorway", cue: "You clear the doorway so the crew can get through.", reading: "Thanks for clearing the way.", neutral: "The doorway’s clear now." },
      { label: "Shift marked cargo", cue: "You take a crate off a spot marked ‘Hold for inspection.’", reading: "Wait, why did you move that crate?", neutral: "That crate was meant to stay there." },
    ] },
  { label: "Open a hatch", phrase: "Tavi sen.", literal: "You opened it.",
    actions: [
      { label: "Let a crew member in", cue: "Someone who was locked out can get back inside.", reading: "You got it open! Come on in.", neutral: "The hatch is open. You can come through." },
      { label: "Break quarantine", cue: "The quarantine light is on when you open the hatch.", reading: "You opened it? Close that hatch!", neutral: "The hatch is open during quarantine." },
    ] },
  { label: "Light a beacon", phrase: "Venu tal.", literal: "You lit the beacon.",
    actions: [
      { label: "Guide a rescue team", cue: "The rescue team spots the beacon and turns toward you.", reading: "Good. Now they can find us.", neutral: "The beacon is on. The team can see it." },
      { label: "Give away a hiding spot", cue: "The crew was trying to stay hidden when the light came on.", reading: "You lit it? They’ll see us!", neutral: "The beacon is visible from outside." },
    ] },
] as const;

export default function AboutExpedition() {
  const reducedMotion = useReducedMotion();
  const [expression, setExpression] = useState<(typeof expressions)[number]>(expressions[0]);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [actionIndex, setActionIndex] = useState<0 | 1>(0);
  const example = examples[exampleIndex];
  const action = example.actions[actionIndex];
  const tone = expression.tone + (actionIndex === 0 ? 1 : -1);
  const mixed = tone === 0;
  const reading = mixed ? example.literal : expression.tone === 0 ? action.neutral : action.reading;
  const reveal = reducedMotion ? false : { opacity: 0, y: 14 };

  return (
    <section className="about-expedition" aria-labelledby="about-heading">
      <nav className="briefing-nav" aria-label="Mission briefing">
        <BriefingLink className="game-button" href="/"><PixelIcon name="back" /> Title screen</BriefingLink>
        <span className="field-label">Voices beyond Stars</span>
      </nav>
      <motion.header className="briefing-hero" initial={reveal} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <p className="field-label"><PixelIcon name="journal" /> Mission briefing</p>
        <h1 id="about-heading">How do you translate a world?</h1>
        <p>Land somewhere unfamiliar. A local holds up one apple, then two, and changes a word. That’s your first clue. Listen, compare what happens, and try speaking or writing a reply. Each world gives you a new language to piece together.</p>
      </motion.header>

      <motion.div className="about-demo" initial={reveal} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <div className="about-demo-controls">
          <h3>Same words, different intent?</h3>
          <p>Pick an activity, then change what happened or how the local looks. See how those clues change what the line implies.</p>
          <fieldset>
            <legend>Activity</legend>
            <div>
              {examples.map((option, index) => (
                <button key={option.label} type="button" className="game-button" aria-pressed={exampleIndex === index}
                  onClick={() => { setExampleIndex(index); setActionIndex(0); }}>{option.label}</button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>What happened?</legend>
            <div>
              {example.actions.map((option, index) => (
                <button key={option.label} type="button" className="game-button" aria-pressed={actionIndex === index}
                  onClick={() => setActionIndex(index === 0 ? 0 : 1)}>{option.label}</button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>What do you see?</legend>
            <div>
              {expressions.map((option) => (
                <button key={option.id} type="button" className="game-button" aria-pressed={expression.id === option.id}
                  onClick={() => setExpression(option)}>{option.label}</button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="about-demo-stage">
          <div className="about-literal">
            <motion.div key={expression.id} aria-hidden="true" className={clsx("about-face", `face-${expression.id}`)}
              initial={reducedMotion ? false : { y: 4, scale: .92 }} animate={{ y: 0, scale: 1 }} transition={{ duration: .24 }}>
              <span className="about-face-eye" /><span className="about-face-eye" /><span className="about-face-mouth" />
            </motion.div>
            <div><p className="field-label">Local's line</p><p className="about-line">{example.phrase}</p><p>Literally, “{example.literal}”</p></div>
          </div>
          <div className="about-reading" data-tone={mixed ? "mixed" : tone > 0 ? "warm" : "urgent"} aria-live="polite" aria-atomic="true">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={`${exampleIndex}-${actionIndex}-${expression.id}`} initial={reveal} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: reducedMotion ? 1 : 0 }} transition={{ duration: reducedMotion ? 0 : .18 }}>
                <p className="about-cue">{action.cue} {expression.cue}</p>
                <p className="field-label">{mixed ? "Mixed cues · Literal reading" : tone > 0 ? "Possible reading · Relief" : "Possible reading · Objection"}</p>
                <p className="about-line">“{reading}”</p>
                <p className="about-cue">{mixed ? "The situation and expression point in different directions." :
                  expression.tone === 0 ? "The situation suggests this tone. The face gives no clear cue." : "The expression supports the tone suggested by the situation."}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <motion.div className="about-ideas" initial={reveal} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <article>
          <h3><PixelIcon name="journal" /> A language from the past</h3>
          <p>With an old inscription, you might have recurring names, a picture beside the text, or another version in a script someone can read. A tool could highlight possible matches and track which ones hold up across inscriptions.</p>
        </article>
        <article>
          <h3><PixelIcon name="map" /> A language we’ve never met</h3>
          <p>Imagine first contact with intelligent life. With no shared dictionary, you might point to something, watch the response, and repeat the experiment. The game lets you try that idea with fictional languages and worlds.</p>
        </article>
        <article>
          <h3><PixelIcon name="eye" /> What a face adds</h3>
          <p>A future camera-assisted translator could notice a frown and suggest a more urgent or skeptical wording when the situation supports it. It could explain the cue and let you choose. This demo uses an animated face you control.</p>
        </article>
      </motion.div>
      <BriefingLink className="game-button about-return" href="/"><PixelIcon name="launch" /> Back to the expedition</BriefingLink>
    </section>
  );
}
