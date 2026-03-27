import { describe, expect, it } from 'vitest';
import { isNonEmptyString } from './index';

describe('isNonEmptyString', () => {
  it('returns false for blank values', () => {
    expect(isNonEmptyString('   ')).toBe(false);
  });

  it('returns true for non-empty values', () => {
    expect(isNonEmptyString('starter')).toBe(true);
  });
});
