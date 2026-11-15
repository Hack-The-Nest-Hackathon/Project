const shapes = {
  apple: "M8 1h3v2H9v2h3v1h2v6h-1v2h-3v1H6v-1H3v-2H2V7h2V5h4z",
  bread: "M5 3h7v1h2v2h1v5h-1v2H2v-1H1V8h1V6h1V4h2zm1 2H4v3h2zm4 0H8v3h2zm3 1h-2v3h2z",
  lantern: "M6 1h4v3h2v2h1v7h-2v2H5v-2H3V6h1V4h2zm1 2v1h2V3zM5 7v4h6V7z",
  marker: "M7 1h2v4h2v2h4v2h-4v2H9v4H7v-4H5V9H1V7h4V5h2z",
  crate: "M2 3h12v11H2zm2 2v2h8V5zm0 4v3h2V9zm6 0v3h2V9z",
  eye: "M5 4h6v1h2v2h2v2h-2v2h-2v1H5v-1H3V9H1V7h2V5h2zm2 2v4h2V6z",
  up: "M7 2h2v2h2v2h2v2h-3v6H6V8H3V6h2V4h2z",
  down: "M6 2h4v6h3v2h-2v2H9v2H7v-2H5v-2H3V8h3z",
  left: "M2 7h2V5h2V3h2v3h6v4H8v3H6v-2H4V9H2z",
  right: "M8 3h2v2h2v2h2v2h-2v2h-2v2H8v-3H2V6h6z",
  launch: "M3 2h2v2h3v2h3v2h2v2h-2v2H8v2H5v1H3z",
  back: "M7 2h2v2H7v2H5v1h9v2H5v1h2v2h2v2H7v-2H5v-2H3V9H1V7h2V6h2V4h2z",
  map: "M7 1h2v4H7zM2 7h4v2H2zM10 7h4v2h-4zM7 11h2v4H7zM6 6h4v4H6z",
  profile: "M5 2h6v2h2v7h-2v2H5v-2H3V4h2zM6 5v3h1V5zm3 0v3h1V5zM6 10v1h4v-1z",
  edit: "M11 1h3v2h1v3h-2V4h-2V2h-1zM9 4h2v2h2v2l-6 6H2V9zm-5 6v2h2v-2z",
  save: "M2 1h10v2h2v12H2zm3 2v4h6V3zm0 7v3h6v-3z",
  land: "M6 1h4v7h3l-5 5-5-5h3zM2 14h12v2H2z",
  lock: "M5 1h6v2h2v4h2v8H1V7h2V3h2zm0 6h6V4H5zm2 3v3h2v-3z",
  journal: "M3 1h10v13H3V2H1v12h2v1h10v-1H3zm2 3v2h6V4zm0 4v2h6V8z",
  badge: "M5 1h6v2h2v6h-2v2h1v5l-4-2-4 2v-5h1V9H3V3h2zm1 3v4h4V4z",
  hint: "M5 1h6v2h2v6h-2v3H5V9H3V3h2zm1 4v3h4V5zM6 13h4v2H6z",
  mic: "M6 1h4v2h1v6h-1v2H6V9H5V3h1zM2 7h2v4h2v2h4v-2h2V7h2v5h-2v2H9v2H7v-2H4v-2H2z",
  sound: "M2 6h3l4-4v12l-4-4H2zM11 5h2v2h-2zm2 2h2v2h-2zm-2 2h2v2h-2z",
  chat: "M2 2h12v10H8l-4 3v-3H2zm3 4v2h2V6zm4 0v2h2V6z",
  shuffle: "M1 3h4l5 8h2V9l4 3-4 3v-2H9L4 5H1zm0 8h3l2-3 1 2-2 3H1zm8-8h3V1l4 3-4 3V5h-2L8 8 7 6z",
  plus: "M7 2h2v5h5v2H9v5H7V9H2V7h5z",
  minus: "M2 7h12v2H2z",
  check: "M1 7h3l3 3 6-7h3L7 14z",
  retry: "M5 2h6v2h2v2h2v5h-2v2h-2v2H5v-2H3v-2H1V8h2v3h2v2h6v-2h2V6h-2V4H5v3L1 4l4-3z",
  boot: "M5 1h5v7h2v2h3v4H2V9h3zM4 12v1h9v-1z",
  gesture: "M6 1h2v6h1V0h2v7h1V2h2v7h1V5h1v7h-2v3H6v-2H4v-2H2V8h2v2h2z",
} as const;

export default function PixelIcon({ name }: { name: keyof typeof shapes }) {
  return (
    <svg className="pixel-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      <path d={shapes[name]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
