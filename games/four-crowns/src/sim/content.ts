import { ENEMIES, WAVES } from '../data/enemies';
import type { BuildingDef, CardDef, EdictDef, EnemyDef, FactionDef, SkillDef, UnitDef, WaveDef } from '../data/schema';

function index<T extends { id: string }>(items: readonly T[], kind: string): (id: string) => T {
  const map = new Map(items.map((i) => [i.id, i]));
  return (id) => {
    const found = map.get(id);
    if (!found) throw new Error(`Unknown ${kind}: ${id}`);
    return found;
  };
}

/** Read-only lookup over one faction's content plus the shared enemies/waves. */
export class Content {
  readonly building: (id: string) => BuildingDef;
  readonly unit: (id: string) => UnitDef;
  readonly skill: (id: string) => SkillDef;
  readonly edict: (id: string) => EdictDef;
  readonly card: (id: string) => CardDef;
  readonly enemy: (id: string) => EnemyDef;

  constructor(
    readonly faction: FactionDef,
    readonly enemies: readonly EnemyDef[] = ENEMIES,
    readonly waves: readonly WaveDef[] = WAVES,
  ) {
    this.building = index(faction.buildings, 'building');
    this.unit = index(faction.units, 'unit');
    this.skill = index(faction.skills, 'skill');
    this.edict = index(faction.edicts, 'edict');
    this.card = index(faction.cards, 'card');
    this.enemy = index(enemies, 'enemy');
  }

  wave(round: number): WaveDef {
    const w = this.waves.find((x) => x.round === round);
    if (!w) throw new Error(`No wave for round ${round}`);
    return w;
  }

  /** Display name of whatever a card plays. */
  cardName(cardId: string): string {
    const c = this.card(cardId);
    if (c.type === 'building') return this.building(c.ref).name;
    if (c.type === 'edict') return this.edict(c.ref).name;
    return this.skill(c.ref).name;
  }

  cardDescription(cardId: string): string {
    const c = this.card(cardId);
    if (c.type === 'building') return this.building(c.ref).description;
    if (c.type === 'edict') return this.edict(c.ref).description;
    return this.skill(c.ref).description;
  }
}
