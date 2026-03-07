import { useCallback } from 'react';
import type { CardId } from '@munchkin/shared';

export interface DragPayload {
  cardId: CardId;
  sourceZone: 'HAND' | 'EQUIPMENT' | 'BACKPACK';
  sourceSlot?: string;
}

const MIME = 'application/munchkin-card';

export function useDraggableCard(
  cardId: CardId,
  sourceZone: DragPayload['sourceZone'],
  isDraggable: boolean,
  sourceSlot?: string,
) {
  const onDragStart = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (!isDraggable) {
        e.preventDefault();
        return;
      }
      const payload: DragPayload = { cardId, sourceZone, sourceSlot };
      e.dataTransfer.setData(MIME, JSON.stringify(payload));
      e.dataTransfer.effectAllowed = 'move';
      const el = e.currentTarget as HTMLElement;
      el.style.opacity = '0.5';
      el.style.transform = 'scale(0.95)';
    },
    [cardId, sourceZone, isDraggable, sourceSlot],
  );

  const onDragEnd = useCallback((e: React.DragEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '1';
    el.style.transform = '';
  }, []);

  return {
    draggable: isDraggable,
    onDragStart,
    onDragEnd,
  };
}

export type DropZoneId =
  | 'TABLE'
  | 'BACKPACK'
  | 'HAND'
  | 'head'
  | 'body'
  | 'feet'
  | 'hand1'
  | 'hand2'
  | 'twoHands';

export function useDropZone(
  onDrop: (payload: DragPayload) => void,
  canAccept?: (payload: DragPayload) => boolean,
) {
  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (!e.dataTransfer.types.includes(MIME)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      e.currentTarget.classList.add('drop-hover');
    },
    [],
  );

  const onDragEnter = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (!e.dataTransfer.types.includes(MIME)) return;
    e.preventDefault();
    e.currentTarget.classList.add('drop-hover');
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.currentTarget.classList.remove('drop-hover');
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.currentTarget.classList.remove('drop-hover');
      const raw = e.dataTransfer.getData(MIME);
      if (!raw) return;
      try {
        const payload: DragPayload = JSON.parse(raw);
        if (canAccept && !canAccept(payload)) return;
        onDrop(payload);
      } catch {
        // ignore malformed payload
      }
    },
    [onDrop, canAccept],
  );

  return {
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop: handleDrop,
  };
}

export function parseDragPayload(e: React.DragEvent): DragPayload | null {
  const raw = e.dataTransfer.getData(MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
