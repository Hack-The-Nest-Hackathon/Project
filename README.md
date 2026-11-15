# Voices beyond Stars

Talk to locals, collect language clues in a journal, and use what you learn to open the gate.

## Run locally

Use Node.js 22.13 or later. Run npm install from the repository root, then run these in separate terminals.

```sh
npm run dev -w backend
npm run dev -w frontend
```

Open [localhost:3000](http://localhost:3000). Next.js proxies `/api/*` to Fastify on port 3001. Only the frontend port needs to be reachable by players. Set `BACKEND_URL` in `frontend/.env.local` before building if Fastify runs elsewhere.

### SSOJet sign-in

1. Create a regular web application in SSOJet and copy its issuer, client ID, and client secret into `backend/.env` as `SSOJET_ISSUER`, `SSOJET_CLIENT_ID`, and `SSOJET_CLIENT_SECRET`. Set `DATABASE_URL` there as well.
2. Register `http://localhost:3000/api/auth/callback` as a callback in SSOJet for local development. Enable the sign-in methods you want in the SSOJet dashboard.
3. Set `SSOJET_PUBLIC_ORIGINS` to the comma-separated exact frontend origins you use. Add `/api/auth/callback` to each origin and register all of those URLs with SSOJet. Use HTTPS for a deployed hostname or IP. Localhost and loopback IPs can use HTTP.
4. The token exchange defaults to `client_secret_post`. Set `SSOJET_TOKEN_AUTH_METHOD=client_secret_basic` only if your SSOJet application accepts HTTP Basic client authentication.
5. Restart Fastify and sign in through the title screen. The first successful login creates the account automatically. Sign-out revokes the game session on that browser.

Copy backend/.env.example to backend/.env. Set ELEVENLABS_API_KEYS to a JSON array of TTS-enabled API keys and ELEVENLABS_VOICE_ID to a voice each key can use. New clips rotate through the keys. Replays use the process-local cache. Set ELEVENLABS_CONCURRENCY within the workspace limit. With no credentials, players can use transcripts.

## Backend routes

Fastify discovers method files under backend/src/routes at startup. Export a default object with a handler and any Fastify route options. A folder like [lineId] becomes a URL parameter.

| File under backend/src/routes | Endpoint |
| --- | --- |
| health/get.ts | GET /api/health |
| auth/login/get.ts | GET /api/auth/login |
| auth/callback/get.ts | GET /api/auth/callback |
| auth/session/get.ts | GET /api/auth/session |
| auth/logout/post.ts | POST /api/auth/logout |
| saves/get.ts | GET /api/saves |
| saves/[slot]/put.ts | PUT /api/saves/:slot |
| world/get.ts | GET /api/world |
| hint/post.ts | POST /api/hint |
| answer/post.ts | POST /api/answer |
| audio/[lineId]/get.ts | GET /api/audio/:lineId |
| photos/[sceneId]/get.ts | GET /api/photos/:sceneId |

Run npm run typecheck and npm run build from the root. Use npm run start -w backend and npm run start -w frontend for production builds. The production frontend has a web app manifest and a service worker that caches game assets and the app shell. Answer checking requires the backend, and hints currently use authored dialogue. See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the rest of the MVP.

## Save slots and speech input

Create a PostgreSQL database named `field_notes` and set `DATABASE_URL` in `backend/.env`. The backend initializes the account, session, and save tables on startup using a `pg` connection pool. Each account gets three save slots for its explorer, current planet, journal, badges, and scrapbook entries. PostgreSQL holds the authoritative copy. After verifying sign-in, the browser can display an account-scoped cache of its latest confirmed saves while it loads the server copy. Progress changes queue for PostgreSQL and retry when the browser reconnects. The cookie holds an opaque game session token, and the database stores its hash. SSOJet tokens stay on the server during the callback.

Legacy anonymous saves remain in PostgreSQL under their old browser keys. The new account flow starts with fresh slots.

Run `npm run db:init -w backend` from the repository root to initialize the schema independently of the server. The database code lives in `backend/database/`. Table definitions go in `sql/schema/`, and each application query has its own file in `sql/queries/`. The backend build copies these files into `dist/` for deployment.

Choose from two starter planets and 25 generated worlds. Each has its own constructed language. The seeded genetic algorithm in `backend/src/language/genetics.ts` ranks 26 candidates over 20 generations. It scores sound inventories, contrasts between words used in the mission, and grammar suited to the difficulty, then breeds and mutates the candidates. Lessons, branching replies, quizzes, and pronunciation practice use the resulting language. The tutorial starts at the Market and can be reopened in the field from **Tutorial**.

Allow microphone access on localhost or HTTPS and select **Speak a phrase**. The backend sends the four-second recording to ElevenLabs Scribe and compares its transcript to known phrases on the selected planet. Dialogue, quiz, and practice audio all use the displayed spelling. The game compares speech transcripts with that same spelling. The key pool needs both Text to Speech and Speech to Text permissions.
