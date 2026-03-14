import React, {
  createContext,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  DropProviderProps,
  DropProviderRef,
  DroppedItemsMap,
  SlotsContextValue,
} from 'react-native-reanimated-dnd';
import type { DropSlotLike } from './geometry';

export function applyDroppedItem<TData = unknown>(
  droppedItems: DroppedItemsMap<TData>,
  draggableId: string,
  droppableId: string,
  data: TData,
): DroppedItemsMap<TData> {
  return {
    ...droppedItems,
    [draggableId]: {
      droppableId,
      data,
    },
  };
}

export function removeDroppedItem<TData = unknown>(
  droppedItems: DroppedItemsMap<TData>,
  draggableId: string,
): DroppedItemsMap<TData> {
  if (!(draggableId in droppedItems)) {
    return droppedItems;
  }

  const next = { ...droppedItems };
  delete next[draggableId];
  return next;
}

export function hasAvailableCapacityForDroppable(
  slots: Record<number, DropSlotLike>,
  droppedItems: DroppedItemsMap,
  droppableId: string,
): boolean {
  let droppableSlot: DropSlotLike | null = null;
  for (const key in slots) {
    const slot = slots[Number(key)];
    if (slot?.id === droppableId) {
      droppableSlot = slot;
      break;
    }
  }

  if (!droppableSlot) {
    return false;
  }

  const capacity = droppableSlot.capacity !== undefined ? droppableSlot.capacity : 1;
  let droppedCount = 0;
  for (const item of Object.values(droppedItems)) {
    if (item.droppableId === droppableId) {
      droppedCount += 1;
    }
  }

  return droppedCount < capacity;
}

const slotsContextFallback: SlotsContextValue<unknown> = {
  register: (_id, _slot) => undefined,
  unregister: (_id) => undefined,
  getSlots: () => ({}),
  isRegistered: (_id) => false,
  setActiveHoverSlot: (_id) => undefined,
  activeHoverSlotId: null,
  registerPositionUpdateListener: (_id, _listener) => undefined,
  unregisterPositionUpdateListener: (_id) => undefined,
  requestPositionUpdate: () => undefined,
  registerDroppedItem: (_draggableId, _droppableId, _itemData) => undefined,
  unregisterDroppedItem: (_draggableId) => undefined,
  getDroppedItems: () => ({}),
  hasAvailableCapacity: (_droppableId) => true,
  onDragging: undefined,
  onDragStart: undefined,
  onDragEnd: undefined,
};

export const SlotsContext = createContext(slotsContextFallback);

export const DropProvider = forwardRef<DropProviderRef, DropProviderProps>(function DropProvider(
  { children, onLayoutUpdateComplete, onDroppedItemsUpdate, onDragging, onDragStart, onDragEnd },
  ref,
): React.JSX.Element {
  const slotsRef = useRef<Record<number, DropSlotLike>>({});
  const positionUpdateListenersRef = useRef<Record<string, () => void>>({});
  const [activeHoverSlotId, setActiveHoverSlotId] = useState<number | null>(null);
  const [droppedItems, setDroppedItems] = useState<DroppedItemsMap>({});

  const register = useCallback((id: number, slot: DropSlotLike) => {
    slotsRef.current[id] = slot;
  }, []);

  const unregister = useCallback((id: number) => {
    delete slotsRef.current[id];
    setActiveHoverSlotId((current) => (current === id ? null : current));
  }, []);

  const isRegistered = useCallback((id: number) => slotsRef.current[id] !== undefined, []);

  const getSlots = useCallback(() => slotsRef.current, []);

  const registerPositionUpdateListener = useCallback((id: string, listener: () => void) => {
    positionUpdateListenersRef.current[id] = listener;
  }, []);

  const unregisterPositionUpdateListener = useCallback((id: string) => {
    delete positionUpdateListenersRef.current[id];
  }, []);

  const getDroppedItems = useCallback(() => droppedItems, [droppedItems]);

  const requestPositionUpdate = useCallback(() => {
    for (const listener of Object.values(positionUpdateListenersRef.current)) {
      listener();
    }
    onLayoutUpdateComplete?.();
  }, [onLayoutUpdateComplete]);

  const registerDroppedItem = useCallback(
    (draggableId: string, droppableId: string, itemData: unknown) => {
      setDroppedItems((current) => applyDroppedItem(current, draggableId, droppableId, itemData));
    },
    [],
  );

  const unregisterDroppedItem = useCallback((draggableId: string) => {
    setDroppedItems((current) => removeDroppedItem(current, draggableId));
  }, []);

  const hasAvailableCapacity = useCallback(
    (droppableId: string) =>
      hasAvailableCapacityForDroppable(slotsRef.current, droppedItems, droppableId),
    [droppedItems],
  );

  const handleDragStart = useCallback(
    (data: unknown) => {
      onDragStart?.(data);
      requestPositionUpdate();
    },
    [onDragStart, requestPositionUpdate],
  );

  useEffect(() => {
    onDroppedItemsUpdate?.(droppedItems);
  }, [droppedItems, onDroppedItemsUpdate]);

  useImperativeHandle(
    ref,
    () => ({
      requestPositionUpdate,
      getDroppedItems,
    }),
    [getDroppedItems, requestPositionUpdate],
  );

  const contextValue = useMemo<SlotsContextValue<unknown>>(
    () => ({
      register,
      unregister,
      getSlots,
      isRegistered,
      setActiveHoverSlot: setActiveHoverSlotId,
      activeHoverSlotId,
      registerPositionUpdateListener,
      unregisterPositionUpdateListener,
      requestPositionUpdate,
      registerDroppedItem,
      unregisterDroppedItem,
      getDroppedItems,
      hasAvailableCapacity,
      onDragging,
      onDragStart: handleDragStart,
      onDragEnd,
    }),
    [
      activeHoverSlotId,
      getDroppedItems,
      getSlots,
      handleDragStart,
      hasAvailableCapacity,
      isRegistered,
      onDragEnd,
      onDragging,
      register,
      registerDroppedItem,
      registerPositionUpdateListener,
      requestPositionUpdate,
      unregister,
      unregisterDroppedItem,
      unregisterPositionUpdateListener,
    ],
  );

  return <SlotsContext.Provider value={contextValue}>{children}</SlotsContext.Provider>;
});
