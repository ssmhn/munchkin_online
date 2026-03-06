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
      const newItems = Array.from(listRef.current.children).slice(0, entries.length - prevCount.current);
      if (newItems.length > 0) {
        gsap.from(newItems, {
          y: -20,
          opacity: 0,
          duration: 0.3,
          stagger: 0.05,
          ease: 'power2.out',
        });
      }
      prevCount.current = entries.length;
    }
  }, [entries.length]);

  const recent = entries.slice(-20).reverse();

  return (
    <div data-testid="game-log" style={{ maxHeight: '200px', overflow: 'auto', background: '#111', padding: '8px', borderRadius: '4px' }}>
      <ul ref={listRef} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {recent.map((entry, i) => (
          <li key={i} style={{ color: '#aaa', fontSize: '12px', padding: '2px 0' }}>
            {entry.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
