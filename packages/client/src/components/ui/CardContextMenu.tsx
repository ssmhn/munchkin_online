import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import type { CardDefinition, GamePhase } from '@munchkin/shared';

interface MenuItem {
  label: string;
  action: string;
  disabled?: boolean;
}

interface Props {
  card: CardDefinition;
  cardId: string;
  source: 'HAND' | 'EQUIPMENT' | 'BACKPACK';
  phase: GamePhase;
  isCombat: boolean;
  backpackFull: boolean;
  enableBackpack: boolean;
  position: { x: number; y: number };
  onAction: (action: string, cardId: string) => void;
  onClose: () => void;
}

export function CardContextMenu({
  card,
  cardId,
  source,
  phase,
  isCombat,
  backpackFull,
  enableBackpack,
  position,
  onAction,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = position.x;
      let y = position.y;

      // If menu would overflow bottom, open upward
      if (y + rect.height > vh) {
        y = position.y - rect.height;
      }
      // If menu would overflow right, shift left
      if (x + rect.width > vw) {
        x = vw - rect.width - 8;
      }
      if (x !== position.x || y !== position.y) {
        setAdjusted({ x, y });
      }

      gsap.fromTo(ref.current,
        { scale: 0.85, opacity: 0, y: -10 },
        { scale: 1, opacity: 1, y: 0, duration: 0.2, ease: 'back.out(2)' },
      );
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const items: MenuItem[] = [];

  if (source === 'HAND') {
    if (
      card.type === 'EQUIPMENT' &&
      card.slots &&
      card.slots.length > 0 &&
      !isCombat
    ) {
      items.push({ label: 'Equip', action: 'EQUIP_ITEM' });
    }
    if (enableBackpack && !backpackFull && !isCombat && card.value != null && card.value > 0) {
      items.push({ label: 'Put in Backpack', action: 'PUT_IN_BACKPACK' });
    }
    if (card.type === 'MONSTER' && phase === 'LOOT_ROOM' && !isCombat) {
      items.push({ label: 'Look for Trouble', action: 'LOOK_FOR_TROUBLE' });
    } else if (isCombat) {
      // During combat: MODIFIER, ONE_SHOT, CURSE, SPECIAL can be played
      const combatPlayable = ['MODIFIER', 'ONE_SHOT', 'CURSE', 'SPECIAL'];
      if (combatPlayable.includes(card.type)) {
        // If playableFrom is set, check context
        if (card.playableFrom && card.playableFrom.length > 0) {
          const canPlay = card.playableFrom.some((ctx) =>
            ctx === 'ANY_COMBAT' || ctx === 'REACTION' ||
            ctx === 'YOUR_TURN_COMBAT' || ctx === 'ANYTIME'
          );
          if (canPlay) {
            items.push({ label: 'Play Card', action: 'PLAY_CARD' });
          }
        } else {
          // No playableFrom restriction — allow in combat
          items.push({ label: 'Play Card', action: 'PLAY_CARD' });
        }
      }
    } else if (card.playableFrom && card.playableFrom.length > 0) {
      // Outside combat: check playableFrom
      const canPlay = !card.playableFrom.every((ctx) =>
        ctx === 'ANY_COMBAT' || ctx === 'YOUR_TURN_COMBAT'
      );
      if (canPlay) {
        items.push({ label: 'Play Card', action: 'PLAY_CARD' });
      }
    }
    if (card.value != null && !isCombat) {
      items.push({ label: `Sell (${card.value} gold)`, action: 'SELL_ITEM' });
    }
    if (phase === 'CHARITY') {
      items.push({ label: 'Discard', action: 'DISCARD_CARD' });
    }
    items.push({ label: 'Details...', action: 'VIEW_DETAIL' });
  } else if (source === 'EQUIPMENT') {
    if (!isCombat) {
      items.push({ label: 'Unequip to Hand', action: 'UNEQUIP_ITEM' });
    }
    items.push({ label: 'Details...', action: 'VIEW_DETAIL' });
  } else if (source === 'BACKPACK') {
    if (!isCombat) {
      items.push({ label: 'Take to Hand', action: 'TAKE_FROM_BACKPACK' });
    }
    items.push({ label: 'Details...', action: 'VIEW_DETAIL' });
  }

  return (
    <div
      ref={ref}
      className="fixed z-[10000] bg-munch-surface border border-munch-border rounded-lg shadow-xl overflow-hidden min-w-[180px]"
      style={{ left: adjusted?.x ?? position.x, top: adjusted?.y ?? position.y }}
    >
      <div className="px-3 py-2 border-b border-munch-border">
        <div className="text-xs font-bold text-munch-text font-fantasy">
          {card.name}
        </div>
      </div>
      {items.map((item) => (
        <button
          key={item.action}
          onClick={() => {
            onAction(item.action, cardId);
            onClose();
          }}
          disabled={item.disabled}
          className="w-full text-left px-3 py-2 text-sm text-munch-text hover:bg-munch-surface-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
