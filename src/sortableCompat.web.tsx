import React, {
  createContext,
  memo,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import {
  type DraggableProps,
  type DraggableState as DraggableStateType,
  type DropProviderProps,
  type DroppableProps,
  type HorizontalScrollDirection as HorizontalScrollDirectionType,
  type ScrollDirection as ScrollDirectionType,
  type SortableDirection as SortableDirectionType,
  type SortableHandleProps,
  type SortableItemProps,
  type SortableProps,
  type SortableRenderItemProps,
  type UseDraggableOptions,
  type UseDraggableReturn,
  type UseDroppableOptions,
  type UseDroppableReturn,
  type UseSortableListOptions,
  type UseSortableListReturn,
  type UseSortableOptions,
  type UseSortableReturn,
} from 'react-native-reanimated-dnd';

type PositionMap = Record<string, number>;

type SharedValueLike<T> = { value: T };

type PointerEventLike = {
  pointerId: number;
  pageX: number;
  pageY: number;
  button?: number;
};

type PointerLikeNativeEvent = {
  pointerId?: number;
  pageX?: number;
  pageY?: number;
  button?: number;
};

type PointerDownEventLike = {
  nativeEvent?: PointerLikeNativeEvent;
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

type SortableItemDragContext = {
  pointerId: number;
  sourceIndex: number;
  targetIndex: number;
  startPageX: number;
  startPageY: number;
};

type SortableItemPendingContext = {
  pointerId: number;
  sourceIndex: number;
  startPageX: number;
  startPageY: number;
};

type SortableItemDragApi = {
  beginTracking: (event: PointerDownEventLike) => void;
};

const DRAG_THRESHOLD = 6;
const DIRECTION_VERTICAL = 'vertical' as SortableDirectionType;
const DIRECTION_HORIZONTAL = 'horizontal' as SortableDirectionType;
const SCROLL_NONE = 'none' as ScrollDirectionType;
const HORIZONTAL_SCROLL_NONE = 'none' as HorizontalScrollDirectionType;

export const ScrollDirection = {
  None: 'none',
  Up: 'up',
  Down: 'down',
} as const;

export const HorizontalScrollDirection = {
  None: 'none',
  Left: 'left',
  Right: 'right',
} as const;

export const SortableDirection = {
  Vertical: 'vertical',
  Horizontal: 'horizontal',
} as const;

export const DraggableState = {
  IDLE: 'IDLE',
  DRAGGING: 'DRAGGING',
  DROPPED: 'DROPPED',
} as const satisfies Record<string, DraggableStateType>;

const slotsContextFallback = {
  register: (_id: number, _slot: unknown) => undefined,
  unregister: (_id: number) => undefined,
  getSlots: () => ({}),
  isRegistered: (_id: number) => false,
  setActiveHoverSlot: (_id: number | null) => undefined,
  activeHoverSlotId: null as number | null,
  registerPositionUpdateListener: (_id: string, _listener: () => void) => undefined,
  unregisterPositionUpdateListener: (_id: string) => undefined,
  requestPositionUpdate: () => undefined,
  registerDroppedItem: (_draggableId: string, _droppableId: string, _itemData: unknown) => undefined,
  unregisterDroppedItem: (_draggableId: string) => undefined,
  getDroppedItems: () => ({}),
  hasAvailableCapacity: (_droppableId: string) => true,
  onDragging: (_payload: unknown) => undefined,
  onDragStart: undefined as ((data: unknown) => void) | undefined,
  onDragEnd: undefined as ((data: unknown) => void) | undefined,
};

export const SlotsContext = createContext(slotsContextFallback);

const SortableItemDragContextValue = createContext<SortableItemDragApi | null>(null);

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
    (positions as SharedValueLike<PositionMap>).value = next;
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

  (sharedValue as SharedValueLike<T>).value = value;
}

function createSharedValue<T>(value: T): SharedValueLike<T> {
  return { value };
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
    writeSharedValue(autoScroll, ScrollDirection.Up as ScrollDirectionType);
    return;
  }

  if (positionY >= upperBound - scrollThreshold) {
    writeSharedValue(autoScroll, ScrollDirection.Down as ScrollDirectionType);
    return;
  }

  writeSharedValue(autoScroll, ScrollDirection.None as ScrollDirectionType);
}

function createPositionsFromIds(ids: string[]): PositionMap {
  const next: PositionMap = {};
  for (const [index, id] of ids.entries()) {
    next[id] = index;
  }
  return next;
}

function defaultItemKeyExtractor<TData>(item: TData, index: number): string {
  if (isRecord(item) && typeof item.id === 'string' && item.id.trim().length > 0) {
    return item.id;
  }

  return `item-${index}`;
}

