import test from 'node:test';
import assert from 'node:assert/strict';
import { SQLiteStore } from '../server/local-db.mjs';
import { handleApi } from '../server/api.mjs';

async function call(store, path, payload, accept = 'application/json') {
  const req = new Request(`http://localhost${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: accept }, body: JSON.stringify(payload)
  });
  return handleApi(req, {}, store, 'test-user');
}

test('工作台回答和日程解析使用已导入的日程函数', async () => {
  const store = new SQLiteStore(':memory:');
  try {
    const chat = await call(store, '/api/ai/chat', { scope: 'workbench', message: '今天先做哪一件？' }, 'text/event-stream');
    assert.equal(chat.status, 200);
    const stream = await chat.text();
    assert.match(stream, /event: done/);
    assert.doesNotMatch(stream, /event: error/);
    const agenda = await call(store, '/api/ai/chat', { scope: 'workbench', message: '这周有什么课？' }, 'text/event-stream');
    assert.equal(agenda.status, 200);
    assert.match(await agenda.text(), /event: done/);
    const plan = await call(store, '/api/schedule/interpret', { message: '今天先做什么？' });
    assert.equal(plan.status, 200);
    assert.deepEqual((await plan.json()).actions, []);
  } finally { store.close(); }
});
