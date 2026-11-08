import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { ENEMIES, WAVES } from '../src/data/enemies';
import { FACTIONS } from '../src/data/factions';
import type { Effect } from '../src/data/schema';

const KNOWN_EFFECTS = new Set<Effect['kind']>([
  'applyBurn',
  'adjacentAura',
  'onDeathBurst',
  'splash',
  'selfDamage',
  'gainResource',
  'gainActions',
  'actionsPerTurn',
  'statModifier',
  'destroyBuildingFor',
  'laneDamage',
  'globalAttackSpeed',
  'revive',
  'resourceOnBurningKill',
  'slam',
]);

describe('content validation', () => {
  it('has four factions with unique ids and complete identity fields', () => {
    expect(FACTIONS).toHaveLength(4);
    expect(new Set(FACTIONS.map((f) => f.id)).size).toBe(4);
    for (const f of FACTIONS) {
      expect(f.name && f.description && f.playstyle && f.passive.name).toBeTruthy();
      expect(f.strengths.length).toBeGreaterThan(0);
      expect(f.weaknesses.length).toBeGreaterThan(0);
      expect(f.primaryResource.cap).toBeGreaterThan(0);
    }
  });

  for (const f of FACTIONS.filter((x) => x.playable)) {
    describe(f.name, () => {
      const allIds = [...f.buildings, ...f.units, ...f.skills, ...f.edicts, ...f.cards].map((x) => x.id);

      it('ids are unique across content', () => {
        expect(new Set(allIds).size).toBe(allIds.length);
      });

      it('every reference resolves', () => {
        const units = new Set(f.units.map((u) => u.id));
        for (const b of f.buildings) if (b.unitGeneration) expect(units.has(b.unitGeneration)).toBe(true);
        const refs = new Set([...f.buildings, ...f.edicts, ...f.skills].map((x) => x.id));
        for (const c of f.cards) expect(refs.has(c.ref), c.id).toBe(true);
        const cards = new Set(f.cards.map((c) => c.id));
        for (const id of f.startingHand) expect(cards.has(id), id).toBe(true);
        for (const c of f.cards) expect(c.actionCost).toBeGreaterThan(0);
      });

      it('has 3 tiers per building, unit and skill, with sane numbers', () => {
        for (const b of f.buildings) {
          expect(b.upgradePaths).toHaveLength(3);
          expect(b.constructionCost).toBeGreaterThan(0);
        }
        for (const u of f.units) {
          expect(u.upgradePaths).toHaveLength(3);
          for (const t of u.upgradePaths) {
            expect(t.health).toBeGreaterThan(0);
            expect(t.attackDamage).toBeGreaterThan(0);
            expect(t.attackSpeed).toBeGreaterThan(0);
            expect(t.attackRange).toBeGreaterThan(0);
          }
          expect(u.spawnTime).toBeGreaterThan(0);
        }
        for (const s of f.skills) {
          expect(s.upgradeLevels).toHaveLength(3);
          expect(s.resourceCost).toBeGreaterThan(0);
        }
      });

      it('only uses known effect kinds', () => {
        const effects: Effect[] = [
          ...f.passive.effects,
          ...f.buildings.flatMap((b) => [...b.activeAbilities, ...b.upgradePaths.flatMap((t) => t.passiveEffects)]),
          ...f.units.flatMap((u) => u.specialAbility?.effects ?? []),
          ...f.skills.flatMap((s) => s.upgradeLevels.flatMap((l) => l.effects)),
          ...f.edicts.flatMap((e) => e.effects),
        ];
        for (const e of effects) expect(KNOWN_EFFECTS.has(e.kind), e.kind).toBe(true);
      });

      it('covers early, mid and late game', () => {
        const stages = new Set(f.buildings.map((b) => b.stage));
        expect([...stages].sort()).toEqual(['early', 'late', 'mid']);
      });
    });
  }

  it('waves exist for every round and reference real enemies', () => {
    const enemies = new Set(ENEMIES.map((e) => e.id));
    for (let r = 1; r <= BALANCE.rounds; r++) {
      const w = WAVES.find((x) => x.round === r);
      expect(w, `round ${r}`).toBeDefined();
      for (const g of w?.groups ?? []) expect(enemies.has(g.enemy)).toBe(true);
    }
    expect(WAVES.find((w) => w.round === BALANCE.rounds)?.groups.some((g) => ENEMIES.find((e) => e.id === g.enemy)?.boss)).toBe(true);
  });
});
