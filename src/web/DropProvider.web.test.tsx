import { describe, expect, test } from 'bun:test';
import {
  applyDroppedItem,
  hasAvailableCapacityForDroppable,
  removeDroppedItem,
} from './DropProvider.web';

describe('drop provider helpers', () => {
  test('dropped items overwrite by draggable id instead of accumulating duplicates', () => {
    const first = applyDroppedItem({}, 'draggable-a', 'zone-a', { id: 'a' });
    const second = applyDroppedItem(first, 'draggable-a', 'zone-a', { id: 'a', count: 2 });

    expect(second).toEqual({
      'draggable-a': {
        droppableId: 'zone-a',
        data: { id: 'a', count: 2 },
      },
    });
  });

  test('removing a dropped item keeps unrelated entries intact', () => {
    const droppedItems = {
      'draggable-a': { droppableId: 'zone-a', data: { id: 'a' } },
      'draggable-b': { droppableId: 'zone-b', data: { id: 'b' } },
    };

    expect(removeDroppedItem(droppedItems, 'draggable-a')).toEqual({
      'draggable-b': { droppableId: 'zone-b', data: { id: 'b' } },
    });
  });

  test('capacity defaults to one and unknown droppables are unavailable', () => {
    const slots = {
      1: { id: 'zone-a', x: 0, y: 0, width: 40, height: 40 },
      2: { id: 'zone-b', x: 50, y: 0, width: 40, height: 40, capacity: 2 },
    };

    expect(hasAvailableCapacityForDroppable(slots, {}, 'zone-a')).toBe(true);
    expect(
      hasAvailableCapacityForDroppable(
        slots,
        { 'drag-a': { droppableId: 'zone-a', data: {} } },
        'zone-a',
      ),
    ).toBe(false);
    expect(
      hasAvailableCapacityForDroppable(
        slots,
        {
          'drag-a': { droppableId: 'zone-b', data: {} },
          'drag-b': { droppableId: 'zone-b', data: {} },
        },
        'zone-b',
      ),
    ).toBe(false);
    expect(hasAvailableCapacityForDroppable(slots, {}, 'missing')).toBe(false);
  });
});
