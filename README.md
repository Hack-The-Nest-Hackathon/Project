# Voices beyond Stars

Talk to locals, collect language clues in a journal, and use what you learn to open the gate.

## Run locally

Use Node.js 22.13 or later. Run npm install from the repository root, then run these in separate terminals.

```sh
npm run dev -w backend
npm run dev -w frontend
```

Open [localhost:3000](http://localhost:3000), or open `http://<your-computer-ip>:3000` from a device on the same network. Use the IP of the Wi-Fi or Ethernet adapter connected to that network. The browser uses the same origin for game assets and API requests. Next.js proxies `/api/*` to Fastify on port 3001, so only the frontend port needs to be reachable by other devices. Set `BACKEND_URL` in `frontend/.env.local` before building if Fastify runs elsewhere.

Localhost and the LAN IP are separate browser origins. Each keeps its own save slots in browser storage. Use HTTPS for microphone access and PWA installation from a LAN address.

Copy backend/.env.example to backend/.env. Set ELEVENLABS_API_KEYS to a JSON array of TTS-enabled API keys and ELEVENLABS_VOICE_ID to a voice each key can use. New clips rotate through the keys. Replays use the process-local cache. Set ELEVENLABS_CONCURRENCY within the workspace limit. With no credentials, players can use transcripts.

## Backend routes

Fastify discovers method files under backend/src/routes at startup. Export a default object with a handler and any Fastify route options. A folder like [lineId] becomes a URL parameter.

| File under backend/src/routes | Endpoint |
| --- | --- |
| health/get.ts | GET /api/health |
| world/get.ts | GET /api/world |
| hint/post.ts | POST /api/hint |
| answer/post.ts | POST /api/answer |
| audio/[lineId]/get.ts | GET /api/audio/:lineId |

Run npm run typecheck and npm run build from the root. Use npm run start -w backend and npm run start -w frontend for production builds. The production frontend has a web app manifest and a service worker that caches previously loaded content. Answer checking requires the backend, and hints currently use authored dialogue. See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the rest of the MVP.

## Save slots and speech input

Create a PostgreSQL database named `field_notes` and set `DATABASE_URL` in `backend/.env`. The backend creates the `game_saves` table on startup using a `pg` connection pool. Three save slots hold the selected planet, collected clues, and badges. Each browser has its own anonymous save key and a local copy of its saves.

Run `npm run db:init -w backend` from the repository root to initialize the schema independently of the server. The database code lives in `backend/database/`. Table definitions go in `sql/schema/`, and each application query has its own file in `sql/queries/`. The backend build copies these files into `dist/` for deployment.

Choose from two starter planets and 25 generated worlds. Collect the dialogue clues, then pass a competency test to earn a badge and unlock more destinations. The generated languages use a deterministic seed, crossover, mutation, and selection for distinct, internally consistent word forms.

Allow microphone access on localhost or HTTPS and select **Speak a phrase**. The backend sends the four-second recording to ElevenLabs Scribe and compares its transcript to known phrases on the selected planet. Invented words are matched against the visible spelling and the phonetic spelling used for synthesis. The key pool needs both Text to Speech and Speech to Text permissions.
