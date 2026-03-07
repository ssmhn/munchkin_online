import React, { useState, useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import type { CardDb, GameAction, GamePhase, CardId } from '@munchkin/shared';
import { GameCard } from './GameCard';

interface Props {
  cards: string[];
  isSelf: boolean;
  cardDb: CardDb | null;
  onAction?: (action: GameAction) => void;
  isLocalActive?: boolean;
  phase?: GamePhase;
  inCombat?: boolean;
  combatActivePlayerId?: string;
  selfPlayerId?: string;
  onContextMenu?: (cardId: string, position: { x: number; y: number }) => void;
  onHoverCard?: (cardId: string | null) => void;
}

export function CardHand({
  cards,
  isSelf,
  cardDb,
  onAction,
  isLocalActive,
  phase,
  inCombat,
  combatActivePlayerId,
  selfPlayerId,
  onContextMenu,
  onHoverCard,
}: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(cards.length);

  // Animate card positions when count changes
  useEffect(() => {
    if (prevCount.current !== cards.length && containerRef.current) {
      const elements = cardRefs.current.filter(Boolean) as HTMLDivElement[];
      gsap.fromTo(
        elements,
        { x: 0 },
        { x: 0, duration: 0.3, ease: 'power2.out', stagger: 0.03 },
      );
      prevCount.current = cards.length;
    }
  }, [cards.length]);

  const handleMouseEnter = useCallback(
    (i: number, cardId: string, el: HTMLDivElement) => {
      setHoveredIndex(i);
      gsap.to(el, { y: -24, scale: 1.08, zIndex: 100, duration: 0.2, ease: 'power2.out' });
      onHoverCard?.(cardId);
    },
    [onHoverCard],
  );

  const handleMouseLeave = useCallback(
    (el: HTMLDivElement) => {
      setHoveredIndex(null);
      gsap.to(el, { y: 0, scale: 1, zIndex: 'auto', duration: 0.2 });
      onHoverCard?.(null);
    },
    [onHoverCard],
  );

  const handleRightClick = useCallback(
    (e: React.MouseEvent, cardId: string) => {
      e.preventDefault();
      onContextMenu?.(cardId, { x: e.clientX, y: e.clientY });
    },
    [onContextMenu],
  );

  // Determine if a card is draggable
  const isDraggable = useCallback(
    (cardId: string): boolean => {
      if (!isSelf) return false;
      if (phase === 'WAITING' || phase === 'END_GAME') return false;
      if (!isLocalActive && phase === 'COMBAT') {
        // Not my combat — modifiers, one-shots, curses, and reaction/any-combat cards are draggable
        const def = cardDb?.[cardId];
        if (!def) return false;
        const combatPlayable = ['MODIFIER', 'ONE_SHOT', 'CURSE'];
        if (combatPlayable.includes(def.type)) return true;
        if (def.playableFrom?.includes('REACTION')) return true;
        if (def.playableFrom?.includes('ANY_COMBAT')) return true;
        return false;
      }
      return true;
    },
    [isSelf, phase, isLocalActive, cardDb],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, cardId: string) => {
      if (!isDraggable(cardId)) {
        e.preventDefault();
        return;
      }
      const payload = JSON.stringify({ cardId, sourceZone: 'HAND' });
      e.dataTransfer.setData('application/munchkin-card', payload);
      e.dataTransfer.effectAllowed = 'move';
      (e.currentTarget as HTMLElement).style.opacity = '0.4';
    },
    [isDraggable],
  );

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
  }, []);

  const handleCardClick = useCallback(
    (cardId: string, e?: React.MouseEvent) => {
      if (!onAction || !cardDb) return;
      const def = cardDb[cardId];
      if (!def) return;

      // Equipment cards: always open context menu to show equip/sell/backpack options
      if (def.type === 'EQUIPMENT' && !inCombat) {
        if (e && onContextMenu) {
          onContextMenu(cardId, { x: e.clientX, y: e.clientY });
        }
        return;
      }

      if (inCombat) {
        // During combat, only allow playable card types
        const combatPlayable = ['MODIFIER', 'ONE_SHOT', 'SPECIAL', 'CURSE'];
        if (!combatPlayable.includes(def.type)) return; // silently ignore non-playable cards

        // Check playableFrom
        if (def.playableFrom && def.playableFrom.length > 0) {
          const iAmCombatActive = combatActivePlayerId === selfPlayerId;
          const allowed = def.playableFrom.some((ctx: string) =>
            ctx === 'ANY_COMBAT' ||
            ctx === 'REACTION' ||
            (ctx === 'YOUR_TURN_COMBAT' && iAmCombatActive) ||
            ctx === 'ANYTIME'
          );
          if (!allowed) return;
        }

        onAction({ type: 'PLAY_CARD', cardId });
        return;
      }

      // Monster in LOOT_ROOM = Look for Trouble
      if (def.type === 'MONSTER' && phase === 'LOOT_ROOM') {
        onAction({ type: 'LOOK_FOR_TROUBLE', cardId });
        return;
      }

      // Don't play combat-only cards outside combat
      if (def.playableFrom && def.playableFrom.length > 0) {
        const combatOnly = def.playableFrom.every((ctx: string) =>
          ctx === 'ANY_COMBAT' || ctx === 'YOUR_TURN_COMBAT'
        );
        if (combatOnly) return;
      }

      // Don't play monsters outside LOOT_ROOM
      if (def.type === 'MONSTER') return;

      onAction({ type: 'PLAY_CARD', cardId });
    },
    [onAction, cardDb, phase, inCombat, combatActivePlayerId, selfPlayerId, onContextMenu],
  );

  if (!isSelf) {
    return (
      <div data-testid="other-hand" className="flex gap-0.5 justify-center">
        {cards.map((_, i) => (
          <div
            key={i}
            data-testid="card-back"
            className="w-5 h-7 rounded-sm bg-gradient-to-br from-violet-600/[.13] to-violet-600/[.27] border border-violet-600/40"
          />
        ))}
      </div>
    );
  }

  const cardCount = cards.length;
  if (cardCount === 0) return null;

  const cardW = 120;
  const cardH = 170;
  const maxAngle = Math.min(30, cardCount * 3.5);
  const angleStep = cardCount > 1 ? (maxAngle * 2) / (cardCount - 1) : 0;
  const maxTotalWidth = Math.min(window.innerWidth * 0.85, 900);
  const spacing = Math.min(
    cardW - 10,
    Math.max(50, (maxTotalWidth - cardW) / Math.max(cardCount - 1, 1)),
  );
  const totalWidth = spacing * (cardCount - 1) + cardW;
  const containerHeight = cardH + 60;

  // Determine card visual state
  const getCardOpacity = (cardId: string): number => {
    if (!isLocalActive && phase !== 'COMBAT') return 0.5;
    if (phase === 'COMBAT' && combatActivePlayerId !== selfPlayerId) {
      const def = cardDb?.[cardId];
      if (!def) return 0.4;
      const combatPlayable = ['MODIFIER', 'ONE_SHOT', 'CURSE'];
      if (combatPlayable.includes(def.type)) return 1;
      if (def.playableFrom?.includes('REACTION') || def.playableFrom?.includes('ANY_COMBAT')) return 1;
      return 0.4;
    }
    return 1;
  };

  return (
    <div
      ref={containerRef}
      data-testid="own-hand"
      className="relative mx-auto"
      style={{ width: `${totalWidth}px`, height: `${containerHeight}px` }}
    >
      {cards.map((cardId, i) => {
        const cardDef = cardDb?.[cardId];
        const angle = cardCount > 1 ? -maxAngle + angleStep * i : 0;
        const normalizedPos = cardCount > 1 ? (i / (cardCount - 1)) * 2 - 1 : 0;
        const yOffset = normalizedPos * normalizedPos * 20;
        const isHovered = hoveredIndex === i;
        const x = spacing * i;
        const y = yOffset + 20;
        const opacity = getCardOpacity(cardId);

        return (
          <div
            key={`${cardId}-${i}`}
            ref={(el) => { cardRefs.current[i] = el; }}
            data-testid={`card-${cardId}`}
            draggable={isDraggable(cardId)}
            onDragStart={(e) => handleDragStart(e, cardId)}
            onDragEnd={handleDragEnd}
            onMouseEnter={(e) => handleMouseEnter(i, cardId, e.currentTarget)}
            onMouseLeave={(e) => handleMouseLeave(e.currentTarget)}
            onContextMenu={(e) => handleRightClick(e, cardId)}
            className="absolute origin-bottom cursor-pointer"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${cardW}px`,
              height: `${cardH}px`,
              transform: isHovered ? 'translateY(-30px) rotate(0deg) scale(1.08)' : `rotate(${angle}deg)`,
              zIndex: isHovered ? 100 : i,
              filter: isHovered ? 'brightness(1.15)' : 'none',
              opacity,
              transition: 'opacity 0.2s',
            }}
          >
            {cardDef ? (
              <GameCard card={cardDef} onClick={(e?: React.MouseEvent) => handleCardClick(cardId, e)} />
            ) : (
              <div className="w-full h-full rounded-lg border-2 border-violet-600 bg-gradient-to-br from-violet-600/[.13] to-violet-600/[.27] flex items-center justify-center text-violet-600 text-xs font-semibold">
                {cardId}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
