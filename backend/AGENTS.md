# Backend instructions

These instructions apply to `backend/`. The backend uses Fastify, TypeScript in strict mode, and PostgreSQL through `pg`.

## Routes

- Add endpoints as `src/routes/<path>/<method>.ts`. Use lowercase method filenames and bracketed segments for parameters. For example, `routes/audio/[lineId]/get.ts` registers `GET /api/audio/:lineId`.
- Default-export the route options and handler. The loader owns the URL and HTTP method. Match Fastify request types to the JSON Schema and validate bodies, headers, and URL parameters at the boundary. Set limits on client-controlled strings, arrays, and uploads.
- Keep handlers focused on request validation, calling application logic, and returning HTTP responses. Keep game rules in the relevant domain module, provider calls in integration modules, and persistence in `database/`. Add shared helpers when they remove real duplication or own a clear lifecycle.
- Preserve API contracts used by the frontend. Return explicit statuses and safe messages for expected failures. Avoid exposing internal exceptions, SQL, provider payloads, credentials, or save keys.

## PostgreSQL

- Use the shared `pg` pool and keep it bounded. Close it during shutdown and in standalone scripts. Use parameterized queries for every user-controlled value.
- Keep one SQL statement per file under `database/sql/schema/` or `database/sql/queries/`. Read SQL at startup and reuse it across requests. Keep typed inputs and query results in the database module.
- Keep saves scoped to the owning save key and slot. Use atomic statements for upserts. If multiple statements need a transaction, use the same checked-out client and release it in `finally`.
- Keep initialization repeatable and preserve existing data. Run `npm run db:init -w backend` against a configured database when verifying schema changes.

## Provider integrations

- Keep environment secrets on the server and out of logs. Document settings in `.env.example` with placeholders. Validate settings before using them.
- Set deadlines for outbound requests and validate the upstream data the application consumes. Share concurrency and cooldown across the ElevenLabs key pool. Retry a confirmed invalid credential at most once with another configured key. Treat rate limits and workspace quota as shared across the pool.
- Cache audio only for known catalog lines and deduplicate requests for the same clip. Release pending work and concurrency slots on success and failure. Keep recordings and transcripts out of logs.

## Verification

- Run `npm run typecheck -w backend` and `npm run build -w backend`. Check that compiled route discovery and SQL copying still work.
- Verify affected HTTP behavior with Fastify injection or local requests, including invalid input and dependency failures. Use mocked provider responses for deterministic key rotation and quota checks. Use a configured PostgreSQL instance to verify database changes.
