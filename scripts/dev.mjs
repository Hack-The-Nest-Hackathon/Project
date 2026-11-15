import { spawn } from "node:child_process";

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error("Run this script through npm: npm run dev");
  process.exit(1);
}

const workspaces = ["backend", "frontend"];
const children = workspaces.map((workspace) => {
  const child = spawn(process.execPath, [npmCli, "run", "dev", "--workspace", workspace], {
    env: process.env,
    stdio: "inherit",
  });
  child.on("error", (error) => {
    console.error(`Could not start the ${workspace}:`, error.message);
    stopChildren();
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${workspace} stopped with exit code ${code}.`);
      stopChildren();
    }
  });
  return child;
});

let stopping = false;
function stopChildren() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
}

process.on("SIGINT", stopChildren);
process.on("SIGTERM", stopChildren);
