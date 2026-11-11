// The hosted migration owns this schema. Never create tables in request handlers.
export const COLLECTIONS = ['profile','courses','meetings','projects','tasks','papers','experiments','opportunities','memories','conversations','job_leads'];
export class D1Store {
  constructor(db) { this.db = db; }
  async list(owner, collection) {
    const {results} = await this.db.prepare('SELECT data FROM records WHERE owner_id = ? AND collection = ? ORDER BY rowid').bind(owner, collection).all();
    return results.map(row => JSON.parse(row.data));
  }
  async get(owner, collection, id) {
    const row = await this.db.prepare('SELECT data FROM records WHERE owner_id = ? AND collection = ? AND id = ?').bind(owner, collection, id).first();
    return row ? JSON.parse(row.data) : null;
  }
  statement(owner, operation) {
    if (operation.type === 'put') return this.db.prepare('INSERT INTO records(owner_id,collection,id,data) VALUES (?,?,?,?) ON CONFLICT(owner_id,collection,id) DO UPDATE SET data=excluded.data').bind(owner, operation.collection, operation.record.id, JSON.stringify(operation.record));
    return this.db.prepare('DELETE FROM records WHERE owner_id = ? AND collection = ? AND id = ?').bind(owner, operation.collection, operation.id);
  }
  async put(owner, collection, record) { await this.statement(owner, {type:'put',collection,record}).run(); return record; }
  async remove(owner, collection, id) { await this.statement(owner, {type:'delete',collection,id}).run(); }
  async batch(owner, operations) { if (operations.length) await this.db.batch(operations.map(op => this.statement(owner, op))); }
  async clear(owner) { await this.db.prepare('DELETE FROM records WHERE owner_id = ?').bind(owner).run(); }
}
