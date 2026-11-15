# Project summary and engineering plan

## Pitch

Explore worlds where every conversation is a puzzle. Listen to locals speak real and invented languages, compare what they say with what you see, and record guesses in a field journal. An AI companion points out patterns and suggests interpretations you can test in your next conversation. Learning enough to communicate opens the way to the next world.

**What makes it fun:** Language is how you explore. A word you hear at a market can become the clue that gets you through a gate. The AI helps you compare evidence, and the world responds when you use what you learned.

## Hackathon demo

Aim for a playable three-to-five-minute run with two small, illustrated locations and about a dozen voiced lines. Use a responsive scene with tappable NPCs and objects.

1. **French market.** A merchant pairs a voiced phrase with apples the player can inspect. The player hears “une pomme” and “deux pommes,” then uses the journal to identify the word for apple. Provide a transcript and an optional translation after the interaction.
2. **Invented-language outpost.** A local points at one lantern and says “vek,” then points at several and says “vek-ri.” A second NPC uses “tor” and “tor-ri” alongside one star and several stars. Players can infer that “-ri” marks plural from both examples.
3. **Gate puzzle.** The gatekeeper says “tor-ri.” The player chooses the panel with several stars. The gate opens, and the journal records the rule they used.

Give the constructed language about eight words, one grammar rule, and a consistent pronunciation guide. Establish the rule as authored game data. The AI companion sees only the clues the player has encountered and can ask “What ending do both groups share?” Its output is a hypothesis tied to evidence. The game engine validates the puzzle and controls progression.

## Architecture

| Area | Choice | Implementation |
| --- | --- | --- |
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS | One scene view, an NPC dialogue panel, and a journal drawer. Use keyboard-accessible hotspots, large touch targets, responsive layout, visible focus, and tap-to-play audio with transcripts. |
| Backend | TypeScript on Node.js using Next.js Route Handlers | Shared schemas, one deployment, and same-origin requests. Keep provider code and configuration in server-only modules. |
| World data | Versioned JSON validated with Zod | Store scenes, line IDs, transcripts, clue references, and branching dialogue. Keep puzzle evaluation deterministic. |
| Local progress | IndexedDB | Persist visited scenes, collected clue IDs, guesses, and unlocked gates. Version the save schema and include a reset action for the demo. |
| Speech | ElevenLabs text-to-speech plus pre-generated MP3s | Generate the core lines before judging and serve them as static assets. Keep player-facing spelling separate from the phonetic input sent to speech synthesis. Listen to every invented-language line and tune its pronunciation. |
| AI hints | Server-side text model with a curated fallback | Accept scene ID and discovered clue IDs. Look up the transcript and context server-side, then request a short hint and supporting clue IDs. Validate the response and fall back to a scripted hint on errors or invalid citations. |
| Deployment | One HTTPS Next.js deployment | Keep the demo usable with its static content and local save. A database and separate API service can wait until cloud saves or multiplayer need them. |

### Contracts and module boundaries

- `content/worlds/` holds scenes, NPC dialogue, clues, transcripts, and puzzle definitions.
- `lib/game/` applies player actions and unlock rules. Each action should be safe to repeat after a page reload.
- `lib/server/elevenlabs/` holds provider configuration, the key pool, and the TTS client.
- `POST /api/hint` accepts `{ sceneId, observedClueIds }` and returns `{ hint, evidenceIds, source }`. Bound input size, check IDs against the scene, apply a request deadline, and let the client use a packaged hint if unreachable.
- `scripts/generate-audio.ts` generates missing clips for approved line IDs. Set deadlines and a run budget. Add optional live synthesis after the core flow works. Accept a known line ID and serve a stored clip whenever possible.

## ElevenLabs key rotation

Use `ELEVENLABS_API_KEYS` as a server-side JSON array of one or more API keys. Load it at startup or script initialization, trim and deduplicate entries, and validate that each key has the required text-to-speech permission and can access the selected voice. Use TTS-scoped credentials. The static demo can run with zero keys configured because it ships with clips.

1. Compute a content hash from the synthesis text, voice, model, settings, pronunciation configuration, and output format. Return the existing clip on a cache hit. Deduplicate simultaneous requests for the same missing clip.
2. On a cache miss, acquire a slot in a queue shared by all keys for that workspace. Pick the next healthy authorized key in round-robin order and advance the cursor. Send the key via the server-side `xi-api-key` header.
3. Quarantine a key after a confirmed credential failure and try another authorized key once if available. On workspace concurrency limits, wait for capacity within the request deadline. On a busy response, use bounded backoff with jitter. On workspace quota exhaustion, stop generation and use the available clip or transcript. Log clip ID, outcome, latency, and key index only.
4. Use in-memory queue and rotation state in the single-process generation script. If live synthesis runs on multiple server instances, use shared queue and cursor state before relying on global concurrency enforcement. Keys in one workspace draw from that workspace's quota.

For key replacement, add a new key to the server secret, verify it works for a test clip, deploy the updated pool, then revoke the old key.

## Website and PWA

- Add `app/manifest.ts` with name, start URL, standalone display, theme colors, and 192×192 and 512×512 icons, including a maskable icon.
- Register a service worker over HTTPS. Precache a versioned playable demo shell, world data, art, transcripts, and core audio. Confirm caching before showing “Ready offline.” Keep live API requests network-only and route unavailable hints to the packaged fallback.
- Use versioned asset URLs and clean up retired caches on activation. Keep progress in IndexedDB across updates. Verify the installed experience on Android Chrome and iOS Safari’s Add to Home Screen, plus the desktop web experience.
- Include a clear Play button, replay controls, and captions. Handle first-use audio from a tap or keyboard action.

## Build order and team split

| When | Work | Done when |
| --- | --- | --- |
| First hour | Agree on the two scenes, the final puzzle, the line IDs, and the data schema. Scaffold Next.js and deploy an HTTPS preview. | Every teammate can open the same preview and work against the same sample scene. |
| First playable slice | Frontend builds the hotspot and journal UI. Game/content builds the invented language, scenes, and unlock logic. Audio/backend implements the generator and several clips. | A player can hear a clue, record it, and unlock the gate. |
| Integration | Add the French market, connect AI hints to observed clues, cache the demo, and test local saves. | The full path works on a phone, with either live or scripted hints. |
| Final stretch | Run through the pitch and rehearse with network disabled. Verify audio, key rotation, and reload behavior. | A fresh player can finish the demo without coaching, and a prepared install can finish in airplane mode. |

Test the key pool with mocked provider responses for a single key, multiple keys, a revoked key, workspace concurrency, and quota exhaustion. Verify that cached playback makes zero provider calls, that browser requests contain no provider credentials, and that the game handles an unavailable voice clip with readable text. If time gets tight, keep the gate puzzle, voiced lines, and journal. Add free-form conversation, microphone input, and more worlds after that flow works.

## References

- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [ElevenLabs workspace API keys](https://elevenlabs.io/docs/overview/administration/workspaces/api-keys)
- [ElevenLabs API 429 behavior](https://elevenlabs.io/docs/help-center/technical/api-error-code-429)
- [ElevenLabs pronunciation dictionaries](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/pronunciation-dictionaries)
