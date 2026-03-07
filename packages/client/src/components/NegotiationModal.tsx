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
      gsap.fromTo(overlayRef.current, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
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
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]"
    >
      <div className="bg-munch-surface rounded-xl p-6 min-w-[340px] max-w-[500px] border border-munch-border">
        <h3
          data-testid="negotiation-title"
          className="text-munch-gold font-fantasy mt-0 mb-3"
        >
          {isReceiving ? 'Help Offer Received' : 'Ask for Help'}
        </h3>

        {/* Timer */}
        <div className="bg-munch-surface-light h-1 rounded-sm mb-4">
          <div
            ref={progressRef}
            data-testid="negotiation-timer"
            className="w-full h-full bg-munch-gold rounded-sm"
          />
        </div>

        {isReceiving ? (
          /* Receiving an offer */
          <div data-testid="incoming-offer">
            <p className="text-munch-text text-sm m-0 mb-2">
              <strong>{incomingOffer.fromPlayerId}</strong> offers to help in exchange for:
            </p>
            <div data-testid="offer-rewards" className="mb-4">
              {incomingRewardLabels && incomingRewardLabels.length > 0 ? (
                incomingRewardLabels.map((label, i) => (
                  <div
                    key={i}
                    className="py-1.5 px-2.5 bg-munch-surface-light rounded-md mb-1 text-[13px] text-munch-text"
                  >
                    {label}
                  </div>
                ))
              ) : (
                <span className="text-munch-text-muted text-[13px]">No reward requested</span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                data-testid="btn-accept"
                onClick={onAccept}
                className="py-2 px-4 bg-munch-success text-white border-none rounded-md cursor-pointer font-semibold text-[13px]"
              >
                Accept
              </button>
              <button
                data-testid="btn-decline"
                onClick={onDecline}
                className="py-2 px-4 bg-munch-danger text-white border-none rounded-md cursor-pointer font-semibold text-[13px]"
              >
                Decline
              </button>
              <button
                data-testid="btn-counter"
                onClick={handleCounter}
                className="py-2 px-4 bg-munch-gold text-white border-none rounded-md cursor-pointer font-semibold text-[13px]"
              >
                Counter Offer
              </button>
            </div>
          </div>
        ) : (
          /* Sending an offer */
          <div data-testid="send-offer">
            {/* Target player selection */}
            <label className="text-munch-text-muted text-xs block mb-1">
              Ask player:
            </label>
            <div data-testid="player-targets" className="flex gap-1.5 mb-3 flex-wrap">
              {otherPlayers.map((p) => (
                <button
                  key={p.id}
                  data-testid={`target-${p.id}`}
                  onClick={() => setSelectedTarget(p.id)}
                  className={`py-1.5 px-3 rounded-md text-munch-text cursor-pointer text-[13px] ${
                    selectedTarget === p.id
                      ? 'border-2 border-munch-gold bg-munch-surface-light'
                      : 'border border-munch-border bg-transparent'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Reward cards */}
            <label className="text-munch-text-muted text-xs block mb-1">
              Offer as reward:
            </label>
            <div data-testid="reward-cards" className="flex flex-col gap-1 mb-4">
              {availableCards.map((card) => (
                <button
                  key={card.id}
                  data-testid={`reward-${card.id}`}
                  onClick={() => toggleCard(card.id)}
                  className={`py-2 px-3 rounded-md text-munch-text cursor-pointer text-left text-[13px] ${
                    selectedCards.has(card.id)
                      ? 'border-2 border-munch-gold bg-munch-surface-light'
                      : 'border border-munch-border bg-transparent'
                  }`}
                >
                  {card.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                data-testid="btn-send-offer"
                onClick={handleSend}
                className="py-2 px-4 bg-munch-gold text-white border-none rounded-md cursor-pointer font-semibold text-[13px]"
              >
                Send Offer
              </button>
              <button
                data-testid="btn-cancel"
                onClick={onClose}
                className="py-2 px-4 bg-munch-danger text-white border-none rounded-md cursor-pointer font-semibold text-[13px]"
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
