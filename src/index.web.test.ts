import { describe, expect, mock, test } from 'bun:test';

mock.module('react-native', () => ({
  View: ({ children }: { children?: unknown }) => children ?? null,
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T) => styles,
  },
}));

const adapter = await import('./index.web');

describe('web entry export parity surface', () => {
  test('includes expected runtime export names', () => {
    const expected = [
      'Draggable',
      'DraggableState',
      'DropProvider',
      'Droppable',
      'HorizontalScrollDirection',
      'ScrollDirection',
      'SlotsContext',
      'Sortable',
      'SortableDirection',
      'SortableItem',
      'clamp',
      'listToObject',
      'objectMove',
      'setAutoScroll',
      'setPosition',
      'useDraggable',
      'useDroppable',
      'useSortable',
      'useSortableList',
    ].sort();

    const actual = Object.keys(adapter)
      .filter((key) => key !== 'default' && key !== '__esModule')
      .sort();

    expect(actual).toEqual(expected);
  });
});

describe('web compatibility exports', () => {
  test('component exports are available', () => {
    expect(() => adapter.DropProvider({ children: 'ok' })).not.toThrow();
    expect(['function', 'object']).toContain(typeof adapter.Draggable);
    expect(typeof adapter.Droppable).toBe('function');

    expect(['function', 'object']).toContain(typeof adapter.Sortable);
    expect(typeof adapter.SortableItem).toBe('function');
    expect(typeof adapter.SortableItem.Handle).toBe('function');
  });

  test('hook exports are callable symbols', () => {
    expect(typeof adapter.useDraggable).toBe('function');
    expect(typeof adapter.useDroppable).toBe('function');
    expect(typeof adapter.useSortable).toBe('function');
    expect(typeof adapter.useSortableList).toBe('function');
  });
});
