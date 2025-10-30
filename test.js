// test.js
const UsemiDB = require("./index");
(async () => {
  const db = new UsemiDB({
    // opsiyonel:
    // filePath: "./data/mydb.json",
    // autoCleanInterval: 5000, // TTL cleaner 5s
    // autoSave: true
  });

  // event örnekleri
  db.on("set", (key, value, expiresAt) => {
    console.log("EVENT set", key, value, expiresAt ? new Date(expiresAt).toISOString() : null);
  });
  db.on("push", (key, value) => console.log("EVENT push", key, value));
  db.on("delete", (key, oldValue) => console.log("EVENT delete", key, oldValue));
  db.on("expired", (key) => console.log("EVENT expired", key));
  db.on("clear", () => console.log("EVENT clear"));

  // set with TTL 5 seconds
  await db.set("temp", { msg: "geçici" }, 5000);
  console.log("temp(set):", db.get("temp"));

  // push example
  await db.push("logs", "ilk log");
  await db.push("logs", "ikinci log");
  console.log("logs:", db.get("logs"));

  // check has
  console.log("has temp?:", db.has("temp"));

  // wait 6s to see TTL expire
  await new Promise(res => setTimeout(res, 6000));
  console.log("temp(after):", db.get("temp")); // null

  // all
  console.log("all:", db.all());

  // delete
  await db.set("a", 1);
  console.log("a:", db.get("a"));
  await db.delete("a");
  console.log("a:", db.get("a"));

  // clear
  await db.set("x", 10);
  console.log("before clear:", db.all());
  await db.clear();
  console.log("after clear:", db.all());
})();
