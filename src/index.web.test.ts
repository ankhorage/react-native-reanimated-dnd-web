import { describe, expect, mock, test } from 'bun:test';

mock.module('react-native', () => ({
  View: () => null,
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T) => styles,
  },
}));

const {
  Draggable,
  DropProvider,
  Droppable,
  ScrollDirection,
  Sortable,
  SortableItem,
  clamp,
  listToObject,
  objectMove,
  setAutoScroll,
  setPosition,
  useDraggable,
  useDroppable,
  useSortable,
  useSortableList,
} = await import('./index.web');

describe('web adapter utilities', () => {
  test('clamp keeps values inside bounds', () => {
    expect(clamp(-2, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
    expect(clamp(8, 0, 3)).toBe(3);
  });

  test('objectMove reorders positions by index', () => {
    const initial = { a: 0, b: 1, c: 2 };
    expect(objectMove(initial, 0, 2)).toEqual({ b: 0, c: 1, a: 2 });
    expect(objectMove(initial, -4, 22)).toEqual({ b: 0, c: 1, a: 2 });
  });

  test('listToObject builds a position map from ids', () => {
    expect(
      listToObject([
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta' },
      ]),
    ).toEqual({ a: 0, b: 1 });
  });

  test('setPosition updates plain-object positions', () => {
    const positions: Record<string, number> = { a: 0, b: 1, c: 2 };
    setPosition(60, 3, positions, 'a', 50);
    expect(positions).toEqual({ b: 0, a: 1, c: 2 });
  });

  test('setPosition updates SharedValue-like positions', () => {
    const positions = { value: { a: 0, b: 1, c: 2 } };
    setPosition(120, 3, positions, 'a', 50);
    expect(positions.value).toEqual({ b: 0, c: 1, a: 2 });
  });

  test('setAutoScroll writes shared direction values', () => {
    const autoScroll = { value: ScrollDirection.None };

    setAutoScroll(1, 0, 200, 20, autoScroll);
    expect(autoScroll.value).toBe(ScrollDirection.Up);

    setAutoScroll(199, 0, 200, 20, autoScroll);
    expect(autoScroll.value).toBe(ScrollDirection.Down);

    setAutoScroll(100, 0, 200, 20, autoScroll);
    expect(autoScroll.value).toBe(ScrollDirection.None);
  });
});

describe('supported export surface', () => {
  test('exports sortable components and provider', () => {
    expect(['function', 'object']).toContain(typeof Sortable);
    expect(typeof SortableItem).toBe('function');
    expect(typeof SortableItem.Handle).toBe('function');

    const fragment = DropProvider({ children: 'child' });
    expect(fragment).toBeDefined();
  });
});

describe('unsupported web exports', () => {
  test('are import-safe and only throw when invoked', () => {
    expect(typeof Draggable).toBe('function');
    expect(typeof Droppable).toBe('function');
    expect(typeof useDraggable).toBe('function');
    expect(typeof useDroppable).toBe('function');
    expect(typeof useSortable).toBe('function');
    expect(typeof useSortableList).toBe('function');
  });

  test('throw a clear error when hooks are invoked', () => {
    expect(() => useDraggable()).toThrow(/not supported on web yet/i);
    expect(() => useDroppable()).toThrow(/not supported on web yet/i);
    expect(() => useSortable()).toThrow(/not supported on web yet/i);
    expect(() => useSortableList()).toThrow(/not supported on web yet/i);
  });

  test('throw a clear error when unsupported components are rendered', () => {
    const renderDraggable = Draggable as unknown as (props: Record<string, unknown>) => unknown;
    const renderDroppable = Droppable as unknown as (props: Record<string, unknown>) => unknown;

    expect(() => renderDraggable({})).toThrow(/not supported on web yet/i);
    expect(() => renderDroppable({})).toThrow(/not supported on web yet/i);
  });
});
