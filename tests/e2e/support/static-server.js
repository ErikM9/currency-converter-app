import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 3200;

/* A port of its own keeps the suite away from a dev server left running on 3000 */
export const BASE_URL = `http://localhost:${PORT}`;

let serverProcess;

export async function startStaticServer() {
  mkdirSync('./screenshots', { recursive: true });
  serverProcess = spawn('node', ['node_modules/http-server/bin/http-server', 'src', '-p', String(PORT), '-c-1', '-s'], {
    stdio: 'ignore'
  });
  await waitForServer();
}

export function stopStaticServer() {
  serverProcess?.kill();
}

async function waitForServer(attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok) return;
    } catch {
      /* The server has not started listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`The static server never came up on ${BASE_URL}`);
}