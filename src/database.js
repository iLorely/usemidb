const fs = require("fs");
const path = require("path");
const NamespaceManager = require("./namespace.js");
const dot = require("./utils.js"); // 🔥 Yeni utils dosyamızı çektik

function query(store, filterFn) {
  if (typeof filterFn !== "function") throw new Error("filterFn fonksiyon olmalı");
  const now = Date.now();
  const results = [];
  for (const key of Object.keys(store)) {
    const entry = store[key];
    if (!entry) continue;
    if (entry.e !== null && now >= entry.e) continue;
    const item = { key, value: entry.v, expiresAt: entry.e };
    try { if (filterFn(item.value, item.key)) results.push(item); } catch (_) {}
  }
  return results;
}

class UsemiDB {
  constructor(options = {}) {
    this.filePath = options.filePath || path.join(__dirname, "..", "usemidb", "usemidb.json");
    this.backupPath = options.backupPath || path.join(path.dirname(this.filePath), "backups");
    this.autoSave = options.autoSave ?? true;
    this.autoCleanInterval = options.autoCleanInterval ?? 60_000;
    this.writeDelay = options.writeDelay ?? 100;
    this._saveTimer = null;
    this.events = {};
    this._startTime = Date.now();
    this.data = {};

    this._ensureFile();
    this._load();
    this._startCleaner();

    this.namespace = new NamespaceManager(this);
  }

  // --- HELPER: Root Key ve Child Path Ayırıcı ---
  // "user.settings.theme" -> { root: "user", path: "settings.theme" }
  _splitKey(key) {
      if (!key.includes('.')) return { root: key, path: null };
      const parts = key.split('.');
      return { root: parts[0], path: parts.slice(1).join('.') };
  }

