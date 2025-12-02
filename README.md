# UsemiDB 🚀

UsemiDB, Node.js projeleri için **hafif, hızlı ve JSON tabanlı bir key-value database** sistemidir.
TTL (zaman aşımı), otomatik yedekleme, event sistemi, **gelişmiş matematiksel işlemler** ve collection desteği ile **basit ama güçlü bir veri yönetim kütüphanesidir**.

---

## ⚡ Özellikler

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
const UsemiDB = require("usemidb");
const db = new UsemiDB({
  filePath: "./database/data.json", // Kayıt dosyası
  autoSave: true,                   // Otomatik kaydetme
  writeDelay: 100,                  // Performans için yazma gecikmesi (ms)
  autoCleanInterval: 60000          // TTL temizleme aralığı (ms)
});

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

// "users" adında bir koleksiyon oluştur
const users = db.collection("users");

// Veriler otomatik olarak "users:ahmet" şeklinde saklanır
await users.set("ahmet", { age: 25, role: "user" });

// Koleksiyon içinde arama yap
const result = users.find({ age: 25 });
console.log(result);

// Koleksiyona özel matematik işlemi
await users.add("ahmet_para", 500);

// Sadece bu koleksiyondaki verileri çek
console.log(users.all());
```

## 📡 Event (Olay) Sistemi
Veritabanında gerçekleşen değişiklikleri dinleyebilirsiniz.
```bash

db.on("set", (key, value) => {
  console.log(`[KAYIT] ${key} eklendi:`, value);
});

db.on("expired", (key) => {
  console.log(`[SİLİNDİ] ${key} süresi doldu.`);
});

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
```

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