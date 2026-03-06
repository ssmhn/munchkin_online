import React, { useState } from 'react';
import { ChooseTargetOverlay } from '../components/ChooseTargetOverlay';
import type { PendingAction } from '@munchkin/shared';

const mockAction: PendingAction = {
  type: 'CHOOSE_MONSTER_TO_CLONE',
  playerId: 'p1',
  timeoutMs: 15000,
  options: [
    { id: 'inst-1', label: 'Orc (Level 4)' },
    { id: 'inst-2', label: 'Big Rat (Level 1)' },
  ],
};

export function TestChoicePage() {
  const [visible, setVisible] = useState(true);
  const [chosen, setChosen] = useState<string | null>(null);

  const handleChoose = (optionId: string) => {
    setChosen(optionId);
    setVisible(false);
  };

  return (
    <div>
      <div data-testid="chosen-value">{chosen ?? 'none'}</div>
      {visible && <ChooseTargetOverlay action={mockAction} onChoose={handleChoose} />}
    </div>
  );
}
