import type { AudioManager, SoundRecipe } from '@questwright/lib';

/** Synthesised SFX for every GDD §10 event (ASSETS.md: "Questwright (generated)"). */
export const SFX: Record<string, SoundRecipe> = {
  click: { wave: 'triangle', freq: [660, 520], duration: 0.06, volume: 0.35 },
  select: { wave: 'triangle', freq: [520, 780], duration: 0.08, volume: 0.35 },
  invalid: { wave: 'square', freq: [180, 140], duration: 0.12, volume: 0.25 },
  place: { wave: 'square', freq: [220, 110], duration: 0.14, volume: 0.4, noise: 0.15 },
  upgrade: { wave: 'triangle', freq: [440, 990], duration: 0.22, volume: 0.4 },
  horn: { wave: 'sawtooth', freq: [140, 210], duration: 0.6, volume: 0.3 },
  spawn: { wave: 'sine', freq: [300, 360], duration: 0.05, volume: 0.08 },
  hit: { wave: 'square', freq: [160, 80], duration: 0.05, volume: 0.12, noise: 0.25 },
  arrow: { wave: 'triangle', freq: [900, 500], duration: 0.05, volume: 0.08 },
  death: { wave: 'sawtooth', freq: [200, 60], duration: 0.16, volume: 0.14, noise: 0.2 },
  enemyDeath: { wave: 'square', freq: [700, 200], duration: 0.1, volume: 0.12, noise: 0.15 },
  crownHit: { wave: 'sawtooth', freq: [120, 50], duration: 0.35, volume: 0.45, noise: 0.35 },
  firestorm: { wave: 'sawtooth', freq: [90, 400], duration: 0.5, volume: 0.4, noise: 0.5 },
  drums: { wave: 'sine', freq: [90, 60], duration: 0.3, volume: 0.6, noise: 0.1 },
  rebirth: { wave: 'triangle', freq: [300, 1200], duration: 0.6, volume: 0.35 },
  slam: { wave: 'sine', freq: [80, 30], duration: 0.4, volume: 0.6, noise: 0.4 },
  reward: { wave: 'triangle', freq: [660, 1320], duration: 0.25, volume: 0.35 },
  victory: { wave: 'triangle', freq: [440, 1760], duration: 0.9, volume: 0.4 },
  defeat: { wave: 'sawtooth', freq: [300, 70], duration: 1.0, volume: 0.35 },
};

export function registerSfx(audio: AudioManager): void {
  for (const [name, recipe] of Object.entries(SFX)) audio.register(name, recipe);
}
