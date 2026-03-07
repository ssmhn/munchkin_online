import React, { useState } from 'react';
import type { CardDb, GameAction, GamePhase } from '@munchkin/shared';
import { GameCard } from './GameCard';

interface Props {
  cards: string[];
  isSelf: boolean;
  cardDb: CardDb | null;
  onAction?: (action: GameAction) => void;
  isLocalActive?: boolean;
  phase?: GamePhase;
}

export function CardHand({ cards, isSelf, cardDb, onAction, isLocalActive, phase }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!isSelf) {
    return (
      <div
        data-testid="other-hand"
        className="flex gap-0.5 justify-center"
      >
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

  const handleCardClick = (cardId: string) => {
    if (!onAction || !cardDb) return;
    const def = cardDb[cardId];
    if (!def) return;

    // Equipment can be equipped any time during your turn (non-combat phases)
    if (def.type === 'EQUIPMENT') {
      onAction({ type: 'EQUIP_ITEM', cardId });
      return;
    }

    // Other playable cards
    onAction({ type: 'PLAY_CARD', cardId });
  };

  const cardCount = cards.length;
  if (cardCount === 0) return null;

  // Card dimensions
  const cardW = 120;
  const cardH = 170;

  // Fan parameters
  const maxAngle = Math.min(30, cardCount * 3.5);
  const angleStep = cardCount > 1 ? (maxAngle * 2) / (cardCount - 1) : 0;

  // How much cards overlap horizontally
  const maxTotalWidth = Math.min(window.innerWidth * 0.85, 900);
  const spacing = Math.min(cardW - 10, Math.max(50, (maxTotalWidth - cardW) / Math.max(cardCount - 1, 1)));
  const totalWidth = spacing * (cardCount - 1) + cardW;

  // Container height needs to fit card + rotation lift + hover lift
  const containerHeight = cardH + 60;

  return (
    <div
      data-testid="own-hand"
      className="relative mx-auto"
      style={{
        width: `${totalWidth}px`,
        height: `${containerHeight}px`,
      }}
    >
      {cards.map((cardId, i) => {
        const cardDef = cardDb?.[cardId];
        const angle = cardCount > 1 ? -maxAngle + angleStep * i : 0;
        const normalizedPos = cardCount > 1 ? (i / (cardCount - 1)) * 2 - 1 : 0;
        const yOffset = normalizedPos * normalizedPos * 20;
        const isHovered = hoveredIndex === i;

        const x = spacing * i;
        const y = yOffset + 20;

        return (
          <div
            key={`${cardId}-${i}`}
            data-testid={`card-${cardId}`}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="absolute origin-bottom cursor-pointer transition-transform duration-200"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${cardW}px`,
              height: `${cardH}px`,
              transform: isHovered
                ? 'translateY(-30px) rotate(0deg) scale(1.08)'
                : `rotate(${angle}deg)`,
              zIndex: isHovered ? 100 : i,
              filter: isHovered ? 'brightness(1.15)' : 'none',
            }}
          >
            {cardDef ? (
              <GameCard card={cardDef} onClick={() => handleCardClick(cardId)} />
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
