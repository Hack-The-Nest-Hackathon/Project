import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const bundle = require.resolve("@mediapipe/tasks-vision");
const source = new URL("./", pathToFileURL(bundle));
const destination = new URL("../public/mediapipe/vendor/1.2.3/", import.meta.url);
await mkdir(new URL("wasm/", destination), { recursive: true });
for (const file of ["vision_bundle.js", "wasm/vision_wasm_internal.js", "wasm/vision_wasm_internal.wasm"]) {
  await copyFile(new URL(file, source), new URL(file, destination));
}
