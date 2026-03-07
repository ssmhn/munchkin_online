import React from 'react';
import type { Gender } from '@munchkin/shared';

export function GenderIcon({
  gender,
  size = 14,
}: {
  gender: Gender;
  size?: number;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center font-bold ${gender === 'MALE' ? 'text-blue-400' : 'text-pink-400'}`}
      style={{ fontSize: size }}
    >
      {gender === 'MALE' ? '\u2642' : '\u2640'}
    </span>
  );
}
