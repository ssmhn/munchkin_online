import React, { useState } from 'react';
import { ReactionBar } from '../components/ReactionBar';
import type { ReactionWindow } from '@munchkin/shared';

const mockWindow: ReactionWindow = {
  trigger: { type: 'DOOR_REVEALED', cardId: 'monster_orc' },
  timeoutMs: 10000,
  responses: {
    p1: { playerId: 'p1', passed: false },
    p2: { playerId: 'p2', passed: false },
  },
  stack: [],
};

export function TestReactionPage() {
  const [visible, setVisible] = useState(true);
  const [hasPassed, setHasPassed] = useState(false);

  const handlePass = () => {
    setHasPassed(true);
  };

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <div style={{ minHeight: '300px' }}>
      <button data-testid="close-reaction" onClick={handleClose}>Close</button>
      {visible && (
        <ReactionBar
          window={mockWindow}
          onPass={handlePass}
          hasPassed={hasPassed}
          reactionCards={['potion_of_fire']}
        />
      )}
    </div>
  );
}
