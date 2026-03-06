import React, { useRef, useState } from 'react';
import { CardDrawAnimation } from '../components/CardDrawAnimation';

const singleCard = [{ id: 'card-1', label: 'Orc (Level 4)' }];
const threeCards = [
  { id: 'card-a', label: 'Sword +3' },
  { id: 'card-b', label: 'Potion' },
  { id: 'card-c', label: 'Helmet' },
];

export function TestCardDrawPage() {
  const deckRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const [animating, setAnimating] = useState(false);
  const [cards, setCards] = useState<{ id: string; label: string }[]>([]);
  const [handCards, setHandCards] = useState<string[]>([]);

  const drawCards = (toAdd: { id: string; label: string }[]) => {
    setCards(toAdd);
    setAnimating(true);
  };

  const handleComplete = () => {
    setHandCards((prev) => [...prev, ...cards.map((c) => c.label)]);
    setCards([]);
    setAnimating(false);
  };

  return (
    <div style={{ padding: '32px' }}>
      <h2 style={{ color: 'var(--color-gold, #c9a84c)', fontFamily: 'var(--font-fantasy, serif)' }}>
        Card Draw Animation Test
      </h2>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <button data-testid="draw-one" onClick={() => drawCards(singleCard)} disabled={animating}>
          Draw 1 Card
        </button>
        <button data-testid="draw-three" onClick={() => drawCards(threeCards)} disabled={animating}>
          Draw 3 Cards
        </button>
      </div>

      <div data-testid="animating-status">{animating ? 'animating' : 'idle'}</div>

      <div style={{ display: 'flex', gap: '40px', marginTop: '24px' }}>
        {/* Deck */}
        <div
          ref={deckRef}
          data-testid="deck-source"
          style={{
            width: '100px',
            height: '140px',
            background: 'var(--color-info, #7c3aed)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
          }}
        >
          DECK
        </div>

        {/* Hand area */}
        <div
          ref={handRef}
          data-testid="hand-target"
          style={{
            minWidth: '300px',
            minHeight: '140px',
            border: '2px dashed var(--color-border, #4a3f2a)',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          {handCards.length === 0 && (
            <span style={{ color: 'var(--color-text-muted, #999)' }}>Hand (empty)</span>
          )}
          {handCards.map((label, i) => (
            <div
              key={i}
              data-testid={`hand-card-${i}`}
              style={{
                width: '80px',
                height: '120px',
                background: 'var(--color-surface, #2a1f10)',
                border: '1px solid var(--color-gold, #c9a84c)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                color: 'var(--color-text, #fff)',
                padding: '4px',
                textAlign: 'center',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {animating && (
        <CardDrawAnimation
          cards={cards}
          deckType="DOOR"
          deckRef={deckRef}
          handRef={handRef}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
