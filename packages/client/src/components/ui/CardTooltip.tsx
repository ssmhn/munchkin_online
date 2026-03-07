import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CardDefinition } from '@munchkin/shared';

interface Props {
  card: CardDefinition;
}

const TYPE_LABELS: Record<string, string> = {
  MONSTER: 'Monster',
  EQUIPMENT: 'Equipment',
  ONE_SHOT: 'One Shot',
  CURSE: 'Curse',
  RACE: 'Race',
  CLASS: 'Class',
  MODIFIER: 'Modifier',
  SPECIAL: 'Special',
};

const SLOT_LABELS: Record<string, string> = {
  head: 'Голова',
  body: 'Тело',
  feet: 'Ноги',
  hand: 'Рука',
  twoHands: 'Две руки',
};

function formatEffectLines(card: CardDefinition): string[] {
  const lines: string[] = [];
  for (const e of card.effects) {
    const ea = e as any;
    switch (ea.type) {
      case 'COMBAT_BONUS':
        lines.push(`${ea.value > 0 ? '+' : ''}${ea.value} к бою`);
        break;
      case 'ESCAPE_BONUS':
        lines.push(`${ea.value > 0 ? '+' : ''}${ea.value} к побегу`);
        break;
      case 'APPLY_STATUS':
        break;
      case 'MONSTER_BONUS':
        lines.push(`+${ea.value} монстру`);
        break;
      case 'MONSTER_PENALTY':
        lines.push(`-${ea.value} монстру`);
        break;
      case 'MODIFY_LEVEL':
        lines.push(`${ea.value > 0 ? '+' : ''}${ea.value} уровень`);
        break;
    }
  }
  return lines;
}

export function CardTooltip({ card }: Props) {
  const isMonster = card.type === 'MONSTER';
  const effectLines = formatEffectLines(card);

  return (
    <div
      className="bg-munch-surface border border-munch-border rounded-lg shadow-xl p-3 min-w-[200px] max-w-[280px]"
    >
      <div className="text-sm font-bold text-munch-text font-fantasy mb-1">
        {card.name}
      </div>
      <div className="text-[10px] text-munch-text-muted mb-2 flex gap-2 flex-wrap">
        <span>{TYPE_LABELS[card.type] ?? card.type}</span>
        {card.slots && card.slots.length > 0 && (
          <span>Слот: {card.slots.map((s: string) => SLOT_LABELS[s] || s).join(', ')}</span>
        )}
        {card.value != null && <span>{card.value} gp</span>}
        {card.isBig && <span className="text-amber-500 font-bold">Большой</span>}
      </div>
      {isMonster && (
        <div className="text-xs text-munch-text mb-1">
          <div>Level: {card.baseLevel}</div>
          {card.treasures != null && <div>Treasures: {card.treasures}</div>}
        </div>
      )}
      {effectLines.length > 0 && (
        <div className="mb-1">
          {effectLines.map((line, i) => (
            <div key={i} className="text-[11px] text-green-400 font-semibold">{line}</div>
          ))}
        </div>
      )}
      {card.description && (
        <div className="text-[11px] text-munch-text-muted leading-snug">
          {card.description}
        </div>
      )}
      {isMonster && card.badStuff?.description && (
        <div className="mt-1.5 pt-1.5 border-t border-munch-border">
          <div className="text-[10px] font-bold text-red-400 mb-0.5">
            Bad Stuff:
          </div>
          <div className="text-[10px] text-red-300">
            {card.badStuff.description}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HoverTooltip — wraps any element with a hover-triggered tooltip
// ---------------------------------------------------------------------------

interface HoverTooltipProps {
  card: CardDefinition | null | undefined;
  children: React.ReactNode;
}

export function HoverTooltip({ card, children }: HoverTooltipProps) {
  const [show, setShow] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  if (!card) return <>{children}</>;

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && createPortal(
        <TooltipPositioner triggerRef={triggerRef} tooltipRef={tooltipRef}>
          <div ref={tooltipRef} className="fixed z-[9999] pointer-events-none">
            <CardTooltip card={card} />
          </div>
        </TooltipPositioner>,
        document.body,
      )}
    </div>
  );
}

function TooltipPositioner({
  triggerRef,
  tooltipRef,
  children,
}: {
  triggerRef: React.RefObject<HTMLDivElement | null>;
  tooltipRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const rect = trigger.getBoundingClientRect();
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    const vw = window.innerWidth;
    const margin = 8;

    let left = rect.left + rect.width / 2 - tw / 2;
    let top = rect.top - th - margin;

    if (left < margin) left = margin;
    if (left + tw > vw - margin) {
      left = rect.left - tw - margin;
      if (left < margin) left = margin;
    }
    if (top < margin) {
      top = rect.bottom + margin;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  });

  return <>{children}</>;
}
