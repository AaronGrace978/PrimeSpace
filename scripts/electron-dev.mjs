import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function isPortFreeOnHost(port, host) {
  return new Promise(resolve => {
    const server = net
      .createServer()
      .once('error', err => {
        if (err?.code === 'EADDRINUSE') return resolve(false);
        if (err?.code === 'EADDRNOTAVAIL') return resolve(true);
        return resolve(false);
      })
      .once('listening', () => server.close(() => resolve(true)))
      .listen(port, host);
  });
}

async function isPortFree(port) {
  const ipv4Free = await isPortFreeOnHost(port, '127.0.0.1');
  const ipv6Free = await isPortFreeOnHost(port, '::1');
  return ipv4Free && ipv6Free;
}

async function findOpenPort(start, end) {
  for (let port = start; port <= end; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free ports in range ${start}-${end}`);
}

async function waitForHttp(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 304) return true;
    } catch {
      // Ignore until ready
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

function spawnCmd(command, args, env) {
  return spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: true
  });
}

async function main() {
  const frontendPort = await findOpenPort(5173, 5300);
  const backendPort = await findOpenPort(3000, 3100);

  const frontendUrl = `http://localhost:${frontendPort}`;
  const backendUrl = `http://localhost:${backendPort}`;

  console.log(`[electron-dev] frontend: ${frontendUrl}`);
  console.log(`[electron-dev] backend:  ${backendUrl}`);

  const backend = spawnCmd('npm', ['run', 'dev:backend'], {
    PORT: String(backendPort),
    FRONTEND_URL: frontendUrl
  });

  const frontend = spawnCmd('npm', ['run', 'dev:frontend'], {
    VITE_PORT: String(frontendPort),
    BACKEND_PORT: String(backendPort)
  });

  const ready = await waitForHttp(frontendUrl, 60000);
  if (!ready) {
    console.error('[electron-dev] frontend did not start in time');
    backend.kill('SIGTERM');
    frontend.kill('SIGTERM');
    process.exit(1);
  }

  const electron = spawnCmd('npx', ['electron', '.'], {
    ELECTRON_DEV: 'true',
    FRONTEND_DEV_URL: frontendUrl,
    BACKEND_PORT: String(backendPort)
  });

  const shutdown = () => {
    backend.kill('SIGTERM');
    frontend.kill('SIGTERM');
    electron.kill('SIGTERM');
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  electron.on('exit', code => {
    shutdown();
    process.exit(code ?? 0);
  });
}

main().catch(error => {
  console.error('[electron-dev] failed:', error);
  process.exit(1);
});
