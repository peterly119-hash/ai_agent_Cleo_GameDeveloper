/**
 * window.__QW__ — the contract between a game and the Playwright QA bot.
 * Games update it; bots read it and call `actions`.
 */
export interface QwTestHook {
  ready: boolean;
  scene: string;
  /** Rolling fps samples (one per ~500 ms). */
  fps: number[];
  /** Monotonic counter the game bumps whenever meaningful progress happens (soft-lock detection). */
  progress: number;
  /** Game-specific summary (round, hp, gold, ...). */
  state: Record<string, unknown>;
  /** Named commands the bot may invoke. */
  actions: Record<string, (...args: never[]) => unknown>;
  errors: string[];
}

declare global {
  interface Window {
    __QW__?: QwTestHook;
  }
}

export function installTestHook(): QwTestHook {
  const hook: QwTestHook = { ready: false, scene: 'boot', fps: [], progress: 0, state: {}, actions: {}, errors: [] };
  if (typeof window !== 'undefined') {
    window.__QW__ = hook;
    window.addEventListener('error', (e) => hook.errors.push(String(e.message)));
  }
  return hook;
}

/** Samples fps into the hook; call from the game loop with the frame delta in ms. */
export class FpsSampler {
  private frames = 0;
  private elapsed = 0;
  constructor(private readonly hook: QwTestHook, private readonly windowMs = 500, private readonly maxSamples = 600) {}

  tick(deltaMs: number): void {
    this.frames++;
    this.elapsed += deltaMs;
    if (this.elapsed >= this.windowMs) {
      this.hook.fps.push(Math.round((this.frames * 1000) / this.elapsed));
      if (this.hook.fps.length > this.maxSamples) this.hook.fps.shift();
      this.frames = 0;
      this.elapsed = 0;
    }
  }
}
