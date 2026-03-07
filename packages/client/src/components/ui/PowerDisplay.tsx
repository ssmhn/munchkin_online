import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface Props {
  power: number;
  preview?: number | null;
}

export function PowerDisplay({ power, preview }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevPower = useRef(power);

  useEffect(() => {
    if (prevPower.current !== power && ref.current) {
      const dir = power > prevPower.current ? 1 : -1;
      gsap.fromTo(
        ref.current,
        { y: dir * -15, opacity: 0.3, color: dir > 0 ? '#27ae60' : '#c0392b' },
        { y: 0, opacity: 1, color: '#c9a84c', duration: 0.4, ease: 'back.out' },
      );
      prevPower.current = power;
    }
  }, [power]);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-munch-text-muted uppercase font-semibold">
        Power
      </span>
      <span
        ref={ref}
        className="text-lg font-bold font-fantasy text-munch-gold"
      >
        {power}
      </span>
      {preview != null && preview !== 0 && (
        <span
          className={`text-sm font-bold ${preview > 0 ? 'text-green-400' : 'text-red-400'}`}
        >
          {preview > 0 ? `+${preview}` : preview}
        </span>
      )}
    </div>
  );
}
