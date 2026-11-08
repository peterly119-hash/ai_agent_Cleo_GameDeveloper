import { SaveStore, type KeyValueStorage, defaultStorage } from './save';

export interface ScoreEntry {
  name: string;
  score: number;
  date: string;
  /** Free-form extras, e.g. faction or round reached. */
  meta?: Record<string, string | number>;
}

/** Persistent top-N high-score table, sorted descending. */
export class HighScores {
  private readonly store: SaveStore<ScoreEntry[]>;
  private entries: ScoreEntry[];

  constructor(gameSlug: string, private readonly maxEntries = 10, storage: KeyValueStorage = defaultStorage()) {
    this.store = new SaveStore<ScoreEntry[]>(`qw:${gameSlug}:scores`, 1, storage);
    this.entries = this.store.load() ?? [];
  }

  /** Adds an entry; returns its 0-based rank, or -1 if it didn't make the table. */
  submit(entry: ScoreEntry): number {
    const list = [...this.entries, entry].sort((a, b) => b.score - a.score).slice(0, this.maxEntries);
    const rank = list.indexOf(entry);
    this.entries = list;
    this.store.save(list);
    return rank;
  }

  isHighScore(score: number): boolean {
    if (this.entries.length < this.maxEntries) return true;
    const last = this.entries[this.entries.length - 1];
    return last !== undefined && score > last.score;
  }

  top(): readonly ScoreEntry[] {
    return this.entries;
  }

  best(): ScoreEntry | undefined {
    return this.entries[0];
  }
}
