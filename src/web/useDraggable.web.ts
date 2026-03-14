import React, {
  type ComponentType,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  DraggableState as DraggableStateType,
  DroppedItemsMap,
  UseDraggableOptions,
  UseDraggableReturn,
} from 'react-native-reanimated-dnd';
import { SlotsContext } from './DropProvider.web';
import { getWebWindow, measureRef } from './domMeasurement';
import {
  applyAxisToTranslation,
  clampTranslationToBounds,
  findMatchingSlot,
  getTranslatedRect,
  resolveAlignedDropPosition,
  type DropSlotLike,
  type LayoutRect,
  type Translation,
} from './geometry';

export type PointerLikeNativeEvent = {
  pointerId?: number;
  pageX?: number;
  pageY?: number;
  button?: number;
};

export type PointerDownEventLike = {
  nativeEvent?: PointerLikeNativeEvent;
  preventDefault?: () => void;
};

type DragSession = {
  pointerId: number;
  startPageX: number;
  startPageY: number;
  startTranslation: Translation;
};

type InternalUseDraggableReturn = UseDraggableReturn & {
  beginTracking: (event: PointerDownEventLike) => void;
  isDragging: boolean;
};

const DRAG_THRESHOLD = 6;

export const DraggableState = {
  IDLE: 'IDLE',
  DRAGGING: 'DRAGGING',
  DROPPED: 'DROPPED',
} as const satisfies Record<string, DraggableStateType>;

let hasWarnedAboutAnimationFunction = false;

export function warnAboutUnsupportedAnimationFunction(): void {
  if (hasWarnedAboutAnimationFunction) {
    return;
  }

  hasWarnedAboutAnimationFunction = true;
  console.warn('Draggable animationFunction is not supported on web and will be ignored.');
}

export function resetAnimationFunctionWarningForTests(): void {
  hasWarnedAboutAnimationFunction = false;
}

export function hasHandleComponent(
  children: ReactNode,
  handleComponent: ComponentType<unknown>,
): boolean {
  return React.Children.toArray(children).some((child) => {
    if (!React.isValidElement(child)) {
      return false;
    }

    if (child.type === handleComponent) {
      return true;
    }

    return hasHandleComponent(child.props.children, handleComponent);
  });
}

function getZeroTranslation(): Translation {
  return { x: 0, y: 0 };
}

function getDragDistance(deltaX: number, deltaY: number): number {
  return Math.hypot(deltaX, deltaY);
}

function countDroppedItemsByDroppableId(
  droppedItems: DroppedItemsMap,
  ignoredDraggableId?: string,
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const [draggableId, item] of Object.entries(droppedItems)) {
    if (draggableId === ignoredDraggableId) {
      continue;
    }

    counts[item.droppableId] = (counts[item.droppableId] ?? 0) + 1;
  }

  return counts;
}