  _ensureFile() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.backupPath)) fs.mkdirSync(this.backupPath, { recursive: true });
    if (!fs.existsSync(this.filePath)) fs.writeFileSync(this.filePath, JSON.stringify({}), "utf-8");
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);
      this.data = this._normalizeLoaded(parsed);
    } catch (err) { this.data = {}; }
  }

  _normalizeLoaded(parsed) {
    const out = {};
    for (const k of Object.keys(parsed)) {
      const item = parsed[k];
      if (item && typeof item === "object" && "v" in item && "e" in item) {
        out[k] = { v: item.v, e: item.e };
      } else { out[k] = { v: item, e: null }; }
    }
    return out;
  }

  async save() {
    if (!this.autoSave) return;
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(async () => {
        try {
            const content = JSON.stringify(this.data, null, 2);
            await fs.promises.writeFile(this.filePath, content, "utf-8");
        } catch (err) { console.error("UsemiDB Save Error:", err); }
    }, this.writeDelay);
  }

  async backup(name) {
      if(!name) throw new Error("Yedek ismi belirtmelisiniz.");
      const safeName = name.replace(/[^a-z0-9-_]/gi, '_');
      const dest = path.join(this.backupPath, `${safeName}.json`);
      const content = JSON.stringify(this.data, null, 2);
      await fs.promises.writeFile(dest, content, "utf-8");
      return dest;
  }

  async restore(name) {
      if(!name) throw new Error("Yedek ismi belirtmelisiniz.");
      const safeName = name.replace(/[^a-z0-9-_]/gi, '_');
      const target = path.join(this.backupPath, `${safeName}.json`);
      if(!fs.existsSync(target)) throw new Error("Yedek dosyası bulunamadı.");
      const raw = await fs.promises.readFile(target, "utf-8");
      const parsed = JSON.parse(raw);
      this.data = this._normalizeLoaded(parsed);
      await this.save();
      this._emit("clear"); 
      return true;
  }

  on(eventName, cb) {
    if (!this.events[eventName]) this.events[eventName] = new Set();
    this.events[eventName].add(cb);
    return () => this.off(eventName, cb);
  }
  off(eventName, cb) { this.events[eventName]?.delete(cb); }
  _emit(eventName, ...args) { for (const cb of Array.from(this.events[eventName] ?? [])) try { cb(...args); } catch {} }

  _startCleaner() {
    if (this._cleaner) clearInterval(this._cleaner);
    this._cleaner = setInterval(() => {
      const removed = this._cleanExpiredSync();
      if (removed.length) { this.save(); removed.forEach(k => this._emit("expired", k)); }
    }, this.autoCleanInterval);
    if (this._cleaner.unref) this._cleaner.unref();
  }
  _isExpiredEntry(entry) { return entry.e !== null && Date.now() >= entry.e; }
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

  // --- CRUD (DOT NOTATION DESTEKLİ) ---
  async set(key, value, ttlMs = null) {
    const { root, path } = this._splitKey(key);
    const expiresAt = typeof ttlMs === "number" && ttlMs > 0 ? Date.now() + ttlMs : null;

    if (!path) {
        // Normal Set
        this.data[root] = { v: value, e: expiresAt };
    } else {
        // Nested Set (user.settings.theme)
        let entry = this.data[root];
        if (!entry || entry.v == null || typeof entry.v !== 'object') {
            // Eğer root yoksa veya obje değilse, yeni obje olarak oluştur
            entry = { v: {}, e: null }; // Nested set yaparken root'a TTL verilmez, mevcut varsa korunur.
            this.data[root] = entry;
        }
        // Eğer kullanıcı özellikle TTL verdiyse, root'un süresini güncelle
        if (ttlMs !== null) entry.e = expiresAt;

        // Utils ile derin yazma
        dot.set(entry.v, path, value);
    }

    await this.save();
    this._emit("set", key, value);
    return true;
  }

  get(key) {
    const { root, path } = this._splitKey(key);
    const entry = this.data[root];
    
    if (!entry) return null;
    if (this._isExpiredEntry(entry)) { delete this.data[root]; this.save().catch(() => {}); this._emit("expired", root); return null; }
    
    if (!path) return entry.v; // Normal Get
    return dot.get(entry.v, path) ?? null; // Nested Get
  }

  has(key) {
      const { root, path } = this._splitKey(key);
      const entry = this.data[root];
      if (!entry) return false;
      if (this._isExpiredEntry(entry)) { delete this.data[root]; this.save().catch(() => {}); this._emit("expired", root); return false; }
      
      if (!path) return true;
      return dot.has(entry.v, path);
  }

  async delete(key) {
    const { root, path } = this._splitKey(key);
    const entry = this.data[root];
    if (!entry) return false;

    if (!path) {
        // Normal Delete
        delete this.data[root];
        await this.save();
        this._emit("delete", key, entry.v);
        return true;
    } else {
        // Nested Delete
        if (typeof entry.v !== 'object') return false;
        const success = dot.del(entry.v, path);
        if (success) {
            await this.save();
            this._emit("delete", key, null); // Nested silmede eski değeri döndürmek zor
            return true;
        }
        return false;
    }
  }

  async clear() { this.data = {}; await this.save(); this._emit("clear"); return true; }

  // --- ARRAY İŞLEMLERİ (DOT NOTATION DESTEKLİ) ---
  async push(key, value) {
    const { root, path } = this._splitKey(key);
    
    // Root veriyi hazırla
    let entry = this.data[root];
    if (!entry || entry.v == null) { 
        entry = { v: (path ? {} : []), e: null }; 
        this.data[root] = entry; 
    }

    let targetArray;
    if (!path) {
        // Root array ise
        if (!Array.isArray(entry.v)) entry.v = [entry.v];
        targetArray = entry.v;
    } else {
        // Nested array ise (user.items)
        let val = dot.get(entry.v, path);
        if (!Array.isArray(val)) { val = val ? [val] : []; dot.set(entry.v, path, val); }
        targetArray = val;
    }

    targetArray.push(value);
    await this.save();
    this._emit("push", key, value);
    return targetArray;
  }

  async pushUnique(key, value) {
    const { root, path } = this._splitKey(key);
    let entry = this.data[root];
    if (!entry || entry.v == null) { 
        entry = { v: (path ? {} : []), e: null }; 
        this.data[root] = entry; 
    }

    let targetArray;
    if (!path) {
        if (!Array.isArray(entry.v)) entry.v = [entry.v];
        targetArray = entry.v;
    } else {
        let val = dot.get(entry.v, path);
        if (!Array.isArray(val)) { val = val ? [val] : []; dot.set(entry.v, path, val); }
        targetArray = val;
    }

    if (targetArray.includes(value)) return false;
    targetArray.push(value);
    await this.save();
    this._emit("push", key, value);
    return targetArray;
  }

  async pull(key, value) {
    const { root, path } = this._splitKey(key);
    let entry = this.data[root];
    if (!entry) return false;

    let targetArray;
    if (!path) {
        if (!Array.isArray(entry.v)) return false;
        targetArray = entry.v;
    } else {
        if (typeof entry.v !== 'object') return false;
        targetArray = dot.get(entry.v, path);
        if (!Array.isArray(targetArray)) return false;
    }

    const initialLen = targetArray.length;
    const newArr = targetArray.filter(i => i !== value);
    
    if (newArr.length !== initialLen) {
        if (!path) entry.v = newArr;
        else dot.set(entry.v, path, newArr);
        
        await this.save();
        this._emit("pull", key, value);
        return true;
    }
    return false;
  }

  // --- MATEMATİK & DİĞER (DOT NOTATION DESTEKLİ) ---
  async _math(key, count, operator) {
    if(typeof count !== 'number') throw new Error(`UsemiDB: .${operator}() için sayısal değer girin.`);
    const { root, path } = this._splitKey(key);
    
    let entry = this.data[root];
    // Eğer kök veri yoksa ve nested işlem yapılıyorsa oluşturmalıyız
    if ((!entry || entry.v == null) && path) {
        entry = { v: {}, e: null };
        this.data[root] = entry;
    }

    // Mevcut değeri al
    let currentVal;
    if (!path) {
        currentVal = (entry && typeof entry.v === 'number') ? entry.v : 0;
    } else {
        currentVal = dot.get(entry.v, path);
        if (typeof currentVal !== 'number') currentVal = 0;
    }
    
    // İşlem yap
    let newVal = currentVal;
    if (operator === 'add') newVal += count;
    if (operator === 'subtract') newVal -= count;
    if (operator === 'multiply') newVal *= count;
    if (operator === 'divide') newVal /= count;

    // Kaydet
    if (!path) {
        // Root'u güncelle (TTL koru)
        let remainingTTL = null;
        if(entry && entry.e) { const t = entry.e - Date.now(); if(t > 0) remainingTTL = t; }
        await this.set(root, newVal, remainingTTL);
    } else {
        // Nested güncelle
        dot.set(entry.v, path, newVal);
        await this.save();
        // Math işlemleri için özel event, ama şimdilik set eventi atıyoruz
        this._emit("set", key, newVal); 
    }
    return newVal;
  }

  async add(key, count) { return this._math(key, count, 'add'); }
  async subtract(key, count) { return this._math(key, count, 'subtract'); }
  async multiply(key, count) { return this._math(key, count, 'multiply'); }
  async divide(key, count) { return this._math(key, count, 'divide'); }

  async toggle(key) {
      const { root, path } = this._splitKey(key);
      let entry = this.data[root];
      
      // Eğer root yoksa oluştur
      if (!entry) {
          if (!path) await this.set(key, true);
          else { await this.set(root, {}); await this.set(key, true); }
          return true;
      }

      let currentVal;
      if (!path) currentVal = !!entry.v;
      else currentVal = !!dot.get(entry.v, path);

      const newVal = !currentVal;
      
      if (!path) {
           let remainingTTL = null;
           if(entry.e) { const t = entry.e - Date.now(); if(t > 0) remainingTTL = t; }
           await this.set(key, newVal, remainingTTL);
      } else {
           dot.set(entry.v, path, newVal);
           await this.save();
      }
      return newVal;
  }

  async rename(oldKey, newKey) {
      // Rename genelde sadece Root Key'ler için güvenlidir, nested rename karmaşıktır.
      // O yüzden burada sadece root key desteği veriyoruz.
      if(!this.has(oldKey)) return false;
      if(this.has(newKey)) throw new Error(`UsemiDB: "${newKey}" zaten var.`);
      const entry = this.data[oldKey];
      this.data[newKey] = entry;
      delete this.data[oldKey];
      await this.save();
      this._emit("rename", oldKey, newKey);
      return true;
  }

  async random(count = 1) {
    const keys = Object.keys(this.data).filter(k => !this._isExpiredEntry(this.data[k]));
    if (keys.length === 0) return count === 1 ? null : [];
    if (count === 1) return this.data[keys[Math.floor(Math.random() * keys.length)]].v;
    const shuffled = keys.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(k => this.data[k].v);
  }

  find(queryObj) {
      const results = [];
      const keys = Object.keys(this.data);
      for(const k of keys) {
          if(this._isExpiredEntry(this.data[k])) continue;
          const val = this.data[k].v;
          if(typeof queryObj === 'object' && val && typeof val === 'object') {
              let match = true;
              for(const qKey of Object.keys(queryObj)) { 
                  // Nested sorgu desteği basit seviyede eklenebilir veya direkt root property bakılır
                  if(val[qKey] !== queryObj[qKey]) { match = false; break; } 
              }
              if(match) results.push({ key: k, value: val });
          } else if (val === queryObj) { results.push({ key: k, value: val }); }
      }
      return results;
  }
  findOne(queryObj) { const res = this.find(queryObj); return res.length > 0 ? res[0] : null; }

  all({ includeMeta = false } = {}) {
    if (!includeMeta) {
      const out = {};
      for (const k of Object.keys(this.data)) if (!this._isExpiredEntry(this.data[k])) out[k] = this.data[k].v;
      return out;
    } else return { ...this.data };
  }
  async clear() { this.data = {}; await this.save(); this._emit("clear"); return true; }
  query(filterFn) { return query(this.data, filterFn); }
  stats() {
    const keys = Object.keys(this.data);
    let fileSize = 0;
    try { fileSize = fs.statSync(this.filePath).size; } catch {}
    const memSize = Buffer.byteLength(JSON.stringify(this.data), "utf-8");
    return { 
        totalKeys: keys.length, 
        keysWithTTL: keys.filter(k => this.data[k].e !== null).length, 
        expiredCount: keys.filter(k => this._isExpiredEntry(this.data[k])).length, 
        fileSize, memSize, autoSave: !!this.autoSave, uptimeMs: Date.now() - this._startTime 
    };
  }
  createCollection(name) { return new UsemiCollection(this, name); }
  collection(name) { return this.createCollection(name); }
}

