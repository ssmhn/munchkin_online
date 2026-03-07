import React, { useState } from 'react';
import type { PlayerClass } from '@munchkin/shared';

const CLASS_EMOJI: Record<PlayerClass, string> = {
  WARRIOR: '\u2694\uFE0F',
  WIZARD: '\uD83E\uDDD9',
  CLERIC: '\u271D\uFE0F',
  THIEF: '\uD83D\uDDE1\uFE0F',
};

const CLASS_LABELS: Record<PlayerClass, string> = {
  WARRIOR: 'Warrior',
  WIZARD: 'Wizard',
  CLERIC: 'Cleric',
  THIEF: 'Thief',
};

const CLASS_DESCRIPTIONS: Record<PlayerClass, string> = {
  WARRIOR: 'Берсерк: может сыграть любое количество Одноразовых бонусов в бою (другие классы — только один за бой).',
  WIZARD: 'Автоматическое бегство: Волшебник автоматически убегает от монстров без броска кубика.',
  CLERIC: 'Изгнание Нежити: сбросить 1 карту, чтобы уничтожить монстра-Нежить без боя. Отмена Проклятий: сбросить 1 карту, чтобы отменить Проклятие.',
  THIEF: 'Кража: бросок кубика 4+ — украсть надетую Шмотку у другого игрока (раз в ход). Подлый удар в спину.',
};

export function ClassIcon({
  cls,
  small,
}: {
  cls: PlayerClass;
  small?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  return (
    <span
      className={`inline-flex items-center gap-0.5 cursor-help ${small ? 'text-[9px]' : 'text-xs'}`}
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({ x: rect.left + rect.width / 2, y: rect.top });
        setShow(true);
      }}
      onMouseLeave={() => setShow(false)}
    >
      <span>{CLASS_EMOJI[cls]}</span>
      <span className="text-munch-text font-semibold">{CLASS_LABELS[cls]}</span>
      {show && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}
        >
          <div className="bg-munch-surface border border-munch-border rounded-lg shadow-xl p-2.5 max-w-[260px] mb-1.5">
            <div className="text-[11px] font-bold text-amber-400 mb-1">{CLASS_LABELS[cls]}</div>
            <div className="text-[10px] text-munch-text/80 leading-snug">{CLASS_DESCRIPTIONS[cls]}</div>
          </div>
        </div>
      )}
    </span>
  );
}
