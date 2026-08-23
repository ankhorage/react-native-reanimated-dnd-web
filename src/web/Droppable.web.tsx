import React from 'react';
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

  return (
    <View
      ref={animatedViewRef as React.Ref<View>}
      onLayout={viewProps.onLayout}
      style={[style, viewProps.style]}
      collapsable={false}
    >
      {children}
    </View>
  );
}
