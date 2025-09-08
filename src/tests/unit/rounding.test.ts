import { roundUp } from '@/lib/pricing/rounding';
import { describe, it, expect } from 'vitest';

describe('roundUp', () => {
  it('step 0 returns value', () => {
    expect(roundUp(1.234, 0)).toBe(1.234);
  });
  it('0.05 boundaries', () => {
    expect(roundUp(1.0, 0.05)).toBe(1.0);
    expect(roundUp(1.001, 0.05)).toBe(1.05);
    expect(roundUp(1.05, 0.05)).toBe(1.05);
    expect(roundUp(1.051, 0.05)).toBe(1.1);
  });
});
