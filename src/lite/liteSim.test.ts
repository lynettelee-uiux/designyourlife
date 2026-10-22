import { describe, expect, it } from 'vitest';
import { emptyInput, liteProfile, liteSimulate, momentImpact, LITE_DREAMS, type LiteInput } from './liteSim';
import { monthlySnapshot } from '../engine/projection';
import type { LifeStatus, Living } from '../engine/profile';

const statuses: LifeStatus[] = ['uni_student', 'poly_student', 'nsf', 'employed', 'part_time_gig', 'between_jobs'];
const livings: Living[] = ['family', 'room', 'own'];
const inp = (patch: Partial<LiteInput>): LiteInput => ({ ...emptyInput(), ...patch });

// The example from review: a 23-year-old student who freelances, gets an allowance and travels cheaply.
const student23 = () =>
  inp({ age: 23, status: 'uni_student', income: { freelance: 1, allowance: 1 }, savings: 1, habits: { food: 1, fun: 1, surprise: 'savings', saving: 'leftover', tracking: 'roughly', bigBuy: 'save' }, dreams: { travel: { id: 'travel' } } });

describe('Lite reflects what the person told us', () => {
  it('models a freelancing student with family allowance: no CPF, income = bands, cheap trips now', () => {
    const r = liteSimulate(student23());
    const now = monthlySnapshot(r.plan, 23);
    expect(now.employeeCpf).toBe(0);
    expect(now.takeHome).toBeCloseTo(550 + 300, 0); // freelance $300–800 band + allowance $200–400 band
    expect(r.plan.recurring.find((x) => x.id === 'travel')).toMatchObject({ fromAge: 23, monthly: 100 });
    expect(r.profile.familyAllowance).toBe(0);
    expect(r.goals.find((g) => g.id === 'travel')!.status).toBe('on_track');
  });

  it('uses the spending answers for lifestyle costs', () => {
    expect(liteProfile(inp({ habits: { food: 3, fun: 3 } })).lifestyle).toBe(650 + 400);
    expect(liteProfile(inp({ habits: { food: 0, fun: 0 } })).lifestyle).toBe(100 + 30);
  });

  it('gives a 23-year-old student student-life moments, not job restructuring', () => {
    const ids = liteSimulate(student23()).chapters.map((c) => c.scenario.id);
    expect(ids).toHaveLength(3);
    expect(ids).not.toContain('restructure');
    expect(ids).toContain('grad_trip');
    expect(ids).toContain('late_client'); // freelancers get the freelance surprise
  });

  it('puts buy-now-pay-later first for people who use credit', () => {
    const ids = liteSimulate(inp({ age: 24, status: 'employed', income: { salary: 1 }, habits: { bigBuy: 'bnpl' } })).chapters.map((c) => c.scenario.id);
    expect(ids).toContain('bnpl');
  });
});

describe('Lite simulation robustness', () => {
  it('works for every situation × living × dream pair, with three moments in age order', () => {
    for (const status of statuses)
      for (const living of livings)
        for (let k = 0; k < LITE_DREAMS.length - 1; k++) {
          const dreams = { [LITE_DREAMS[k]]: { id: LITE_DREAMS[k] }, [LITE_DREAMS[k + 1]]: { id: LITE_DREAMS[k + 1] } };
          const r = liteSimulate(inp({ age: 22, status, living, dreams, income: {} }));
          expect(r.chapters.length).toBe(3);
          expect(r.chapters.filter((c) => c.scenario.unexpected)).toHaveLength(1);
          for (let j = 1; j < r.chapters.length; j++) expect(r.chapters[j].age).toBeGreaterThanOrEqual(r.chapters[j - 1].age);
          for (const g of r.goals) expect(g.progress >= 1).toBe(g.status === 'on_track');
          for (const ch of r.chapters)
            for (const c of ch.scenario.choices) {
              const input = inp({ age: 22, status, living, dreams, income: {}, decisions: { [ch.scenario.id]: c.id } });
              expect(Number.isFinite(liteSimulate(input).plan.cash)).toBe(true);
              expect(Number.isFinite(momentImpact(input, ch.scenario.id))).toBe(true);
              expect(ch.scenario.story(r.ctx, ch.age)).not.toMatch(/NaN|undefined/);
            }
        }
  });

  it('drops dreams already met by the living situation', () => {
    const r = liteSimulate(inp({ living: 'own', dreams: { own_home: { id: 'own_home' }, travel: { id: 'travel' } } }));
    expect(r.goals.map((g) => g.id)).toEqual(['travel']);
  });

  it('the lifestyle lever moves dreams nearer', () => {
    const dreams = { live_independently: { id: 'live_independently' as const }, travel: { id: 'travel' as const }, pet: { id: 'pet' as const } };
    const near = (o: LiteInput['overrides']) => liteSimulate(inp({ dreams, overrides: o })).goals.reduce((x, g) => x + g.progress, 0);
    expect(near({ lifestyle: 0 })).toBeGreaterThan(near({}));
  });
});
