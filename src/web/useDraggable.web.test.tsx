import { beforeEach, describe, expect, spyOn, test } from 'bun:test';
import React from 'react';

const draggableModule = await import('./useDraggable.web');

describe('draggable helpers', () => {
  beforeEach(() => {
    draggableModule.resetAnimationFunctionWarningForTests();
  });

  test('handle detection is recursive', () => {
    function Handle({ children }: { children?: React.ReactNode }) {
      return <>{children}</>;
    }

    const tree = (
      <div>
        <span>label</span>
        <Handle>
          <span>grab</span>
        </Handle>
      </div>
    );

    expect(draggableModule.hasHandleComponent(tree, Handle)).toBe(true);
    expect(draggableModule.hasHandleComponent(<div>plain</div>, Handle)).toBe(false);
  });

  test('animation function warning fires once per module load', () => {
    const consoleWarn = spyOn(console, 'warn').mockImplementation(() => undefined);

    draggableModule.warnAboutUnsupportedAnimationFunction();
    draggableModule.warnAboutUnsupportedAnimationFunction();

    expect(consoleWarn).toHaveBeenCalledTimes(1);
    consoleWarn.mockRestore();
  });

  test('pre-drag delay must elapse before pointer movement activates a drag', () => {
    expect(draggableModule.hasSatisfiedPreDragDelay(1_000, 250, 1_249)).toBe(false);
    expect(draggableModule.hasSatisfiedPreDragDelay(1_000, 250, 1_250)).toBe(true);
    expect(draggableModule.hasSatisfiedPreDragDelay(1_000, -1, 1_000)).toBe(true);
  });
});
