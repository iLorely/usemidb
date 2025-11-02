# UsemiDB

UsemiDB, Node.js projeleri için **hafif, JSON tabanlı bir key-value database** sistemidir.
TTL (zaman aşımı), otomatik yedekleme, event sistemi ve collection desteği ile **basit ama güçlü bir veri yönetim kütüphanesidir**.

---

## ⚡ Özellikler

- **Key-Value Store**: Basit `set`, `get`, `delete`, `has`, `push` metodları.
- **TTL Desteği**: Her veri için süreli (expiration) kaydı.
- **Otomatik Temizleme**: TTL süresi dolan veriler otomatik olarak silinir.
- **Event Sistemi**: `set`, `delete`, `push`, `expired`, `clear` eventleri.
- **Yedekleme**: DB dosyası bozulursa `.bak` yedeğiyle kurtarma.
- **Collections**: İstediğiniz namespace içinde veri gruplama.
- **Stats**: Dosya boyutu, hafıza kullanımı, TTL istatistikleri.
- **Full JSON Storage**: Tüm veriler JSON formatında saklanır.

---

## 🔹 ÖRNEK KULLANIM

```bash
const UsemiDB = require("usemidb");
const db = new UsemiDB({
  filePath: "./usemidb/usemidb.json", // opsiyonel
  autoSave: true,                      // default true
  autoCleanInterval: 60000             // TTL temizleme aralığı (ms)
});

// set & get
await db.set("user_1", { name: "Serkan" }, 10000); // 10 saniye TTL
const user = db.get("user_1");

// push (array veri)
await db.push("numbers", 42);
await db.push("numbers", 7);
console.log(db.get("numbers")); // [42, 7]

// delete
await db.delete("numbers");

// has
console.log(db.has("numbers")); // false

// all & clear
console.log(db.all());
await db.clear();

// events
db.on("set", (key, value, expiresAt) => {
  console.log(`Key set: ${key} => ${value}`);
});
db.on("expired", (key) => {
  console.log(`Key expired: ${key}`);
});

// stats
console.log(db.stats());
```

---

## 📦 NPM SAYFASI
[UsemiDB NPM Paketi](https://www.npmjs.com/package/usemidb)

---

## 💻 Kurulum

```bash
npm install usemidb
```
