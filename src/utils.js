/**
 * Verilen objenin derinliklerine nokta notasyonu ile ulaşır.
 * Örn: get(obj, "settings.theme.color")
 */
function get(obj, path) {
  if (!path || typeof path !== "string") return undefined;
  const keys = path.split(".");
  let current = obj;

  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
}

/**
 * Verilen objenin derinliklerine nokta notasyonu ile veri yazar.
 * Örn: set(obj, "settings.theme", "dark")
 * Olmayan alt objeleri otomatik oluşturur.
 */
function set(obj, path, value) {
  if (!path || typeof path !== "string") return false;
  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    // Eğer o anahtar yoksa veya obje değilse, yeni obje oluştur
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return true;
}

/**
 * Verilen objenin derinliklerindeki bir anahtarı siler.
 */
function del(obj, path) {
  if (!path || typeof path !== "string") return false;
  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined) return false; // Yol zaten yok
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  if (current && Object.prototype.hasOwnProperty.call(current, lastKey)) {
    delete current[lastKey];
    return true;
  }
  return false;
}

/**
 * Verilen objenin derinliklerinde anahtar var mı kontrol eder.
 */
function has(obj, path) {
  return get(obj, path) !== undefined;
}

module.exports = { get, set, del, has };