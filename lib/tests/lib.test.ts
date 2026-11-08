import { describe, expect, it } from 'vitest';
import { AudioManager, FpsSampler, HighScores, InputMap, MemoryStorage, Rng, SaveStore, type QwTestHook } from '../src/index';

describe('Rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true);
  });

  it('int stays in range and shuffle keeps elements', () => {
    const r = new Rng(1);
    for (let i = 0; i < 200; i++) {
      const n = r.int(3, 6);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(6);
    }
    expect(r.shuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4]);
  });

  it('weighted never picks zero-weight items', () => {
    const r = new Rng(7);
    for (let i = 0; i < 100; i++) expect(r.weighted(['a', 'b'], (x) => (x === 'a' ? 0 : 1))).toBe('b');
  });

  it('state round-trips', () => {
    const r = new Rng(9);
    r.next();
    const s = r.getState();
    const expected = r.next();
    r.setState(s);
    expect(r.next()).toBe(expected);
  });
});

describe('SaveStore', () => {
  it('saves, loads and clears', () => {
    const store = new SaveStore<{ gold: number }>('k', 1, new MemoryStorage());
    expect(store.load()).toBeNull();
    store.save({ gold: 5 });
    expect(store.load()).toEqual({ gold: 5 });
    store.clear();
    expect(store.load()).toBeNull();
  });

  it('migrates old versions and survives corrupt data', () => {
    const storage = new MemoryStorage();
    new SaveStore<{ g: number }>('k', 1, storage).save({ g: 2 });
    const v2 = new SaveStore<{ gold: number }>('k', 2, storage, (old) => ({ gold: (old as { g: number }).g }));
    expect(v2.load()).toEqual({ gold: 2 });
    storage.setItem('k', '{not json');
    expect(v2.load()).toBeNull();
  });
});

describe('HighScores', () => {
  it('keeps the top N sorted and persists', () => {
    const storage = new MemoryStorage();
    const hs = new HighScores('g', 2, storage);
    hs.submit({ name: 'a', score: 10, date: 'd' });
    hs.submit({ name: 'b', score: 30, date: 'd' });
    expect(hs.submit({ name: 'c', score: 5, date: 'd' })).toBe(-1);
    expect(hs.top().map((e) => e.score)).toEqual([30, 10]);
    expect(new HighScores('g', 2, storage).best()?.name).toBe('b');
    expect(hs.isHighScore(11)).toBe(true);
    expect(hs.isHighScore(9)).toBe(false);
  });
});

describe('InputMap', () => {
  it('maps keys to actions with justPressed semantics', () => {
    const input = new InputMap({ confirm: ['Enter', 'Space'], back: ['Escape'] });
    input.keyDown('Space');
    expect(input.isDown('confirm')).toBe(true);
    expect(input.justPressed('confirm')).toBe(true);
    input.endFrame();
    input.keyDown('Space');
    expect(input.justPressed('confirm')).toBe(false);
    input.keyUp('Space');
    expect(input.isDown('confirm')).toBe(false);
  });

  it('supports rebinding and listeners', () => {
    const input = new InputMap({ confirm: ['Enter'] });
    const seen: string[] = [];
    input.onAction((a) => seen.push(a));
    input.rebind('confirm', ['KeyE']);
    input.keyDown('Enter');
    input.keyDown('KeyE');
    expect(seen).toEqual(['confirm']);
  });
});

describe('AudioManager', () => {
  it('is a safe no-op without an AudioContext and tracks mute', () => {
    const audio = new AudioManager();
    audio.register('hit', { wave: 'square', freq: [400, 100], duration: 0.1, volume: 0.5 });
    expect(audio.has('hit')).toBe(true);
    expect(audio.play('hit')).toBe(false);
    expect(audio.toggleMute()).toBe(true);
  });
});

describe('FpsSampler', () => {
  it('records a sample per window', () => {
    const hook = { fps: [] as number[] } as unknown as QwTestHook;
    const s = new FpsSampler(hook, 500);
    for (let i = 0; i < 30; i++) s.tick(1000 / 60);
    expect(hook.fps.length).toBe(1);
    expect(hook.fps[0]).toBeGreaterThanOrEqual(59);
  });
});
