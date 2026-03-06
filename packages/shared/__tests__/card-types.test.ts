import { describe, it, expect } from 'vitest';
import type { CardDefinition, CardEffect, CardCondition } from '../src/types/card';

describe('Card system types', () => {
  it('should accept a simple equipment card (Sword of Slaying)', () => {
    const sword: CardDefinition = {
      id: 'sword_of_slaying',
      name: 'Меч Рубки',
      deck: 'TREASURE',
      type: 'EQUIPMENT',
      description: '+3 к бою',
      playableFrom: ['YOUR_TURN_PRECOMBAT', 'YOUR_TURN_COMBAT'],
      slots: ['rightHand'],
      value: 300,
      effects: [{ type: 'COMBAT_BONUS', value: 3, target: 'SELF' }],
    };

    expect(sword.id).toBe('sword_of_slaying');
    expect(sword.effects[0].type).toBe('COMBAT_BONUS');
  });

  it('should accept a CONDITIONAL effect (Helmet of Courage)', () => {
    const conditionalEffect: CardEffect = {
      type: 'CONDITIONAL',
      condition: { type: 'PLAYER_CLASS', class: 'WARRIOR' },
      then: [{ type: 'COMBAT_BONUS', value: 4, target: 'SELF' }],
      else: [{ type: 'COMBAT_BONUS', value: 2, target: 'SELF' }],
    };

    const helmet: CardDefinition = {
      id: 'helmet_of_courage',
      name: 'Шлем Смелости',
      deck: 'TREASURE',
      type: 'EQUIPMENT',
      description: '+2 к бою (+4 для Воина)',
      slots: ['head'],
      value: 400,
      effects: [conditionalEffect],
    };

    expect(helmet.effects[0].type).toBe('CONDITIONAL');
    if (helmet.effects[0].type === 'CONDITIONAL') {
      expect(helmet.effects[0].condition.type).toBe('PLAYER_CLASS');
      expect(helmet.effects[0].then).toHaveLength(1);
      expect(helmet.effects[0].else).toHaveLength(1);
    }
  });

  it('should accept CLONE_MONSTER effect with instanceId CHOSEN', () => {
    const doppelganger: CardDefinition = {
      id: 'special_doppelganger',
      name: 'Доппельгангер',
      deck: 'DOOR',
      type: 'SPECIAL',
      description: 'Клонирует монстра',
      playableFrom: ['ANY_COMBAT'],
      effects: [{ type: 'CLONE_MONSTER', instanceId: 'CHOSEN' }],
    };

    expect(doppelganger.effects[0].type).toBe('CLONE_MONSTER');
    if (doppelganger.effects[0].type === 'CLONE_MONSTER') {
      expect(doppelganger.effects[0].instanceId).toBe('CHOSEN');
    }
  });

  it('should accept monster card with badStuff', () => {
    const dragon: CardDefinition = {
      id: 'monster_plutonium_dragon',
      name: 'Плутониевый Дракон',
      deck: 'DOOR',
      type: 'MONSTER',
      description: 'Уровень 20',
      baseLevel: 20,
      treasures: 5,
      tags: ['DRAGON'],
      badStuff: {
        description: 'Умри',
        effects: [
          { type: 'REMOVE_EQUIPMENT', slot: 'ALL', target: 'ACTIVE_PLAYER' },
          { type: 'DISCARD_HAND', count: 'ALL', target: 'ACTIVE_PLAYER' },
          { type: 'SET_LEVEL', value: 1, target: 'ACTIVE_PLAYER' },
        ],
      },
      effects: [],
    };

    expect(dragon.baseLevel).toBe(20);
    expect(dragon.badStuff?.effects).toHaveLength(3);
  });

  it('should accept nested AND/OR/NOT conditions', () => {
    const condition: CardCondition = {
      type: 'AND',
      conditions: [
        { type: 'PLAYER_RACE', race: 'ELF' },
        {
          type: 'OR',
          conditions: [
            { type: 'PLAYER_CLASS', class: 'WARRIOR' },
            { type: 'NOT', condition: { type: 'PLAYER_GENDER', gender: 'MALE' } },
          ],
        },
      ],
    };

    expect(condition.type).toBe('AND');
    if (condition.type === 'AND') {
      expect(condition.conditions).toHaveLength(2);
    }
  });

  it('should accept race card with triggers', () => {
    const elf: CardDefinition = {
      id: 'race_elf',
      name: 'Эльф',
      deck: 'DOOR',
      type: 'RACE',
      description: 'Получаешь уровень при помощи в победе',
      playableFrom: ['YOUR_TURN_PRECOMBAT', 'ANYTIME'],
      effects: [],
      triggers: [
        {
          event: 'ON_HELPER_VICTORY',
          effects: [{ type: 'MODIFY_LEVEL', value: 1, target: 'SELF' }],
        },
      ],
    };

    expect(elf.triggers?.[0].event).toBe('ON_HELPER_VICTORY');
  });
});
