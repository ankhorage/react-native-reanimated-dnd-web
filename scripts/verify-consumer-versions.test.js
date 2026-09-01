import { describe, expect, test } from 'bun:test';

import {
  resolveDeclaredVersionRange,
  satisfiesDeclaredVersionRange,
} from './verify-consumer-versions.mjs';

describe('consumer dependency version policy', () => {
  test('accepts exact versions only when they match', () => {
    expect(satisfiesDeclaredVersionRange('19.2.3', '19.2.3')).toBe(true);
    expect(satisfiesDeclaredVersionRange('19.2.3', '19.2.4')).toBe(false);
  });

  test('accepts newer tilde patches without crossing the minor boundary', () => {
    expect(satisfiesDeclaredVersionRange('~57.0.15', '57.0.19')).toBe(true);
    expect(satisfiesDeclaredVersionRange('~57.0.15', '57.0.14')).toBe(false);
    expect(satisfiesDeclaredVersionRange('~57.0.15', '57.1.0')).toBe(false);
  });

  test('uses the candidate package declaration for transitive dependencies', () => {
    const consumer = { dependencies: { expo: '~57.0.15' } };
    const candidate = { dependencies: { 'react-native-reanimated-dnd': '~2.0.0' } };

    expect(resolveDeclaredVersionRange(consumer, candidate, 'expo')).toBe('~57.0.15');
    expect(resolveDeclaredVersionRange(consumer, candidate, 'react-native-reanimated-dnd')).toBe(
      '~2.0.0',
    );
  });
});
