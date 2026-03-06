import React, { useState } from 'react';
import { InteractiveCardHand } from '../components/InteractiveCardHand';

const initialCards = [
  { id: 'sword', label: 'Sword +3', playable: true },
  { id: 'potion', label: 'Potion', playable: true },
  { id: 'cursed', label: 'Cursed Item', playable: false },
  { id: 'helmet', label: 'Helmet +1', playable: true },
];

export function TestCardHandPage() {
  const [cards, setCards] = useState(initialCards);
  const [lastPlayed, setLastPlayed] = useState('none');

  const handlePlayCard = (cardId: string) => {
    setLastPlayed(cardId);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  return (
    <div style={{ padding: '32px' }}>
      <h2 style={{ color: 'var(--color-gold, #c9a84c)', fontFamily: 'var(--font-fantasy, serif)' }}>
        Interactive Card Hand Test
      </h2>

      <div data-testid="last-played">Last played: {lastPlayed}</div>
      <div data-testid="hand-count">Cards: {cards.length}</div>

      <div style={{ marginTop: '24px' }}>
        <InteractiveCardHand cards={cards} onPlayCard={handlePlayCard} />
      </div>
    </div>
  );
}
