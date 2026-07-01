import { describe, expect, it } from 'vitest';
import { resolveSubscriptionEffectiveAmount } from './subscription-effective-amount.js';

const plan = { billingPriceArs: 30_000, price: 29_000 };

describe('resolveSubscriptionEffectiveAmount', () => {
  it('uses the plan price when there is no discount', () => {
    expect(resolveSubscriptionEffectiveAmount({}, plan)).toBe(30_000);
  });

  it('uses a positive finalAmount', () => {
    expect(resolveSubscriptionEffectiveAmount({ finalAmount: 24_000 }, plan)).toBe(24_000);
  });

  it('preserves finalAmount equal to zero', () => {
    expect(resolveSubscriptionEffectiveAmount({ finalAmount: 0 }, plan)).toBe(0);
  });

  it('calculates a percentage discount', () => {
    expect(resolveSubscriptionEffectiveAmount({ discountType: 'percentage', discountValue: 20 }, plan)).toBe(24_000);
  });

  it('calculates a fixed discount', () => {
    expect(resolveSubscriptionEffectiveAmount({ discountType: 'fixed', discountValue: 5_000 }, plan)).toBe(25_000);
  });

  it('returns zero for a 100% percentage discount', () => {
    expect(resolveSubscriptionEffectiveAmount({ discountType: 'percentage', discountValue: 100 }, plan)).toBe(0);
  });

  it('never returns negative amounts when a fixed discount is higher than the price', () => {
    expect(resolveSubscriptionEffectiveAmount({ discountType: 'fixed', discountValue: 40_000 }, plan)).toBe(0);
  });

  it('supports legacy data without finalAmount by using originalAmount and discountAmount', () => {
    expect(resolveSubscriptionEffectiveAmount({ originalAmount: 30_000, discountAmount: 6_000 }, { billingPriceArs: 40_000 })).toBe(24_000);
  });

  it('protects against negative and invalid values', () => {
    expect(resolveSubscriptionEffectiveAmount({ finalAmount: -10 }, plan)).toBe(0);
    expect(resolveSubscriptionEffectiveAmount({ finalAmount: Number.NaN }, { billingPriceArs: Number.POSITIVE_INFINITY, price: -1 })).toBe(0);
  });

  it('prioritizes finalAmount over the current plan price', () => {
    expect(resolveSubscriptionEffectiveAmount({ finalAmount: 10_000 }, { billingPriceArs: 50_000 })).toBe(10_000);
  });
});
