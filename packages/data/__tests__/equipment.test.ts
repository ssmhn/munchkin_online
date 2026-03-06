import { describe, it, expect } from 'vitest';
import equipment from '../src/equipment.json';

describe('equipment.json', () => {
  it('should have at least 40 unique items', () => {
    expect(equipment.length).toBeGreaterThanOrEqual(40);
    const ids = new Set(equipment.map((e: any) => e.id));
    expect(ids.size).toBe(equipment.length);
  });

  it('each item has all required fields', () => {
    for (const item of equipment) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item.deck).toBe('TREASURE');
      expect(item.type).toBe('EQUIPMENT');
      expect(Array.isArray(item.slots)).toBe(true);
      expect(item.slots.length).toBeGreaterThanOrEqual(1);
      expect(typeof item.value).toBe('number');
      expect(Array.isArray(item.effects)).toBe(true);
      expect(item.effects.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('values are reasonable (100-1000)', () => {
    for (const item of equipment) {
      expect(item.value).toBeGreaterThanOrEqual(100);
      expect(item.value).toBeLessThanOrEqual(1000);
    }
  });

  it('helmet_of_courage has CONDITIONAL effect with PLAYER_CLASS: WARRIOR', () => {
    const helmet = equipment.find((e: any) => e.id === 'helmet_of_courage')!;
    expect(helmet).toBeDefined();
    const conditional = helmet.effects[0] as any;
    expect(conditional.type).toBe('CONDITIONAL');
    expect(conditional.condition.type).toBe('PLAYER_CLASS');
    expect(conditional.condition.class).toBe('WARRIOR');
    expect(conditional.then[0].value).toBe(4);
    expect(conditional.else[0].value).toBe(2);
  });

  it('two-handed items have slots: [twoHands]', () => {
    const twoHanded = equipment.filter((e: any) => e.slots.includes('twoHands'));
    expect(twoHanded.length).toBeGreaterThanOrEqual(3);
    for (const item of twoHanded) {
      expect(item.slots).toEqual(['twoHands']);
    }
  });

  it('big items have isBig: true', () => {
    const bigItems = equipment.filter((e: any) => e.isBig === true);
    expect(bigItems.length).toBeGreaterThanOrEqual(3);
  });
});