class UsemiCollection {
  constructor(db, name) { this.db = db; this.name = name; }
  _key(key) { return `${this.name}:${key}`; } // Collection'larda dot notation için ayrım burada yapılır
  
  async set(key, value, ttl = null) { return this.db.set(this._key(key), value, ttl); }
  get(key) { return this.db.get(this._key(key)); }
  has(key) { return this.db.has(this._key(key)); }
  async delete(key) { return this.db.delete(this._key(key)); }
  async push(key, value) { return this.db.push(this._key(key), value); }
  async pushUnique(key, value) { return this.db.pushUnique(this._key(key), value); }
  async pull(key, value) { return this.db.pull(this._key(key), value); }
  
  async add(key, count) { return this.db.add(this._key(key), count); }
  async subtract(key, count) { return this.db.subtract(this._key(key), count); }
  async multiply(key, count) { return this.db.multiply(this._key(key), count); }
  async divide(key, count) { return this.db.divide(this._key(key), count); }
  
  async toggle(key) { return this.db.toggle(this._key(key)); }
  async rename(oldKey, newKey) { return this.db.rename(this._key(oldKey), this._key(newKey)); }
  async random(count = 1) { return this.db.collection(this.name).random(count); }
  
  find(queryObj) {
      const allRes = this.db.find(queryObj);
      return allRes.filter(item => item.key.startsWith(this.name + ":")).map(item => ({
          key: item.key.replace(this.name + ":", ""), value: item.value
      }));
  }
  findOne(queryObj) { const res = this.find(queryObj); return res.length > 0 ? res[0] : null; }
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