// Small, pure time-value-of-money helpers. Rates are annual decimals.

/** Value in `years` of an amount stated in today's dollars, given annual inflation. */
export const inflate = (todayAmount: number, rate: number, years: number) => todayAmount * Math.pow(1 + rate, Math.max(0, years));

/** Today's purchasing power of a future nominal amount. */
export const deflate = (futureAmount: number, rate: number, years: number) => futureAmount / Math.pow(1 + rate, Math.max(0, years));

/**
 * Level monthly saving needed to reach `target` (nominal) in `months`, starting from `current`,
 * with monthly compounding at `annualRate`. Returns 0 if already reached; Infinity if months <= 0 and short.
 */
export function monthlySavingNeeded(target: number, current: number, months: number, annualRate: number): number {
  if (current >= target) return 0;
  if (months <= 0) return Infinity;
  const r = annualRate / 12;
  const fvCurrent = current * Math.pow(1 + r, months);
  const gap = target - fvCurrent;
  if (gap <= 0) return 0;
  if (r === 0) return gap / months;
  return (gap * r) / (Math.pow(1 + r, months) - 1);
}

/** Future value of a starting balance plus level monthly contributions. */
export function futureValue(current: number, monthly: number, months: number, annualRate: number): number {
  const r = annualRate / 12;
  if (r === 0) return current + monthly * months;
  const g = Math.pow(1 + r, months);
  return current * g + (monthly * (g - 1)) / r;
}

/** Months until a target is reached with a level monthly contribution (no growth if rate = 0). Infinity if never. */
export function monthsToTarget(target: number, current: number, monthly: number, annualRate: number): number {
  if (current >= target) return 0;
  if (monthly <= 0 && annualRate <= 0) return Infinity;
  for (let m = 1; m <= 12 * 80; m++) {
    if (futureValue(current, monthly, m, annualRate) >= target) return m;
  }
  return Infinity;
}

/**
 * How many months liquid savings last when spending `monthlyOut` and receiving `monthlyIn`.
 * Simple runway with no growth — deliberately conservative for short periods.
 */
export function runwayMonths(savings: number, monthlyOut: number, monthlyIn = 0): number {
  const net = monthlyOut - monthlyIn;
  if (net <= 0) return Infinity;
  return Math.max(0, savings) / net;
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
