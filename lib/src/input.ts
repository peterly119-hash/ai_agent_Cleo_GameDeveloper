/**
 * Engine-agnostic action map: games bind named actions to keys and query actions,
 * never raw keys. Lets players rebind and lets bots inject actions.
 */
export type ActionBindings<A extends string> = Record<A, readonly string[]>;

export class InputMap<A extends string> {
  private readonly keyToActions = new Map<string, Set<A>>();
  private readonly held = new Set<A>();
  private readonly pressedThisFrame = new Set<A>();
  private readonly listeners = new Set<(action: A) => void>();

  constructor(private bindings: ActionBindings<A>) {
    this.rebuild();
  }

  /** Feed a key-down event (e.g. KeyboardEvent.code). */
  keyDown(code: string): void {
    for (const action of this.keyToActions.get(code) ?? []) this.trigger(action);
  }

  keyUp(code: string): void {
    for (const action of this.keyToActions.get(code) ?? []) this.held.delete(action);
  }

  /** Programmatic press, used by bots, touch buttons and tests. */
  trigger(action: A): void {
    if (!this.held.has(action)) this.pressedThisFrame.add(action);
    this.held.add(action);
    for (const fn of this.listeners) fn(action);
  }

  release(action: A): void {
    this.held.delete(action);
  }

  isDown(action: A): boolean {
    return this.held.has(action);
  }

  /** True only on the frame the action was first pressed. Call endFrame() each frame. */
  justPressed(action: A): boolean {
    return this.pressedThisFrame.has(action);
  }

  endFrame(): void {
    this.pressedThisFrame.clear();
  }

  onAction(fn: (action: A) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  rebind(action: A, keys: readonly string[]): void {
    this.bindings = { ...this.bindings, [action]: keys };
    this.rebuild();
  }

  private rebuild(): void {
    this.keyToActions.clear();
    for (const action of Object.keys(this.bindings) as A[]) {
      for (const key of this.bindings[action]) {
        const set = this.keyToActions.get(key) ?? new Set<A>();
        set.add(action);
        this.keyToActions.set(key, set);
      }
    }
  }
}
