import type { FactionDef } from '../schema';
import { emberThrone } from './ember-throne';

/**
 * Faction registry. Adding a faction = add a data folder + one line here (GDD §11).
 * Non-playable factions carry identity data only until their milestone.
 */
function stub(def: Omit<FactionDef, 'buildings' | 'units' | 'skills' | 'edicts' | 'cards' | 'startingDeck' | 'playable'>): FactionDef {
  return { ...def, playable: false, buildings: [], units: [], skills: [], edicts: [], cards: [], startingDeck: [] };
}

const stoneCourt = stub({
  id: 'stone-court',
  name: 'Stone Court',
  element: 'Earth',
  description: 'Patient wall-builders whose island grows heavier every day it stands.',
  playstyle: 'Defensive: outlast with walls and armour, scale slowly into an unbreakable late game.',
  primaryResource: { id: 'stone', name: 'Stone', cap: 40 },
  startingResources: { gold: 8, primary: 2 },
  passive: { name: 'Settled Ground', description: "Each building's units gain +5% HP per round it has stood (max +50%).", effects: [] },
  strengths: ['Durable', 'Late-game scaling', 'Great against swarms'],
  weaknesses: ['Slow start', 'Low damage', 'Weak to ranged chip and burn'],
  color: 0xb08a5a,
  shape: 'square',
});

const galeCovenant = stub({
  id: 'gale-covenant',
  name: 'Gale Covenant',
  element: 'Air',
  description: 'Swift monks of the high winds who strike first and are gone before the counter.',
  playstyle: 'Tempo: cheap fast swarms, extra attacks, and shoving enemies between lanes.',
  primaryResource: { id: 'momentum', name: 'Momentum', cap: 20 },
  startingResources: { gold: 9, primary: 0 },
  passive: { name: 'Tailwind', description: 'Units move 25% faster and their first hit strikes twice.', effects: [] },
  strengths: ['Fast', 'Flexible lanes', 'Great against slow tanks'],
  weaknesses: ['Fragile', 'Falls off against splash'],
  color: 0x8fd3e8,
  shape: 'diamond',
});

const tideCircle = stub({
  id: 'tide-circle',
  name: 'Tide Circle',
  element: 'Water',
  description: 'Healers and shapeshifters who bend the island itself into new forms.',
  playstyle: 'Sustain and combos: heal through attrition, copy and transform neighbouring tiles.',
  primaryResource: { id: 'flow', name: 'Flow', cap: 30 },
  startingResources: { gold: 8, primary: 0 },
  passive: { name: 'Ebb', description: '20% of damage your units deal heals the most injured ally in that lane.', effects: [] },
  strengths: ['Sustain', 'Combo engines', 'Wins long fights'],
  weaknesses: ['Low burst', 'Weak to burst damage and boss timers'],
  color: 0x3a7fd6,
  shape: 'circle',
});

export const FACTIONS: readonly FactionDef[] = [emberThrone, stoneCourt, galeCovenant, tideCircle];

export function getFaction(id: string): FactionDef {
  const f = FACTIONS.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown faction: ${id}`);
  return f;
}
