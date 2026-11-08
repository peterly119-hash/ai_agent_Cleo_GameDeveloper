import type Phaser from 'phaser';

export interface MenuTheme {
  font: string;
  fontSize: number;
  text: string;
  textHover: string;
  fill: number;
  fillHover: number;
  stroke: number;
  width: number;
  height: number;
  gap: number;
}

export interface MenuItem {
  label: string;
  onSelect: () => void;
  /** Stable id for bots/tests, e.g. 'start'. */
  id?: string;
}

export interface MenuHandle {
  container: Phaser.GameObjects.Container;
  /** Select an item by id (used by Playwright bots via window.__QW__). */
  select(id: string): boolean;
  destroy(): void;
}

/**
 * Vertical button menu with mouse + keyboard (arrows/WASD + Enter/Space) support.
 * Phaser is only a type import here; the scene supplies the runtime.
 */
export function createMenu(
  scene: Phaser.Scene,
  x: number,
  y: number,
  items: readonly MenuItem[],
  theme: MenuTheme,
): MenuHandle {
  const container = scene.add.container(x, y);
  let focused = 0;
  const buttons = items.map((item, i) => {
    const by = i * (theme.height + theme.gap);
    const bg = scene.add
      .rectangle(0, by, theme.width, theme.height, theme.fill)
      .setStrokeStyle(2, theme.stroke)
      .setInteractive({ useHandCursor: true });
    const label = scene.add
      .text(0, by, item.label, { fontFamily: theme.font, fontSize: `${theme.fontSize}px`, color: theme.text })
      .setOrigin(0.5);
    bg.on('pointerover', () => setFocus(i));
    bg.on('pointerdown', () => item.onSelect());
    container.add([bg, label]);
    return { bg, label };
  });

  function setFocus(index: number): void {
    focused = (index + items.length) % items.length;
    buttons.forEach((b, i) => {
      const on = i === focused;
      b.bg.setFillStyle(on ? theme.fillHover : theme.fill);
      b.label.setColor(on ? theme.textHover : theme.text);
    });
  }
  setFocus(0);

  const onKey = (event: KeyboardEvent): void => {
    if (event.code === 'ArrowDown' || event.code === 'KeyS') setFocus(focused + 1);
    else if (event.code === 'ArrowUp' || event.code === 'KeyW') setFocus(focused - 1);
    else if (event.code === 'Enter' || event.code === 'Space') items[focused]?.onSelect();
  };
  scene.input.keyboard?.on('keydown', onKey);

  const handle: MenuHandle = {
    container,
    select(id: string): boolean {
      const item = items.find((it) => it.id === id);
      if (!item) return false;
      item.onSelect();
      return true;
    },
    destroy(): void {
      scene.input.keyboard?.off('keydown', onKey);
      container.destroy(true);
    },
  };
  scene.events.once('shutdown', () => scene.input.keyboard?.off('keydown', onKey));
  return handle;
}
