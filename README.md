# UsemiDB 🚀

UsemiDB, Node.js projeleri için **hafif, yüksek performanslı ve JSON tabanlı bir key-value database** sistemidir.

**v0.1.4 Güncellemesi ile artık Nokta Notasyonu (Dot Notation) destekliyor!** 🎯
İç içe geçmiş verileri (Nested Objects) yönetmek, matematiksel işlemler yapmak, yedek almak ve gelişmiş aramalar yapmak hiç bu kadar kolay olmamıştı.

---

## ⚡ Özellikler

- **🎯 Dot Notation**: `user.settings.theme` gibi iç içe verilere doğrudan erişim ve güncelleme.
- **🛡️ Snapshot & Restore**: İstediğiniz an veritabanının yedeğini alın (`backup`) ve geri dönün (`restore`).
- **🔎 Gelişmiş Arama**: `find` ve `findOne` ile obje özelliklerine göre hızlıca veri bulun.
- **✖️➗ Matematik Seti**: `add`, `subtract`, `multiply`, `divide` işlemlerini nokta notasyonu ile yapın.
- **✨ Akıllı Listeler**: `pushUnique` ile tekrarsız ekleme ve `pull` ile listeden silme.
- **🎲 Random**: Veritabanından rastgele veri çekme.
- **⚡ Performans**: `writeDelay` (Debounce) sistemi ile diski yormadan toplu yazma.
- **⏳ TTL Desteği**: Verilere ömür biçin, süresi dolunca otomatik silinsin.
- **📁 Collections**: Verilerinizi namespace (koleksiyon) bazlı gruplandırın.

---

## 🔹 Kullanım Örnekleri
1. Kurulum & Ayarlar
```bash
const UsemiDB = require("usemidb");

const db = new UsemiDB({
  filePath: "./database/data.json", // Veri dosyası
  backupPath: "./database/backups", // Yedek klasörü
  writeDelay: 100,                  // Performans için yazma gecikmesi (ms)
  autoCleanInterval: 60000          // TTL kontrol aralığı (ms)
});
```

2. 🎯 Dot Notation (Nokta Notasyonu) - YENİ!
```bash
// İç içe veri kaydetme
await db.set("user_1.settings.theme", "dark");
await db.set("user_1.settings.notifications", true);

// Veriyi okuma
const theme = db.get("user_1.settings.theme");
console.log(theme); // "dark"

// Tüm objeyi de çekebilirsiniz
console.log(db.get("user_1"));
// { settings: { theme: "dark", notifications: true } }
```

3. ✖️ Matematiksel İşlemler
```bash
await db.set("user_1.stats.xp", 100);

// Ekleme & Çıkarma
await db.add("user_1.stats.xp", 50);       // 150
await db.subtract("user_1.stats.xp", 10);  // 140

// Çarpma & Bölme
await db.multiply("user_1.stats.xp", 2);   // 280
await db.divide("user_1.stats.xp", 2);     // 140
```

4. ✨ Akıllı Liste (Array) Yönetimi
```bash
// Normal Ekleme
await db.push("etiketler", "nodejs");

// ⭐️ Unique Push (Tekrarsız Ekleme)
// Eğer "nodejs" listede varsa tekrar eklemez!
await db.pushUnique("etiketler", "nodejs");

// İç içe listelere erişim
await db.push("user_1.inventory", "sword");

// Listeden Silme (Pull)
await db.pull("user_1.inventory", "sword");
```

5. 🛡️ Yedekleme & Geri Yükleme (Snapshot)
```bash
// Kritik bir işlemden önce yedek al
await db.backup("guvenli-nokta-v1");
console.log("Yedek alındı!");

// ...Veriler bozulursa veya silinirse...

// Yedeği geri yükle
await db.restore("guvenli-nokta-v1");
console.log("Veriler kurtarıldı.");
```

6. 🔎 Arama & Rastgele Veri
```bash
// Obje özelliklerine göre arama
const admins = db.find({ role: "admin" });

// İsme göre tek kişi bul
const user = db.findOne({ username: "Lorely" });

// Rastgele veri çek (Çekilişler için)
const winner = await db.random();
```
7. 🗂️ Koleksiyonlar (Namespaces)
```bash
const economy = db.collection("economy");

// Sadece 'economy' koleksiyonuna yazar
await economy.set("user_1", 500);

// Koleksiyon içinde de nokta notasyonu çalışır
await economy.add("user_1", 50);
```

📡 Event Sistemi
```bash
db.on("set", (key, value) => {
  console.log(`[KAYIT] ${key} = ${JSON.stringify(value)}`);
});

db.on("expired", (key) => {
  console.log(`[TTL] ${key} süresi doldu ve silindi.`);
});
```

---

## 💻 Kurulum

```bash
npm install usemidb
```

---

# 🔗 Linkler
## 📦 NPM Sayfası
[UsemiDB NPM Paketi](https://www.npmjs.com/package/usemidb)

---

## 🐈 Github Sayfası
[UsemiDB Github](https://github.com/iLorely/usemidb)