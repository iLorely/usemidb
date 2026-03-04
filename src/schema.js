class SchemaValidator {
    constructor() {
        this.rules = {};
    }

    /**
     * Veritabanı için kural (şema) tanımlar.
     * @param {string} keyOrPrefix Kuralın geçerli olacağı anahtar veya koleksiyon adı
     * @param {string|object} expectedType Beklenen veri tipi veya obje şeması
     */
    define(keyOrPrefix, expectedType) {
        this.rules[keyOrPrefix] = expectedType;
    }

    /**
     * Veriyi kurallara göre test eder. Uymuyorsa hata fırlatır.
     */
    validate(key, value) {
        for (const ruleKey in this.rules) {
            const rule = this.rules[ruleKey];

            // 1. Tam Eşleşme (Örn: "bakiye")
            if (key === ruleKey) {
                this._enforce(key, value, rule);
            } 
            // 2. Koleksiyon veya Nokta Notasyonu Eşleşmesi (Örn: "users:1" veya "user.age")
            else if (key.startsWith(ruleKey + ":") || key.startsWith(ruleKey + ".")) {
                
                // Nokta notasyonu ile direkt bir alt özelliğe mi müdahale ediliyor? (Örn: "users:1.age")
                const parts = key.split(".");
                const lastPart = parts[parts.length - 1]; 
                
                if (typeof rule === "object" && rule[lastPart]) {
                    // Sadece o spesifik özelliği kontrol et
                    this._enforce(key, value, rule[lastPart]);
                } else {
                    // Tüm objeyi kontrol et
                    this._enforce(key, value, rule);
                }
            }
        }
        return true;
    }

    _enforce(pathName, val, expected) {
        // Eğer kural basit bir string ise ("number", "string" vb.)
        if (typeof expected === "string") {
            if (val !== undefined && val !== null && !this._checkType(val, expected)) {
                throw new Error(`\n[UsemiDB Güvenlik Kalkanı] 🛡️\nHATA: '${pathName}' verisi '${expected}' tipinde olmalıdır!\nSizin girdiğiniz tip: '${typeof val}'\n`);
            }
        } 
        // Eğer kural bir obje ise ( { age: "number", name: "string" } )
        else if (typeof expected === "object" && val !== null && typeof val === "object" && !Array.isArray(val)) {
            for (const prop in expected) {
                const expectedType = expected[prop];
                const actualValue = val[prop];
                
                if (actualValue !== undefined && actualValue !== null && !this._checkType(actualValue, expectedType)) {
                    throw new Error(`\n[UsemiDB Güvenlik Kalkanı] 🛡️\nHATA: '${pathName}.${prop}' verisi '${expectedType}' tipinde olmalıdır!\nSizin girdiğiniz tip: '${typeof actualValue}'\n`);
                }
            }
        }
    }

    _checkType(val, type) {
        if (type === "array") return Array.isArray(val);
        if (type === "object") return typeof val === "object" && val !== null && !Array.isArray(val);
        return typeof val === type;
    }
}

module.exports = SchemaValidator;