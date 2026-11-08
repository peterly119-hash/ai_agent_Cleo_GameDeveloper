/** Minimal storage interface so saves are testable without a browser. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

interface Envelope<T> {
  version: number;
  savedAt: string;
  data: T;
}

/** Returns browser localStorage when usable, otherwise in-memory storage. */
export function defaultStorage(): KeyValueStorage {
  try {
    const ls = globalThis.localStorage;
    const probe = '__qw_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return new MemoryStorage();
  }
}

/**
 * Versioned JSON save slot. A save with a different version is passed to `migrate`
 * (or discarded when no migration is given). Corrupt saves never throw.
 */
export class SaveStore<T> {
  constructor(
    private readonly key: string,
    private readonly version: number,
    private readonly storage: KeyValueStorage = defaultStorage(),
    private readonly migrate?: (old: unknown, oldVersion: number) => T | null,
  ) {}

  save(data: T): void {
    const env: Envelope<T> = { version: this.version, savedAt: new Date().toISOString(), data };
    this.storage.setItem(this.key, JSON.stringify(env));
  }

  load(): T | null {
    const raw = this.storage.getItem(this.key);
    if (raw === null) return null;
    try {
      const env = JSON.parse(raw) as Envelope<unknown>;
      if (env.version === this.version) return env.data as T;
      return this.migrate ? this.migrate(env.data, env.version) : null;
    } catch {
      return null;
    }
  }

  clear(): void {
    this.storage.removeItem(this.key);
  }
}
