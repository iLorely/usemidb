# UsemiDB 🚀

UsemiDB, Node.js projeleri için **hafif, yüksek performanslı ve JSON tabanlı bir key-value database** sistemidir.

**v0.1.4 Güncellemesi ile artık Nokta Notasyonu (Dot Notation) destekliyor!** 🎯
İç içe geçmiş verileri (Nested Objects) yönetmek, matematiksel işlemler yapmak, yedek almak ve gelişmiş aramalar yapmak hiç bu kadar kolay olmamıştı.

---

## ⚡ Özellikler

<<<<<<< HEAD
- **Key-Value Store**: Basit `set`, `get`, `delete`, `has`, `push` metodları.
- **Gelişmiş Arama**: `find` ve `findOne` ile veriler içinde obje tabanlı sorgulama.
- **Matematiksel İşlemler**: `add`, `subtract`, `multiply`, `divide` ile tam kapsamlı işlem yeteneği.
- **Rastgele Veri (Random)**: Veritabanından rastgele veri veya veri grubu çekme.
- **Akıllı Liste Yönetimi**: `push` ile ekle, `pull` ile listeden veri sil.
- **Toggle & Rename**: Boolean değerleri tersine çevirme ve anahtar adı değiştirme.
- **Performans**: `writeDelay` ile disk yazma işlemleri optimize edilmiştir (Debounce).
- **TTL Desteği**: Her veri için süreli (expiration) kayıt imkanı.
- **Otomatik Temizleme**: TTL süresi dolan veriler otomatik olarak silinir.
- **Event Sistemi**: `set`, `delete`, `push`, `expired`, `clear` ve `rename` eventleri.
- **Yedekleme**: DB dosyası bozulursa `.bak` yedeğiyle otomatik kurtarma.
- **Collections**: Verileri gruplamak için gelişmiş namespace desteği.

---

## 🔹 Örnek Kullanım

### HIZLI BAŞLANGIÇ

```javascript
=======
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
>>>>>>> 9c01b8a (feat: Add Dot Notation support via utils.js)
const UsemiDB = require("usemidb");

const db = new UsemiDB({
  filePath: "./usemidb/data.json", // Veri dosyası
  backupPath: "./usemidb/backups", // Yedek klasörü
  writeDelay: 100,                  // Performans için yazma gecikmesi (ms)
  autoCleanInterval: 60000          // TTL kontrol aralığı (ms)
});
```

<<<<<<< HEAD
(async () => {
    // 🟢 Basit Veri Kaydı (TTL: 10 saniye)
    await db.set("user_1", { name: "Lorely", role: "admin" }, 10000);
    
    const user = db.get("user_1");
    console.log(user); // { name: "Lorely", role: "admin" }

    // 🟢 Matematiksel İşlemler (Topla, Çıkar, Çarp, Böl)
    await db.set("bakiye", 100);
    await db.add("bakiye", 50);      // 150
    await db.subtract("bakiye", 20); // 130
    await db.multiply("bakiye", 2);  // 260 (2 ile çarp)
    await db.divide("bakiye", 2);    // 130 (2'ye böl)
    console.log(db.get("bakiye"));   // 130

    // 🟢 Gelişmiş Arama (Find & FindOne)
    // Rolü 'admin' olanları bul
    const admins = db.find({ role: "admin" });
    console.log(admins); // [{ key: "user_1", value: { ... } }]

    // İsmi 'Lorely' olan tek bir kişiyi bul
    const lorely = db.findOne({ name: "Lorely" });
    console.log(lorely);

    // 🟢 Liste (Array) İşlemleri
    await db.push("etiketler", "javascript");
    await db.push("etiketler", "nodejs");
    await db.push("etiketler", "python");
    
    // Listeden eleman silme (pull)
    await db.pull("etiketler", "python"); 
    console.log(db.get("etiketler")); // ["javascript", "nodejs"]

    // 🟢 Rastgele Veri Çekme (Random)
    // Çekilişler veya rastgele eşya sistemleri için idealdir.
    const randomUser = await db.random(); 
    console.log(randomUser); // Tek bir rastgele değer döner.

    const luckyWinners = await db.random(3);
    console.log(luckyWinners); // Rastgele 3 değerden oluşan bir liste döner.

    // 🟢 Toggle (Aç/Kapat)
    // "bakim_modu" yoksa oluşturur ve true yapar, varsa tersine çevirir.
    await db.toggle("bakim_modu"); 
    console.log(db.get("bakim_modu")); // true

    // 🟢 Rename (Anahtar Adı Değiştirme)
    await db.rename("user_1", "admin_1");
    console.log(db.get("admin_1")); // { name: "Lorely", ... }
})();
```

## 🗂️ Collection (Namespace) Kullanımı
Verilerinizi kategorize etmek (örn: kullanıcılar, sunucular, ayarlar) için collection sistemini kullanabilirsiniz.
```bash
=======
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
>>>>>>> 9c01b8a (feat: Add Dot Notation support via utils.js)

4. ✨ Akıllı Liste (Array) Yönetimi
```bash
// Normal Ekleme
await db.push("etiketler", "nodejs");

<<<<<<< HEAD
// Veriler otomatik olarak "users:ahmet" şeklinde saklanır
await users.set("ahmet", { age: 25, role: "user" });

// Koleksiyon içinde arama yap
const result = users.find({ age: 25 });
console.log(result);
=======
// ⭐️ Unique Push (Tekrarsız Ekleme)
// Eğer "nodejs" listede varsa tekrar eklemez!
await db.pushUnique("etiketler", "nodejs"); 
>>>>>>> 9c01b8a (feat: Add Dot Notation support via utils.js)

// İç içe listelere erişim
await db.push("user_1.inventory", "sword");

<<<<<<< HEAD
// Sadece bu koleksiyondaki verileri çek
console.log(users.all());
```

## 📡 Event (Olay) Sistemi
Veritabanında gerçekleşen değişiklikleri dinleyebilirsiniz.
```bash
=======
// Listeden Silme (Pull)
await db.pull("user_1.inventory", "sword");
```

5. 🛡️ Yedekleme & Geri Yükleme (Snapshot)
```bash
// Kritik bir işlemden önce yedek al
await db.backup("guvenli-nokta-v1");
console.log("Yedek alındı!");
>>>>>>> 9c01b8a (feat: Add Dot Notation support via utils.js)

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
<<<<<<< HEAD

db.on("rename", (oldKey, newKey) => {
  console.log(`[DEĞİŞTİ] ${oldKey} -> ${newKey} oldu.`);
});
```

## 📊 İstatistikler
```bash

console.log(db.stats());
/* Çıktı:
{
  totalKeys: 15,
  keysWithTTL: 2,
  expiredCount: 0,
  fileSize: 1024,
  memSize: 512,
  uptimeMs: 5200
}
*/
=======
>>>>>>> 9c01b8a (feat: Add Dot Notation support via utils.js)
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