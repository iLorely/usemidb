declare module "usemidb" {

  interface UsemiDBOptions {
    filePath?: string;
    autoSave?: boolean;
    autoCleanInterval?: number; // ms
    /**
     * Performans için yazma gecikmesi (ms).
     * Varsayılan: 100ms
     */
    writeDelay?: number;
  }

  interface StoredEntry<T = any> {
    v: T;
    e: number | null; // expiresAt timestamp
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

  // "rename" olayını da ekledik
  type EventName = "set" | "delete" | "push" | "pull" | "expired" | "clear" | "rename";

  type EventCallback = (...args: any[]) => void;

  interface AllOptions {
    includeMeta?: boolean;
  }


  /** ✅ Collection API */
  interface CollectionOps<T = any> {
    set(id: string, data: T, ttlMs?: number): Promise<boolean>;
    get(id: string): T | null;
    has(id: string): boolean;
    delete(id: string): Promise<boolean>;
    push(id: string, value: any): Promise<any[]>;
    pull(id: string, value: any): Promise<boolean>;
    add(id: string, count: number): Promise<number>;
    subtract(id: string, count: number): Promise<number>;
    
    /** Bir anahtarın boolean değerini tersine çevirir (true <-> false) */
    toggle(id: string): Promise<boolean>;

    /** Bir anahtarın adını değiştirir */
    rename(oldId: string, newId: string): Promise<boolean>;

    all(): Record<string, T>;
    clear(): Promise<boolean>;
  }


  class UsemiDB {
    constructor(options?: UsemiDBOptions);

    set<T = any>(key: string, value: T, ttlMs?: number): Promise<boolean>;
    get<T = any>(key: string): T | null;
    has(key: string): boolean;
    delete(key: string): Promise<boolean>;
    push<T = any>(key: string, value: T): Promise<T[]>;
    pull<T = any>(key: string, value: T): Promise<boolean>;
    add(key: string, count: number): Promise<number>;
    subtract(key: string, count: number): Promise<number>;

    /**
     * Bir anahtarın değerini tersine çevirir (true -> false, false -> true).
     * Eğer değer yoksa 'true' olarak oluşturur.
     */
    toggle(key: string): Promise<boolean>;

    /**
     * Bir anahtarın ismini değiştirir.
     * @throws Yeni anahtar ismi zaten varsa hata fırlatır.
     */
    rename(oldKey: string, newKey: string): Promise<boolean>;

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