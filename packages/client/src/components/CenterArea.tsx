import React from 'react';
import type { CombatState, GamePhase, CardDb, GameAction, RevealedCard, PlayerState, EquippedItems } from '@munchkin/shared';
import { DeckArea } from './DeckArea';
import { CombatZone } from './CombatZone';
import { GameCard } from './GameCard';

interface Props {
  phase: GamePhase;
  combat: CombatState | null;
  doorDeckSize: number;
  treasureDeckSize: number;
  cardDb: CardDb | null;
  players: Record<string, { name: string }>;
  isLocalActive: boolean;
  selfPlayerId?: string;
  revealedCard: RevealedCard | null;
  isRevealOwner: boolean;
  reactionWindowOpen: boolean;
  playerStates?: Record<string, PlayerState>;
  onAction?: (action: GameAction) => void;
}

export function CenterArea({
  phase, combat, doorDeckSize, treasureDeckSize, cardDb, players,
  isLocalActive, selfPlayerId, revealedCard, isRevealOwner, reactionWindowOpen, playerStates, onAction,
}: Props) {
  const isCombat = phase === 'COMBAT' && combat;
  const sendAction = (action: GameAction) => onAction?.(action);
  const hasRevealedCard = !!revealedCard;

  const sourceLabel = revealedCard ? {
    KICK_DOOR: 'Door Card',
    LOOT_DOOR: 'Looted Door',
    LOOT_TREASURE: 'Looted Treasure',
    AFTER_COMBAT_TREASURE: 'Combat Reward',
  }[revealedCard.source] : '';

  const revealedCardDef = revealedCard ? cardDb?.[revealedCard.cardId] : null;

  return (
    <div
      data-testid="center-area"
      className={`flex flex-col items-center gap-4 p-4 rounded-xl min-w-[280px] min-h-[160px] transition-all duration-300 ${
        isCombat ? 'border border-red-600/20' : 'border border-munch-border'
      }`}
      style={{
        background: isCombat
          ? 'radial-gradient(ellipse at center, rgba(220,38,38,0.08) 0%, transparent 70%)'
          : hasRevealedCard
            ? 'radial-gradient(ellipse at center, rgba(201,168,76,0.12) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(201,168,76,0.06) 0%, transparent 70%)',
      }}
    >
      {/* Combat display */}
      {isCombat && combat && (
        <CombatZone
          combat={combat}
          cardDb={cardDb}
          players={players}
          isActivePlayer={isLocalActive}
          selfPlayerId={selfPlayerId}
          onAction={sendAction}
          playerStates={playerStates}
        />
      )}

      {/* Revealed card display (replaces decks when a card is revealed) */}
      {!isCombat && hasRevealedCard && revealedCard && (
        <div className="flex flex-col items-center gap-3" data-testid="revealed-card-display">
          <div className="text-xs text-munch-gold uppercase tracking-wider font-semibold">
            {sourceLabel}
          </div>

          <div className="transform scale-125">
            {revealedCardDef ? (
              <GameCard card={revealedCardDef} />
            ) : (
              <div className="w-[120px] h-[170px] rounded-lg bg-munch-surface border-2 border-munch-gold flex flex-col items-center justify-center p-3 shadow-[0_2px_16px_rgba(201,168,76,0.3)]">
                <div className="text-[10px] text-munch-gold uppercase font-bold mb-2">
                  {revealedCard.source === 'KICK_DOOR' ? 'Door' : 'Treasure'}
                </div>
                <div className="text-xs font-bold text-munch-text text-center font-fantasy leading-snug">
                  {revealedCard.cardId.replace(/_/g, ' ')}
                </div>
              </div>
            )}
          </div>

          {reactionWindowOpen && (
            <div className="text-sm text-munch-info font-semibold animate-pulse">
              Waiting for reactions...
            </div>
          )}

          {isRevealOwner && !reactionWindowOpen && (
            <button
              data-testid="btn-apply-revealed"
              className="px-6 py-2.5 text-sm font-bold font-fantasy text-munch-bg bg-gradient-to-b from-munch-gold-light to-munch-gold border-2 border-[#a08030] rounded-lg cursor-pointer uppercase tracking-wide shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-100 ease-linear hover:scale-105"
              onClick={() => sendAction({ type: 'APPLY_REVEALED_CARD', cardId: revealedCard.cardId })}
            >
              Apply Card
            </button>
          )}

          {!isRevealOwner && (
            <div className="text-xs text-munch-text-muted">
              {players[revealedCard.ownerId]?.name || revealedCard.ownerId}&apos;s card
            </div>
          )}
        </div>
      )}

      {/* Non-combat, no revealed card: show decks */}
      {!isCombat && !hasRevealedCard && (
        <DeckArea doorDeckSize={doorDeckSize} treasureDeckSize={treasureDeckSize} />
      )}

      {/* Action buttons */}
      {isLocalActive && !isCombat && !hasRevealedCard && (
        <div className="flex gap-2.5 flex-wrap justify-center">
          {phase === 'KICK_DOOR' && (
            <button
              data-testid="btn-kick-door"
              className="px-6 py-2.5 text-sm font-bold font-fantasy text-munch-bg bg-gradient-to-b from-munch-gold-light to-munch-gold border-2 border-[#a08030] rounded-lg cursor-pointer uppercase tracking-wide shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-100 ease-linear"
              onClick={() => sendAction({ type: 'KICK_DOOR' })}
            >
              Kick Open The Door
            </button>
          )}
          {phase === 'LOOT_ROOM' && (
            <>
              <button
                data-testid="btn-loot-door"
                className="px-6 py-2.5 text-sm font-bold font-fantasy text-munch-bg bg-gradient-to-b from-munch-gold-light to-munch-gold border-2 border-[#a08030] rounded-lg cursor-pointer uppercase tracking-wide shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-100 ease-linear"
                onClick={() => sendAction({ type: 'LOOT', deck: 'DOOR' })}
              >
                Loot Door
              </button>
              <button
                data-testid="btn-loot-treasure"
                className="px-6 py-2.5 text-sm font-bold font-fantasy text-munch-bg bg-gradient-to-b from-amber-400 to-amber-600 border-2 border-amber-800 rounded-lg cursor-pointer uppercase tracking-wide shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-100 ease-linear"
                onClick={() => sendAction({ type: 'LOOT', deck: 'TREASURE' })}
              >
                Loot Treasure
              </button>
            </>
          )}
          {(phase === 'LOOT_ROOM' || phase === 'AFTER_COMBAT') && (
            <button
              data-testid="btn-end-turn"
              className="px-6 py-2.5 text-sm font-bold font-fantasy text-munch-bg bg-gradient-to-b from-munch-gold-light to-munch-gold border-2 border-[#a08030] rounded-lg cursor-pointer uppercase tracking-wide shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-100 ease-linear"
              onClick={() => sendAction({ type: 'END_TURN' })}
            >
              End Turn
            </button>
          )}
        </div>
      )}

      {/* Phase hint messages */}
      {!isCombat && !hasRevealedCard && (
        <PhaseHint phase={phase} isLocalActive={isLocalActive} />
      )}
    </div>
  );
}

function PhaseHint({ phase, isLocalActive }: { phase: GamePhase; isLocalActive: boolean }) {
  let text = '';
  let color = '#d97706';

  switch (phase) {
    case 'KICK_DOOR':
      text = isLocalActive ? 'Click the button to kick open the door!' : 'Waiting for active player to kick the door...';
      break;
    case 'LOOT_ROOM':
      text = isLocalActive ? 'Loot the room, play a monster from hand, or end your turn.' : 'Active player is looting the room...';
      break;
    case 'CHARITY':
      text = isLocalActive ? 'Discard down to 5 cards, then end your turn.' : 'Active player must discard excess cards...';
      color = '#059669';
      break;
    case 'END_GAME':
      text = 'Game Over!';
      color = 'var(--color-munch-gold, #c9a84c)';
      break;
    default:
      return null;
  }

  return (
    <div
      className="text-xs font-semibold text-center px-3 py-1 rounded"
      style={{ color, background: `${color}15` }}
    >
      {text}
    </div>
  );
}
