const dot = require("./utils.js");

function evaluateCondition(targetValue, condition) {
    // Eğer şart bir obje değilse (direkt eşitlik aranıyorsa)
    if (typeof condition !== 'object' || condition === null) {
        return targetValue === condition; 
    }

    // Şart objesinin içindeki operatörleri ($) bul
    const opKeys = Object.keys(condition).filter(k => k.startsWith('$'));
    
    // Eğer obje ama içinde $ operatörü yoksa (birebir obje eşleşmesi)
    if (opKeys.length === 0) {
        return JSON.stringify(targetValue) === JSON.stringify(condition);
    }

    for (const op of opKeys) {
        const opValue = condition[op];
        switch (op) {
            case '$eq': if (targetValue !== opValue) return false; break;
            case '$ne': if (targetValue === opValue) return false; break;
            case '$gt': if (targetValue <= opValue) return false; break;
            case '$gte': if (targetValue < opValue) return false; break;
            case '$lt': if (targetValue >= opValue) return false; break;
            case '$lte': if (targetValue > opValue) return false; break;
            case '$in': if (!Array.isArray(opValue) || !opValue.includes(targetValue)) return false; break;
            case '$nin': if (Array.isArray(opValue) && opValue.includes(targetValue)) return false; break;
            case '$includes': if (!targetValue || typeof targetValue.includes !== 'function' || !targetValue.includes(opValue)) return false; break;
            case '$startsWith': if (typeof targetValue !== 'string' || !targetValue.startsWith(opValue)) return false; break;
            case '$endsWith': if (typeof targetValue !== 'string' || !targetValue.endsWith(opValue)) return false; break;
            default: break; 
        }
    }
    return true;
}

function matchQuery(itemValue, queryObj) {
    // Eğer direkt string/number aranıyorsa
    if (typeof queryObj !== 'object' || queryObj === null) {
        return itemValue === queryObj;
    }

    const keys = Object.keys(queryObj);
    
    // Eğer sorgu direkt bir operatörse (Örn: db.find({ $gt: 50 }))
    const hasOperatorsAtRoot = keys.length > 0 && keys.every(k => k.startsWith('$'));
    if (hasOperatorsAtRoot) {
        return evaluateCondition(itemValue, queryObj);
    }

    // Eğer sorgu obje özellikleri üzerindeyse (Örn: db.find({ "stats.level": { $gt: 10 } }))
    for (const key of keys) {
        const targetValue = dot.get(itemValue, key); // Utils ile derin veriyi al
        const condition = queryObj[key];

        if (!evaluateCondition(targetValue, condition)) {
            return false; // Biri bile uymazsa ele
        }
    }
    return true;
}

module.exports = { matchQuery };