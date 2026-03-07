import React, { useMemo, useState, useCallback } from 'react';
import type { GameState, CardDb, GameAction } from '@munchkin/shared';
import { PhaseBar } from './PhaseBar';
import { CardHand } from './CardHand';
import { CenterArea } from './CenterArea';
import { GameLog } from './GameLog';
import { PlayerStatsPanel } from './board/PlayerStatsPanel';
import { OtherPlayerCard } from './board/OtherPlayerCard';
import { EquipmentZone } from './board/EquipmentZone';
import { BackpackPanel } from './board/BackpackPanel';
// RevealedCard is now rendered inline in CenterArea
import { CharityOverlay } from './overlays/CharityOverlay';
import { ChooseTargetOverlay } from './ChooseTargetOverlay';
import { CardContextMenu } from './ui/CardContextMenu';
import { CardDetailModal } from './ui/CardDetailModal';

interface Props {
  state: GameState;
  selfPlayerId?: string;
  cardDb: CardDb | null;
  onAction?: (action: GameAction) => void;
}

export function GameBoard({ state, selfPlayerId, cardDb, onAction }: Props) {
  const [contextMenu, setContextMenu] = useState<{ cardId: string; position: { x: number; y: number }; source: 'HAND' | 'EQUIPMENT' | 'BACKPACK' } | null>(null);
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  const otherPlayers = useMemo(
    () => state.playerOrder.filter((id) => id !== selfPlayerId),
    [state.playerOrder, selfPlayerId],
  );

  const localPlayer = selfPlayerId ? state.players[selfPlayerId] : null;
  const activePlayer = state.players[state.activePlayerId];
  const isLocalActive = selfPlayerId === state.activePlayerId;

  const playerNameMap = useMemo(() => {
    const map: Record<string, { name: string }> = {};
    for (const id of state.playerOrder) {
      const p = state.players[id];
      if (p) map[id] = { name: p.name };
    }
    return map;
  }, [state.players, state.playerOrder]);

  const sendAction = useCallback(
    (action: GameAction) => onAction?.(action),
    [onAction],
  );

  const handleContextMenu = useCallback(
    (cardId: string, position: { x: number; y: number }) => {
      setContextMenu({ cardId, position, source: 'HAND' });
    },
    [],
  );

  const handleContextAction = useCallback(
    (action: string, cardId: string) => {
      switch (action) {
        case 'EQUIP_ITEM':
          sendAction({ type: 'EQUIP_ITEM', cardId });
          break;
        case 'UNEQUIP_ITEM':
          sendAction({ type: 'UNEQUIP_ITEM', cardId });
          break;
        case 'PUT_IN_BACKPACK':
          sendAction({ type: 'PUT_IN_BACKPACK', cardId });
          break;
        case 'TAKE_FROM_BACKPACK':
          sendAction({ type: 'TAKE_FROM_BACKPACK', cardId });
          break;
        case 'PLAY_CARD':
          sendAction({ type: 'PLAY_CARD', cardId });
          break;
        case 'LOOK_FOR_TROUBLE':
          sendAction({ type: 'LOOK_FOR_TROUBLE', cardId });
          break;
        case 'DISCARD_CARD':
          sendAction({ type: 'DISCARD_CARD', cardId });
          break;
        case 'SELL_ITEM':
          sendAction({ type: 'SELL_ITEMS', cardIds: [cardId] });
          break;
        case 'VIEW_DETAIL':
          setDetailCardId(cardId);
          break;
      }
    },
    [sendAction],
  );

  // Drop handler for table zone (play card)
  const handleTableDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.classList.remove('drop-hover');
      const raw = e.dataTransfer.getData('application/munchkin-card');
      if (!raw) return;
      try {
        const payload = JSON.parse(raw);
        if (payload.sourceZone === 'HAND') {
          const def = cardDb?.[payload.cardId];
          // Monster during LOOT_ROOM = Look for Trouble
          if (def?.type === 'MONSTER' && state.phase === 'LOOT_ROOM') {
            sendAction({ type: 'LOOK_FOR_TROUBLE', cardId: payload.cardId });
          } else if (def?.type === 'EQUIPMENT' && state.phase !== 'COMBAT') {
            sendAction({ type: 'EQUIP_ITEM', cardId: payload.cardId });
          } else {
            sendAction({ type: 'PLAY_CARD', cardId: payload.cardId });
          }
        }
      } catch { /* ignore */ }
    },
    [sendAction, cardDb, state.phase],
  );

  const handleTableDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('application/munchkin-card')) {
      e.preventDefault();
      e.currentTarget.classList.add('drop-hover');
    }
  }, []);

  const handleTableDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('drop-hover');
  }, []);

  // Check for revealed cards
  const revealedCard = state.revealedCards.length > 0 ? state.revealedCards[0] : null;
  const isRevealOwner = revealedCard?.ownerId === selfPlayerId;
  const reactionWindowOpen = !!state.combat?.reactionWindow;

  // Other players for charity
  const charityOtherPlayers = useMemo(
    () => otherPlayers.map((id) => ({ id, name: state.players[id]?.name ?? id })),
    [otherPlayers, state.players],
  );

  return (
    <div
      data-testid="game-board"
      className="w-screen h-screen flex flex-col bg-munch-bg overflow-hidden relative"
    >
      {/* Row 1: Other players + Phase bar */}
      <div className="flex items-start justify-center gap-2 px-4 py-2 border-b border-munch-border bg-black/20 flex-wrap shrink-0">
        <div className="flex gap-1 items-start flex-wrap flex-1 justify-center">
          {otherPlayers.map((id) => (
            <OtherPlayerCard
              key={id}
              player={state.players[id]}
              isActive={id === state.activePlayerId}
              isHelper={state.combat?.helpers.some((h) => h.playerId === id)}
              cardDb={cardDb}
              onClick={() => {
                // Could open player detail modal
              }}
            />
          ))}
        </div>
        <PhaseBar
          phase={state.phase}
          activePlayerName={activePlayer?.name || ''}
          isLocalPlayerActive={isLocalActive}
        />
      </div>

      {/* Row 2: Main content — [Stats + Equip] [Table] [Backpack] */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left column: Player stats + Equipment */}
        {localPlayer && (
          <div className="flex flex-col gap-2 p-2 overflow-auto shrink-0 w-[180px]">
            <PlayerStatsPanel
              player={localPlayer}
              cardDb={cardDb}
              combat={state.combat}
              backpackSize={state.config.backpackSize}
              enableBackpack={state.config.enableBackpack}
            />
            <EquipmentZone
              equipped={localPlayer.equipped}
              cardDb={cardDb}
              phase={state.phase}
              onAction={sendAction}
            />
          </div>
        )}

        {/* Center: Table zone */}
        <div
          className="flex-1 flex items-center justify-center p-3 relative [&.drop-hover]:bg-munch-gold/5 transition-colors"
          onDrop={handleTableDrop}
          onDragOver={handleTableDragOver}
          onDragLeave={handleTableDragLeave}
        >
          <CenterArea
            phase={state.phase}
            combat={state.combat}
            doorDeckSize={state.doorDeck.length}
            treasureDeckSize={state.treasureDeck.length}
            cardDb={cardDb}
            players={playerNameMap}
            isLocalActive={isLocalActive}
            selfPlayerId={selfPlayerId}
            revealedCard={revealedCard}
            isRevealOwner={isRevealOwner}
            reactionWindowOpen={reactionWindowOpen}
            playerStates={state.players}
            onAction={onAction}
          />
        </div>

        {/* Right column: Backpack + Reaction button */}
        <div className="p-2 shrink-0 w-[140px] flex flex-col gap-2">
          {localPlayer && state.config.enableBackpack && (
            <BackpackPanel
              backpack={localPlayer.backpack}
              backpackSize={state.config.backpackSize}
              cardDb={cardDb}
              phase={state.phase}
              onAction={sendAction}
            />
          )}

          {/* Reaction Pass button — shown when reaction window is open and player hasn't passed yet */}
          {reactionWindowOpen && selfPlayerId && (() => {
            const rw = state.combat?.reactionWindow;
            const myResponse = rw?.responses[selfPlayerId];
            const needsResponse = myResponse && !myResponse.passed && !myResponse.cardId;
            if (!needsResponse) return null;
            return (
              <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-amber-600/30 bg-amber-600/10">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide text-center">
                  Reaction Window
                </div>
                <div className="text-[9px] text-munch-text-muted text-center">
                  Play a card from hand or pass
                </div>
                <button
                  data-testid="btn-react-pass"
                  onClick={() => sendAction({ type: 'REACT_PASS' })}
                  className="px-3 py-1.5 text-xs font-bold font-fantasy text-munch-bg bg-gradient-to-b from-munch-gold-light to-munch-gold border border-[#a08030] rounded cursor-pointer uppercase tracking-wide shadow-[0_1px_4px_rgba(0,0,0,0.3)] hover:scale-105 transition-transform"
                >
                  Pass
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Row 3: Player's hand */}
      <div className="border-t border-munch-border bg-black/15 py-1 overflow-visible relative z-20 shrink-0">
        {localPlayer && (
          <CardHand
            cards={localPlayer.hand}
            isSelf={true}
            cardDb={cardDb}
            onAction={onAction}
            isLocalActive={isLocalActive}
            phase={state.phase}
            inCombat={!!state.combat}
            combatActivePlayerId={state.combat?.activePlayerId}
            selfPlayerId={selfPlayerId}
            onContextMenu={handleContextMenu}
            onHoverCard={setHoveredCardId}
          />
        )}
      </div>

      {/* Floating game log */}
      <div className="absolute bottom-[120px] right-3 w-[220px] max-h-[160px] opacity-80 z-10">
        <GameLog entries={state.log} />
      </div>

      {/* --- Overlays --- */}

      {/* Pending action overlay (choose monster, choose player, etc.) */}
      {selfPlayerId && (() => {
        const pending = state.pendingActions.find((pa) => pa.playerId === selfPlayerId);
        if (!pending) return null;
        return (
          <ChooseTargetOverlay
            action={pending}
            onChoose={(optionId) => sendAction({ type: 'CHOOSE_OPTION', optionId })}
          />
        );
      })()}

      {/* Charity overlay */}
      {state.phase === 'CHARITY' && localPlayer && isLocalActive && (
        <CharityOverlay
          player={localPlayer}
          cardDb={cardDb}
          otherPlayers={charityOtherPlayers}
          onAction={sendAction}
        />
      )}

      {/* Context menu */}
      {contextMenu && cardDb?.[contextMenu.cardId] && (
        <CardContextMenu
          card={cardDb[contextMenu.cardId]}
          cardId={contextMenu.cardId}
          source={contextMenu.source}
          phase={state.phase}
          isCombat={!!state.combat}
          backpackFull={localPlayer ? localPlayer.backpack.length >= state.config.backpackSize : true}
          enableBackpack={state.config.enableBackpack}
          position={contextMenu.position}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Card detail modal */}
      {detailCardId && cardDb?.[detailCardId] && (
        <CardDetailModal
          card={cardDb[detailCardId]}
          onClose={() => setDetailCardId(null)}
        />
      )}
    </div>
  );
}
