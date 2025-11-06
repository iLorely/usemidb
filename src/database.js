const fs = require("fs");
const path = require("path");
const NamespaceManager = require("./namespace.js");

function query(store, filterFn) {
  if (typeof filterFn !== "function") throw new Error("filterFn fonksiyon olmalı");

  const now = Date.now();
  const results = [];

  for (const key of Object.keys(store)) {
    const entry = store[key];
    if (!entry) continue;

    if (entry.e !== null && now >= entry.e) continue;

    const item = { key, value: entry.v, expiresAt: entry.e };
    try {
      if (filterFn(item.value, item.key)) results.push(item);
    } catch (_) {}
  }

  return results;
}

class UsemiDB {
  constructor(options = {}) {
    this.filePath = options.filePath || path.join(__dirname, "..", "usemidb", "usemidb.json");
    this.backupFile = this.filePath + ".bak";
    this.autoSave = options.autoSave ?? true;
    this.autoCleanInterval = options.autoCleanInterval ?? 60_000;
    this.events = {};
    this._startTime = Date.now();
    this.data = {};

    this._ensureFile();
    this._load();
    this._startCleaner();

    this.namespace = new NamespaceManager(this);
  }

  _ensureFile() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.filePath)) fs.writeFileSync(this.filePath, JSON.stringify({}), "utf-8");
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);
      this.data = this._normalizeLoaded(parsed);
    } catch (err) {
      if (fs.existsSync(this.backupFile)) {
        try {
          const braw = fs.readFileSync(this.backupFile, "utf-8");
          fs.writeFileSync(this.filePath, braw, "utf-8");
          const parsed = JSON.parse(braw);
          this.data = this._normalizeLoaded(parsed);
        } catch {
          this.data = {};
        }
      } else {
        this.data = {};
      }
    }
  }

  _normalizeLoaded(parsed) {
    const out = {};
    for (const k of Object.keys(parsed)) {
      const item = parsed[k];
      if (item && typeof item === "object" && "v" in item && "e" in item) {
        out[k] = { v: item.v, e: item.e };
      } else {
        out[k] = { v: item, e: null };
      }
    }
    return out;
  }

  async save() {
    try {
      if (fs.existsSync(this.filePath)) await fs.promises.copyFile(this.filePath, this.backupFile);
      if (this.autoSave) await fs.promises.writeFile(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {}
  }

  on(eventName, cb) {
    if (!this.events[eventName]) this.events[eventName] = new Set();
    this.events[eventName].add(cb);
    return () => this.off(eventName, cb);
  }

  off(eventName, cb) {
    this.events[eventName]?.delete(cb);
  }

  _emit(eventName, ...args) {
    for (const cb of Array.from(this.events[eventName] ?? [])) try { cb(...args); } catch {}
  }

  _startCleaner() {
    if (this._cleaner) clearInterval(this._cleaner);
    this._cleaner = setInterval(() => {
      const removed = this._cleanExpiredSync();
      if (removed.length) {
        this.save();
        removed.forEach(k => this._emit("expired", k));
      }
    }, this.autoCleanInterval);
    if (this._cleaner.unref) this._cleaner.unref();
  }

  _isExpiredEntry(entry) {
    return entry.e !== null && Date.now() >= entry.e;
  }

  _cleanExpiredSync() {
    const removed = [];
    for (const k of Object.keys(this.data)) if (this._isExpiredEntry(this.data[k])) { delete this.data[k]; removed.push(k); }
    return removed;
  }

  async cleanExpired() {
    const removed = this._cleanExpiredSync();
    if (removed.length) { await this.save(); removed.forEach(k => this._emit("expired", k)); }
    return removed;
  }

  async set(key, value, ttlMs = null) {
    const expiresAt = typeof ttlMs === "number" && ttlMs > 0 ? Date.now() + ttlMs : null;
    this.data[key] = { v: value, e: expiresAt };
    await this.save();
    this._emit("set", key, value);
    return true;
  }

  get(key) {
    const entry = this.data[key];
    if (!entry) return null;
    if (this._isExpiredEntry(entry)) { delete this.data[key]; this.save().catch(() => {}); this._emit("expired", key); return null; }
    return entry.v;
  }

  has(key) {
    const entry = this.data[key];
    if (!entry) return false;
    if (this._isExpiredEntry(entry)) { delete this.data[key]; this.save().catch(() => {}); this._emit("expired", key); return false; }
    return true;
  }

  async delete(key) {
    const entry = this.data[key];
    if (!entry) return false;
    delete this.data[key];
    await this.save();
    this._emit("delete", key, entry.v);
    return true;
  }

  async push(key, value) {
    let entry = this.data[key];
    if (!entry || entry.v == null) { entry = { v: [], e: null }; this.data[key] = entry; }
    if (!Array.isArray(entry.v)) entry.v = [entry.v];
    entry.v.push(value);
    await this.save();
    this._emit("push", key, value);
    return entry.v;
  }

  all({ includeMeta = false } = {}) {
    if (!includeMeta) {
      const out = {};
      for (const k of Object.keys(this.data)) if (!this._isExpiredEntry(this.data[k])) out[k] = this.data[k].v;
      return out;
    } else return { ...this.data };
  }

  async clear() {
    this.data = {};
    await this.save();
    this._emit("clear");
    return true;
  }

  query(filterFn) {
    return query(this.data, filterFn);
  }

  stats() {
    const keys = Object.keys(this.data);
    const totalKeys = keys.length;
    const keysWithTTL = keys.filter(k => this.data[k].e !== null).length;
    const expiredCount = keys.filter(k => this._isExpiredEntry(this.data[k])).length;
    let fileSize = 0;
    try { fileSize = fs.statSync(this.filePath).size; } catch {}
    const memSize = Buffer.byteLength(JSON.stringify(this.data), "utf-8");
    return { totalKeys, keysWithTTL, expiredCount, fileSize, memSize, autoSave: !!this.autoSave, uptimeMs: Date.now() - this._startTime };
  }

  createCollection(name) { return new UsemiCollection(this, name); }
  collection(name) { return this.createCollection(name); }
}

class UsemiCollection {
  constructor(db, name) { this.db = db; this.name = name; }
  _key(key) { return `${this.name}:${key}`; }
  async set(key, value, ttl = null) { return this.db.set(this._key(key), value, ttl); }
  get(key) { return this.db.get(this._key(key)); }
  has(key) { return this.db.has(this._key(key)); }
  async delete(key) { return this.db.delete(this._key(key)); }
  async push(key, value) { return this.db.push(this._key(key), value); }
  all() {
    const out = {};
    const raw = this.db.all();
    for (const k of Object.keys(raw)) if (k.startsWith(this.name + ":")) out[k.replace(this.name + ":", "")] = raw[k];
    return out;
  }
  query(filterFn) {
    const raw = this.db.all({ includeMeta: true });
    const out = {};
    for (const k of Object.keys(raw)) {
      if (k.startsWith(this.name + ":")) {
        const trimmed = k.replace(this.name + ":", "");
        const entry = raw[k];
        if (filterFn(entry.v, trimmed)) out[trimmed] = entry.v;
      }
    }
    return out;
  }
}

module.exports = UsemiDB;
