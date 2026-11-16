import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { request } from 'node:http';

async function freePort() {
  const s = createServer(); s.listen(0, '127.0.0.1'); await once(s, 'listening');
  const port = s.address().port; await new Promise(resolve => s.close(resolve)); return port;
}
async function start(env) {
  const p = spawn(process.execPath, ['server/local.mjs'], { env: { PATH: process.env.PATH, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; p.stdout.on('data', x => { output += x; }); p.stderr.on('data', x => { output += x; });
  for (let n = 0; n < 100; n++) {
    if (output.includes('listening on port') || output.includes('Local:')) return p;
    if (p.exitCode !== null) throw new Error(`server exited: ${output}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  p.kill(); throw new Error('server did not start');
}
async function stop(p) { if (p.exitCode !== null) return; p.kill('SIGTERM'); await once(p, 'exit'); }

test('评审模式认证、来源限制和持久化', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'yantu-review-'));
  const port = await freePort();
  const env = { PORT: String(port), REVIEW_MODE: 'true', PUBLIC_ORIGIN: 'https://review.example.com', REVIEW_USER: 'reviewer', REVIEW_PASSWORD: 'example-password-987654321', DATABASE_PATH: join(dir, 'review.sqlite') };
  const url = `http://127.0.0.1:${port}`;
  const auth = `Basic ${Buffer.from(`${env.REVIEW_USER}:${env.REVIEW_PASSWORD}`).toString('base64')}`;
  let proc;
  try {
    proc = await start(env);
    assert.equal((await fetch(`${url}/healthz`)).status, 200);
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(`${url}/api/state`)).status, 401);
    assert.equal((await fetch(url, {headers:{Authorization: 'Basic invalid'}})).status, 401);
    assert.equal((await fetch(url, {headers:{Authorization:auth}})).status, 200);
    const foreignHost = await new Promise((resolve, reject) => { const r = request(`${url}/api/state`, {headers:{Authorization:auth, Host:'evil.example'}}, res => {res.resume(); resolve(res.statusCode);}); r.on('error', reject); r.end(); });
    assert.equal(foreignHost, 403);
    const post = {method:'POST',headers:{Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify({title:'持久化测试任务'})};
    assert.equal((await fetch(`${url}/api/records/tasks`, {...post,headers:{...post.headers,Origin:'https://evil.example'}})).status, 403);
    assert.equal((await fetch(`${url}/api/records/tasks`, {...post,headers:{...post.headers,Origin:'http://localhost:5173'}})).status, 403);
    assert.equal((await fetch(`${url}/api/records/tasks`, {...post,headers:{...post.headers,Origin:env.PUBLIC_ORIGIN}})).status, 201);
    await stop(proc); proc = await start(env);
    const state = await (await fetch(`${url}/api/state`, {headers:{Authorization:auth}})).json();
    assert.ok(state.tasks.some(task => task.title === '持久化测试任务'));
  } finally { if (proc) await stop(proc); await rm(dir, {recursive:true,force:true}); }
});

test('评审模式配置不完整时不能启动', async () => {
  const p = spawn(process.execPath, ['server/local.mjs'], {env:{PATH:process.env.PATH, REVIEW_MODE:'true'},stdio:'ignore'});
  const [code] = await once(p, 'exit'); assert.notEqual(code, 0);
});

test('公开评审模式免登录但仍限制请求来源', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'yantu-public-'));
  const port = await freePort();
  const env = { PORT: String(port), REVIEW_MODE: 'true', REVIEW_PUBLIC_ACCESS: 'true', PUBLIC_ORIGIN: 'https://review.example.com', DATABASE_PATH: join(dir, 'review.sqlite') };
  let proc;
  try {
    proc = await start(env);
    const url = `http://127.0.0.1:${port}`;
    assert.equal((await fetch(`${url}/api/state`)).status, 200);
    const post = {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'公开测试任务'})};
    assert.equal((await fetch(`${url}/api/records/tasks`, {...post,headers:{...post.headers,Origin:'https://evil.example'}})).status, 403);
    assert.equal((await fetch(`${url}/api/records/tasks`, {...post,headers:{...post.headers,Origin:env.PUBLIC_ORIGIN}})).status, 201);
  } finally { if (proc) await stop(proc); await rm(dir, {recursive:true,force:true}); }
});
