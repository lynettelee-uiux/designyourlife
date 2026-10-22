import { describe, expect, it } from 'vitest';
import { allocate, annualCpfInterest, cpfApplies, monthlyCpf, rateBand } from '../cpf';

describe('monthlyCpf (2026, age 55 and below)', () => {
  it('applies 17% employer + 20% employee above $750', () => {
    expect(monthlyCpf(3000, 22, 2026)).toMatchObject({ employee: 600, employer: 510, total: 1110 });
  });
  it('caps wages at the $8,000 Ordinary Wage ceiling', () => {
    expect(monthlyCpf(10000, 25, 2026)).toMatchObject({ cappedWage: 8000, employee: 1600, employer: 1360, total: 2960 });
  });
  it('phases in employee share between $500 and $750', () => {
    // employer 17% × 600 = 102; employee 0.6 × (600 − 500) = 60
    expect(monthlyCpf(600, 22, 2026)).toMatchObject({ employee: 60, employer: 102, total: 162 });
  });
  it('charges only the employer share from $50 to $500', () => {
    expect(monthlyCpf(400, 21, 2026)).toMatchObject({ employee: 0, employer: 68, total: 68 });
  });
  it('charges nothing at $50 or below', () => {
    expect(monthlyCpf(40, 21, 2026).total).toBe(0);
  });
  it('rounds total to the dollar and employee share down (CPF method)', () => {
    const r = monthlyCpf(3333, 30, 2026); // 566.61 + 666.6 = 1233.21
    expect(r.total).toBe(1233);
    expect(r.employee).toBe(666);
    expect(r.employer).toBe(567);
  });
  it('is continuous at $750', () => {
    expect(monthlyCpf(749.99, 22, 2026).total).toBeCloseTo(monthlyCpf(750, 22, 2026).total, -1);
  });
});

describe('rate tables by year', () => {
  it('uses 2026 rates for ages above 55 in 2026', () => {
    expect(rateBand(57, 2026)).toMatchObject({ employer: 0.16, employee: 0.18 });
  });
  it('uses the announced 2027 rates in 2027 and falls back to the latest table later', () => {
    expect(rateBand(57, 2027)).toMatchObject({ employer: 0.165, employee: 0.19 });
    expect(rateBand(62, 2035)).toMatchObject({ employer: 0.13, employee: 0.13 });
  });
});

describe('allocate', () => {
  it('matches the CPF worked example for a 30-year-old ($100 → 62.17 / 16.21 / 21.62)', () => {
    expect(allocate(100, 30)).toEqual({ oa: 62.17, sa: 16.21, ma: 21.62 });
  });
  it('always sums to the contribution', () => {
    for (const total of [1, 162, 1110, 2960, 1233]) {
      for (const age of [21, 40, 48, 53]) {
        const a = allocate(total, age);
        expect(a.oa + a.sa + a.ma).toBeCloseTo(total, 2);
      }
    }
  });
});

describe('annualCpfInterest', () => {
  it('pays base rates and +1% on the first $60k (OA capped at $20k) into SA', () => {
    const i = annualCpfInterest({ oa: 10000, sa: 5000, ma: 5000 });
    expect(i.oa).toBe(250);
    expect(i.ma).toBe(200);
    expect(i.sa).toBe(200 + 200);
  });
  it('caps OA at $20k for extra interest and combined at $60k', () => {
    const i = annualCpfInterest({ oa: 30000, sa: 50000, ma: 0 });
    expect(i.sa).toBe(2000 + 600);
  });
});

describe('cpfApplies', () => {
  it('excludes NS allowances, self-employment and foreigners', () => {
    expect(cpfApplies('citizen', 'salary')).toBe(true);
    expect(cpfApplies('citizen', 'allowance')).toBe(false);
    expect(cpfApplies('citizen', 'self')).toBe(false);
    expect(cpfApplies('other', 'salary')).toBe(false);
  });
});
