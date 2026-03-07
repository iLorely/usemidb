const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";

// Kullanıcının girdiği şifreyi AES-256 için tam 32 byte'lık (256 bit) güvenli bir anahtara dönüştürür.
function getHashKey(password) {
    return crypto.createHash("sha256").update(String(password)).digest();
}

/**
 * Metni şifreler
 */
function encrypt(text, password) {
    const iv = crypto.randomBytes(16); // Rastgele bir vektör oluştur (Her şifrelemede değişir, güvenliği artırır)
    const key = getHashKey(password);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    // IV ile şifrelenmiş metni araya ':' koyarak birleştir (Çözerken IV lazım olacak)
    return iv.toString("hex") + ":" + encrypted;
}

/**
 * Şifrelenmiş metni çözer
 */
function decrypt(encryptedText, password) {
    const parts = encryptedText.split(":");
    const iv = Buffer.from(parts.shift(), "hex");
    const encryptedData = parts.join(":");
    const key = getHashKey(password);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
}

module.exports = { encrypt, decrypt };