import { useCallback, useContext, useEffect, useRef } from 'react';
import type { UseDroppableOptions, UseDroppableReturn } from 'react-native-reanimated-dnd';
import { SlotsContext } from './DropProvider.web';
import { measureRef } from './domMeasurement';

let nextDroppableId = 1;

export function getUniqueDroppableId(): number {
  return nextDroppableId++;
}

export function useDroppable<TData = unknown>(
  options: UseDroppableOptions<TData>,
): UseDroppableReturn {
  const {
    onDrop,
    dropDisabled,
    onActiveChange,
    dropAlignment,
    dropOffset,
    activeStyle,
    droppableId,
    capacity,
  } = options;

  const animatedViewRef = useRef<unknown>(null);
  const id = useRef(getUniqueDroppableId()).current;
  const stringId = useRef(droppableId ?? `droppable-${id}`).current;
  const instanceId = useRef(`droppable-${id}-${Math.random().toString(36).slice(2, 11)}`).current;
  const {
    register,
    unregister,
    activeHoverSlotId,
    registerPositionUpdateListener,
    unregisterPositionUpdateListener,
  } = useContext(SlotsContext);
  const isActive = activeHoverSlotId === id;

  const updateDroppablePosition = useCallback(() => {
    const measurement = measureRef(animatedViewRef);
    if (!measurement || measurement.width <= 0 || measurement.height <= 0) {
      unregister(id);
      return;
    }

    register(id, {
      id: stringId,
      x: measurement.x,
      y: measurement.y,
      width: measurement.width,
      height: measurement.height,
      onDrop,
      dropAlignment: dropAlignment ?? 'center',
      dropOffset: dropOffset ?? { x: 0, y: 0 },
      capacity,
    });
  }, [capacity, dropAlignment, dropOffset, id, onDrop, register, stringId, unregister]);

  const handleLayoutHandler = useCallback(() => {
    updateDroppablePosition();
  }, [updateDroppablePosition]);

  useEffect(() => {
    onActiveChange?.(isActive);
  }, [isActive, onActiveChange]);

  useEffect(() => {
    registerPositionUpdateListener(instanceId, updateDroppablePosition);
    return () => {
      unregisterPositionUpdateListener(instanceId);
    };
  }, [instanceId, registerPositionUpdateListener, unregisterPositionUpdateListener, updateDroppablePosition]);

  useEffect(() => {
    if (dropDisabled) {
      unregister(id);
      return;
    }

    updateDroppablePosition();
  }, [dropDisabled, id, unregister, updateDroppablePosition]);

  useEffect(() => {
    return () => {
      unregister(id);
    };
  }, [id, unregister]);

  return {
    viewProps: {
      onLayout: handleLayoutHandler,
      style: isActive ? activeStyle : undefined,
    },
    isActive,
    activeStyle,
    animatedViewRef: animatedViewRef as UseDroppableReturn['animatedViewRef'],
  };
}
