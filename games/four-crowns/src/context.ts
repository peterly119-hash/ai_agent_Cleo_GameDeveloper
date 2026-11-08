import { AudioManager, FpsSampler, HighScores, SaveStore, installTestHook, type QwTestHook } from '@questwright/lib';
import { registerSfx } from './sfx';

/** App-wide singletons shared by scenes. */
export interface Settings {
  muted: boolean;
  speed: number;
}

const settingsStore = new SaveStore<Settings>('qw:four-crowns:settings', 1);

export const ctx = {
  hook: installTestHook() as QwTestHook,
  audio: new AudioManager(),
  scores: new HighScores('four-crowns', 8),
  settings: settingsStore.load() ?? { muted: false, speed: 1 },
  saveSettings(): void {
    settingsStore.save(this.settings);
  },
  /** Bumped on meaningful progress (QA soft-lock detection). */
  progress(): void {
    this.hook.progress += 1;
  },
};

ctx.audio.setMuted(ctx.settings.muted);
registerSfx(ctx.audio);

export const fps = new FpsSampler(ctx.hook);

/** Unlock audio on the first user gesture (browsers block autoplay). */
export function installAudioUnlock(): void {
  const unlock = (): void => ctx.audio.unlock();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}
