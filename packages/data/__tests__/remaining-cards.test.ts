import { describe, it, expect } from 'vitest';
import races from '../src/races.json';
import classes from '../src/classes.json';
import oneshots from '../src/oneshots.json';
import modifiers from '../src/modifiers.json';
import curses from '../src/curses.json';
import special from '../src/special.json';

describe('races.json', () => {
  it('should have 4 races: Elf, Dwarf, Halfling, Human', () => {
    expect(races).toHaveLength(4);
    const ids = races.map((r: any) => r.id);
    expect(ids).toContain('race_elf');
    expect(ids).toContain('race_dwarf');
    expect(ids).toContain('race_halfling');
    expect(ids).toContain('race_human');
  });

  it('Elf has ON_HELPER_VICTORY trigger', () => {
    const elf = races.find((r: any) => r.id === 'race_elf')!;
    expect(elf.triggers![0].event).toBe('ON_HELPER_VICTORY');
    expect(elf.triggers![0].effects[0].type).toBe('MODIFY_LEVEL');
  });
});

describe('classes.json', () => {
  it('should have 4 classes: Warrior, Wizard, Cleric, Thief', () => {
    expect(classes).toHaveLength(4);
    const ids = classes.map((c: any) => c.id);
    expect(ids).toContain('class_warrior');
    expect(ids).toContain('class_wizard');
    expect(ids).toContain('class_cleric');
    expect(ids).toContain('class_thief');
  });

  it('Warrior has IGNORE_WEAPON_RESTRICTIONS status', () => {
    const warrior = classes.find((c: any) => c.id === 'class_warrior')!;
    expect(warrior.effects[0].type).toBe('APPLY_STATUS');
    expect((warrior.effects[0] as any).status).toBe('IGNORE_WEAPON_RESTRICTIONS');
  });
});

describe('oneshots.json', () => {
  it('should have at least 15 one-shot cards', () => {
    expect(oneshots.length).toBeGreaterThanOrEqual(15);
  });

  it('all oneshots have playableFrom and effects', () => {
    for (const card of oneshots) {
      expect(card.type).toBe('ONE_SHOT');
      expect(Array.isArray(card.playableFrom)).toBe(true);
      expect(Array.isArray(card.effects)).toBe(true);
      expect(card.effects.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('modifiers.json', () => {
  it('should have at least 8 modifiers', () => {
    expect(modifiers.length).toBeGreaterThanOrEqual(8);
  });

  it('Enraged gives +5 monster bonus', () => {
    const enraged = modifiers.find((m: any) => m.id === 'modifier_enraged')!;
    expect(enraged.effects[0].type).toBe('MONSTER_BONUS');
    expect((enraged.effects[0] as any).value).toBe(5);
  });
});

describe('curses.json', () => {
  it('should have at least 10 curses', () => {
    expect(curses.length).toBeGreaterThanOrEqual(10);
  });

  it('curse_combat_minus2 uses APPLY_CURSE with curseId', () => {
    const curse = curses.find((c: any) => c.id === 'curse_combat_minus2')!;
    expect(curse.effects[0].type).toBe('APPLY_CURSE');
    expect((curse.effects[0] as any).curseId).toBe('curse_combat_minus2');
  });
});

describe('special.json', () => {
  it('should have at least 5 special cards', () => {
    expect(special.length).toBeGreaterThanOrEqual(5);
  });

  it('Doppelganger has CLONE_MONSTER with instanceId CHOSEN', () => {
    const doppel = special.find((s: any) => s.id === 'special_doppelganger')!;
    expect(doppel.effects[0].type).toBe('CLONE_MONSTER');
    expect((doppel.effects[0] as any).instanceId).toBe('CHOSEN');
  });

  it('Wandering Monster has ADD_MONSTER from HAND', () => {
    const wandering = special.find((s: any) => s.id === 'special_wandering_monster')!;
    expect(wandering.effects[0].type).toBe('ADD_MONSTER');
    expect((wandering.effects[0] as any).source).toBe('HAND');
  });
});
