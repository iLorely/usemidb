class NamespaceManager {
  constructor(db) {
    this.db = db;
  }

  _key(ns, key) {
    return `${ns}:${key}`;
  }

  async set(ns, key, value) {
    return await this.db.set(this._key(ns, key), value);
  }

  async get(ns, key) {
    return await this.db.get(this._key(ns, key));
  }

  async delete(ns, key) {
    return await this.db.delete(this._key(ns, key));
  }

  async has(ns, key) {
    return await this.db.has(this._key(ns, key));
  }

  async keys(ns) {
    const all = await this.db.keys();
    return all.filter(k => k.startsWith(`${ns}:`));
  }
}

module.exports = NamespaceManager;
