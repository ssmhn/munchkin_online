import React from 'react';
import type { PlayerState, CardDb, GameAction } from '@munchkin/shared';
import { GameCard } from '../GameCard';
import { GoldButton } from '../GoldButton';

interface OtherPlayer {
  id: string;
  name: string;
}

interface Props {
  player: PlayerState;
  cardDb: CardDb | null;
  otherPlayers: OtherPlayer[];
  onAction: (action: GameAction) => void;
}

export function CharityOverlay({ player, cardDb, otherPlayers, onAction }: Props) {
  const excess = player.hand.length - 5;
  if (excess <= 0) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[3000]">
      <div className="bg-munch-surface rounded-xl p-6 max-w-[500px] w-full mx-4 border border-munch-border">
        <h3 className="text-munch-gold font-fantasy text-lg mb-1">Charity</h3>
        <p className="text-sm text-munch-text-muted mb-4">
          Discard {excess} card{excess > 1 ? 's' : ''} or give to other players.
        </p>

        {/* Cards in hand */}
        <div className="flex gap-2 flex-wrap mb-4 justify-center">
          {player.hand.map((cardId) => {
            const def = cardDb?.[cardId];
            return (
              <div key={cardId} className="flex flex-col items-center gap-1">
                {def ? <GameCard card={def} compact /> : (
                  <div className="w-[54px] h-[76px] bg-munch-surface-light rounded-md border border-munch-border flex items-center justify-center text-[8px]">{cardId}</div>
                )}
                <div className="flex gap-1">
                  <button
                    onClick={() => onAction({ type: 'DISCARD_CARD', cardId })}
                    className="text-[8px] px-1.5 py-0.5 bg-red-600/20 text-red-400 rounded border border-red-600/30 cursor-pointer"
                  >
                    Discard
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Give to players */}
        {otherPlayers.length > 0 && (
          <div className="border-t border-munch-border pt-3">
            <div className="text-xs text-munch-text-muted mb-2">Or give a card to:</div>
            <div className="flex gap-2 flex-wrap">
              {otherPlayers.map((p) => (
                <button
                  key={p.id}
                  className="text-xs px-3 py-1.5 bg-munch-surface-light border border-munch-border rounded text-munch-text cursor-pointer hover:border-munch-gold transition-colors"
                  onClick={() => {
                    // Player needs to select a card first, then give
                    // For now, show as target options
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="text-[10px] text-munch-text-muted text-center mt-3">
          Cards remaining to discard: {excess}
        </div>
      </div>
    </div>
  );
}
