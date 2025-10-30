const fs = require("fs");
const path = require("path");

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

    // in-memory store: keys -> { v: value, e: expiresAt|null }
    this.data = {};

    // ensure data folder + file exists
    this._ensureFile();

    // load into memory (attempt backup if parse fails)
    this._load();

    // start TTL cleaner
    this._startCleaner();
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
      // normalize parsed -> internal format { v, e }
      this.data = this._normalizeLoaded(parsed);
    } catch (err) {
      console.error("UsemiDB: JSON parse hatası, yedekten yüklemeye çalışılıyor...", err.message);
      // try backup
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
      // fallback
      this.data = {};
    }
  }

  _normalizeLoaded(parsed) {
    // Stored format on disk is previous internal format:
    // key -> { v: value, e: expiresAt|null }
    // But earlier versions may have plain values. Convert them.
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
        // plain old format -> wrap
        out[k] = { v: item, e: null };
      }
    }
    return out;
  }

  // Save (async)
  async save() {
    try {
      // create backup first
      if (fs.existsSync(this.filePath)) {
        await fs.promises.copyFile(this.filePath, this.backupFile);
      }
      // prepare plain JSON for disk: keep same structure { key: { v, e } }
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
          // save if something removed
          this.save();
          for (const k of removed) this._emit("expired", k);
        }
      } catch (err) {
        console.error("UsemiDB: cleaner hata:", err);
      }
    }, this.autoCleanInterval);
    // node won't keep process alive just for this timer if it's unref'd
    if (this._cleaner.unref) this._cleaner.unref();
  }

  _isExpiredEntry(entry) {
    return entry.e !== null && Date.now() >= entry.e;
  }

  // Sync cleaner used by interval (returns removed keys)
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

  // Public manual cleaner (async)
  async cleanExpired() {
    const removed = this._cleanExpiredSync();
    if (removed.length > 0) {
      await this.save();
      removed.forEach(k => this._emit("expired", k));
    }
    return removed;
  }

  // ---------------- Core API ----------------

  /**
   * set(key, value, ttlMs)
   * - ttlMs optional: milliseconds
   */
  async set(key, value, ttlMs = null) {
    const expiresAt = typeof ttlMs === "number" && ttlMs > 0 ? Date.now() + ttlMs : null;
    this.data[key] = { v: value, e: expiresAt };
    await this.save();
    this._emit("set", key, value, expiresAt);
    return true;
  }

  // get returns raw value or null if not present/expired
  get(key) {
    const entry = this.data[key];
    if (!entry) return null;
    if (this._isExpiredEntry(entry)) {
      // expired: remove sync and emit
      delete this.data[key];
      // schedule save (non-blocking)
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

  // push: ensures an array at key, pushes value
  async push(key, value) {
    let entry = this.data[key];
    if (!entry || entry.v === undefined || entry.v === null) {
      entry = { v: [], e: null };
      this.data[key] = entry;
    }
    if (!Array.isArray(entry.v)) {
      // if not array, convert to array [old, new]
      entry.v = [entry.v];
    }
    entry.v.push(value);
    await this.save();
    this._emit("push", key, value);
    return entry.v;
  }

  all({ includeMeta = false } = {}) {
    // includeMeta = false -> return plain values only
    if (!includeMeta) {
      const out = {};
      for (const k of Object.keys(this.data)) {
        if (!this._isExpiredEntry(this.data[k])) {
          out[k] = this.data[k].v;
        }
      }
      return out;
    } else {
      // returns internal objects { v, e }
      return { ...this.data };
    }
  }

  async clear() {
    this.data = {};
    await this.save();
    this._emit("clear");
    return true;
  }
}

module.exports = UsemiDB;
