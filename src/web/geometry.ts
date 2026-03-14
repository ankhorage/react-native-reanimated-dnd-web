import type { CollisionAlgorithm, DropAlignment, DropOffset } from 'react-native-reanimated-dnd';

export type LayoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DropSlotLike = LayoutRect & {
  id: string;
  onDrop?: (data: unknown) => void;
  dropAlignment?: DropAlignment;
  dropOffset?: DropOffset;
  capacity?: number;
};

export type Translation = {
  x: number;
  y: number;
};

export function expandRect(rect: LayoutRect): LayoutRect & { right: number; bottom: number } {
  return {
    ...rect,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
  };
}

export function applyAxisToTranslation(
  dragAxis: 'x' | 'y' | 'both',
  current: Translation,
  next: Translation,
): Translation {
  if (dragAxis === 'x') {
    return { x: next.x, y: current.y };
  }

  if (dragAxis === 'y') {
    return { x: current.x, y: next.y };
  }

  return next;
}

export function clampTranslationToBounds(
  originRect: LayoutRect,
  draggableRect: LayoutRect,
  boundsRect: LayoutRect | null,
  translation: Translation,
): Translation {
  if (!boundsRect) {
    return translation;
  }

  const minX = boundsRect.x - originRect.x;
  const maxX = boundsRect.x + boundsRect.width - originRect.x - draggableRect.width;
  const minY = boundsRect.y - originRect.y;
  const maxY = boundsRect.y + boundsRect.height - originRect.y - draggableRect.height;

  return {
    x: Math.max(minX, Math.min(translation.x, maxX)),
    y: Math.max(minY, Math.min(translation.y, maxY)),
  };
}

export function getTranslatedRect(
  originRect: LayoutRect,
  draggableRect: LayoutRect,
  translation: Translation,
): LayoutRect {
  return {
    x: originRect.x + translation.x,
    y: originRect.y + translation.y,
    width: draggableRect.width,
    height: draggableRect.height,
  };
}

export function hasCollision(
  draggableRect: LayoutRect,
  slotRect: LayoutRect,
  algorithm: CollisionAlgorithm,
): boolean {
  const draggable = expandRect(draggableRect);
  const slot = expandRect(slotRect);

  if (algorithm === 'intersect') {
    return (
      draggable.x < slot.right &&
      draggable.right > slot.x &&
      draggable.y < slot.bottom &&
      draggable.bottom > slot.y
    );
  }

  if (algorithm === 'contain') {
    return (
      draggable.x >= slot.x &&
      draggable.right <= slot.right &&
      draggable.y >= slot.y &&
      draggable.bottom <= slot.bottom
    );
  }

  const centerX = draggable.x + draggable.width / 2;
  const centerY = draggable.y + draggable.height / 2;
  return centerX >= slot.x && centerX <= slot.right && centerY >= slot.y && centerY <= slot.bottom;
}

export function findMatchingSlot(
  slots: Record<number, DropSlotLike>,
  draggableRect: LayoutRect,
  collisionAlgorithm: CollisionAlgorithm,
  hasAvailableCapacity: (droppableId: string) => boolean,
): { slotId: number; slot: DropSlotLike } | null {
  for (const key in slots) {
    const slotId = Number.parseInt(key, 10);
    const slot = slots[slotId];

    if (!slot) {
      continue;
    }

    if (hasCollision(draggableRect, slot, collisionAlgorithm) && hasAvailableCapacity(slot.id)) {
      return { slotId, slot };
    }
  }

  return null;
}

export function resolveAlignedDropPosition(
  slot: DropSlotLike,
  draggableRect: LayoutRect,
): Translation {
  const alignment = slot.dropAlignment ?? 'center';
  const offset = slot.dropOffset ?? { x: 0, y: 0 };

  let x = slot.x + slot.width / 2 - draggableRect.width / 2;
  let y = slot.y + slot.height / 2 - draggableRect.height / 2;

  switch (alignment) {
    case 'top-left':
      x = slot.x;
      y = slot.y;
      break;
    case 'top-center':
      x = slot.x + slot.width / 2 - draggableRect.width / 2;
      y = slot.y;
      break;
    case 'top-right':
      x = slot.x + slot.width - draggableRect.width;
      y = slot.y;
      break;
    case 'center-left':
      x = slot.x;
      y = slot.y + slot.height / 2 - draggableRect.height / 2;
      break;
    case 'center':
      break;
    case 'center-right':
      x = slot.x + slot.width - draggableRect.width;
      y = slot.y + slot.height / 2 - draggableRect.height / 2;
      break;
    case 'bottom-left':
      x = slot.x;
      y = slot.y + slot.height - draggableRect.height;
      break;
    case 'bottom-center':
      x = slot.x + slot.width / 2 - draggableRect.width / 2;
      y = slot.y + slot.height - draggableRect.height;
      break;
    case 'bottom-right':
      x = slot.x + slot.width - draggableRect.width;
      y = slot.y + slot.height - draggableRect.height;
      break;
  }

  return {
    x: x + offset.x,
    y: y + offset.y,
  };
}
