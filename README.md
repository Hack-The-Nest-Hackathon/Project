# Voices Beyond Stars

Voices Beyond Stars is a pixel-art adventure about learning a language from context. Land on unfamiliar worlds, listen to their inhabitants, and use what you see and hear to work out what their words mean.

We built the game at a hackathon to explore how people learn and decipher languages. The characters speak constructed languages, so players start without a vocabulary and build one by comparing clues. The same idea motivates the game's mission briefing, which explores how context and emotion can change the way a phrase is understood.

## Play the expedition

- Choose an explorer and use the star map to travel between worlds.
- Talk to locals, replay their lines, and compare clues in your field journal. Build replies from word tiles or try optional microphone practice.
- Pass a translation check to earn a badge, unlock destinations, and develop a real NASA archive photo for your scrapbook.
- Collect pixel-art achievement stickers and compare expedition progress with friends.

The game includes two starter worlds, 25 generated worlds, and Echo Basin. Echo Basin unlocks after one badge and teaches click patterns, gestures, and pictographic writing. The other worlds each have their own constructed language. A seeded genetic algorithm scores and evolves language candidates for features such as sound contrast and grammar difficulty.

## Run locally

You’ll need Node.js 22.13 or newer, npm, PostgreSQL, and an SSOJet application. Install dependencies from the repository root.

On Windows, make sure the Node.js install directory (usually `C:\Program Files\nodejs`) is on `PATH`, then open a new terminal and check `node -v` and `npm -v`. A Node executable can be available without npm being discoverable; in that case `npm` commands and workspace scripts will fail until the directory containing `npm.cmd` is added to `PATH`.

```sh
npm ci
```

Copy [backend/.env.example](backend/.env.example) to `backend/.env`. Configure PostgreSQL and SSOJet by following the [backend guide](backend/README.md#configuration). ElevenLabs credentials enable voice playback and microphone practice.

From the repository root, start both the backend and frontend together:

```sh
npm run dev
```

You can also start either workspace separately with `npm run dev -w backend` or `npm run dev -w frontend`.

Open [localhost:3000](http://localhost:3000). To run the backend in a container, follow the [Docker instructions](backend/README.md#run-with-docker).

## Project layout

| Directory | What lives there |
| --- | --- |
| [frontend/](frontend/) | Next.js and React game client, pixel art, accessibility controls, and installable web app |
| [backend/](backend/) | Fastify API, language generation, dialogue and speech, translation checks, and account services |
| [backend/database/](backend/database/) | PostgreSQL schema and queries for accounts, saves, friends, and achievements |

Next.js forwards browser requests from `/api/*` to Fastify. The default backend address is `http://127.0.0.1:3001`. If the API runs elsewhere, set `BACKEND_URL` in `frontend/.env.local` before starting or building the frontend.

Each account has three cloud save slots. The browser caches the last confirmed saves and retries queued changes when connectivity returns. The production frontend includes a web app manifest and service worker for the app shell and game assets.

## Development checks

```sh
npm run typecheck
npm run build
```

For a local production run, build first, then run `npm run start -w backend` and `npm run start -w frontend` in separate terminals.
