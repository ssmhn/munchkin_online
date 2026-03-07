import React from 'react';

interface Props {
  doorDeckSize: number;
  treasureDeckSize: number;
}

function DeckPile({
  label,
  count,
  color,
  letter,
  testId,
  countTestId,
}: {
  label: string;
  count: number;
  color: string;
  letter: string;
  testId: string;
  countTestId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center gap-1"
    >
      {/* Stacked cards effect */}
      <div className="relative w-[72px] h-[100px]">
        {/* Shadow cards behind */}
        {count > 2 && (
          <div
            className="absolute top-1 left-1 w-[72px] h-[100px] rounded-md"
            style={{
              background: `${color}11`,
              border: `1px solid ${color}33`,
            }}
          />
        )}
        {count > 1 && (
          <div
            className="absolute top-0.5 left-0.5 w-[72px] h-[100px] rounded-md"
            style={{
              background: `${color}22`,
              border: `1px solid ${color}44`,
            }}
          />
        )}
        {/* Top card */}
        <div
          className={`absolute top-0 left-0 w-[72px] h-[100px] rounded-md flex flex-col items-center justify-center gap-1 ${
            count > 0 ? 'cursor-pointer opacity-100' : 'cursor-default opacity-30'
          }`}
          style={{
            background: `linear-gradient(145deg, ${color}15 0%, ${color}30 100%)`,
            border: `2px solid ${color}`,
            boxShadow: `0 2px 8px rgba(0,0,0,0.4), inset 0 0 20px ${color}08`,
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ border: `2px solid ${color}88` }}
          >
            <span
              className="text-lg font-bold font-fantasy"
              style={{ color }}
            >
              {letter}
            </span>
          </div>
          <span
            className="text-[9px] font-bold uppercase tracking-wider"
            style={{ color }}
          >
            {label}
          </span>
        </div>
      </div>
      <span
        data-testid={countTestId}
        className="text-[11px] text-munch-text-muted font-semibold"
      >
        {count} {count === 1 ? 'card' : 'cards'}
      </span>
    </div>
  );
}

export function DeckArea({ doorDeckSize, treasureDeckSize }: Props) {
  return (
    <div
      data-testid="deck-area"
      className="flex gap-6 items-center justify-center"
    >
      <DeckPile
        label="Doors"
        count={doorDeckSize}
        color="#7c3aed"
        letter="D"
        testId="door-deck"
        countTestId="door-deck-count"
      />
      <DeckPile
        label="Treasure"
        count={treasureDeckSize}
        color="#d97706"
        letter="T"
        testId="treasure-deck"
        countTestId="treasure-deck-count"
      />
    </div>
  );
}
