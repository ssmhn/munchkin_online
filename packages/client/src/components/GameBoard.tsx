import React from 'react';
import type { GameState } from '@munchkin/shared';
import { PlayerArea } from './PlayerArea';
import { CardHand } from './CardHand';
import { DeckArea } from './DeckArea';
import { GameLog } from './GameLog';

interface Props {
  state: GameState;
  selfPlayerId?: string;
}

export function GameBoard({ state, selfPlayerId }: Props) {
  const players = Object.values(state.players);

  return (
    <div data-testid="game-board" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <div data-testid="players-area" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {players.map(player => (
          <PlayerArea
            key={player.id}
            player={player}
            isActive={player.id === state.activePlayerId}
            isSelf={player.id === selfPlayerId}
          />
        ))}
      </div>

      <DeckArea
        doorDeckSize={state.doorDeck.length}
        treasureDeckSize={state.treasureDeck.length}
      />

      {selfPlayerId && state.players[selfPlayerId] && (
        <div>
          <h3>Your Hand</h3>
          <CardHand cards={state.players[selfPlayerId].hand} isSelf={true} />
        </div>
      )}

      {players
        .filter(p => p.id !== selfPlayerId)
        .map(p => (
          <div key={p.id}>
            <h4>{p.name}'s Hand</h4>
            <CardHand cards={p.hand} isSelf={false} />
          </div>
        ))}

      <GameLog entries={state.log} />
    </div>
  );
}
