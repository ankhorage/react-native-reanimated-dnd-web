import React, { type MutableRefObject, useCallback } from 'react';
import { View } from 'react-native';
import type { DroppableProps } from 'react-native-reanimated-dnd';
import { useDroppable } from './useDroppable.web';

export function Droppable<TData = unknown>({
  onDrop,
  dropDisabled,
  onActiveChange,
  dropAlignment,
  dropOffset,
  activeStyle,
  droppableId,
  capacity,
  style,
  children,
}: DroppableProps<TData>): React.JSX.Element {
  const { viewProps, animatedViewRef } = useDroppable({
    onDrop,
    dropDisabled,
    onActiveChange,
    dropAlignment,
    dropOffset,
    activeStyle,
    droppableId,
    capacity,
  });

  const combinedRef = useCallback(
    (value: unknown) => {
      (animatedViewRef as MutableRefObject<unknown>).current = value;
    },
    [animatedViewRef],
  );

  return (
    <View
      ref={combinedRef}
      onLayout={viewProps.onLayout}
      style={[style, viewProps.style]}
      collapsable={false}
    >
      {children}
    </View>
  );
}
