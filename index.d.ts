declare module "usemidb" {

  interface UsemiDBOptions {
    filePath?: string;
    autoSave?: boolean;
    autoCleanInterval?: number; // ms
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

  type EventName = "set" | "delete" | "push" | "expired" | "clear";

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
    all<T = any>(options?: AllOptions): Record<string, T> | Record<string, StoredEntry<T>>;
    clear(): Promise<boolean>;

    /** ✅ stats **/
    stats(): Stats;

    /** ✅ Events */
    on(eventName: EventName, callback: EventCallback): () => void;
    off(eventName: EventName, callback: EventCallback): void;

    /** ✅ Clean expired */
    cleanExpired(): Promise<string[]>;

    /** ✅ Namespaced collections */
    collection<T = any>(namespace: string): CollectionOps<T>;
  }

  export = UsemiDB;
}

