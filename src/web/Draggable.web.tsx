import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import type { DraggableProps } from 'react-native-reanimated-dnd';

import { useDraggableInternal } from './useDraggable.web';

interface DraggablePointerEventLike {
  nativeEvent?: {
    pointerId?: number;
    pageX?: number;
    pageY?: number;
    button?: number;
  };
  preventDefault?: () => void;
}

interface DraggableContextValue {
  beginTracking: (event: DraggablePointerEventLike) => void;
  registerHandle: (registered: boolean) => void;
}

interface DraggableHandleProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface WebOnlyViewStyle extends ViewStyle {
  touchAction?: 'none';
  userSelect?: 'none';
}

const DraggableContext = createContext<DraggableContextValue | null>(null);

function DraggableHandle({ children, style }: DraggableHandleProps): React.JSX.Element {
  const draggableContext = useContext(DraggableContext);

  useEffect(() => {
    draggableContext?.registerHandle(true);
    return () => draggableContext?.registerHandle(false);
  }, [draggableContext]);

  const handlePointerDown = useCallback(
    (event: DraggablePointerEventLike) => {
      draggableContext?.beginTracking(event);
    },
    [draggableContext],
  );

  return (
    <View onPointerDown={handlePointerDown} style={[webStyles.handle, style]}>
      {children}
    </View>
  );
}

function DraggableComponent<TData = unknown>({
  style: componentStyle,
  children,
  ...useDraggableHookOptions
}: DraggableProps<TData>): React.JSX.Element {
  const {
    animatedViewProps,
    hasHandle,
    animatedViewRef,
    registerHandle,
    beginTracking,
    isDragging,
  } = useDraggableInternal({
    ...useDraggableHookOptions,
  });

  const contextValue = useMemo(
    () => ({
      beginTracking,
      registerHandle,
    }),
    [beginTracking, registerHandle],
  );

  return (
    <View
      ref={animatedViewRef as React.Ref<View>}
      onLayout={animatedViewProps.onLayout}
      onPointerDown={hasHandle ? undefined : beginTracking}
      style={[
        componentStyle,
        animatedViewProps.style,
        webStyles.surface,
        isDragging ? webStyles.dragging : null,
      ]}
      collapsable={false}
    >
      <DraggableContext.Provider value={contextValue}>{children}</DraggableContext.Provider>
    </View>
  );
}

export const Draggable = Object.assign(DraggableComponent, {
  Handle: DraggableHandle,
});

const surfaceStyle = {
  touchAction: 'none',
} satisfies WebOnlyViewStyle;

const draggingStyle = {
  opacity: 0.7,
  userSelect: 'none',
} satisfies WebOnlyViewStyle;

const handleStyle = {
  touchAction: 'none',
} satisfies WebOnlyViewStyle;

const webStyles: Record<'surface' | 'dragging' | 'handle', WebOnlyViewStyle> = {
  surface: surfaceStyle,
  dragging: draggingStyle,
  handle: handleStyle,
};