function findIdByIndex(positions: PositionMap, targetIndex: number, excludedId: string): string | null {
  for (const [candidateId, candidateIndex] of Object.entries(positions)) {
    if (candidateId !== excludedId && candidateIndex === targetIndex) {
      return candidateId;
    }
  }

  return null;
}

function childHasHandle(children: ReactNode): boolean {
  return React.Children.toArray(children).some((child) => {
    if (!React.isValidElement(child)) {
      return false;
    }

    if (child.type === SortableHandle) {
      return true;
    }

    const element = child as ReactElement<{ children?: ReactNode }>;
    return childHasHandle(element.props.children);
  });
}

function SortableHandle({ children, style }: SortableHandleProps): React.JSX.Element {
  const dragApi = useContext(SortableItemDragContextValue);

  const handlePointerDown = useCallback(
    (event: PointerDownEventLike) => {
      dragApi?.beginTracking(event);
    },
    [dragApi],
  );

  return (
    <View onPointerDown={handlePointerDown} style={style}>
      {children}
    </View>
  );
}

function SortableItemBase<T>({
  id,
  direction = DIRECTION_VERTICAL,
  positions,
  itemsCount,
  itemHeight = 0,
  itemWidth = 0,
  gap = 0,
  children,
  style,
  onMove,
  onDragStart,
  onDrop,
  onDragging,
  onDraggingHorizontal,
}: SortableItemProps<T>): React.JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const dragContextRef = useRef<SortableItemDragContext | null>(null);
  const pendingContextRef = useRef<SortableItemPendingContext | null>(null);
  const listenersRef = useRef<PointerListeners>({ move: null, up: null });

  const isHorizontal = direction === DIRECTION_HORIZONTAL;
  const itemExtent = isHorizontal ? itemWidth : itemHeight;
  const itemStep = (itemExtent ?? 0) + gap;
  const hasHandle = useMemo(() => childHasHandle(children), [children]);

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
    (event: PointerEventLike) => {
      const drag = dragContextRef.current;
      if (!drag || itemStep <= 0) {
        return;
      }

      const delta = isHorizontal ? event.pageX - drag.startPageX : event.pageY - drag.startPageY;
      const deltaRows = Math.round(delta / itemStep);
      const nextTarget = clamp(drag.sourceIndex + deltaRows, 0, Math.max(0, itemsCount - 1));
      if (nextTarget !== drag.targetIndex) {
        drag.targetIndex = nextTarget;

        const currentPositions = readPositions(positions);
        const overItemId = findIdByIndex(currentPositions, nextTarget, id);

        if (isHorizontal) {
          onDraggingHorizontal?.(id, overItemId, event.pageX);
        } else {
          onDragging?.(id, overItemId, event.pageY);
        }
      }
    },
    [id, isHorizontal, itemStep, itemsCount, onDragging, onDraggingHorizontal, positions],
  );

  const commitDrop = useCallback(() => {
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

  const beginTrackingInternal = useCallback(
    (pointerEvent: PointerEventLike) => {
      const webWindow = getWebWindow();
      if (!webWindow || itemStep <= 0) {
        return;
      }

      const sourceIndex = readPositions(positions)[id] ?? 0;
      pendingContextRef.current = {
        pointerId: pointerEvent.pointerId,
        sourceIndex,
        startPageX: pointerEvent.pageX,
        startPageY: pointerEvent.pageY,
      };

      const handleMove = (moveEvent: PointerEventLike) => {
        const drag = dragContextRef.current;
        if (drag) {
          if (drag.pointerId !== moveEvent.pointerId) return;
          updateDragTarget(moveEvent);
          return;
        }

        const pending = pendingContextRef.current;
        if (pending?.pointerId !== moveEvent.pointerId) return;

        const deltaPrimary = isHorizontal
          ? moveEvent.pageX - pending.startPageX
          : moveEvent.pageY - pending.startPageY;
        const deltaSecondary = isHorizontal
          ? moveEvent.pageY - pending.startPageY
          : moveEvent.pageX - pending.startPageX;

        if (
          !(
            Math.abs(deltaPrimary) > DRAG_THRESHOLD &&
            Math.abs(deltaPrimary) > Math.abs(deltaSecondary)
          )
        ) {
          return;
        }

        dragContextRef.current = {
          pointerId: pending.pointerId,
          sourceIndex: pending.sourceIndex,
          targetIndex: pending.sourceIndex,
          startPageX: pending.startPageX,
          startPageY: pending.startPageY,
        };
        pendingContextRef.current = null;
        setIsDragging(true);
        onDragStart?.(id, dragContextRef.current.sourceIndex);
        updateDragTarget(moveEvent);
      };

      const handleUp = (upEvent: PointerEventLike) => {
        const drag = dragContextRef.current;
        if (drag) {
          if (drag.pointerId !== upEvent.pointerId) return;
          commitDrop();
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
    [clearListeners, commitDrop, id, isHorizontal, itemStep, onDragStart, positions, updateDragTarget],
  );

  const beginTracking = useCallback(
    (event: PointerDownEventLike) => {
      const nativeEvent = event.nativeEvent;
      if (!nativeEvent) return;

      if (typeof nativeEvent.button === 'number' && nativeEvent.button !== 0) {
        return;
      }

      const { pointerId, pageX, pageY } = nativeEvent;
      if (typeof pointerId !== 'number' || typeof pageX !== 'number' || typeof pageY !== 'number') {
        return;
      }

      beginTrackingInternal({
        pointerId,
        pageX,
        pageY,
        button: nativeEvent.button,
      });
    },
    [beginTrackingInternal],
  );

  const dragApi = useMemo<SortableItemDragApi>(() => ({ beginTracking }), [beginTracking]);

  return (
    <SortableItemDragContextValue.Provider value={dragApi}>
      <View
        onPointerDown={hasHandle ? undefined : beginTracking}
        style={[
          isHorizontal && itemWidth > 0 ? { width: itemWidth } : null,
          !isHorizontal && itemHeight > 0 ? { height: itemHeight } : null,
          style as StyleProp<ViewStyle>,
          isDragging ? webStyles.dragging : null,
        ]}
      >
        {children}
      </View>
    </SortableItemDragContextValue.Provider>
  );
}

export const SortableItem = Object.assign(SortableItemBase, {
  Handle: SortableHandle,
});

function SortableImpl<TData>({
  data,
  renderItem,
  direction = DIRECTION_VERTICAL,
  itemHeight,
  itemWidth,
  gap = 0,
  paddingHorizontal = 0,
  style,
  contentContainerStyle,
  itemKeyExtractor,
}: SortableProps<TData>): React.JSX.Element {
  const isHorizontal = direction === DIRECTION_HORIZONTAL;
  const isVertical = !isHorizontal;

  if (isVertical && (!itemHeight || itemHeight <= 0)) {
    throw new Error('itemHeight is required and must be > 0 when direction is vertical.');
  }

  if (isHorizontal && (!itemWidth || itemWidth <= 0)) {
    throw new Error('itemWidth is required and must be > 0 when direction is horizontal.');
  }

  const keyExtractor = itemKeyExtractor ?? defaultItemKeyExtractor<TData>;
  const ids = useMemo(
    () => data.map((item, index) => keyExtractor(item, index)),
    [data, keyExtractor],
  );

  const positionsRef = useRef<SharedValueLike<PositionMap>>(createSharedValue({}));
  const lowerBoundRef = useRef<SharedValueLike<number>>(createSharedValue(0));
  const leftBoundRef = useRef<SharedValueLike<number>>(createSharedValue(0));
  const autoScrollDirectionRef = useRef<SharedValueLike<ScrollDirectionType>>(
    createSharedValue(SCROLL_NONE),
  );
  const autoScrollHorizontalDirectionRef = useRef<SharedValueLike<HorizontalScrollDirectionType>>(
    createSharedValue(HORIZONTAL_SCROLL_NONE),
  );

  useEffect(() => {
    positionsRef.current.value = createPositionsFromIds(ids);
  }, [ids]);

  const renderSortableItem = useCallback(
    (item: TData, index: number) => {
      const id = ids[index] ?? keyExtractor(item, index);
      const renderProps: SortableRenderItemProps<TData> = {
        item,
        index,
        id,
        positions: positionsRef.current as SortableRenderItemProps<TData>['positions'],
        direction,
        lowerBound: isVertical
          ? (lowerBoundRef.current as SortableRenderItemProps<TData>['lowerBound'])
          : undefined,
        leftBound: isHorizontal
          ? (leftBoundRef.current as SortableRenderItemProps<TData>['leftBound'])
          : undefined,
        autoScrollDirection: isVertical
          ? (autoScrollDirectionRef.current as SortableRenderItemProps<TData>['autoScrollDirection'])
          : undefined,
        autoScrollHorizontalDirection: isHorizontal
          ? (autoScrollHorizontalDirectionRef.current as SortableRenderItemProps<TData>['autoScrollHorizontalDirection'])
          : undefined,
        itemsCount: data.length,
        itemHeight,
        itemWidth,
        gap,
        paddingHorizontal,
      };

      return (
        <View
          key={id}
          style={
            index < data.length - 1
              ? isHorizontal
                ? { marginRight: gap }
                : { marginBottom: gap }
              : null
          }
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
      isHorizontal,
      isVertical,
      itemHeight,
      itemWidth,
      keyExtractor,
      paddingHorizontal,
      renderItem,
    ],
  );

  return (
    <View style={style}>
      <View style={[contentContainerStyle, isHorizontal ? webStyles.horizontalContent : null]}>
        {data.map(renderSortableItem)}
      </View>
    </View>
  );
}

export const Sortable = memo(SortableImpl) as typeof SortableImpl;

type DraggableHandleProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

function DraggableHandle({ children, style }: DraggableHandleProps): React.JSX.Element {
  return <View style={style}>{children}</View>;
}

function DraggableComponent<TData = unknown>(
  { style, children }: DraggableProps<TData>,
  _ref: ForwardedRef<unknown>,
): React.JSX.Element {
  return <View style={style}>{children}</View>;
}

const ForwardedDraggable = forwardRef(DraggableComponent) as <TData = unknown>(
  props: DraggableProps<TData> & { ref?: ForwardedRef<unknown> },
) => React.JSX.Element;

export const Draggable = Object.assign(ForwardedDraggable, {
  Handle: DraggableHandle,
});

export function Droppable<TData = unknown>({
  style,
  children,
}: DroppableProps<TData>): React.JSX.Element {
  return <View style={style}>{children}</View>;
}

export function DropProvider({
  children,
}: DropProviderProps): React.JSX.Element {
  return <SlotsContext.Provider value={slotsContextFallback}>{children}</SlotsContext.Provider>;
}

export function useDraggable<TData = unknown>(
  _options: UseDraggableOptions<TData>,
): UseDraggableReturn {
  return {
    animatedViewProps: {
      style: {},
      onLayout: () => undefined,
    },
    gesture: {},
    state: DraggableState.IDLE,
    animatedViewRef: { current: null } as unknown as UseDraggableReturn['animatedViewRef'],
    hasHandle: false,
  };
}

export function useDroppable<TData = unknown>(
  _options: UseDroppableOptions<TData>,
): UseDroppableReturn {
  return {
    viewProps: {
      onLayout: () => undefined,
      style: {},
    },
    isActive: false,
    activeStyle: undefined,
    animatedViewRef: { current: null } as unknown as UseDroppableReturn['animatedViewRef'],
  };
}

export function useSortable<T>(_options: UseSortableOptions<T>): UseSortableReturn {
  const panGestureHandler = useMemo(() => ({ onStart: () => undefined }), []);

  return {
    animatedStyle: {},
    panGestureHandler,
    isMoving: false,
    hasHandle: false,
  };
}

export function useSortableList<TData extends { id: string }>(
  options: UseSortableListOptions<TData>,
): UseSortableListReturn<TData> {
  const { data, itemHeight, itemKeyExtractor = (item) => item.id } = options;

  const positionsRef = useRef<SharedValueLike<PositionMap>>(createSharedValue({}));
  const scrollYRef = useRef<SharedValueLike<number>>(createSharedValue(0));
  const autoScrollRef = useRef<SharedValueLike<ScrollDirectionType>>(
    createSharedValue(SCROLL_NONE),
  );
  const scrollViewRef = useRef<unknown>(null);
  const dropProviderRef = useRef<unknown>(null);

  useEffect(() => {
    const ids = data.map((item, index) => itemKeyExtractor(item, index));
    positionsRef.current.value = createPositionsFromIds(ids);
  }, [data, itemKeyExtractor]);

  const handleScroll = useCallback((event: { nativeEvent?: { contentOffset?: { y?: number } } }) => {
    const y = event.nativeEvent?.contentOffset?.y;
    if (typeof y === 'number') {
      scrollYRef.current.value = y;
    }
  }, []);

  const handleScrollEnd = useCallback(() => {
    return undefined;
  }, []);

  const contentHeight = data.length * itemHeight;

  const getItemProps = useCallback(
    (item: TData, index: number) => {
      const id = itemKeyExtractor(item, index);
      return {
        id,
        positions: positionsRef.current,
        lowerBound: scrollYRef.current,
        autoScrollDirection: autoScrollRef.current,
        itemsCount: data.length,
        itemHeight,
      };
    },
    [data.length, itemHeight, itemKeyExtractor],
  );

  return {
    positions: positionsRef.current,
    scrollY: scrollYRef.current,
    autoScroll: autoScrollRef.current,
    scrollViewRef,
    dropProviderRef: dropProviderRef as UseSortableListReturn<TData>['dropProviderRef'],
    handleScroll,
    handleScrollEnd,
    contentHeight,
    getItemProps,
  };
}

const webStyles = StyleSheet.create({
  dragging: {
    opacity: 0.7,
    userSelect: 'none' as ViewStyle['userSelect'],
  },
  horizontalContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
});
