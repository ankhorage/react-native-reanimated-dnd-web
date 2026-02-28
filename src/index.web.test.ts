import { describe, expect, mock, test } from 'bun:test';

mock.module('react-native', () => ({
  View: ({ children }: { children?: unknown }) => children ?? null,
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T) => styles,
  },
}));

const upstream = {
  Draggable: () => null,
  DropProvider: ({ children }: { children?: unknown }) => children ?? null,
  Droppable: () => null,
  ScrollDirection: {
    None: 'none',
    Up: 'up',
    Down: 'down',
  },
  HorizontalScrollDirection: {
    None: 'none',
    Left: 'left',
    Right: 'right',
  },
  SortableDirection: {
    Vertical: 'vertical',
    Horizontal: 'horizontal',
  },
  DraggableState: {
    IDLE: 'IDLE',
    DRAGGING: 'DRAGGING',
    DROPPED: 'DROPPED',
  },
  SlotsContext: { Provider: () => null },
  Sortable: () => null,
  SortableItem: Object.assign(() => null, {
    Handle: () => null,
  }),
  clamp: (value: number) => value,
  listToObject: () => ({}),
  objectMove: () => ({}),
  setAutoScroll: () => undefined,
  setPosition: () => undefined,
  useDraggable: () => ({}),
  useDroppable: () => ({}),
  useSortable: () => ({}),
  useSortableList: () => ({}),
};

mock.module('react-native-reanimated-dnd', () => upstream);

const adapter = await import('./index.web');

describe('web entry exports', () => {
  test('re-exports upstream non-sortable symbols unchanged', () => {
    expect(adapter.Draggable).toBe(upstream.Draggable);
    expect(adapter.Droppable).toBe(upstream.Droppable);
    expect(adapter.DropProvider).toBe(upstream.DropProvider);
    expect(adapter.useDraggable).toBe(upstream.useDraggable);
    expect(adapter.useDroppable).toBe(upstream.useDroppable);
    expect(adapter.ScrollDirection).toBe(upstream.ScrollDirection);
    expect(adapter.HorizontalScrollDirection).toBe(upstream.HorizontalScrollDirection);
    expect(adapter.SortableDirection).toBe(upstream.SortableDirection);
    expect(adapter.DraggableState).toBe(upstream.DraggableState);
    expect(adapter.SlotsContext).toBe(upstream.SlotsContext);
  });

  test('overrides sortable symbols with web compat implementations', () => {
    expect(adapter.Sortable).not.toBe(upstream.Sortable);
    expect(adapter.SortableItem).not.toBe(upstream.SortableItem);
    expect(adapter.useSortable).not.toBe(upstream.useSortable);
    expect(adapter.useSortableList).not.toBe(upstream.useSortableList);
  });

  test('exposes SortableItem.Handle on compat export', () => {
    expect(typeof adapter.SortableItem).toBe('function');
    expect(typeof adapter.SortableItem.Handle).toBe('function');
  });
});
