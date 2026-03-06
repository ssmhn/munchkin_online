import { describe, it, expect } from 'vitest';
import monsters from '../src/monsters.json';

const VALID_EFFECT_TYPES = [
  'COMBAT_BONUS', 'MONSTER_BONUS', 'MONSTER_PENALTY',
  'MODIFY_LEVEL', 'SET_LEVEL', 'GAIN_LEVELS_FROM_KILL',
  'ADD_MONSTER', 'CLONE_MONSTER',
  'REMOVE_EQUIPMENT', 'STEAL_ITEM', 'DISCARD_HAND', 'FORCE_SELL',
  'REMOVE_CLASS', 'REMOVE_RACE', 'CHANGE_GENDER',
  'APPLY_CURSE', 'REMOVE_CURSE', 'APPLY_STATUS',
  'DRAW_CARDS', 'GIVE_CARD_FROM_HAND',
  'AUTO_ESCAPE', 'ESCAPE_BONUS', 'PREVENT_ESCAPE', 'COMBAT_IMMUNITY',
  'EXTRA_TREASURE', 'GAIN_GOLD',
  'CONDITIONAL',
];

describe('monsters.json', () => {
  it('should have at least 20 unique monsters', () => {
    expect(monsters.length).toBeGreaterThanOrEqual(20);
    const ids = new Set(monsters.map((m: any) => m.id));
    expect(ids.size).toBe(monsters.length);
  });

  it('each monster has all required fields', () => {
    for (const m of monsters) {
      expect(m).toHaveProperty('id');
      expect(m).toHaveProperty('name');
      expect(m.deck).toBe('DOOR');
      expect(m.type).toBe('MONSTER');
      expect(typeof m.baseLevel).toBe('number');
      expect(typeof m.treasures).toBe('number');
      expect(Array.isArray(m.tags)).toBe(true);
      expect(m).toHaveProperty('badStuff');
      expect(Array.isArray(m.badStuff.effects)).toBe(true);
      expect(Array.isArray(m.effects)).toBe(true);
    }
  });

  it('baseLevel is between 1 and 20 for all monsters', () => {
    for (const m of monsters) {
      expect(m.baseLevel).toBeGreaterThanOrEqual(1);
      expect(m.baseLevel).toBeLessThanOrEqual(20);
    }
  });

  it('badStuff.effects contain valid CardEffect types', () => {
    for (const m of monsters) {
      for (const effect of m.badStuff.effects) {
        expect(VALID_EFFECT_TYPES).toContain(effect.type);
      }
    }
  });

  it('key monsters are present: big_rat, orc, plutonium_dragon', () => {
    const ids = monsters.map((m: any) => m.id);
    expect(ids).toContain('monster_big_rat');
    expect(ids).toContain('monster_orc');
    expect(ids).toContain('monster_plutonium_dragon');
  });

  it('plutonium_dragon has DRAGON tag and death badStuff', () => {
    const dragon = monsters.find((m: any) => m.id === 'monster_plutonium_dragon')!;
    expect(dragon.tags).toContain('DRAGON');
    expect(dragon.baseLevel).toBe(20);
    expect(dragon.treasures).toBe(5);

    const effectTypes = dragon.badStuff.effects.map((e: any) => e.type);
    expect(effectTypes).toContain('REMOVE_EQUIPMENT');
    expect(effectTypes).toContain('DISCARD_HAND');
    expect(effectTypes).toContain('SET_LEVEL');
  });
});
