# Frontend instructions

These instructions apply to `frontend/`. The app uses Next.js App Router, React, TypeScript, and Tailwind CSS.

## React and Next.js

- Keep route files and layouts under `app/`. Use Server Components by default. Add `"use client"` at the boundary that needs React state, event handlers, or browser APIs such as local storage, the microphone, and audio playback.
- Keep state close to the UI that owns it. Compute values such as the selected planet, badge count, and visible clues from existing state during render. Use functional state updates when the next value depends on the previous value.
- Use effects to synchronize with external systems. Put work triggered by a click or submission in its event handler. Clean up timers, subscriptions, recordings, and stale requests when the component unmounts or the relevant input changes.
- Keep related markup together. Extract a component when it has its own behavior, meaningful reuse, or enough complexity to make the parent harder to read. Avoid wrappers that only forward props or rename a native element.
- Extract a hook when it owns reusable stateful behavior or a well-defined lifecycle. Keep pure transformations as functions. Add memoization when it solves a demonstrated performance or identity problem.
- Use semantic controls, accessible labels, visible focus, and keyboard-friendly interactions. Preserve playable transcripts and clear feedback for unavailable audio, denied microphone access, and failed saves.

## File organization

- Colocate feature-specific components and helpers with their feature. Use `components/` for UI shared across features.
- Put shared application logic in `lib/`. Use descriptive modules such as `lib/api/saves.ts` and `lib/progress.ts`.
- Put small, reusable, domain-independent pure functions in `utils/` when there is an actual shared use. Keep feature rules with their feature and skip empty folders, speculative helpers, and boilerplate barrel files.

## Tailwind

- Use Tailwind utilities for local styling and the existing global CSS for app-wide styles. Move recurring design values into shared CSS variables or Tailwind theme tokens when reuse warrants it.
- Use `clsx` for conditional classes. Use a plain string for static classes. Add `clsx` as a frontend dependency when introducing its first use.
- Write complete class names in source so Tailwind can discover them. For variants, map each variant to full class strings. Use a CSS variable or an inline style for truly dynamic values.

```tsx
import clsx from "clsx";

const className = clsx(
  "clue-button rounded-xl px-4",
  selected && "ring-2 ring-amber-300",
  disabled && "opacity-60",
);
```

## API clients

- Put backend calls in typed modules under `lib/api/`, organized by feature. Export operations such as `getWorld`, `submitAnswer`, and `saveProgress`. Components call these functions and handle loading, error, and success states.
- Centralize shared HTTP behavior in `lib/api/client.ts` as calls start to share it. Handle status checks, JSON parsing, empty responses such as `204`, and cancellation. Preserve the HTTP status and a safe message so the UI can distinguish rejected input from connectivity failures.
- Use relative `/api/*` URLs for browser requests through the existing Next.js proxy. Keep provider keys and database credentials on the backend. For server-side fetching, use the configured backend origin from a server-only module.
- Define request and response types alongside the relevant API functions and keep them aligned with the backend contracts. Validate external or untrusted data at the boundary where needed. Pass an `AbortSignal` when a request can become stale.
- Keep media URLs in the API module as well. Let the browser play audio from the URL when that meets the feature requirements.

## Verification

- Run `npm run typecheck -w frontend` from the repository root. Run `npm run build -w frontend` for changes to routing, configuration, or browser/server boundaries.
- Exercise the affected flow in the browser. For changes to audio, saves, or navigation, check touch and keyboard operation and the relevant failure states.
