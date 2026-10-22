import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../assumptions';
import { buildPlan, type PlanEffect } from '../plan';
import { defaultProfile, surpriseCharacter, type Dreams } from '../profile';
import { balancesAtAge, monthlySnapshot, project, projectAll } from '../projection';
import { evaluateGoals } from '../goals';
import { realityCheck } from '../reality';

const worker = () => ({ ...defaultProfile(23, 'employed'), nickname: 'Test', cash: 10000, cpfTotal: 0 });

describe('projection accounting', () => {
  it('conserves money: change in liquid assets = take-home − spending − one-offs + returns + cash interest', () => {
    const plan = buildPlan({ profile: worker(), dreams: { travel: { id: 'travel' }, pet: { id: 'pet', age: 25 } }, habits: {} });
    for (const key of ['favourable', 'baseline', 'challenging'] as const) {
      const proj = project(plan, key);
      let prevCash = plan.cash;
      let prevLiquid = plan.cash + plan.investments;
      for (const r of proj.rows) {
        if (r.shortfall > 0) break;
        const cashInterest = prevCash * SCENARIOS[key].cashReturn;
        const expected = prevLiquid + r.takeHome - r.spending - r.oneOffs + r.investReturn + cashInterest;
        expect(r.liquid).toBeCloseTo(expected, 0);
        prevCash = r.cash;
        prevLiquid = r.liquid;
      }
    }
  });

  it('keeps CPF separate from spendable money', () => {
    const plan = buildPlan({ profile: worker(), dreams: {}, habits: {} });
    const row = project(plan).rows[0];
    expect(row.liquid).toBeCloseTo(row.cash + row.investments, 2);
    expect(row.cpfTotal).toBeGreaterThan(0);
    // first year CPF = 12 months of contributions + interest on zero opening balance
    expect(row.cpfTotal).toBeCloseTo(12 * 1110, 0);
  });

  it('take-home equals gross minus employee CPF minus tax (no double counting of employer CPF)', () => {
    const plan = buildPlan({ profile: worker(), dreams: {}, habits: {} });
    for (const r of project(plan).rows.slice(0, 10)) {
      expect(r.takeHome).toBeCloseTo(r.gross - r.employeeCpf - r.tax, 1);
    }
  });

  it('stops CPF modelling at 55 and income at retirement', () => {
    const plan = buildPlan({ profile: worker(), dreams: { retire_early: { id: 'retire_early', age: 50, amount: 2500 } }, habits: {} });
    const rows = project(plan).rows;
    expect(rows.find((r) => r.age === 50)!.gross).toBe(0);
    expect(rows.find((r) => r.age === 49)!.gross).toBeGreaterThan(0);
    expect(rows.find((r) => r.age === 56)!.cpfModelled).toBe(false);
    expect(rows[rows.length - 1].age).toBe(64);
  });

  it('records a shortfall instead of letting balances go negative', () => {
    const p = { ...defaultProfile(21, 'between_jobs'), cash: 500, mainIncomeAge: 30 };
    const proj = project(buildPlan({ profile: p, dreams: {}, habits: {} }));
    expect(proj.firstShortfallAge).toBe(21);
    for (const r of proj.rows) {
      expect(r.cash).toBeGreaterThanOrEqual(0);
      expect(r.investments).toBeGreaterThanOrEqual(0);
    }
  });

  it('carries an unfunded shortfall forward and repays it before rebuilding savings', () => {
    const p = { ...defaultProfile(21, 'between_jobs'), cash: 500, mainIncomeAge: 23, mainIncome: 4000 };
    const rows = project(buildPlan({ profile: p, dreams: {}, habits: {} })).rows;
    const peak = Math.max(...rows.map((r) => r.unfunded));
    expect(peak).toBeGreaterThan(0);
    const firstRepaid = rows.find((r) => r.age > 22 && r.unfunded === 0)!;
    expect(firstRepaid).toBeDefined();
    for (const r of rows) {
      if (r.unfunded > 0) expect(r.cash).toBe(0); // no saving while a shortfall is still owed
      expect(r.net).toBeCloseTo(r.liquid - r.unfunded, 2);
    }
  });

  it('reduces income during a career break and makes no CPF contributions for those months', () => {
    const base = buildPlan({ profile: worker(), dreams: {}, habits: {} });
    const brk = buildPlan({ profile: worker(), dreams: { career_break: { id: 'career_break', age: 28, months: 6 } }, habits: {} });
    const a = project(base).rows.find((r) => r.age === 28)!;
    const b = project(brk).rows.find((r) => r.age === 28)!;
    expect(b.gross).toBeCloseTo(a.gross / 2, 0);
    expect(b.employeeCpf).toBeCloseTo(a.employeeCpf / 2, 0);
  });
});

