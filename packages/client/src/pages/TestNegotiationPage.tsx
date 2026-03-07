import React, { useState } from 'react';
import { NegotiationModal } from '../components/NegotiationModal';
import type { HelpOffer } from '@munchkin/shared';

const otherPlayers = [
  { id: 'p2', name: 'Bob' },
  { id: 'p3', name: 'Charlie' },
];

const availableCards = [
  { id: 'sword-1', label: 'Sword of Doom (+3)' },
  { id: 'potion-1', label: 'Potion of Fire' },
  { id: 'helmet-1', label: 'Horned Helmet (+1)' },
];

const mockIncomingOffer: HelpOffer = {
  fromPlayerId: 'p2',
  toPlayerId: 'p1',
  treasureCount: 2,
};

export function TestNegotiationPage() {
  const [mode, setMode] = useState<'send' | 'receive' | 'closed'>('send');
  const [result, setResult] = useState<string>('none');

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ color: '#fff' }}>Negotiation Test</h2>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button data-testid="show-send" onClick={() => { setMode('send'); setResult('none'); }}>
          Show Send Mode
        </button>
        <button data-testid="show-receive" onClick={() => { setMode('receive'); setResult('none'); }}>
          Show Receive Mode
        </button>
      </div>

      <div data-testid="result">{result}</div>
      <div data-testid="helper-status">{result === 'accepted' ? 'Helper' : 'none'}</div>

      {mode === 'send' && (
        <NegotiationModal
          currentPlayerId="p1"
          otherPlayers={otherPlayers}
          availableCards={availableCards}
          timeoutMs={30000}
          onSendOffer={(target, cards) => {
            setResult(`sent:${target}:${cards.join(',')}`);
            setMode('closed');
          }}
          onAccept={() => {}}
          onDecline={() => {}}
          onCounterOffer={() => {}}
          onClose={() => { setMode('closed'); setResult('cancelled'); }}
        />
      )}

      {mode === 'receive' && (
        <NegotiationModal
          currentPlayerId="p1"
          otherPlayers={otherPlayers}
          availableCards={availableCards}
          incomingOffer={mockIncomingOffer}
          incomingRewardLabels={['Sword of Doom (+3)', 'Potion of Fire']}
          timeoutMs={30000}
          onSendOffer={() => {}}
          onAccept={() => { setResult('accepted'); setMode('closed'); }}
          onDecline={() => { setResult('declined'); setMode('closed'); }}
          onCounterOffer={(cards) => { setResult(`counter:${cards.join(',')}`); setMode('closed'); }}
          onClose={() => setMode('closed')}
        />
      )}
    </div>
  );
}
