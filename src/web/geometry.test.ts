import { describe, expect, test } from 'bun:test';
import {
  applyAxisToTranslation,
  clampTranslationToBounds,
  findMatchingSlot,
  hasCollision,
  resolveAlignedDropPosition,
} from './geometry';

describe('geometry helpers', () => {
  test('collision checks mirror intersect, contain, and center strategies', () => {
    const draggableRect = { x: 50, y: 50, width: 40, height: 40 };
    const slotRect = { x: 40, y: 40, width: 80, height: 80 };

    expect(hasCollision(draggableRect, slotRect, 'intersect')).toBe(true);
    expect(hasCollision(draggableRect, slotRect, 'contain')).toBe(true);
    expect(hasCollision(draggableRect, slotRect, 'center')).toBe(true);
    expect(
      hasCollision({ x: 10, y: 10, width: 20, height: 20 }, slotRect, 'contain'),
    ).toBe(false);
  });

  test('drop alignment resolves expected target position', () => {
    const slot = {
      id: 'slot-a',
      x: 100,
      y: 80,
      width: 120,
      height: 100,
      dropAlignment: 'bottom-right' as const,
      dropOffset: { x: 4, y: 6 },
    };

    expect(resolveAlignedDropPosition(slot, { x: 0, y: 0, width: 30, height: 20 })).toEqual({
      x: 194,
      y: 166,
    });
  });

  test('axis and bounds helpers constrain translation deterministically', () => {
    const axisTranslation = applyAxisToTranslation('x', { x: 10, y: 5 }, { x: 70, y: 90 });
    expect(axisTranslation).toEqual({ x: 70, y: 5 });

    const bounded = clampTranslationToBounds(
      { x: 50, y: 50, width: 40, height: 40 },
      { x: 50, y: 50, width: 40, height: 40 },
      { x: 40, y: 40, width: 120, height: 70 },
      { x: 200, y: -50 },
    );
    expect(bounded).toEqual({ x: 70, y: -10 });
  });

  test('matching slot selection is deterministic for overlapping eligible slots', () => {
    const slots = {
      1: { id: 'zone-a', x: 10, y: 10, width: 100, height: 100 },
      2: { id: 'zone-b', x: 10, y: 10, width: 100, height: 100 },
    };

    const match = findMatchingSlot(
      slots,
      { x: 20, y: 20, width: 40, height: 40 },
      'intersect',
      (slot) => slot.id === 'zone-a',
    );

    expect(match).toEqual({
      slotId: 1,
      slot: slots[1],
    });
  });
});
