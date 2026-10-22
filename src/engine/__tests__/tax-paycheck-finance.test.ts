import { describe, expect, it } from 'vitest';
import { residentTax, estimateAnnualTax } from '../tax';
import { paycheck } from '../paycheck';
import { inflate, deflate, futureValue, monthlySavingNeeded, monthsToTarget, runwayMonths } from '../finance';

describe('residentTax (YA2024+ bands)', () => {
  it.each([
    [20000, 0],
    [30000, 200],
    [40000, 550],
    [80000, 3350],
    [120000, 7950],
  ])('chargeable %i → %i', (income, tax) => {
    expect(residentTax(income)).toBe(tax);
  });
});

describe('estimateAnnualTax', () => {
  it('applies Earned Income Relief and CPF Relief', () => {
    // 4,500 × 12 = 54,000; reliefs 1,000 + 10,800 → chargeable 42,200 → 550 + 2,200 × 7%
    const t = estimateAnnualTax(54000, 10800, 23, 2026);
    expect(t.chargeable).toBe(42200);
    expect(t.tax).toBe(704);
  });
});

describe('paycheck', () => {
  it('splits a $4,500 salary into take-home and CPF', () => {
    const p = paycheck(4500, 23, 'citizen', 'salary', 2026);
    expect(p.employeeCpf).toBe(900);
    expect(p.employerCpf).toBe(765);
    expect(p.takeHomeBeforeTax).toBe(3600);
    expect(p.allocation.oa + p.allocation.sa + p.allocation.ma).toBeCloseTo(1665, 2);
    expect(p.spendable).toBeCloseTo(3600 - 704 / 12, 2);
  });
  it('does not deduct CPF from an NS allowance', () => {
    const p = paycheck(790, 20, 'citizen', 'allowance', 2026);
    expect(p.totalCpf).toBe(0);
    expect(p.takeHomeBeforeTax).toBe(790);
    expect(p.notes.join(' ')).toMatch(/NS allowance/);
  });
  it('flags the PR approximation', () => {
    expect(paycheck(3000, 24, 'pr', 'salary', 2026).notes.join(' ')).toMatch(/graduated/);
  });
});

describe('finance helpers', () => {
  it('inflates and deflates symmetrically', () => {
    expect(inflate(1000, 0.02, 10)).toBeCloseTo(1218.99, 2);
    expect(deflate(inflate(500, 0.03, 7), 0.03, 7)).toBeCloseTo(500, 8);
  });
  it('monthly saving reaches the target exactly', () => {
    const m = monthlySavingNeeded(20000, 1000, 36, 0.04);
    expect(futureValue(1000, m, 36, 0.04)).toBeCloseTo(20000, 6);
    expect(monthlySavingNeeded(12000, 0, 12, 0)).toBe(1000);
    expect(monthlySavingNeeded(100, 200, 12, 0)).toBe(0);
  });
  it('months to target and runway', () => {
    expect(monthsToTarget(1200, 0, 100, 0)).toBe(12);
    expect(monthsToTarget(1000, 0, 0, 0)).toBe(Infinity);
    expect(runwayMonths(6000, 2000)).toBe(3);
    expect(runwayMonths(6000, 2000, 2500)).toBe(Infinity);
  });
});
