# Voices Beyond Stars

The backend powers the expedition. It serves worlds and dialogue, checks translation answers, and stores each explorer’s progress. It also connects the game to SSOJet for sign-in, ElevenLabs for speech, and NASA’s archive for scrapbook photos. See the [project overview](../README.md) for the player experience and full local setup.

## Configuration

Copy [.env.example](.env.example) to `backend/.env` and set the following values.

| Service | Settings |
| --- | --- |
| PostgreSQL | Set `DATABASE_URL` to the database that should hold accounts, sessions, saves, friends, and achievements. |
| SSOJet | Set `SSOJET_ISSUER`, `SSOJET_CLIENT_ID`, and `SSOJET_CLIENT_SECRET` from a regular web application. The backend also accepts `SSOJET_AUTHORITY` as the issuer setting. |
| Frontend origins | Set `SSOJET_PUBLIC_ORIGINS` to the comma-separated frontend origins that can start sign-ins. |
| ElevenLabs | Set `ELEVENLABS_API_KEYS` to a JSON array of keys. Grant Text to Speech permissions for dialogue and Speech to Text permissions for microphone practice. |

For local sign-in, register `http://localhost:3000/api/auth/callback` in SSOJet. For every additional frontend origin, register its exact `/api/auth/callback` URL as well. Use HTTPS for deployed origins. The token exchange defaults to `client_secret_post`. Set `SSOJET_TOKEN_AUTH_METHOD=client_secret_basic` if your SSOJet app requires HTTP Basic client authentication.

Microphone practice requires HTTPS or localhost. The API uses ElevenLabs Scribe to compare a short recording with known phrases. Dialogue and clues remain readable when speech services are unavailable. Set `ELEVENLABS_CHARACTER_VOICES` for per-character overrides or `ELEVENLABS_VOICE_ID` for the fallback narrator. Match `ELEVENLABS_CONCURRENCY` to your provider limit.

## Run the API

Run the workspace commands from the repository root.

```sh
npm ci
npm run dev -w backend
```

Check [localhost:3001/api/health](http://localhost:3001/api/health). Fastify initializes the database schema at startup when `DATABASE_URL` is set. To initialize it separately, run `npm run db:init -w backend`.

For a production build and local run:

```sh
npm run build -w backend
npm run start -w backend
```

## Run with Docker

Build from the repository root so Docker can use the shared npm lockfile. The container reads your backend environment at runtime.

```sh
docker build -f backend/Dockerfile -t voices-backend .
docker run --rm --name voices-backend --env-file backend/.env -e HOST=0.0.0.0 -e PORT=3001 -p 127.0.0.1:3001:3001 voices-backend
```

A frontend running on your host can use the default backend URL. For a database on your host, use `host.docker.internal` in `DATABASE_URL`. On Linux Docker Engine, also pass `--add-host=host.docker.internal:host-gateway` to `docker run`. For a remote database, keep its configured address.

For pre-generated planet music, pass `--mount type=bind,source=<absolute-path-to-backend/.music-cache>,target=/app/backend/.music-cache,readonly` to `docker run`. To generate tracks locally, use `npm run music:generate -w backend` with ElevenLabs credentials that have music access.

## Backend layout

| Path | Responsibility |
| --- | --- |
| [src/routes/](src/routes/) | Fastify endpoints, discovered by file path and HTTP method |
| [src/language/](src/language/) | Seeded generation of sounds, vocabulary, and grammar |
| [src/world.ts](src/world.ts) | World catalog, character dialogue, quiz material, and practice phrases |
| [src/speech.ts](src/speech.ts) | ElevenLabs voice profiles, synthesis cache, and transcription |
| [database/sql/](database/sql/) | PostgreSQL table definitions and application queries, copied into the production build |

An endpoint such as `src/routes/audio/[lineId]/get.ts` becomes `GET /api/audio/:lineId`. The API serves health, sign-in and sessions, worlds, translation checks, speech, saved progress, friendships, achievements, and archive photos.

The first successful sign-in creates an account. PostgreSQL stores the game session and cloud saves. Legacy anonymous saves remain under their original browser keys, so accounts begin with fresh slots.
