type DiscountType = "percentage" | "fixed";

type AmountSource = {
  finalAmount?: number | null;
  originalAmount?: number | null;
  discountAmount?: number | null;
  discountType?: DiscountType | string | null;
  discountValue?: number | null;
};

type PlanAmountSource = {
  billingPriceArs?: number | null;
  price?: number | null;
};

const finiteNumberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const clampAndRoundAmount = (value: unknown): number => {
  const finiteValue = finiteNumberOrNull(value);
  if (finiteValue === null) return 0;
  return Math.round(Math.max(0, finiteValue) * 100) / 100;
};

const firstFiniteNumber = (...values: unknown[]): number => {
  for (const value of values) {
    const finiteValue = finiteNumberOrNull(value);
    if (finiteValue !== null) return finiteValue;
  }
  return 0;
};

export const resolveSubscriptionEffectiveAmount = (
  subscription: AmountSource,
  plan?: PlanAmountSource | null,
): number => {
  const finalAmount = finiteNumberOrNull(subscription.finalAmount);
  if (finalAmount !== null) {
    return clampAndRoundAmount(finalAmount);
  }

  const baseAmount = firstFiniteNumber(
    subscription.originalAmount,
    plan?.billingPriceArs,
    plan?.price,
    0,
  );
  const discountAmount = finiteNumberOrNull(subscription.discountAmount);
  if (discountAmount !== null) {
    return clampAndRoundAmount(baseAmount - discountAmount);
  }

  const discountValue = finiteNumberOrNull(subscription.discountValue);
  if (discountValue !== null && subscription.discountType === "percentage") {
    return clampAndRoundAmount(baseAmount * (1 - discountValue / 100));
  }

  if (discountValue !== null && subscription.discountType === "fixed") {
    return clampAndRoundAmount(baseAmount - discountValue);
  }

  return clampAndRoundAmount(baseAmount);
};
