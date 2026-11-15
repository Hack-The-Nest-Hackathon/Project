import type { GestureName } from "../../lib/body-language";

const shapes: Record<GestureName, string> = {
  Open_Palm: "M39 86V52L25 37Q20 29 26 25Q31 22 36 28L44 39V18Q44 10 50 10Q56 10 56 18V36H58V10Q58 3 64 3Q70 3 70 10V36H72V16Q72 9 78 9Q84 9 84 16V40H86V28Q86 21 92 21Q98 21 98 28V63Q98 79 83 87V99H48V87Z",
  Thumb_Up: "M42 92V53L58 36L62 12Q64 5 71 8Q79 12 77 24L74 40H96Q105 40 104 50L96 82Q94 92 83 92Z M23 52H38V94H23Z",
  Pointing_Up: "M40 91V57L28 42Q24 36 29 32Q34 28 40 35L47 43V12Q47 4 54 4Q61 4 61 12V46Q64 38 70 40L78 45Q84 40 90 47L99 58V74Q99 87 86 93V102H49V93Z",
  Victory: "M39 91V60L28 47Q23 41 29 36Q34 33 40 40L47 48L38 17Q36 9 42 7Q49 5 52 13L61 40L70 10Q72 3 79 5Q85 7 83 15L75 46Q82 41 88 47L98 57V73Q98 87 85 93V102H48V93Z",
};

export default function GestureIllustration({ gesture, greeting = false }: { gesture: GestureName; greeting?: boolean }) {
  return (
    <svg viewBox="0 0 128 116" className={`signal-illustration${greeting ? " signal-greeting" : ""}`} aria-hidden="true">
      <circle cx="65" cy="57" r="53" fill="#96f0d00d" />
      <path d={shapes[gesture]} fill="#f4c597" stroke="#352340" strokeWidth="4" strokeLinejoin="round" />
      <path d="M45 99h43v13H45z" fill="#58bfaa" stroke="#352340" strokeWidth="4" />
      <path d="M53 104h25" stroke="#a8ffe0" strokeWidth="3" />
    </svg>
  );
}