export function useDraggableInternal<TData = unknown>(
  options: UseDraggableOptions<TData> & {
    children?: ReactNode;
    handleComponent?: ComponentType<unknown>;
  },
): InternalUseDraggableReturn {
  const {
    data,
    draggableId,
    dragDisabled = false,
    onDragStart,
    onDragEnd,
    onDragging,
    onStateChange,
    animationFunction,
    dragBoundsRef,
    dragAxis = 'both',
    collisionAlgorithm = 'intersect',
    children,
    handleComponent,
  } = options;
  const animatedViewRef = useRef<unknown>(null);
  const [state, setState] = useState<DraggableStateType>(DraggableState.IDLE);
  const [hasHandle, setHasHandle] = useState(false);
  const [translation, setTranslationState] = useState<Translation>(getZeroTranslation);
  const [isDragging, setIsDragging] = useState(false);

  const translationRef = useRef<Translation>(getZeroTranslation());
  const committedTranslationRef = useRef<Translation>(getZeroTranslation());
  const committedStateRef = useRef<DraggableStateType>(DraggableState.IDLE);
  const dragDisabledRef = useRef(dragDisabled);
  const originRectRef = useRef<LayoutRect | null>(null);
  const draggableRectRef = useRef<LayoutRect | null>(null);
  const boundsRectRef = useRef<LayoutRect | null>(null);
  const activeDragRef = useRef<DragSession | null>(null);
  const pendingDragRef = useRef<DragSession | null>(null);
  const listenersRef = useRef<{
    move: ((event: PointerEvent) => void) | null;
    up: ((event: PointerEvent) => void) | null;
  }>({
    move: null,
    up: null,
  });
  const internalDraggableId = useRef(
    draggableId ?? `draggable-${Math.random().toString(36).slice(2, 11)}`,
  ).current;
  const {
    getSlots,
    setActiveHoverSlot,
    activeHoverSlotId,
    registerPositionUpdateListener,
    unregisterPositionUpdateListener,
    registerDroppedItem,
    unregisterDroppedItem,
    getDroppedItems,
    onDragging: contextOnDragging,
    onDragStart: contextOnDragStart,
    onDragEnd: contextOnDragEnd,
  } = useContext(SlotsContext);

  const setTranslation = useCallback((next: Translation) => {
    const current = translationRef.current;
    if (current.x === next.x && current.y === next.y) {
      return;
    }

    translationRef.current = next;
    setTranslationState(next);
  }, []);

  const clearListeners = useCallback(() => {
    const webWindow = getWebWindow();
    if (!webWindow) {
      return;
    }

    const currentMove = listenersRef.current.move;
    if (currentMove) {
      webWindow.removeEventListener?.('pointermove', currentMove);
    }

    const currentUp = listenersRef.current.up;
    if (currentUp) {
      webWindow.removeEventListener?.('pointerup', currentUp);
      webWindow.removeEventListener?.('pointercancel', currentUp);
    }

    listenersRef.current = {
      move: null,
      up: null,
    };
  }, []);

  const updateDraggablePosition = useCallback(() => {
    const measurement = measureRef(animatedViewRef);
    if (!measurement) {
      return;
    }

    draggableRectRef.current = measurement;
    originRectRef.current = {
      x: measurement.x - translationRef.current.x,
      y: measurement.y - translationRef.current.y,
      width: measurement.width,
      height: measurement.height,
    };
  }, []);

  const updateBounds = useCallback(() => {
    if (!dragBoundsRef) {
      boundsRectRef.current = null;
      return;
    }

    boundsRectRef.current = measureRef(dragBoundsRef as { current: unknown });
  }, [dragBoundsRef]);

  const emitDragging = useCallback(
    (nextTranslation: Translation) => {
      const originRect = originRectRef.current;
      if (!originRect) {
        return;
      }

      const payload = {
        x: originRect.x,
        y: originRect.y,
        tx: nextTranslation.x,
        ty: nextTranslation.y,
        itemData: data,
      };

      onDragging?.(payload);
      contextOnDragging?.(payload);
    },
    [contextOnDragging, data, onDragging],
  );

  const getMatchingSlot = useCallback(
    (nextTranslation: Translation) => {
      const originRect = originRectRef.current;
      const draggableRect = draggableRectRef.current;
      if (!originRect || !draggableRect) {
        return null;
      }

      const currentRect = getTranslatedRect(originRect, draggableRect, nextTranslation);
      const droppedCountsByDroppableId = countDroppedItemsByDroppableId(
        getDroppedItems(),
        internalDraggableId,
      );
      const canAcceptDrop = (slot: DropSlotLike) => {
        const capacity = slot.capacity ?? 1;
        return (droppedCountsByDroppableId[slot.id] ?? 0) < capacity;
      };

      return findMatchingSlot(getSlots(), currentRect, collisionAlgorithm, canAcceptDrop);
    },
    [collisionAlgorithm, getDroppedItems, getSlots, internalDraggableId],
  );

  const updateHoverState = useCallback(
    (nextTranslation: Translation) => {
      const match = getMatchingSlot(nextTranslation);
      const nextSlotId = match?.slotId ?? null;
      if (activeHoverSlotId !== nextSlotId) {
        setActiveHoverSlot(nextSlotId);
      }

      return match;
    },
    [activeHoverSlotId, getMatchingSlot, setActiveHoverSlot],
  );

  const processDrop = useCallback(() => {
    const originRect = originRectRef.current;
    const draggableRect = draggableRectRef.current;
    const currentTranslation = translationRef.current;
    const match = getMatchingSlot(currentTranslation);

    setActiveHoverSlot(null);

    if (!originRect || !draggableRect || !match) {
      const resetTranslation = getZeroTranslation();
      committedTranslationRef.current = resetTranslation;
      committedStateRef.current = DraggableState.IDLE;
      setTranslation(resetTranslation);
      unregisterDroppedItem(internalDraggableId);
      setState(DraggableState.IDLE);
      return;
    }

    match.slot.onDrop?.(data);
    registerDroppedItem(internalDraggableId, match.slot.id, data);
    const targetPosition = resolveAlignedDropPosition(match.slot, draggableRect);
    const nextTranslation = {
      x: targetPosition.x - originRect.x,
      y: targetPosition.y - originRect.y,
    };
    committedTranslationRef.current = nextTranslation;
    committedStateRef.current = DraggableState.DROPPED;
    setTranslation(nextTranslation);
    setState(DraggableState.DROPPED);
  }, [
    data,
    getMatchingSlot,
    internalDraggableId,
    registerDroppedItem,
    setActiveHoverSlot,
    setTranslation,
    unregisterDroppedItem,
  ]);

  const updateDrag = useCallback(
    (pointerEvent: PointerEvent) => {
      const dragSession = activeDragRef.current;
      if (!dragSession || dragDisabledRef.current) {
        return;
      }

      const originRect = originRectRef.current;
      const draggableRect = draggableRectRef.current;
      if (!originRect || !draggableRect) {
        return;
      }

      const deltaX = pointerEvent.pageX - dragSession.startPageX;
      const deltaY = pointerEvent.pageY - dragSession.startPageY;
      const nextTranslation = applyAxisToTranslation(dragAxis, dragSession.startTranslation, {
        x: dragSession.startTranslation.x + deltaX,
        y: dragSession.startTranslation.y + deltaY,
      });
      const boundedTranslation = clampTranslationToBounds(
        originRect,
        draggableRect,
        boundsRectRef.current,
        nextTranslation,
      );

      setTranslation(boundedTranslation);
      emitDragging(boundedTranslation);
      updateHoverState(boundedTranslation);
    },
    [dragAxis, emitDragging, setTranslation, updateHoverState],
  );

  const commitDrag = useCallback(() => {
    if (dragDisabledRef.current) {
      setActiveHoverSlot(null);
      return;
    }

    onDragEnd?.(data);
    contextOnDragEnd?.(data);
    processDrop();
  }, [contextOnDragEnd, data, onDragEnd, processDrop, setActiveHoverSlot]);

  const cancelActiveInteraction = useCallback(() => {
    pendingDragRef.current = null;
    activeDragRef.current = null;
    setIsDragging(false);
    clearListeners();
    setActiveHoverSlot(null);
    setTranslation(committedTranslationRef.current);
    setState(committedStateRef.current);

    if (committedStateRef.current === DraggableState.IDLE) {
      unregisterDroppedItem(internalDraggableId);
    }
  }, [clearListeners, internalDraggableId, setActiveHoverSlot, setTranslation, unregisterDroppedItem]);

  useEffect(() => {
    dragDisabledRef.current = dragDisabled;
    if (!dragDisabled) {
      return;
    }

    if (pendingDragRef.current || activeDragRef.current || state === DraggableState.DRAGGING) {
      cancelActiveInteraction();
    }
  }, [cancelActiveInteraction, dragDisabled, state]);

  useEffect(() => {
    if (!children || !handleComponent) {
      setHasHandle(false);
      return;
    }

    setHasHandle(hasHandleComponent(children, handleComponent));
  }, [children, handleComponent]);

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  useEffect(() => {
    if (animationFunction) {
      warnAboutUnsupportedAnimationFunction();
    }
  }, [animationFunction]);

  useEffect(() => {
    const handlePositionUpdate = () => {
      updateDraggablePosition();
      updateBounds();
    };

    registerPositionUpdateListener(internalDraggableId, handlePositionUpdate);
    return () => {
      unregisterPositionUpdateListener(internalDraggableId);
    };
  }, [
    internalDraggableId,
    registerPositionUpdateListener,
    unregisterPositionUpdateListener,
    updateBounds,
    updateDraggablePosition,
  ]);

  useEffect(() => {
    updateBounds();
  }, [updateBounds]);

  useEffect(() => {
    return () => {
      clearListeners();
      unregisterDroppedItem(internalDraggableId);
    };
  }, [clearListeners, internalDraggableId, unregisterDroppedItem]);

  const beginTracking = useCallback(
    (event: PointerDownEventLike) => {
      if (dragDisabledRef.current) {
        return;
      }

      event.preventDefault?.();

      const nativeEvent = event.nativeEvent;
      if (!nativeEvent) {
        return;
      }

      if (typeof nativeEvent.button === 'number' && nativeEvent.button !== 0) {
        return;
      }

      const { pointerId, pageX, pageY } = nativeEvent;
      if (typeof pointerId !== 'number' || typeof pageX !== 'number' || typeof pageY !== 'number') {
        return;
      }

      updateDraggablePosition();
      updateBounds();

      const webWindow = getWebWindow();
      if (!webWindow) {
        return;
      }

      pendingDragRef.current = {
        pointerId,
        startPageX: pageX,
        startPageY: pageY,
        startTranslation: translationRef.current,
      };

      const handleMove = (moveEvent: PointerEvent) => {
        const activeDrag = activeDragRef.current;
        if (activeDrag) {
          if (activeDrag.pointerId !== moveEvent.pointerId) {
            return;
          }

          updateDrag(moveEvent);
          return;
        }

        const pendingDrag = pendingDragRef.current;
        if (!pendingDrag || pendingDrag.pointerId !== moveEvent.pointerId || dragDisabledRef.current) {
          return;
        }

        const deltaX = moveEvent.pageX - pendingDrag.startPageX;
        const deltaY = moveEvent.pageY - pendingDrag.startPageY;
        if (getDragDistance(deltaX, deltaY) <= DRAG_THRESHOLD) {
          return;
        }

        activeDragRef.current = pendingDrag;
        pendingDragRef.current = null;
        setIsDragging(true);
        setState(DraggableState.DRAGGING);
        onDragStart?.(data);
        contextOnDragStart?.(data);
        updateDrag(moveEvent);
      };

      const handleUp = (upEvent: PointerEvent) => {
        const activeDrag = activeDragRef.current;
        if (activeDrag) {
          if (activeDrag.pointerId !== upEvent.pointerId) {
            return;
          }

          activeDragRef.current = null;
          pendingDragRef.current = null;
          setIsDragging(false);
          clearListeners();
          commitDrag();
          return;
        }

        const pendingDrag = pendingDragRef.current;
        if (pendingDrag && pendingDrag.pointerId === upEvent.pointerId) {
          pendingDragRef.current = null;
          clearListeners();
        }
      };

      clearListeners();
      listenersRef.current = {
        move: handleMove,
        up: handleUp,
      };
      webWindow.addEventListener?.('pointermove', handleMove);
      webWindow.addEventListener?.('pointerup', handleUp);
      webWindow.addEventListener?.('pointercancel', handleUp);
    },
    [
      clearListeners,
      commitDrag,
      contextOnDragStart,
      data,
      onDragStart,
      updateBounds,
      updateDrag,
      updateDraggablePosition,
    ],
  );

  const animatedStyle = useMemo(
    () => ({
      transform: [
        { translateX: translation.x },
        { translateY: translation.y },
      ],
    }),
    [translation.x, translation.y],
  );

  return {
    animatedViewProps: {
      style: animatedStyle,
      onLayout: () => {
        updateDraggablePosition();
        updateBounds();
      },
    },
    gesture: {
      onPointerDown: beginTracking,
    } as UseDraggableReturn['gesture'],
    state,
    animatedViewRef: animatedViewRef as UseDraggableReturn['animatedViewRef'],
    hasHandle,
    beginTracking,
    isDragging,
  };
}

export function useDraggable<TData = unknown>(
  options: UseDraggableOptions<TData>,
): UseDraggableReturn {
  const result = useDraggableInternal(options);
  return {
    animatedViewProps: result.animatedViewProps,
    gesture: result.gesture,
    state: result.state,
    animatedViewRef: result.animatedViewRef,
    hasHandle: result.hasHandle,
  };
}
