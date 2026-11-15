import { useState } from "react";

export function sentenceTokens(phrase: string) {
  return phrase.split(/[\s·]+/u).filter(Boolean).map((text) => ({
    text, word: text.replace(/[.,!?;:]+$/u, "").toLowerCase(),
  }));
}

export default function SentenceWords({ phrase, glosses, language, newWords, onPick }: {
  phrase: string;
  glosses?: (string | undefined)[];
  language?: string;
  newWords?: ReadonlySet<string>;
  onPick?: (word: string) => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const tokens = sentenceTokens(phrase);
  const isNew = (word: string, index: number) =>
    newWords?.has(word) && tokens.findIndex((token) => token.word === word) === index;
  const hint = active !== null && tokens[active] && isNew(tokens[active].word, active) ? glosses?.[active] : undefined;

  return (
    <>
      <div className="word-tokens" lang={language}>
        {tokens.map(({ text, word }, index) => (
          <button key={index} type="button" aria-pressed={active === index}
            className={isNew(word, index) ? "new-word" : undefined}
            onClick={() => { setActive(index); onPick?.(word); }}>{text}</button>
        ))}
      </div>
      {active !== null && hint && <p className="field-label word-help" role="status">
        <strong>{tokens[active]?.text}</strong> · {hint}
      </p>}
    </>
  );
}
