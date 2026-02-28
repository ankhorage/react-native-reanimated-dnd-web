import React, {
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import type {
  SortableHandleProps,
  SortableItemProps,
  SortableProps,
  SortableRenderItemProps,
} from 'react-native-reanimated-dnd';

type PositionMap = Record<string, number>;
type PointerEventLike = {
  pointerId: number;
  pageX: number;
  pageY: number;
  button?: number;
};
type WebWindowLike = {
  addEventListener: (
    type: 'pointermove' | 'pointerup' | 'pointercancel',
    listener: (event: PointerEventLike) => void,
  ) => void;
  removeEventListener: (
    type: 'pointermove' | 'pointerup' | 'pointercancel',
    listener: (event: PointerEventLike) => void,
  ) => void;
};
type PointerListeners = {
  move: ((event: PointerEventLike) => void) | null;
  up: ((event: PointerEventLike) => void) | null;
};

const DRAG_THRESHOLD = 6;
const WEB_ERROR_PREFIX = '[@ankhorage/react-native-reanimated-dnd-web:web]';

function createUnsupportedError(symbol: string): Error {
  return new Error(
    `${WEB_ERROR_PREFIX} ${symbol} is not supported on web yet. Use Sortable/SortableItem for sortable lists.`,
  );
}

function unsupportedFunction<T extends (...args: never[]) => unknown>(symbol: string): T {
  const unsupported = (() => {
    throw createUnsupportedError(symbol);
  }) as T;

  return unsupported;
}

function unsupportedComponent<P extends object>(symbol: string): React.FC<P> {
  const Unsupported: React.FC<P> = () => {
    throw createUnsupportedError(symbol);
  };

  Unsupported.displayName = `Unsupported${symbol}`;
  return Unsupported;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getWebWindow(): WebWindowLike | null {
  if (typeof globalThis === 'undefined') return null;

  const maybeWindow = globalThis as unknown as Partial<WebWindowLike>;
  if (
    typeof maybeWindow.addEventListener !== 'function' ||
    typeof maybeWindow.removeEventListener !== 'function'
  ) {
    return null;
  }

  return maybeWindow as WebWindowLike;
}

function toPositionMap(candidate: unknown): PositionMap {
  if (!isRecord(candidate)) {
    return {};
  }

  const next: PositionMap = {};
  for (const [key, value] of Object.entries(candidate)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      next[key] = value;
    }
  }
  return next;
}

function readPositions(positions: unknown): PositionMap {
  if (isRecord(positions) && 'value' in positions) {
    return toPositionMap(positions.value);
  }

  return toPositionMap(positions);
}

function writePositions(positions: unknown, next: PositionMap): void {
  if (isRecord(positions) && 'value' in positions) {
    (positions as { value: PositionMap }).value = next;
    return;
  }

  if (!isRecord(positions)) {
    return;
  }

  for (const key of Object.keys(positions)) {
    delete positions[key];
  }
  Object.assign(positions, next);
}

function writeSharedValue<T>(sharedValue: unknown, value: T): void {
  if (!isRecord(sharedValue) || !('value' in sharedValue)) {
    return;
  }

  (sharedValue as { value: T }).value = value;
}

function defaultItemKeyExtractor<TData>(item: TData, index: number): string {
  if (isRecord(item) && typeof item.id === 'string' && item.id.trim().length > 0) {
    return item.id;
  }

  return `item-${index}`;
}

function createPositionsFromIds(ids: string[]): PositionMap {
  const next: PositionMap = {};
  for (const [index, id] of ids.entries()) {
    next[id] = index;
  }
  return next;
}

type PositionSharedValue = SortableRenderItemProps<unknown>['positions'];

function createPositionSharedValue(positionMap: PositionMap): PositionSharedValue {
  // Keep a SharedValue-like shape (`{ value }`) so both web logic and upstream prop types align.
  return { value: positionMap } as PositionSharedValue;
}

export enum ScrollDirection {
  None = 'none',
  Up = 'up',
  Down = 'down',
}

export function clamp(value: number, lowerBound: number, upperBound: number): number {
  return Math.min(Math.max(value, lowerBound), upperBound);
}

export function objectMove(object: PositionMap, from: number, to: number): PositionMap {
  const entries = Object.entries(object).sort(([, indexA], [, indexB]) => indexA - indexB);
  if (entries.length === 0) {
    return {};
  }

  const safeFrom = clamp(from, 0, entries.length - 1);
  const safeTo = clamp(to, 0, entries.length - 1);
  const [moved] = entries.splice(safeFrom, 1);
  if (!moved) {
    return object;
  }

  entries.splice(safeTo, 0, moved);

  const next: PositionMap = {};
  for (const [index, [id]] of entries.entries()) {
    next[id] = index;
  }
  return next;
}

export function listToObject<T extends { id: string }>(list: T[]): PositionMap {
  const next: PositionMap = {};
  for (const [index, item] of list.entries()) {
    next[item.id] = index;
  }
  return next;
}

export function setPosition(
  positionY: number,
  itemsCount: number,
  positions: unknown,
  id: string,
  itemHeight: number,
): void {
  if (!id || itemsCount <= 0 || itemHeight <= 0) {
    return;
  }

  const currentPositions = readPositions(positions);
  const from = currentPositions[id];
  if (typeof from !== 'number') {
    return;
  }

  const nextPosition = clamp(Math.round(positionY / itemHeight), 0, itemsCount - 1);
  writePositions(positions, objectMove(currentPositions, from, nextPosition));
}

export function setAutoScroll(
  positionY: number,
  lowerBound: number,
  upperBound: number,
  scrollThreshold: number,
  autoScroll: unknown,
): void {
  if (positionY <= lowerBound + scrollThreshold) {
    writeSharedValue(autoScroll, ScrollDirection.Up);
    return;
  }

  if (positionY >= upperBound - scrollThreshold) {
    writeSharedValue(autoScroll, ScrollDirection.Down);
    return;
  }

  writeSharedValue(autoScroll, ScrollDirection.None);
}

type SortableItemDragContext = {
  pointerId: number;
  sourceIndex: number;
  targetIndex: number;
  startPageY: number;
};

type SortableItemPendingContext = {
  pointerId: number;
  sourceIndex: number;
  startPageX: number;
  startPageY: number;
};

function SortableHandle({ children, style }: SortableHandleProps): React.JSX.Element {
  return <View style={style}>{children}</View>;
}

function SortableItemBase<T>({
  id,
  positions,
  itemsCount,
  itemHeight = 0,
  gap = 0,
  children,
  style,
  onMove,
  onDragStart,
  onDrop,
  onDragging,
}: SortableItemProps<T>): React.JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const dragContextRef = useRef<SortableItemDragContext | null>(null);
  const pendingContextRef = useRef<SortableItemPendingContext | null>(null);
  const listenersRef = useRef<PointerListeners>({ move: null, up: null });
  const rowStep = itemHeight + gap;

  const clearListeners = useCallback(() => {
    const webWindow = getWebWindow();
    if (!webWindow) return;

    const currentMove = listenersRef.current.move;
    if (currentMove) {
      webWindow.removeEventListener('pointermove', currentMove);
    }

    const currentUp = listenersRef.current.up;
    if (currentUp) {
      webWindow.removeEventListener('pointerup', currentUp);
      webWindow.removeEventListener('pointercancel', currentUp);
    }

    listenersRef.current = { move: null, up: null };
  }, []);

  const resetDragState = useCallback(() => {
    dragContextRef.current = null;
    pendingContextRef.current = null;
    setIsDragging(false);
    clearListeners();
  }, [clearListeners]);

  useEffect(() => {
    return () => {
      clearListeners();
    };
  }, [clearListeners]);

  const updateDragTarget = useCallback(
    (pageY: number) => {
      const drag = dragContextRef.current;
      if (!drag || rowStep <= 0) return;

      const dy = pageY - drag.startPageY;
      const deltaRows = Math.round(dy / rowStep);
      const nextTarget = clamp(drag.sourceIndex + deltaRows, 0, Math.max(0, itemsCount - 1));
      if (nextTarget !== drag.targetIndex) {
        drag.targetIndex = nextTarget;
        onDragging?.(id, null, pageY);
      }
    },
    [id, itemsCount, onDragging, rowStep],
  );

  const handleDrop = useCallback(() => {
    const drag = dragContextRef.current;
    if (!drag) {
      resetDragState();
      return;
    }

    if (drag.targetIndex !== drag.sourceIndex) {
      const currentPositions = readPositions(positions);
      const from = currentPositions[id];
      if (typeof from === 'number') {
        writePositions(positions, objectMove(currentPositions, from, drag.targetIndex));
      }

      onMove?.(id, drag.sourceIndex, drag.targetIndex);
      onDrop?.(id, drag.targetIndex);
    }

    resetDragState();
  }, [id, onDrop, onMove, positions, resetDragState]);

  const beginTracking = useCallback(
    (event: PointerEventLike) => {
      const webWindow = getWebWindow();
      if (!webWindow) return;

      const sourceIndex = readPositions(positions)[id] ?? 0;
      pendingContextRef.current = {
        pointerId: event.pointerId,
        sourceIndex,
        startPageX: event.pageX,
        startPageY: event.pageY,
      };

      const handleMove = (moveEvent: PointerEventLike) => {
        const drag = dragContextRef.current;
        if (drag) {
          if (drag.pointerId !== moveEvent.pointerId) return;
          updateDragTarget(moveEvent.pageY);
          return;
        }

        const pending = pendingContextRef.current;
        if (pending?.pointerId !== moveEvent.pointerId) return;

        const dy = moveEvent.pageY - pending.startPageY;
        const dx = moveEvent.pageX - pending.startPageX;
        if (!(Math.abs(dy) > DRAG_THRESHOLD && Math.abs(dy) > Math.abs(dx))) {
          return;
        }

        dragContextRef.current = {
          pointerId: pending.pointerId,
          sourceIndex: pending.sourceIndex,
          targetIndex: pending.sourceIndex,
          startPageY: pending.startPageY,
        };
        pendingContextRef.current = null;
        setIsDragging(true);
        onDragStart?.(id, dragContextRef.current.sourceIndex);
        updateDragTarget(moveEvent.pageY);
      };

      const handleUp = (upEvent: PointerEventLike) => {
        const drag = dragContextRef.current;
        if (drag) {
          if (drag.pointerId !== upEvent.pointerId) return;
          handleDrop();
          return;
        }

        const pending = pendingContextRef.current;
        if (pending?.pointerId === upEvent.pointerId) {
          pendingContextRef.current = null;
          clearListeners();
        }
      };

      clearListeners();
      listenersRef.current = { move: handleMove, up: handleUp };
      webWindow.addEventListener('pointermove', handleMove);
      webWindow.addEventListener('pointerup', handleUp);
      webWindow.addEventListener('pointercancel', handleUp);
    },
    [clearListeners, handleDrop, id, onDragStart, positions, updateDragTarget],
  );

  const handlePointerDown = useCallback(
    (event: { nativeEvent?: Partial<PointerEventLike> }) => {
      const { nativeEvent } = event;
      if (!nativeEvent) return;

      if (typeof nativeEvent.button === 'number' && nativeEvent.button !== 0) {
        return;
      }

      const { pointerId } = nativeEvent;
      const { pageX } = nativeEvent;
      const { pageY } = nativeEvent;

      if (typeof pointerId !== 'number' || typeof pageX !== 'number' || typeof pageY !== 'number') {
        return;
      }

      beginTracking({
        pointerId,
        pageX,
        pageY,
        button: nativeEvent.button,
      });
    },
    [beginTracking],
  );

  return (
    <View
      onPointerDown={handlePointerDown}
      style={[
        itemHeight > 0 ? { height: itemHeight } : null,
        style as StyleProp<ViewStyle>,
        isDragging ? webStyles.dragging : null,
      ]}
    >
      {children}
    </View>
  );
}

