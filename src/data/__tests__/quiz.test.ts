import { describe, expect, it } from 'vitest';
import { LIFE_SCENARIOS, cardExtra } from '../lifeScenarios';
import { emptyInput, liteSimulate } from '../../lite/liteSim';
import { buildPlan } from '../../engine/plan';
import { defaultProfile, type LifeStatus } from '../../engine/profile';
import type { ScenarioCtx } from '../lifeScenarios';

const ctxFor = (status: LifeStatus, age = 23): ScenarioCtx => {
  const profile = { ...defaultProfile(age, status), nickname: 'Sam' };
  const dreams = { pet: { id: 'pet' as const }, live_independently: { id: 'live_independently' as const } };
  return { profile, dreams, habits: {}, basePlan: buildPlan({ profile, dreams, habits: {} }), name: 'Sam' };
};

describe('quick-guess questions', () => {
  it('every scenario has a question with distinct options and a valid answer', () => {
    for (const status of ['uni_student', 'nsf', 'employed', 'part_time_gig', 'between_jobs'] as LifeStatus[]) {
      const ctx = ctxFor(status);
      for (const s of LIFE_SCENARIOS) {
        expect(s.quiz, s.id).toBeDefined();
        const q = s.quiz!(ctx, 24);
        expect(q.options.length).toBe(3);
        expect(new Set(q.options.map((o) => o.label)).size, `${s.id} labels`).toBe(3);
        expect(q.options.map((o) => o.id)).toContain(q.answer);
        expect(`${q.question} ${q.explain} ${q.options.map((o) => o.label).join(' ')}`).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it('answers are not always in the same position', () => {
    const ctx = ctxFor('employed');
    const positions = new Set(LIFE_SCENARIOS.map((s) => s.quiz!(ctx, 24)).map((q) => q.options.findIndex((o) => o.id === q.answer)));
    expect(positions.size).toBe(3);
  });

  it('uses correct working for the headline examples', () => {
    expect(cardExtra(2500)).toBeCloseTo(377, -1); // 12 payments at ~27% a year
    const ctx = ctxFor('employed');
    const offer = LIFE_SCENARIOS.find((s) => s.id === 'first_offer')!.quiz!(ctx, 23);
    expect(offer.answer).toBe('a'); // $2,700 × 14 = $37,800 > $3,000 × 12 = $36,000
    const intern = LIFE_SCENARIOS.find((s) => s.id === 'internship')!.quiz!(ctx, 23);
    expect(intern.answer).toBe('same'); // $960 take-home + $444 CPF = $1,404 vs $1,400
    const scam = LIFE_SCENARIOS.find((s) => s.id === 'scam')!.quiz!(ctx, 23);
    expect(scam.explain).toMatch(/6,3\d\d/);
  });

  it('works inside a full Lite run', () => {
    const r = liteSimulate({ ...emptyInput(), age: 23, status: 'uni_student', income: { freelance: 1 }, dreams: { travel: { id: 'travel' } } });
    for (const ch of r.chapters) expect(ch.scenario.quiz!(r.ctx, ch.age).question.length).toBeGreaterThan(20);
  });
});

describe('newer dream moments', () => {
  it('break-even quiz answer is 50, not the price trap', () => {
    const q = LIFE_SCENARIOS.find((s) => s.id === 'launch')!.quiz!(ctxFor('employed'), 25);
    expect(q.answer).toBe('50');
    expect(30 - 18).toBe(600 / 50);
  });
});