describe('interconnected decisions', () => {
  it('a pet makes a later career break harder to fund', () => {
    const profile = worker();
    const dreams: Dreams = { career_break: { id: 'career_break', age: 28, months: 6 } };
    const withoutPet = buildPlan({ profile, dreams, habits: {} });
    const withPet = buildPlan({ profile, dreams: { ...dreams, pet: { id: 'pet', age: 24 } }, habits: {} });
    const runway = (plan: typeof withPet) => {
      const proj = project(plan);
      return balancesAtAge(plan, proj, 28).liquid / monthlySnapshot(plan, 28).spend;
    };
    expect(runway(withPet)).toBeLessThan(runway(withoutPet));
    const goal = evaluateGoals(withPet, projectAll(withPet), profile, { ...dreams, pet: { id: 'pet', age: 24 } }).find((g) => g.id === 'career_break')!;
    expect(goal.detail).toMatch(/pet care/);
  });

  it('renting a room lowers the monthly surplus', () => {
    const profile = worker();
    const home = buildPlan({ profile, dreams: {}, habits: {} });
    const rent = buildPlan({ profile, dreams: { live_independently: { id: 'live_independently', age: 24 } }, habits: {} });
    expect(monthlySnapshot(rent, 24).surplus).toBeLessThan(monthlySnapshot(home, 24).surplus - 1000);
  });

  it('selling in a downturn locks in the fall: invested balance is zero afterwards', () => {
    const profile = { ...worker(), investments: 10000 };
    const fx = (response: 'sell' | 'hold' | 'keep_investing'): PlanEffect[] => [{ kind: 'downturn', age: 26, response }];
    const sell = project(buildPlan({ profile, dreams: {}, habits: {}, effects: fx('sell') }));
    const keep = project(buildPlan({ profile, dreams: {}, habits: {}, effects: fx('keep_investing') }));
    expect(sell.rows.find((r) => r.age === 30)!.investments).toBe(0);
    expect(keep.rows.find((r) => r.age === 26)!.investReturn).toBeLessThan(0);
  });

  it('removing a pet removes its setup cost; shifting moves both', () => {
    const profile = worker();
    const dreams: Dreams = { pet: { id: 'pet', age: 25 } };
    const removed = buildPlan({ profile, dreams, habits: {}, effects: [{ kind: 'removeRecurring', id: 'pet' }] });
    expect(removed.recurring.find((r) => r.id === 'pet')).toBeUndefined();
    expect(removed.oneOffs.find((o) => o.id === 'pet-setup')).toBeUndefined();
    const shifted = buildPlan({ profile, dreams, habits: {}, effects: [{ kind: 'shiftRecurring', id: 'pet', fromAge: 28 }] });
    expect(shifted.recurring.find((r) => r.id === 'pet')).toMatchObject({ fromAge: 28, toAge: 41 });
    expect(shifted.oneOffs.find((o) => o.id === 'pet-setup')!.age).toBe(28);
  });
});

describe('owning a home with a CPF-paid loan', () => {
  const owner = () => ({ ...worker(), living: 'own' as const, homeLoanMonthly: 1200, homeLoanCpf: 1000, homeLoanYears: 25, cpfTotal: 20000 });

  it('takes the CPF part from OA and treats the rest as a cash housing cost', () => {
    const plan = buildPlan({ profile: owner(), dreams: {}, habits: {} });
    const noLoan = buildPlan({ profile: { ...owner(), homeLoanMonthly: 0, homeLoanCpf: 0 }, dreams: {}, habits: {} });
    const a = project(plan).rows[0];
    const b = project(noLoan).rows[0];
    expect(a.cpfHousing).toBe(12000);
    expect(b.cpf.oa - a.cpf.oa).toBeCloseTo(12000, 0); // same contributions; OA lower by the instalments
    expect(monthlySnapshot(plan, 23).byCategory.housing).toBeCloseTo(200 + 250, 0); // $200 cash part + running costs
  });

  it('pays in cash whatever OA cannot cover, without OA going negative', () => {
    const p = { ...owner(), cpfTotal: 0, homeLoanCpf: 2500, homeLoanMonthly: 2500 };
    const rows = project(buildPlan({ profile: p, dreams: {}, habits: {} })).rows;
    for (const r of rows) expect(r.cpf.oa).toBeGreaterThanOrEqual(-0.01);
    const r0 = rows[0];
    expect(r0.cpfHousing).toBeLessThan(30000);
    expect(r0.spending).toBeGreaterThan(project(buildPlan({ profile: { ...p, homeLoanCpf: 0, homeLoanMonthly: 0 }, dreams: {}, habits: {} })).rows[0].spending);
  });

  it('stops deductions when the loan ends and ignores an "own a home" dream', () => {
    const plan = buildPlan({ profile: { ...owner(), homeLoanYears: 5 }, dreams: { own_home: { id: 'own_home' } }, habits: {} });
    const rows = project(plan).rows;
    expect(rows.find((r) => r.age === 27)!.cpfHousing).toBeGreaterThan(0);
    expect(rows.find((r) => r.age === 28)!.cpfHousing).toBe(0);
    expect(plan.recurring.find((r) => r.id === 'home-costs')).toBeUndefined();
  });
});

