const fs = require("fs");
const path = require("path");
const NamespaceManager = require("./namespace.js");

class UsemiDB {
  /**
   * options:
   *  - filePath: custom file path
   *  - autoCleanInterval: ms for TTL cleaner (default 60_000)
   *  - autoSave: boolean (default true)
   */
  constructor(options = {}) {
    this.filePath =
      options.filePath || path.join(__dirname, "..", "usemidb", "usemidb.json");
    this.backupFile = this.filePath + ".bak";

    this.autoSave = options.autoSave ?? true;
    this.autoCleanInterval = options.autoCleanInterval ?? 60_000; // 60s
    this.events = {}; // eventName -> [callbacks]

    this._startTime = Date.now(); // stats için

    // in-memory store: keys -> { v: value, e: expiresAt|null }
    this.data = {};

    // ensure data folder + file exists
    this._ensureFile();

    // load into memory (attempt backup if parse fails)
    this._load();

    // start TTL cleaner
    this._startCleaner();

    // Namespace manager
    this.namespace = new NamespaceManager(this);
  }

  // ---------------- File helpers ----------------
  _ensureFile() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({}), "utf-8");
    }
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);
      this.data = this._normalizeLoaded(parsed);
    } catch (err) {
      console.error("UsemiDB: JSON parse hatası, yedekten yüklemeye çalışılıyor...", err.message);
      if (fs.existsSync(this.backupFile)) {
        try {
          const braw = fs.readFileSync(this.backupFile, "utf-8");
          fs.writeFileSync(this.filePath, braw, "utf-8");
          const parsed = JSON.parse(braw);
          this.data = this._normalizeLoaded(parsed);
          console.log("UsemiDB: yedek başarıyla yüklendi.");
          return;
        } catch (err2) {
          console.error("UsemiDB: Backup da bozuk. Temiz DB başlatılıyor.", err2.message);
        }
      }
      this.data = {};
    }
  }

  _normalizeLoaded(parsed) {
    const out = {};
    for (const k of Object.keys(parsed)) {
      const item = parsed[k];
      if (
        item &&
        typeof item === "object" &&
        Object.prototype.hasOwnProperty.call(item, "v") &&
        Object.prototype.hasOwnProperty.call(item, "e")
      ) {
        out[k] = { v: item.v, e: item.e };
      } else {
        out[k] = { v: item, e: null };
      }
    }
    return out;
  }

  async save() {
    try {
      if (fs.existsSync(this.filePath)) {
        await fs.promises.copyFile(this.filePath, this.backupFile);
      }
      const plain = {};
      for (const k of Object.keys(this.data)) {
        plain[k] = this.data[k];
      }
      if (this.autoSave) {
        await fs.promises.writeFile(
          this.filePath,
          JSON.stringify(plain, null, 2),
          "utf-8"
        );
      }
    } catch (err) {
      console.error("UsemiDB: save hatası:", err);
    }
  }

  // ---------------- Event system ----------------
  on(eventName, cb) {
    if (!this.events[eventName]) this.events[eventName] = new Set();
    this.events[eventName].add(cb);
    return () => this.off(eventName, cb);
  }

  off(eventName, cb) {
    if (!this.events[eventName]) return;
    this.events[eventName].delete(cb);
  }

  _emit(eventName, ...args) {
    if (!this.events[eventName]) return;
    for (const cb of Array.from(this.events[eventName])) {
      try {
        cb(...args);
      } catch (err) {
        console.error("UsemiDB: event handler hata:", err);
      }
    }
  }

  // ---------------- TTL helpers ----------------
  _startCleaner() {
    if (this._cleaner) clearInterval(this._cleaner);
    this._cleaner = setInterval(() => {
      try {
        const removed = this._cleanExpiredSync();
        if (removed && removed.length > 0) {
          this.save();
          for (const k of removed) this._emit("expired", k);
        }
      } catch (err) {
        console.error("UsemiDB: cleaner hata:", err);
      }
    }, this.autoCleanInterval);
    if (this._cleaner.unref) this._cleaner.unref();
  }

  _isExpiredEntry(entry) {
    return entry.e !== null && Date.now() >= entry.e;
  }

  _cleanExpiredSync() {
    const removed = [];
    for (const k of Object.keys(this.data)) {
      if (this._isExpiredEntry(this.data[k])) {
        delete this.data[k];
        removed.push(k);
      }
    }
    return removed;
  }

  async cleanExpired() {
    const removed = this._cleanExpiredSync();
    if (removed.length > 0) {
      await this.save();
      removed.forEach(k => this._emit("expired", k));
    }
    return removed;
  }

  // ---------------- Core API ----------------
  async set(key, value, ttlMs = null) {
    const expiresAt = typeof ttlMs === "number" && ttlMs > 0 ? Date.now() + ttlMs : null;
    this.data[key] = { v: value, e: expiresAt };
    await this.save();
    this._emit("set", key, value, expiresAt);
    return true;
  }

  get(key) {
    const entry = this.data[key];
    if (!entry) return null;
    if (this._isExpiredEntry(entry)) {
      delete this.data[key];
      this.save().catch(() => {});
      this._emit("expired", key);
      return null;
    }
    return entry.v;
  }

  has(key) {
    const entry = this.data[key];
    if (!entry) return false;
    if (this._isExpiredEntry(entry)) {
      delete this.data[key];
      this.save().catch(() => {});
      this._emit("expired", key);
      return false;
    }
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
    if (!entry || entry.v === undefined || entry.v === null) {
      entry = { v: [], e: null };
      this.data[key] = entry;
    }
    if (!Array.isArray(entry.v)) {
      entry.v = [entry.v];
    }
    entry.v.push(value);
    await this.save();
    this._emit("push", key, value);
    return entry.v;
  }

  all({ includeMeta = false } = {}) {
    if (!includeMeta) {
      const out = {};
      for (const k of Object.keys(this.data)) {
        if (!this._isExpiredEntry(this.data[k])) {
          out[k] = this.data[k].v;
        }
      }
      return out;
    } else {
      return { ...this.data };
    }
  }

  async clear() {
    this.data = {};
    await this.save();
    this._emit("clear");
    return true;
  }

  // ---------------- Stats ----------------
  stats() {
    const keys = Object.keys(this.data);
    const totalKeys = keys.length;
    const keysWithTTL = keys.filter(k => this.data[k].e !== null).length;
    const expiredCount = keys.filter(k => this._isExpiredEntry(this.data[k])).length;

    let fileSize = 0;
    try {
      const stats = fs.statSync(this.filePath);
      fileSize = stats.size;
    } catch (err) {
      fileSize = 0;
    }

    const memSize = Buffer.byteLength(JSON.stringify(this.data), "utf-8");

    return {
      totalKeys,
      keysWithTTL,
      expiredCount,
      fileSize,
      memSize,
      autoSave: !!this.autoSave,
      uptimeMs: Date.now() - this._startTime
    };
  }

  // ---------------- Collection System ----------------
  createCollection(name) {
    if (!name || typeof name !== "string") {
      throw new Error("collection name must be string");
    }
    return new UsemiCollection(this, name);
  }

  collection(name) {
    return this.createCollection(name);
  }
}

// =========================================
// Collection class
// =========================================

class UsemiCollection {
  constructor(db, name) {
    this.db = db;
    this.name = name;
  }

  _key(key) {
    return `${this.name}:${key}`;
  }

  async set(key, value, ttl = null) {
    return this.db.set(this._key(key), value, ttl);
  }

  get(key) {
    return this.db.get(this._key(key));
  }

  has(key) {
    return this.db.has(this._key(key));
  }

  async delete(key) {
    return this.db.delete(this._key(key));
  }

  async push(key, value) {
    return this.db.push(this._key(key), value);
  }

  all() {
    const out = {};
    const raw = this.db.all();
    for (const k of Object.keys(raw)) {
      if (k.startsWith(this.name + ":")) {
        const trimmed = k.replace(this.name + ":", "");
        out[trimmed] = raw[k];
      }
    }
    return out;
  }
}

module.exports = UsemiDB;
