declare module "usemidb" {

  interface UsemiDBOptions {
    filePath?: string;
    backupPath?: string;
    autoSave?: boolean;
    autoCleanInterval?: number;
    writeDelay?: number;
  }

  interface StoredEntry<T = any> {
    v: T;
    e: number | null;
  }

  interface Stats {
    totalKeys: number;
    keysWithTTL: number;
    expiredCount: number;
    fileSize: number;
    memSize: number;
    autoSave: boolean;
    uptimeMs: number;
  }

  interface QueryResult<T = any> {
    key: string;
    value: T;
  }

  type EventName = "set" | "delete" | "push" | "pull" | "expired" | "clear" | "rename";
  type EventCallback = (...args: any[]) => void;

  interface AllOptions {
    includeMeta?: boolean;
  }

  type FilterOperators<T> = {
    $eq?: T;                   // Eşittir
    $ne?: T;                   // Eşit Değildir
    $gt?: number | string;     // Büyüktür
    $gte?: number | string;    // Büyük veya Eşittir
    $lt?: number | string;     // Küçüktür
    $lte?: number | string;    // Küçük veya Eşittir
    $in?: T[];                 // Dizi İçindedir
    $nin?: T[];                // Dizi İçinde Değildir
    $includes?: any;           // Metin/Dizi içeriyorsa
    $startsWith?: string;      // Şununla başlıyorsa
    $endsWith?: string;        // Şununla bitiyorsa
  };

  // Dinamik Query Tipi (Hem normal eşleşme hem operatör)
  type QueryParam<T = any> = {
    [key: string]: any | FilterOperators<any>;
  } | FilterOperators<any> | any;

  type SchemaTypes = "string" | "number" | "boolean" | "array" | "object";
  interface SchemaDefinition {
      [key: string]: SchemaTypes;
  }

  interface CollectionOps<T = any> {
    set(id: string, data: T, ttlMs?: number): Promise<boolean>;
    get(id: string): T | null;
    has(id: string): boolean;
    delete(id: string): Promise<boolean>;
    push(id: string, value: any): Promise<any[]>;
    pushUnique(id: string, value: any): Promise<any[] | false>;
    pull(id: string, value: any): Promise<boolean>;
    add(id: string, count: number): Promise<number>;
    subtract(id: string, count: number): Promise<number>;
    multiply(id: string, count: number): Promise<number>;
    divide(id: string, count: number): Promise<number>;
    toggle(id: string): Promise<boolean>;
    rename(oldId: string, newId: string): Promise<boolean>;
    random(count?: number): Promise<T | T[] | null>;
    
    // Arama tipleri güncellendi
    find(query: QueryParam<T>): QueryResult<T>[];
    findOne(query: QueryParam<T>): QueryResult<T> | null;
    
    all(): Record<string, T>;
    clear(): Promise<boolean>;
  }

  class SchemaValidator {
      /**
       * Veritabanı için veri doğrulama kuralı tanımlar.
       * @example db.schema.define("bakiye", "number");
       * @example db.schema.define("users", { name: "string", age: "number" });
       */
      define(keyOrPrefix: string, typeOrSchema: SchemaTypes | SchemaDefinition): void;
  }

  class UsemiDB {
    constructor(options?: UsemiDBOptions);
    set<T = any>(key: string, value: T, ttlMs?: number): Promise<boolean>;
    get<T = any>(key: string): T | null;
    has(key: string): boolean;
    delete(key: string): Promise<boolean>;
    push<T = any>(key: string, value: T): Promise<T[]>;
    pushUnique<T = any>(key: string, value: T): Promise<T[] | false>;
    pull<T = any>(key: string, value: T): Promise<boolean>;
    add(key: string, count: number): Promise<number>;
    subtract(key: string, count: number): Promise<number>;
    multiply(key: string, count: number): Promise<number>;
    divide(key: string, count: number): Promise<number>;
    toggle(key: string): Promise<boolean>;
    rename(oldKey: string, newKey: string): Promise<boolean>;
    random<T = any>(count?: number): Promise<T | T[] | null>;
    
    /** * Gelişmiş arama yapar.
     * @example db.find({ "stats.level": { $gt: 10 } })
     * @example db.find({ "role": { $in: ["admin", "mod"] } })
     */
    find<T = any>(query: QueryParam<T>): QueryResult<T>[];
    findOne<T = any>(query: QueryParam<T>): QueryResult<T> | null;
    
    backup(name: string): Promise<string>;
    restore(name: string): Promise<boolean>;
    all<T = any>(options?: AllOptions): Record<string, T> | Record<string, StoredEntry<T>>;
    clear(): Promise<boolean>;
    stats(): Stats;
    on(eventName: EventName, callback: EventCallback): () => void;
    off(eventName: EventName, callback: EventCallback): void;
    cleanExpired(): Promise<string[]>;
    collection<T = any>(namespace: string): CollectionOps<T>
    
    schema: SchemaValidator;
  }

  export = UsemiDB;
}