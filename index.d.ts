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
    find(query: Partial<T> | any): QueryResult<T>[];
    findOne(query: Partial<T> | any): QueryResult<T> | null;
    all(): Record<string, T>;
    clear(): Promise<boolean>;
  }

  class UsemiDB {
    constructor(options?: UsemiDBOptions);

    /** * Veri kaydeder. Nokta notasyonu (.) destekler.
     * @example db.set("user.settings.theme", "dark")
     */
    set<T = any>(key: string, value: T, ttlMs?: number): Promise<boolean>;

    /** * Veri çeker. Nokta notasyonu (.) destekler.
     * @example db.get("user.settings.theme")
     */
    get<T = any>(key: string): T | null;

    /** * Veri var mı kontrol eder. Nokta notasyonu (.) destekler.
     */
    has(key: string): boolean;

    /** * Veriyi siler. Nokta notasyonu (.) destekler.
     */
    delete(key: string): Promise<boolean>;
    
    /** * Array'e veri ekler. Nokta notasyonu (.) destekler.
     */
    push<T = any>(key: string, value: T): Promise<T[]>;
    
    pushUnique<T = any>(key: string, value: T): Promise<T[] | false>;
    pull<T = any>(key: string, value: T): Promise<boolean>;

    /** * Matematik işlemleri. Nokta notasyonu (.) destekler.
     * @example db.add("user.wallet.gold", 50)
     */
    add(key: string, count: number): Promise<number>;
    subtract(key: string, count: number): Promise<number>;
    multiply(key: string, count: number): Promise<number>;
    divide(key: string, count: number): Promise<number>;

    toggle(key: string): Promise<boolean>;
    rename(oldKey: string, newKey: string): Promise<boolean>;
    random<T = any>(count?: number): Promise<T | T[] | null>;
    find<T = any>(query: Partial<T> | any): QueryResult<T>[];
    findOne<T = any>(query: Partial<T> | any): QueryResult<T> | null;
    backup(name: string): Promise<string>;
    restore(name: string): Promise<boolean>;

    all<T = any>(options?: AllOptions): Record<string, T> | Record<string, StoredEntry<T>>;
    clear(): Promise<boolean>;
    stats(): Stats;
    on(eventName: EventName, callback: EventCallback): () => void;
    off(eventName: EventName, callback: EventCallback): void;
    cleanExpired(): Promise<string[]>;
    collection<T = any>(namespace: string): CollectionOps<T>;
  }

  export = UsemiDB;
}