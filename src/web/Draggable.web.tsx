import React, {
  createContext,
  type ForwardedRef,
  forwardRef,
  type MutableRefObject,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';
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

function assignRef(ref: ForwardedRef<unknown>, value: unknown): void {
  if (!ref) {
    return;
  }

  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  ref.current = value;
}

function DraggableHandle({ children, style }: DraggableHandleProps): React.JSX.Element {
  const draggableContext = useContext(DraggableContext);

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

function DraggableComponent<TData = unknown>(
  { style: componentStyle, children, ...useDraggableHookOptions }: DraggableProps<TData>,
  ref: ForwardedRef<unknown>,
): React.JSX.Element {
  const { animatedViewProps, hasHandle, animatedViewRef, beginTracking, isDragging } =
    useDraggableInternal({
      ...useDraggableHookOptions,
      children,
      handleComponent: DraggableHandle,
    });

  const combinedRef = useCallback(
    (value: unknown) => {
      (animatedViewRef as MutableRefObject<unknown>).current = value;
      assignRef(ref, value);
    },
    [animatedViewRef, ref],
  );

  const contextValue = useMemo(
    () => ({
      beginTracking,
    }),
    [beginTracking],
  );

  return (
    <View
      ref={combinedRef}
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

const ForwardedDraggable = forwardRef(DraggableComponent) as <TData = unknown>(
  props: DraggableProps<TData> & { ref?: ForwardedRef<unknown> },
) => React.JSX.Element;

export const Draggable = Object.assign(ForwardedDraggable, {
  Handle: DraggableHandle,
});

const surfaceStyle = {
  touchAction: 'none',
  alignSelf: 'flex-start',
} satisfies WebOnlyViewStyle;

const draggingStyle = {
  opacity: 0.7,
  userSelect: 'none',
} satisfies WebOnlyViewStyle;

const handleStyle = {
  touchAction: 'none',
} satisfies WebOnlyViewStyle;

const webStyles = StyleSheet.create({
  surface: surfaceStyle,
  dragging: draggingStyle,
  handle: handleStyle,
});
