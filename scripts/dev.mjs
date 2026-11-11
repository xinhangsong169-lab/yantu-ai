import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const port = process.env.PORT || '4320';
const server = spawn(process.execPath, ['--env-file-if-exists=.env', 'server/local.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: port }
});

let ready = false;
for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    if (response.ok) {
      ready = true;
      break;
    }
  } catch {
    /* 接口还在启动 */
  }
  await delay(150);
}

if (!ready) {
  console.error(`接口没有在 ${port} 端口就绪。`);
  server.kill();
  process.exit(1);
}

const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const vite = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', '5173'], {
  stdio: 'inherit'
});

function stop() {
  vite.kill();
  server.kill();
  process.exit(0);
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
vite.on('exit', (code) => {
  server.kill();
  process.exit(code ?? 0);
});
