import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import React from 'react';

mock.module('react-native', () => ({
  View: ({ children }: { children?: unknown }) => children ?? null,
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T) => styles,
  },
}));

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
});
