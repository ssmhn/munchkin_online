import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import type { HelpOffer } from '@munchkin/shared';

interface PlayerInfo {
  id: string;
  name: string;
}

interface Props {
  /** Current player viewing the modal */
  currentPlayerId: string;
  /** Other players who can be asked for help */
  otherPlayers: PlayerInfo[];
  /** Cards available to offer as reward (from hand/carried) */
  availableCards: { id: string; label: string }[];
  /** Existing help offer (if responding to one) */
  incomingOffer?: HelpOffer | null;
  /** Labels for incoming offer reward cards */
  incomingRewardLabels?: string[];
  /** Timeout in ms */
  timeoutMs?: number;
  onSendOffer: (targetPlayerId: string, rewardCardIds: string[]) => void;
  onAccept: () => void;
  onDecline: () => void;
  onCounterOffer: (rewardCardIds: string[]) => void;
  onClose: () => void;
}

export function NegotiationModal({
  currentPlayerId,
  otherPlayers,
  availableCards,
  incomingOffer,
  incomingRewardLabels,
  timeoutMs = 30000,
  onSendOffer,
  onAccept,
  onDecline,
  onCounterOffer,
  onClose,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>(otherPlayers[0]?.id ?? '');
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const isReceiving = incomingOffer && incomingOffer.toPlayerId === currentPlayerId;

  useEffect(() => {
    if (overlayRef.current) {
      gsap.from(overlayRef.current, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'back.out' });
    }
  }, []);

  useEffect(() => {
    if (progressRef.current && timeoutMs > 0) {
      gsap.to(progressRef.current, {
        width: '0%',
        duration: timeoutMs / 1000,
        ease: 'none',
      });
    }
  }, [timeoutMs]);

  const toggleCard = (cardId: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const handleSend = () => {
    onSendOffer(selectedTarget, Array.from(selectedCards));
  };

  const handleCounter = () => {
    onCounterOffer(Array.from(selectedCards));
  };

  return (
    <div
      ref={overlayRef}
      data-testid="negotiation-modal"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div style={{
        background: 'var(--color-surface, #1e293b)',
        borderRadius: '12px',
        padding: '24px',
        minWidth: '340px',
        maxWidth: '500px',
        border: '1px solid var(--color-border, #4a3f2a)',
      }}>
        <h3
          data-testid="negotiation-title"
          style={{
            color: 'var(--color-gold, #c9a84c)',
            fontFamily: 'var(--font-fantasy, serif)',
            marginTop: 0,
            marginBottom: '12px',
          }}
        >
          {isReceiving ? 'Help Offer Received' : 'Ask for Help'}
        </h3>

        {/* Timer */}
        <div style={{ background: 'var(--color-surface-light, #334155)', height: '4px', borderRadius: '2px', marginBottom: '16px' }}>
          <div
            ref={progressRef}
            data-testid="negotiation-timer"
            style={{ width: '100%', height: '100%', background: 'var(--color-gold, #f59e0b)', borderRadius: '2px' }}
          />
        </div>

        {isReceiving ? (
          /* Receiving an offer */
          <div data-testid="incoming-offer">
            <p style={{ color: 'var(--color-text, #fff)', fontSize: '14px', margin: '0 0 8px' }}>
              <strong>{incomingOffer.fromPlayerId}</strong> offers to help in exchange for:
            </p>
            <div data-testid="offer-rewards" style={{ marginBottom: '16px' }}>
              {incomingRewardLabels && incomingRewardLabels.length > 0 ? (
                incomingRewardLabels.map((label, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '6px 10px',
                      background: 'var(--color-surface-light, #374151)',
                      borderRadius: '6px',
                      marginBottom: '4px',
                      fontSize: '13px',
                      color: 'var(--color-text, #fff)',
                    }}
                  >
                    {label}
                  </div>
                ))
              ) : (
                <span style={{ color: 'var(--color-text-muted, #999)', fontSize: '13px' }}>No reward requested</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                data-testid="btn-accept"
                onClick={onAccept}
                style={actionBtnStyle('var(--color-success, #16a34a)')}
              >
                Accept
              </button>
              <button
                data-testid="btn-decline"
                onClick={onDecline}
                style={actionBtnStyle('var(--color-danger, #dc2626)')}
              >
                Decline
              </button>
              <button
                data-testid="btn-counter"
                onClick={handleCounter}
                style={actionBtnStyle('var(--color-gold, #c9a84c)')}
              >
                Counter Offer
              </button>
            </div>
          </div>
        ) : (
          /* Sending an offer */
          <div data-testid="send-offer">
            {/* Target player selection */}
            <label style={{ color: 'var(--color-text-muted, #999)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Ask player:
            </label>
            <div data-testid="player-targets" style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {otherPlayers.map((p) => (
                <button
                  key={p.id}
                  data-testid={`target-${p.id}`}
                  onClick={() => setSelectedTarget(p.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: selectedTarget === p.id ? '2px solid var(--color-gold, #c9a84c)' : '1px solid var(--color-border, #4b5563)',
                    background: selectedTarget === p.id ? 'var(--color-surface-light, #374151)' : 'transparent',
                    color: 'var(--color-text, #fff)',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Reward cards */}
            <label style={{ color: 'var(--color-text-muted, #999)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Offer as reward:
            </label>
            <div data-testid="reward-cards" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
              {availableCards.map((card) => (
                <button
                  key={card.id}
                  data-testid={`reward-${card.id}`}
                  onClick={() => toggleCard(card.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: selectedCards.has(card.id)
                      ? '2px solid var(--color-gold, #c9a84c)'
                      : '1px solid var(--color-border, #4b5563)',
                    background: selectedCards.has(card.id) ? 'var(--color-surface-light, #374151)' : 'transparent',
                    color: 'var(--color-text, #fff)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13px',
                  }}
                >
                  {card.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                data-testid="btn-send-offer"
                onClick={handleSend}
                style={actionBtnStyle('var(--color-gold, #c9a84c)')}
              >
                Send Offer
              </button>
              <button
                data-testid="btn-cancel"
                onClick={onClose}
                style={actionBtnStyle('var(--color-danger, #dc2626)')}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function actionBtnStyle(bg: string): React.CSSProperties {
  return {
    padding: '8px 16px',
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
  };
}
