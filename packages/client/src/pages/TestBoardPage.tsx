import React, { useState } from 'react';
import { GameBoard } from '../components/GameBoard';
import type { GameState, PlayerState, EquippedItems } from '@munchkin/shared';

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

export function TestBoardPage() {
  const [state, setState] = useState(createMockState);

  const bumpLevel = () => {
    setState(prev => ({
      ...prev,
      players: {
        ...prev.players,
        p1: { ...prev.players.p1, level: prev.players.p1.level + 1 },
      },
    }));
  };

  return (
    <div>
      <button data-testid="bump-level" onClick={bumpLevel}>Bump Level</button>
      <GameBoard state={state} selfPlayerId="p1" />
    </div>
  );
}
