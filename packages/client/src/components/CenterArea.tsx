import React from 'react';
import type { CombatState, GamePhase, CardDb, GameAction } from '@munchkin/shared';
import { DeckArea } from './DeckArea';
import { GameCard } from './GameCard';

interface Props {
  phase: GamePhase;
  combat: CombatState | null;
  doorDeckSize: number;
  treasureDeckSize: number;
  cardDb: CardDb | null;
  players: Record<string, { name: string }>;
  isLocalActive: boolean;
  onAction?: (action: GameAction) => void;
}

export function CenterArea({ phase, combat, doorDeckSize, treasureDeckSize, cardDb, players, isLocalActive, onAction }: Props) {
  const isCombat = phase === 'COMBAT' && combat;

  return (
    <div
      data-testid="center-area"
      className={`flex flex-col items-center gap-4 p-4 rounded-xl min-w-[280px] min-h-[160px] transition-all duration-300 ${
        isCombat
          ? 'border border-red-600/20'
          : 'border border-munch-border'
      }`}
      style={{
        background: isCombat
          ? 'radial-gradient(ellipse at center, rgba(220,38,38,0.08) 0%, transparent 70%)'
          : 'radial-gradient(ellipse at center, rgba(201,168,76,0.06) 0%, transparent 70%)',
      }}
    >
      {/* Combat display */}
      {isCombat && combat && (
        <CombatDisplay combat={combat} cardDb={cardDb} players={players} isLocalActive={isLocalActive} onAction={onAction} />
      )}

      {/* Non-combat: show decks */}
      {!isCombat && (
        <DeckArea doorDeckSize={doorDeckSize} treasureDeckSize={treasureDeckSize} />
      )}

      {/* Action buttons */}
      {isLocalActive && !isCombat && (
        <div className="flex gap-2.5 flex-wrap justify-center">
          {phase === 'KICK_DOOR' && (
            <button
              data-testid="btn-kick-door"
              className="px-6 py-2.5 text-sm font-bold font-fantasy text-munch-bg bg-gradient-to-b from-munch-gold-light to-munch-gold border-2 border-[#a08030] rounded-lg cursor-pointer uppercase tracking-wide shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-100 ease-linear"
              onClick={() => onAction?.({ type: 'KICK_DOOR' })}
            >
              Kick Open The Door
            </button>
          )}
          {(phase === 'LOOT_ROOM' || phase === 'LOOK_FOR_TROUBLE' || phase === 'AFTER_COMBAT') && (
            <button
              data-testid="btn-end-turn"
              className="px-6 py-2.5 text-sm font-bold font-fantasy text-munch-bg bg-gradient-to-b from-munch-gold-light to-munch-gold border-2 border-[#a08030] rounded-lg cursor-pointer uppercase tracking-wide shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-100 ease-linear"
              onClick={() => onAction?.({ type: 'END_TURN' })}
            >
              End Turn
            </button>
          )}
          {phase === 'CHARITY' && (
            <button
              data-testid="btn-end-turn"
              className="px-6 py-2.5 text-sm font-bold font-fantasy text-munch-bg bg-gradient-to-b from-munch-gold-light to-munch-gold border-2 border-[#a08030] rounded-lg cursor-pointer uppercase tracking-wide shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-100 ease-linear"
              onClick={() => onAction?.({ type: 'END_TURN' })}
            >
              Done (End Turn)
            </button>
          )}
        </div>
      )}

      {/* Phase hint messages */}
      {!isCombat && (
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
      text = isLocalActive ? 'Play cards or loot the room. End turn when done.' : 'Active player is looting the room...';
      break;
    case 'LOOK_FOR_TROUBLE':
      text = isLocalActive ? 'Play a monster from your hand or end your turn.' : 'Active player is looking for trouble...';
      color = '#7c3aed';
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

function CombatDisplay({
  combat,
  cardDb,
  players,
  isLocalActive,
  onAction,
}: {
  combat: CombatState;
  cardDb: CardDb | null;
  players: Record<string, { name: string }>;
  isLocalActive: boolean;
  onAction?: (action: GameAction) => void;
}) {
  const fighterName = players[combat.activePlayerId]?.name || 'Unknown';

  let playerBonus = 0;
  combat.appliedCards.forEach((ac) => {
    const def = cardDb?.[ac.cardId];
    if (def) {
      def.effects.forEach((e) => {
        if (e.type === 'COMBAT_BONUS') playerBonus += e.value;
      });
    }
  });

  let monsterTotal = 0;
  combat.monsters.forEach((m) => {
    const def = cardDb?.[m.cardId];
    const base = def?.baseLevel ?? 0;
    const mods = m.modifiers.reduce((sum, mod) => sum + mod.value, 0);
    monsterTotal += base + mods;
  });

  return (
    <div
      data-testid="combat-area"
      className="flex flex-col items-center gap-3 w-full"
    >
      <div className="text-[10px] font-bold text-red-600 uppercase tracking-wide px-2.5 py-0.5 rounded bg-red-600/15">
        {combat.phase}
      </div>

      {/* VS layout */}
      <div className="flex items-center gap-4 w-full justify-center">
        {/* Player side */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <div className="text-[11px] font-semibold text-green-400">
            {fighterName}
            {combat.helpers.length > 0 &&
              ` + ${combat.helpers.map((h) => players[h.playerId]?.name || '?').join(', ')}`}
          </div>
          <div className="text-2xl font-bold text-green-400 font-fantasy">
            {playerBonus > 0 ? `+${playerBonus}` : '0'}
          </div>
          <div className="text-[9px] text-munch-text-muted">bonus</div>
        </div>

        <div className="text-base font-bold text-red-600 font-fantasy px-1">
          VS
        </div>

        {/* Monster side */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <div className="flex gap-1.5 justify-center flex-wrap">
            {combat.monsters.map((monster) => {
              const def = cardDb?.[monster.cardId];
              return def ? (
                <GameCard key={monster.instanceId} card={def} compact />
              ) : (
                <div
                  key={monster.instanceId}
                  className="w-[54px] h-[76px] rounded-md bg-violet-600/[.13] border border-violet-600 flex items-center justify-center text-[9px] text-violet-600"
                >
                  ???
                </div>
              );
            })}
          </div>
          <div className="text-2xl font-bold text-red-600 font-fantasy">
            {monsterTotal}
          </div>
          <div className="text-[9px] text-munch-text-muted">total level</div>
        </div>
      </div>

      {/* Combat action buttons */}
      {isLocalActive && (
        <div className="flex gap-2.5 flex-wrap justify-center">
          {combat.phase === 'ACTIVE' && (
            <button
              data-testid="btn-run-away"
              className="px-6 py-2.5 text-sm font-bold font-fantasy text-white bg-gradient-to-b from-red-400 to-red-600 border-2 border-red-800 rounded-lg cursor-pointer uppercase tracking-wide shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-100 ease-linear"
              onClick={() => onAction?.({ type: 'RUN_AWAY', diceRoll: Math.floor(Math.random() * 6) + 1 })}
            >
              Run Away
            </button>
          )}
          {combat.reactionWindow && (
            <button
              data-testid="btn-react-pass"
              className="px-6 py-2.5 text-sm font-bold font-fantasy text-munch-bg bg-gradient-to-b from-munch-gold-light to-munch-gold border-2 border-[#a08030] rounded-lg cursor-pointer uppercase tracking-wide shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-100 ease-linear"
              onClick={() => onAction?.({ type: 'REACT_PASS' })}
            >
              Pass
            </button>
          )}
        </div>
      )}

      {/* Applied cards */}
      {combat.appliedCards.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-center">
          {combat.appliedCards.map((ac, i) => {
            const def = cardDb?.[ac.cardId];
            return (
              <div
                key={`${ac.cardId}-${i}`}
                className="text-[8px] px-1.5 py-0.5 rounded-sm bg-indigo-500/15 border border-indigo-400/25 text-indigo-400"
              >
                {def?.name || ac.cardId}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