describe('non-wage income (family allowance, freelance)', () => {
  const student = () => ({
    ...defaultProfile(23, 'uni_student'),
    currentIncome: 0,
    familyAllowance: 0,
    otherIncome: [
      { id: 'allowance', label: 'Allowance from family', monthly: 300, taxable: false, grows: false, toAge: 25 },
      { id: 'freelance', label: 'Freelance', monthly: 800, taxable: true, grows: true },
    ],
  });
  it('adds to take-home without CPF, and stops the allowance when main work starts', () => {
    const plan = buildPlan({ profile: student(), dreams: {}, habits: {} });
    const now = monthlySnapshot(plan, 23);
    expect(now.employeeCpf).toBe(0);
    expect(now.takeHome).toBeCloseTo(1100, 0);
    const later = monthlySnapshot(plan, 25);
    expect(later.gross).toBeGreaterThan(plan.incomePhases[1].monthly); // salary + freelance, allowance stopped
  });
  it('keeps money conserved with mixed income', () => {
    const plan = buildPlan({ profile: student(), dreams: { travel: { id: 'travel', age: 23, count: 2, amount: 600 } }, habits: {} });
    let prevCash = plan.cash;
    let prevLiquid = plan.cash;
    for (const r of project(plan).rows.slice(0, 8)) {
      if (r.shortfall > 0 || r.unfunded > 0) break;
      expect(r.liquid).toBeCloseTo(prevLiquid + r.takeHome - r.spending - r.oneOffs + r.investReturn + prevCash * SCENARIOS.baseline.cashReturn, 0);
      prevCash = r.cash;
      prevLiquid = r.liquid;
    }
  });
  it('lets travel start while studying when the dream says so', () => {
    const plan = buildPlan({ profile: student(), dreams: { travel: { id: 'travel', age: 23, count: 1, amount: 600 } }, habits: {} });
    expect(plan.recurring.find((r) => r.id === 'travel')).toMatchObject({ fromAge: 23, monthly: 50 });
  });
});

describe('scenario ordering', () => {
  it('favourable ≥ baseline ≥ challenging liquid assets at 45 for a typical saver', () => {
    const plan = buildPlan({ profile: worker(), dreams: {}, habits: { windfall: 'invest' } });
    const all = projectAll(plan);
    const at = (k: keyof typeof all) => balancesAtAge(plan, all[k], 45).liquidReal;
    expect(at('favourable')).toBeGreaterThan(at('baseline'));
    expect(at('baseline')).toBeGreaterThan(at('challenging'));
  });
});

describe('robustness across generated characters', () => {
  it('produces finite numbers and valid statuses for 200 surprise characters', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const c = surpriseCharacter(seed * 7919);
      const plan = buildPlan({ profile: c.profile, dreams: c.dreams, habits: {} });
      const all = projectAll(plan);
      for (const r of all.baseline.rows) {
        expect(Number.isFinite(r.liquid)).toBe(true);
        expect(Number.isFinite(r.cpfTotal)).toBe(true);
      }
      for (const g of evaluateGoals(plan, all, c.profile, c.dreams)) {
        expect(['on_track', 'adjust', 'explore']).toContain(g.status);
        expect(g.headline).not.toMatch(/NaN|undefined|Infinity/);
        // the distance bar and the status must tell the same story
        expect(g.progress).toBeGreaterThanOrEqual(0);
        expect(g.progress).toBeLessThanOrEqual(1);
        expect(g.progress >= 1, `${g.id} ${g.status} ${g.progress}`).toBe(g.status === 'on_track');
        if (g.status !== 'on_track') expect(g.gap ?? '').not.toMatch(/NaN|undefined|Infinity/);
      }
      for (const r of realityCheck(plan, c.profile, c.dreams)) {
        expect(r.summary).not.toMatch(/NaN|undefined/);
        for (const l of r.lines) expect(Number.isFinite(l.value)).toBe(true);
      }
    }
  });
  it('surpriseCharacter is deterministic for a seed', () => {
    expect(surpriseCharacter(42)).toEqual(surpriseCharacter(42));
  });
});
