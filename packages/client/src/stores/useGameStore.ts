import { create } from 'zustand';
import type { GameState, CardDb, JsonPatch, GameEvent } from '@munchkin/shared';

interface GameStore {
  state: GameState | null;
  cardDb: CardDb | null;
  events: GameEvent[];
  lastError: string | null;
  applyFullSync: (state: GameState, cardDb: CardDb) => void;
  applyStatePatch: (patch: JsonPatch[], events: GameEvent[]) => void;
  setError: (message: string) => void;
  clearError: () => void;
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
  lastError: null,

  applyFullSync: (state, cardDb) => {
    set({ state, cardDb, events: [] });
  },

  applyStatePatch: (patch, events) => {
    set((prev) => ({
      state: prev.state ? applyJsonPatch(prev.state, patch) : null,
      events: [...prev.events, ...events],
    }));
  },

  setError: (message) => {
    set({ lastError: message });
    // Auto-clear after 3 seconds
    setTimeout(() => set((prev) => prev.lastError === message ? { lastError: null } : {}), 3000);
  },

  clearError: () => {
    set({ lastError: null });
  },

  reset: () => {
    set({ state: null, cardDb: null, events: [], lastError: null });
  },
}));
