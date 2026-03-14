import type { LayoutRect } from './geometry';

type BoundingRectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ElementLike = {
  getBoundingClientRect: () => BoundingRectLike;
};

type MeasureCallback = (
  x: number,
  y: number,
  width: number,
  height: number,
  pageX: number,
  pageY: number,
) => void;

type MeasurableLike = {
  measure: (callback: MeasureCallback) => void;
};

type WindowLike = {
  scrollX?: number;
  scrollY?: number;
  addEventListener?: (
    type: 'pointermove' | 'pointerup' | 'pointercancel',
    listener: (event: PointerEvent) => void,
  ) => void;
  removeEventListener?: (
    type: 'pointermove' | 'pointerup' | 'pointercancel',
    listener: (event: PointerEvent) => void,
  ) => void;
};

type RefLike = {
  current: unknown;
};

function isElementLike(value: unknown): value is ElementLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'getBoundingClientRect' in value &&
    typeof value.getBoundingClientRect === 'function'
  );
}

function isMeasurableLike(value: unknown): value is MeasurableLike {
  return typeof value === 'object' && value !== null && 'measure' in value && typeof value.measure === 'function';
}

export function getWebWindow(): WindowLike | null {
  if (typeof globalThis === 'undefined') {
    return null;
  }

  const webWindow = globalThis as unknown as WindowLike;
  if (
    typeof webWindow.addEventListener !== 'function' ||
    typeof webWindow.removeEventListener !== 'function'
  ) {
    return null;
  }

  return webWindow;
}

export function measureNode(node: unknown): LayoutRect | null {
  if (isElementLike(node)) {
    const rect = node.getBoundingClientRect();
    const webWindow = getWebWindow();
    return {
      x: rect.left + (webWindow?.scrollX ?? 0),
      y: rect.top + (webWindow?.scrollY ?? 0),
      width: rect.width,
      height: rect.height,
    };
  }

  if (isMeasurableLike(node)) {
    let measured: LayoutRect | null = null;
    node.measure((_x, _y, width, height, pageX, pageY) => {
      if (width > 0 && height > 0) {
        measured = {
          x: pageX,
          y: pageY,
          width,
          height,
        };
      }
    });
    return measured;
  }

  return null;
}

export function measureRef(ref: RefLike | null | undefined): LayoutRect | null {
  if (!ref) {
    return null;
  }

  return measureNode(ref.current);
}
