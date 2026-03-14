import { describe, expect, test } from 'bun:test';
import { measureNode } from './domMeasurement';

describe('dom measurement helpers', () => {
  test('ignores non-function getBoundingClientRect values', () => {
    expect(measureNode({ getBoundingClientRect: true })).toBeNull();
  });

  test('supports measurable fallback nodes', () => {
    expect(
      measureNode({
        measure: (callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void) =>
          callback(0, 0, 32, 24, 12, 18),
      }),
    ).toEqual({
      x: 12,
      y: 18,
      width: 32,
      height: 24,
    });
  });
});
