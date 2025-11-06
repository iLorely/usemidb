class NamespaceManager {
  constructor(db) {
    this.db = db;
  }

  use(name) {
    return {
      set: async (key, value, ttl) => {
        return this.db.set(`${name}:${key}`, value, ttl);
      },
      get: (key) => {
        return this.db.get(`${name}:${key}`);
      },
      delete: async (key) => {
        return this.db.delete(`${name}:${key}`);
      },
      has: (key) => {
        return this.db.has(`${name}:${key}`);
      },
      all: () => {
        const raw = this.db.all();
        const out = {};
        for (const k of Object.keys(raw)) {
          if (k.startsWith(name + ":")) {
            const trimmed = k.replace(name + ":", "");
            out[trimmed] = raw[k];
          }
        }
        return out;
      },
      query: (fn) => {
        const now = Date.now();
        const raw = this.db.all({ includeMeta: true });
        const out = {};

        for (const k of Object.keys(raw)) {
          if (!k.startsWith(name + ":")) continue;

          const trimmed = k.replace(name + ":", "");
          const entry = raw[k];

          if (entry.e !== null && now >= entry.e) continue;

          const item = {
            key: trimmed,
            value: entry.v,
            expiresAt: entry.e
          };

          try {
            if (fn(item)) {
              out[trimmed] = entry.v;
            }
          } catch {}
        }

        return out;
      },
    };
  }
}

module.exports = NamespaceManager;
