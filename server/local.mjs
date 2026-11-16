import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, timingSafeEqual } from 'node:crypto';
import { handleApi } from './api.mjs';
import { SQLiteStore } from './local-db.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const root = (existsSync(dist) ? dist : publicDir).replace(/[/\\]+$/, '');
const reviewMode = process.env.REVIEW_MODE === 'true';
const publicReview = reviewMode && process.env.REVIEW_PUBLIC_ACCESS === 'true';
const publicOrigin = process.env.PUBLIC_ORIGIN || '';
const reviewUser = process.env.REVIEW_USER || '';
const reviewPassword = process.env.REVIEW_PASSWORD || '';
const reviewBindHost = process.env.REVIEW_BIND_HOST || '0.0.0.0';
if (reviewMode) {
  let url;
  try { url = new URL(publicOrigin); } catch { throw new Error('评审模式需要有效的 PUBLIC_ORIGIN'); }
  if (url.protocol !== 'https:' || url.origin !== publicOrigin || url.username || url.password) throw new Error('PUBLIC_ORIGIN 必须是 HTTPS 来源，例如 https://review.example.com');
  if (!publicReview && (!reviewUser || reviewUser.includes(':') || /[\r\n]/.test(reviewUser) || reviewPassword.length < 16 || /[\r\n]/.test(reviewPassword))) throw new Error('评审模式需要 REVIEW_USER 和至少 16 位的 REVIEW_PASSWORD');
  if (!process.env.DATABASE_PATH) throw new Error('评审模式必须配置独立的 DATABASE_PATH');
  if (!['127.0.0.1', '0.0.0.0'].includes(reviewBindHost)) throw new Error('REVIEW_BIND_HOST 无效');
}
const database = process.env.DATABASE_PATH || fileURLToPath(new URL('../.data/yantu.sqlite', import.meta.url));
const store = new SQLiteStore(database);
const port = Number(process.env.PORT || 4320);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};
const origin = `http://127.0.0.1:${port}`;
const allowedOrigins = new Set(reviewMode ? [publicOrigin] : [
  origin,
  `http://localhost:${port}`,
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean)
]);

const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`, ...(reviewMode ? [new URL(publicOrigin).host] : [])]);
function authenticated(req) {
  const value = req.headers.authorization || '';
  if (!value.startsWith('Basic ')) return false;
  const actual = createHash('sha256').update(value.slice(6)).digest();
  const expected = createHash('sha256').update(Buffer.from(`${reviewUser}:${reviewPassword}`).toString('base64')).digest();
  return timingSafeEqual(actual, expected);
}

const server = createServer(async (req, res) => {
  try {
    if (reviewMode && req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end('ok');
    }
    if (!allowedHosts.has(req.headers.host || '')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: '请通过本机地址打开工作台' }));
    }
    if (reviewMode && !publicReview && !authenticated(req)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Yantu Review", charset="UTF-8"', 'Cache-Control': 'no-store' });
      return res.end('Authentication required');
    }
    if (req.url?.startsWith('/api/')) {
      if (!['GET', 'HEAD'].includes(req.method || '') && req.headers.origin && !allowedOrigins.has(req.headers.origin)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: '不接受其他站点的写入请求' }));
      }
      let buffer = Buffer.alloc(0);
      for await (const chunk of req) {
        buffer = Buffer.concat([buffer, chunk]);
        if (buffer.length > 12_000_000) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: '请求过大，请分批导入' }));
        }
      }
      const request = new Request(new URL(req.url, origin), {
        method: req.method,
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/json',
          Accept: req.headers.accept || ''
        },
        ...(!['GET', 'HEAD'].includes(req.method || '') ? { body: buffer } : {})
      });
      const response = await handleApi(request, process.env, store, 'local-user');
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (!response.body) return res.end();
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      return res.end();
    }
    const pathname = decodeURIComponent(new URL(req.url, origin).pathname);
    const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    let file = path;
    try {
      if (!(await stat(file)).isFile()) file = resolve(root, 'index.html');
    } catch {
      if (extname(path)) {
        res.writeHead(404);
        return res.end('Not found');
      }
      file = resolve(root, 'index.html');
    }
    res.writeHead(200, {
      'Content-Type': mime[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(await readFile(file));
  } catch {
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '服务暂时不可用' }));
  }
});

server.listen(port, reviewMode ? reviewBindHost : '127.0.0.1', () => {
  console.log(reviewMode ? `Review server listening on port ${port}` : `Local: http://127.0.0.1:${port}`);
  console.log(`Database: ${database}`);
  console.log(`AI: ${process.env.DASHSCOPE_API_KEY ? 'cloud model configured' : 'local planning (no cloud key)'}`);
});

function stop() {
  server.close(() => {
    store.close();
    process.exit(0);
  });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
