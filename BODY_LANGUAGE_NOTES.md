# Body-language addition

Open **Body language** from the title screen, star map, or field screen.

The five activities teach greeting, waiting, agreement, asking for a turn, and communicating a quantity. Players first interpret an illustrated gesture in a situation, then optionally use their camera to practise it. Two scenes deliberately use the same open palm with different meanings. The content describes shared signals in the game’s scenes and explains that meanings vary between people and cultures.

## Running

Follow the main README. Run `npm install` at the project root, then `npm run dev -w backend` and `npm run dev -w frontend` in separate terminals. The frontend’s preparation step copies the pinned MediaPipe SDK and WebAssembly runtime automatically. Use localhost or HTTPS for the camera. This feature needs no external API key, and its model is bundled with the project.

## Implementation

- Google MediaPipe Tasks Vision 1.2.3, pinned in the frontend dependency and package lock.
- Browser worker performs inference; frames are not uploaded or saved. Microphone access is disabled.
- Four recognised hand shapes support five contextual lessons: open palm, thumbs up, raised index finger, and two raised fingers.
- Matching requires a continuous one-second hold at the configured confidence threshold. Camera frames preserve their original aspect ratio.
- Camera tracks stop after success, when changing lessons or closing the activity, and on page/tab exit or hiding.
- Meaning completions and camera-practice completions are stored separately in each save slot. Camera use is optional; older saves remain valid.
- Existing field movement is paused while the activity is open.

## Verification performed

- Frontend/backend TypeScript checks and production builds passed.
- A real MediaPipe worker recognised Google’s sample thumbs-up image.
- A simulated camera stream carrying that sample completed recognition, saved practice, and released its camera track. This did not access the user’s webcam.
- Camera refusal, switching lessons during practice, and cancellation while permission was pending were tested.
- Correct/incorrect interpretation feedback, save persistence after reload, and responsive portrait/landscape bounds were tested.
- Save routes round-tripped the new progress format with a stubbed database and rejected unknown IDs, duplicates, and extra recording fields; old saves were still accepted.
- The market play-through still collected all six clues, passed the quiz, and saved its badge.

Physical webcams, lighting conditions, and mobile-device cameras have not been tested. Live PostgreSQL persistence was not exercised. The separate project review describes five pre-existing issues in the original archive; those fixes are outside this feature addition.

## Assets and attribution

MediaPipe’s model and license are in `frontend/public/mediapipe/`. Generated SDK/runtime files are excluded from source and prepared from the pinned npm dependency. Google documentation: https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer
