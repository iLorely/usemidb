function query(store, filterFn) {
  const now = Date.now();
  const results = [];

  for (const key of Object.keys(store)) {
    const entry = store[key];
    if (!entry) continue;

    const item = {
      key,
      value: entry.v,
      expiresAt: entry.e
    };

    if (item.expiresAt !== null && now >= item.expiresAt) {
      continue;
    }

    try {
      if (filterFn(item)) {
        results.push(item);
      }
    } catch {}
  }

  return results;
}

module.exports = query;
