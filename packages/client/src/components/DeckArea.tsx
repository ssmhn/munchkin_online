import React from 'react';

interface Props {
  doorDeckSize: number;
  treasureDeckSize: number;
}

export function DeckArea({ doorDeckSize, treasureDeckSize }: Props) {
  return (
    <div data-testid="deck-area" style={{ display: 'flex', gap: '16px' }}>
      <div
        data-testid="door-deck"
        style={{
          width: '80px',
          height: '120px',
          background: '#7c3aed',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          flexDirection: 'column',
        }}
      >
        <div>Doors</div>
        <div data-testid="door-deck-count">{doorDeckSize}</div>
      </div>
      <div
        data-testid="treasure-deck"
        style={{
          width: '80px',
          height: '120px',
          background: '#d97706',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          flexDirection: 'column',
        }}
      >
        <div>Treasure</div>
        <div data-testid="treasure-deck-count">{treasureDeckSize}</div>
      </div>
    </div>
  );
}
