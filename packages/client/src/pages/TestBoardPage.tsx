import React, { useState } from 'react';
import { GameBoard } from '../components/GameBoard';
import { CombatZone } from '../components/CombatZone';
import type { GameState, EquippedItems, CombatState } from '@munchkin/shared';

function createEquipped(): EquippedItems {
  return { head: null, body: null, feet: null, leftHand: null, rightHand: null, twoHands: null, extras: [] };
}

function createMockState(): GameState {
  return {
    id: 'test',
    phase: 'KICK_DOOR',
    turn: 1,
    activePlayerId: 'p1',
    playerOrder: ['p1', 'p2'],
    players: {
      p1: {
        id: 'p1', name: 'Alice', level: 3, gender: 'FEMALE', race: 'ELF',
        classes: ['WIZARD'], hand: ['sword_1', 'potion_2', 'armor_3'],
        equipped: createEquipped(), carried: [], curses: [], isConnected: true,
      },
      p2: {
        id: 'p2', name: 'Bob', level: 1, gender: 'MALE', race: null,
        classes: [], hand: ['HIDDEN', 'HIDDEN'],
        equipped: createEquipped(), carried: [], curses: [], isConnected: true,
      },
    },
    doorDeck: Array(20).fill('HIDDEN'),
    treasureDeck: Array(15).fill('HIDDEN'),
    discardDoor: [],
    discardTreasure: [],
    combat: null,
    pendingActions: [],
    log: [
      { timestamp: Date.now(), message: 'Alice kicked the door' },
      { timestamp: Date.now(), message: 'A Big Rat appears!' },
    ],
    winner: null,
  };
}

function createCombatState(): CombatState {
  return {
    phase: 'ACTIVE',
    monsters: [
      { cardId: 'Big Rat', modifiers: [], instanceId: 'inst-1' },
    ],
    activePlayerId: 'p1',
    helpers: [],
    appliedCards: [],
    reactionWindow: null,
    helpOffer: null,
    runAttempts: 0,
    resolved: false,
  };
}

export function TestBoardPage() {
  const [state, setState] = useState(createMockState);
  const [combat, setCombat] = useState<CombatState | null>(null);

  const bumpLevel = () => {
    setState(prev => ({
      ...prev,
      players: {
        ...prev.players,
        p1: { ...prev.players.p1, level: prev.players.p1.level + 1 },
      },
    }));
  };

  const startCombat = () => {
    setCombat(createCombatState());
  };

  const addClone = () => {
    setCombat(prev => prev ? {
      ...prev,
      monsters: [
        ...prev.monsters,
        { cardId: 'Big Rat Clone', modifiers: [], instanceId: `inst-${prev.monsters.length + 1}` },
      ],
    } : null);
  };

  return (
    <div>
      <button data-testid="bump-level" onClick={bumpLevel}>Bump Level</button>
      <button data-testid="start-combat" onClick={startCombat}>Start Combat</button>
      <button data-testid="add-clone" onClick={addClone}>Add Clone</button>
      <GameBoard state={state} selfPlayerId="p1" cardDb={null} />
      {combat && (
        <CombatZone
          combat={combat}
          isActivePlayer={true}
          playerPower={5}
          monsterPower={3}
        />
      )}
    </div>
  );
}
