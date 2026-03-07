import React, { useMemo } from 'react';
import type { GameState, CardDb, GameAction } from '@munchkin/shared';
import { PlayerArea } from './PlayerArea';
import { CardHand } from './CardHand';
import { PhaseBar } from './PhaseBar';
import { CenterArea } from './CenterArea';
import { GameLog } from './GameLog';

interface Props {
  state: GameState;
  selfPlayerId?: string;
  cardDb: CardDb | null;
  onAction?: (action: GameAction) => void;
}

export function GameBoard({ state, selfPlayerId, cardDb, onAction }: Props) {
  const otherPlayers = useMemo(() => {
    return state.playerOrder.filter((id) => id !== selfPlayerId);
  }, [state.playerOrder, selfPlayerId]);

  const localPlayer = selfPlayerId ? state.players[selfPlayerId] : null;
  const activePlayer = state.players[state.activePlayerId];
  const isLocalActive = selfPlayerId === state.activePlayerId;

  // Build a simple name map for CenterArea
  const playerNameMap = useMemo(() => {
    const map: Record<string, { name: string }> = {};
    for (const id of state.playerOrder) {
      const p = state.players[id];
      if (p) map[id] = { name: p.name };
    }
    return map;
  }, [state.players, state.playerOrder]);

  // Distribute other players around the top and sides
  const { topPlayers, leftPlayers, rightPlayers } = useMemo(() => {
    const count = otherPlayers.length;
    if (count <= 3) {
      return { topPlayers: otherPlayers, leftPlayers: [] as string[], rightPlayers: [] as string[] };
    }
    // For 4+ opponents: put 1 on left, 1 on right, rest on top
    return {
      leftPlayers: [otherPlayers[0]],
      topPlayers: otherPlayers.slice(1, count - 1),
      rightPlayers: [otherPlayers[count - 1]],
    };
  }, [otherPlayers]);

  return (
    <div
      data-testid="game-board"
      className="w-screen h-screen grid grid-rows-[auto_1fr_auto_auto] grid-cols-[auto_1fr_auto] bg-munch-bg overflow-hidden relative min-h-screen"
    >
      {/* Top row: other players + phase bar */}
      <div
        data-testid="players-area"
        className="col-span-full flex items-start justify-center gap-2 px-4 py-2 border-b border-munch-border bg-black/20 flex-wrap"
      >
        {/* Left side top players */}
        <div className="flex gap-1 items-start">
          {topPlayers.slice(0, Math.ceil(topPlayers.length / 2)).map((id) => (
            <PlayerArea
              key={id}
              player={state.players[id]}
              isActive={id === state.activePlayerId}
              isSelf={false}
              compact
            />
          ))}
        </div>

        {/* Phase bar in center */}
        <PhaseBar
          phase={state.phase}
          activePlayerName={activePlayer?.name || ''}
          isLocalPlayerActive={isLocalActive}
        />

        {/* Right side top players */}
        <div className="flex gap-1 items-start">
          {topPlayers.slice(Math.ceil(topPlayers.length / 2)).map((id) => (
            <PlayerArea
              key={id}
              player={state.players[id]}
              isActive={id === state.activePlayerId}
              isSelf={false}
              compact
            />
          ))}
        </div>
      </div>

      {/* Left side player (if any) */}
      <div className="row-start-2 col-start-1 flex flex-col items-center justify-center p-2">
        {leftPlayers.map((id) => (
          <PlayerArea
            key={id}
            player={state.players[id]}
            isActive={id === state.activePlayerId}
            isSelf={false}
            compact
          />
        ))}
      </div>

      {/* Center area */}
      <div className="row-start-2 col-start-2 flex items-center justify-center p-3 relative">
        <CenterArea
          phase={state.phase}
          combat={state.combat}
          doorDeckSize={state.doorDeck.length}
          treasureDeckSize={state.treasureDeck.length}
          cardDb={cardDb}
          players={playerNameMap}
          isLocalActive={isLocalActive}
          onAction={onAction}
        />
      </div>

      {/* Right side player (if any) */}
      <div className="row-start-2 col-start-3 flex flex-col items-center justify-center p-2">
        {rightPlayers.map((id) => (
          <PlayerArea
            key={id}
            player={state.players[id]}
            isActive={id === state.activePlayerId}
            isSelf={false}
            compact
          />
        ))}
      </div>

      {/* Local player's hand */}
      <div className="col-span-full row-start-3 flex justify-center items-end border-t border-munch-border bg-black/15 py-1 overflow-visible relative z-20">
        {localPlayer && (
          <CardHand cards={localPlayer.hand} isSelf={true} cardDb={cardDb} onAction={onAction} isLocalActive={isLocalActive} phase={state.phase} />
        )}
      </div>

      {/* Local player info bar */}
      <div className="col-span-full row-start-4 flex items-center justify-center gap-4 px-4 py-1.5 bg-black/30 border-t border-munch-border">
        {localPlayer && (
          <>
            <PlayerArea
              player={localPlayer}
              isActive={isLocalActive}
              isSelf={true}
              compact
            />

            {/* Equipped items summary */}
            <div className="flex gap-1 flex-wrap items-center">
              {localPlayer.equipped.head && cardDb?.[localPlayer.equipped.head] && (
                <EquipBadge name={cardDb[localPlayer.equipped.head].name} slot="Head" />
              )}
              {localPlayer.equipped.body && cardDb?.[localPlayer.equipped.body] && (
                <EquipBadge name={cardDb[localPlayer.equipped.body].name} slot="Body" />
              )}
              {localPlayer.equipped.feet && cardDb?.[localPlayer.equipped.feet] && (
                <EquipBadge name={cardDb[localPlayer.equipped.feet].name} slot="Feet" />
              )}
              {localPlayer.equipped.leftHand && cardDb?.[localPlayer.equipped.leftHand] && (
                <EquipBadge name={cardDb[localPlayer.equipped.leftHand].name} slot="L.Hand" />
              )}
              {localPlayer.equipped.rightHand && cardDb?.[localPlayer.equipped.rightHand] && (
                <EquipBadge name={cardDb[localPlayer.equipped.rightHand].name} slot="R.Hand" />
              )}
              {localPlayer.equipped.twoHands && cardDb?.[localPlayer.equipped.twoHands] && (
                <EquipBadge name={cardDb[localPlayer.equipped.twoHands].name} slot="2H" />
              )}
              {localPlayer.equipped.extras.map((cardId) => {
                const def = cardDb?.[cardId];
                return def ? <EquipBadge key={cardId} name={def.name} slot="Extra" /> : null;
              })}
              {localPlayer.carried.length > 0 && (
                <span className="text-[9px] text-munch-text-muted px-1.5 rounded-sm bg-munch-text-muted/10 border border-munch-text-muted/20">
                  +{localPlayer.carried.length} carried
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Floating game log */}
      <div className="absolute bottom-[100px] right-3 w-[220px] max-h-[160px] opacity-80 z-10">
        <GameLog entries={state.log} />
      </div>
    </div>
  );
}

function EquipBadge({ name, slot }: { name: string; slot: string }) {
  return (
    <div className="flex flex-col items-center px-1.5 py-0.5 rounded border border-amber-600/30 bg-amber-600/[.12]">
      <span className="text-[7px] text-amber-600 font-bold uppercase">
        {slot}
      </span>
      <span className="text-[8px] text-munch-text font-semibold max-w-[70px] overflow-hidden text-ellipsis whitespace-nowrap">
        {name}
      </span>
    </div>
  );
}