export const SortableItem = Object.assign(SortableItemBase, {
  Handle: SortableHandle,
});

function SortableImpl<TData>({
  data,
  renderItem,
  direction,
  itemHeight,
  itemWidth,
  gap,
  paddingHorizontal,
  style,
  contentContainerStyle,
  itemKeyExtractor,
}: SortableProps<TData>): React.JSX.Element {
  const keyExtractor = itemKeyExtractor ?? defaultItemKeyExtractor<TData>;
  const ids = useMemo(
    () => data.map((item, index) => keyExtractor(item, index)),
    [data, keyExtractor],
  );
  const positions = useMemo(() => createPositionSharedValue(createPositionsFromIds(ids)), [ids]);

  const renderSortableItem = useCallback(
    (item: TData, index: number) => {
      const id = ids[index] ?? keyExtractor(item, index);
      const marginBottom = gap ?? 0;
      const renderProps: SortableRenderItemProps<TData> = {
        item,
        index,
        id,
        positions,
        direction,
        itemsCount: data.length,
        itemHeight,
        itemWidth,
        gap,
        paddingHorizontal,
      };

      return (
        <View
          key={id}
          style={index < data.length - 1 && marginBottom > 0 ? { marginBottom } : null}
        >
          {renderItem(renderProps)}
        </View>
      );
    },
    [
      data.length,
      direction,
      gap,
      ids,
      itemHeight,
      itemWidth,
      keyExtractor,
      paddingHorizontal,
      positions,
      renderItem,
    ],
  );

  return (
    <View style={style}>
      <View style={contentContainerStyle}>{data.map(renderSortableItem)}</View>
    </View>
  );
}

export const Sortable = memo(SortableImpl) as typeof SortableImpl;

interface DropProviderProps {
  children?: ReactNode;
}

export function DropProvider({ children }: DropProviderProps): React.JSX.Element {
  return <>{children}</>;
}

export const Draggable = unsupportedComponent<Record<string, unknown>>('Draggable');
export const Droppable = unsupportedComponent<Record<string, unknown>>('Droppable');
export const useDraggable = unsupportedFunction<(...args: never[]) => never>('useDraggable');
export const useDroppable = unsupportedFunction<(...args: never[]) => never>('useDroppable');
export const useSortable = unsupportedFunction<(...args: never[]) => never>('useSortable');
export const useSortableList = unsupportedFunction<(...args: never[]) => never>('useSortableList');

const webStyles = StyleSheet.create({
  dragging: {
    opacity: 0.7,
  },
});

export type * from 'react-native-reanimated-dnd';
