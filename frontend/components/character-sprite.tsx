import type { Character } from "../lib/character";

const skin = ["#ffe2cb", "#f4ae91", "#d68f5e", "#ad653e", "#814a37", "#56332d"];
const hairColors = ["#29213c", "#59332d", "#b6503a", "#e7b968", "#aa7ed3", "#52b796"];
const suits = ["#58bfaa", "#e37468", "#7875dc", "#d6984b", "#cc709e", "#78b9db"];
const hair = [
  "M6 5h2V3h8v1h2v2h1v4h-3V7h-3V6h-2v2H7v3H5V6h1z",
  "M6 4h12v2h2v9h-4V8H8v7H4V6h2z",
  "M5 5h2V2h2v2h2V1h2v3h2V2h2v3h2v5h-3V7H8v3H5z",
  "M6 4h12v2h2v9h-2v3h-2v-6h1V8H7v4h1v6H6v-3H4V6h2z",
  "M8 4V2h2V1h5v1h2v3h2v4h-3V7H8v2H5V5z",
  "",
];

export default function CharacterSprite({ character }: { character: Character }) {
  const { accessory } = character;
  return (
    <svg viewBox="0 0 24 28" shapeRendering="crispEdges" aria-hidden="true" className="character-sprite">
      <path fill="#191225" d="M7 13h10v2h3v7H4v-7h3z" />
      <path className="sprite-foot sprite-foot-left" fill="#191225" d="M7 21h4v4h1v1H6v-1h1z" />
      <path className="sprite-foot sprite-foot-right" fill="#191225" d="M13 21h4v4h1v1h-6v-1h1z" />
      <path fill={suits[character.suit]} d="M8 14h8v2h3v5h-3v2h-3v-2h-2v2H8v-2H5v-5h3z" />
      <path fill="#f4d59f" d="M11 16h2v2h-2z" />
      <path fill={skin[character.skin]} d="M8 4h8v2h2v6h-2v2H8v-2H6V6h2zM5 19h2v2H5zM17 19h2v2h-2z" />
      <path fill={hairColors[character.hairColor]} d={hair[character.hair]} />
      <path fill="#241929" d="M8 9h1v2H8zM15 9h1v2h-1zM11 12h2v1h-2z" />
      {accessory === 1 && <path fill="#f2c57e" d="M6 8h5v1h2V8h5v4h-5v-2h-2v2H6z" />}
      {accessory === 2 && <path fill="#9ee8ee" d="M17 5h2v7h-2v2h-4v-1h3v-3h1z" />}
      {accessory === 3 && <path fill="#ffe3a3" d="M16 4h1v2h2v1h-2v2h-1V7h-2V6h2z" />}
      {accessory === 4 && <path fill="#f68c85" d="M7 13h10v2h-2v4h-3v-3H7z" />}
      {accessory === 5 && <path fill="#8be7df" d="M5 7h14v4h-2v1H7v-1H5z" />}
    </svg>
  );
}
