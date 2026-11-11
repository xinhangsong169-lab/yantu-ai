import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export class SQLiteStore {
  constructor(path = ':memory:') {
    if (path !== ':memory:') mkdirSync(dirname(path), {recursive:true});
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    const exists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='records'").get();
    if (!exists) this.db.exec(readFileSync(new URL('../migrations/0001_records.sql', import.meta.url), 'utf8'));
  }
  async list(owner, collection) { return this.db.prepare('SELECT data FROM records WHERE owner_id=? AND collection=? ORDER BY rowid').all(owner, collection).map(row => JSON.parse(row.data)); }
  async get(owner, collection, id) { const row=this.db.prepare('SELECT data FROM records WHERE owner_id=? AND collection=? AND id=?').get(owner, collection, id); return row ? JSON.parse(row.data) : null; }
  apply(owner, op) {
    if (op.type === 'put') this.db.prepare('INSERT INTO records(owner_id,collection,id,data) VALUES (?,?,?,?) ON CONFLICT(owner_id,collection,id) DO UPDATE SET data=excluded.data').run(owner, op.collection, op.record.id, JSON.stringify(op.record));
    else this.db.prepare('DELETE FROM records WHERE owner_id=? AND collection=? AND id=?').run(owner, op.collection, op.id);
  }
  async put(owner, collection, record) { this.apply(owner, {type:'put',collection,record}); return record; }
  async remove(owner, collection, id) { this.apply(owner, {type:'delete',collection,id}); }
  async batch(owner, operations) {
    this.db.exec('BEGIN IMMEDIATE');
    try { for (const op of operations) this.apply(owner, op); this.db.exec('COMMIT'); }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  async clear(owner) { this.db.prepare('DELETE FROM records WHERE owner_id=?').run(owner); }
  close() { this.db.close(); }
}
