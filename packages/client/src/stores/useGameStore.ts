import { create } from 'zustand';
import type { GameState, CardDb, JsonPatch, GameEvent } from '@munchkin/shared';

interface GameStore {
  state: GameState | null;
  cardDb: CardDb | null;
  events: GameEvent[];
  applyFullSync: (state: GameState, cardDb: CardDb) => void;
  applyStatePatch: (patch: JsonPatch[], events: GameEvent[]) => void;
  reset: () => void;
}

function applyJsonPatch(obj: any, patches: JsonPatch[]): any {
  const result = structuredClone(obj);
  for (const patch of patches) {
    const parts = patch.path.split('/').filter(Boolean);
    if (patch.op === 'replace' || patch.op === 'add') {
      let target = result;
      for (let i = 0; i < parts.length - 1; i++) {
        target = target[parts[i]];
      }
      target[parts[parts.length - 1]] = patch.value;
    } else if (patch.op === 'remove') {
      let target = result;
      for (let i = 0; i < parts.length - 1; i++) {
        target = target[parts[i]];
      }
      delete target[parts[parts.length - 1]];
    }
  }
  return result;
}

export const useGameStore = create<GameStore>((set) => ({
  state: null,
  cardDb: null,
  events: [],

  applyFullSync: (state, cardDb) => {
    set({ state, cardDb, events: [] });
  },

  applyStatePatch: (patch, events) => {
    set((prev) => ({
      state: prev.state ? applyJsonPatch(prev.state, patch) : null,
      events: [...prev.events, ...events],
    }));
  },

  reset: () => {
    set({ state: null, cardDb: null, events: [] });
  },
}));
