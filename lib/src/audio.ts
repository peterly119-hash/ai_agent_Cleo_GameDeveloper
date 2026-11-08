/**
 * Tiny WebAudio manager with procedural sound "recipes" (no audio files needed).
 * Safe to construct anywhere: the AudioContext is created lazily on first unlock()
 * (call it from a user gesture), and every call is a no-op when audio is unavailable.
 */
export interface SoundRecipe {
  /** Oscillator wave shape. */
  wave: OscillatorType;
  /** Start and end frequency in Hz (a sweep when they differ). */
  freq: [number, number];
  /** Seconds. */
  duration: number;
  /** 0..1 relative to the SFX channel. */
  volume: number;
  /** Optional white-noise mix 0..1 (hits, explosions). */
  noise?: number;
}

export interface AudioSettings {
  muted: boolean;
  sfxVolume: number;
  musicVolume: number;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private readonly recipes = new Map<string, SoundRecipe>();
  settings: AudioSettings;

  constructor(settings: Partial<AudioSettings> = {}) {
    this.settings = { muted: false, sfxVolume: 0.6, musicVolume: 0.4, ...settings };
  }

  register(name: string, recipe: SoundRecipe): void {
    this.recipes.set(name, recipe);
  }

  has(name: string): boolean {
    return this.recipes.has(name);
  }

  /** Call from a click/key handler; browsers block audio before a gesture. */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor = globalThis.AudioContext as typeof AudioContext | undefined;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
  }

  toggleMute(): boolean {
    this.settings.muted = !this.settings.muted;
    return this.settings.muted;
  }

  /** Returns true if a sound was actually scheduled. */
  play(name: string): boolean {
    const recipe = this.recipes.get(name);
    const ctx = this.ctx;
    if (!recipe || !ctx || this.settings.muted || ctx.state !== 'running') return false;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    const peak = recipe.volume * this.settings.sfxVolume;
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + recipe.duration);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = recipe.wave;
    osc.frequency.setValueAtTime(recipe.freq[0], now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, recipe.freq[1]), now + recipe.duration);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + recipe.duration);

    if (recipe.noise && recipe.noise > 0) {
      const frames = Math.max(1, Math.floor(ctx.sampleRate * recipe.duration));
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) channel[i] = (Math.random() * 2 - 1) * recipe.noise;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(gain);
      src.start(now);
    }
    return true;
  }
}
