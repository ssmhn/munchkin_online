import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import type { LogEntry } from '@munchkin/shared';

interface Props {
  entries: LogEntry[];
}

export function GameLog({ entries }: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const prevCount = useRef(0);

  useEffect(() => {
    if (listRef.current && entries.length > prevCount.current) {
      const newCount = entries.length - prevCount.current;
      const newItems = Array.from(listRef.current.children).slice(0, newCount);
      if (newItems.length > 0) {
        gsap.fromTo(newItems,
          { y: -15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
        );
      }
      prevCount.current = entries.length;
    }
  }, [entries.length]);

  const recent = entries.slice(-20).reverse();

  return (
    <div data-testid="game-log" className="max-h-[200px] overflow-auto bg-gray-950 p-2 rounded">
      <ul ref={listRef} className="list-none p-0 m-0">
        {recent.map((entry, i) => (
          <li key={i} className="text-gray-400 text-xs py-0.5">
            {entry.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
