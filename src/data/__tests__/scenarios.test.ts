import { describe, expect, it } from 'vitest';
import { LIFE_SCENARIOS, selectScenarios, type ScenarioCtx } from '../lifeScenarios';
import { HABIT_QUESTIONS } from '../habitQuestions';
import { ASPIRATIONS } from '../aspirations';
import { SOURCES } from '../sources';
import { ALL_ASSUMPTIONS } from '../../engine/assumptions';
import { buildPlan } from '../../engine/plan';
import { defaultProfile, STATUS_INFO, surpriseCharacter, type LifeStatus } from '../../engine/profile';
import { projectAll } from '../../engine/projection';
import { initialState } from '../../state/store';
import { simulate, compareChoice } from '../../state/sim';

const ctxFor = (status: LifeStatus, extra: Partial<ScenarioCtx> = {}): ScenarioCtx => {
  const profile = { ...defaultProfile(22, status), nickname: 'Sam' };
  const dreams = extra.dreams ?? {};
  const habits = extra.habits ?? {};
  return { profile, dreams, habits, basePlan: buildPlan({ profile, dreams, habits }), name: 'Sam' };
};

describe('scenario library integrity', () => {
  it('every scenario has 2–4 choices with unique ids, reflections and a learning card', () => {
    const ids = new Set<string>();
    for (const s of LIFE_SCENARIOS) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
      expect(s.choices.length).toBeGreaterThanOrEqual(2);
      expect(s.choices.length).toBeLessThanOrEqual(4);
      expect(new Set(s.choices.map((c) => c.id)).size).toBe(s.choices.length);
      for (const c of s.choices) expect(c.reflection.length).toBeGreaterThan(20);
      expect(s.learn.body.length).toBeGreaterThan(20);
      for (const id of s.learn.sourceIds ?? []) expect(SOURCES[id], `unknown source ${id}`).toBeDefined();
    }
  });

  it('every assumption cites known sources', () => {
    for (const a of ALL_ASSUMPTIONS) for (const id of a.sourceIds) expect(SOURCES[id], id).toBeDefined();
  });

  it('habit questions and aspirations are well formed', () => {
    expect(HABIT_QUESTIONS.length).toBeGreaterThanOrEqual(5);
    expect(HABIT_QUESTIONS.length).toBeLessThanOrEqual(7);
    expect(ASPIRATIONS.length).toBe(12);
  });
});

describe('chapter selection', () => {
  const allDreams = { pet: { id: 'pet' as const }, career_break: { id: 'career_break' as const }, live_independently: { id: 'live_independently' as const }, support_parents: { id: 'support_parents' as const } };
  it.each(Object.keys(STATUS_INFO) as LifeStatus[])('gives %s 5–7 chapters, exactly one unexpected event, in age order', (status) => {
    const ch = selectScenarios(ctxFor(status, { dreams: allDreams }));
    expect(ch.length).toBeGreaterThanOrEqual(5);
    expect(ch.length).toBeLessThanOrEqual(7);
    expect(ch.filter((c) => c.scenario.unexpected).length).toBe(1);
    for (let i = 1; i < ch.length; i++) expect(ch[i].age).toBeGreaterThanOrEqual(ch[i - 1].age);
  });
  it('includes aspiration-driven chapters when relevant', () => {
    const ids = selectScenarios(ctxFor('employed', { dreams: allDreams })).map((c) => c.scenario.id);
    expect(ids).toEqual(expect.arrayContaining(['pet', 'career_break', 'move_out']));
  });
});

describe('every choice in every chapter produces a valid plan', () => {
  it('for a range of characters', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const c = surpriseCharacter(seed * 104729);
      const state = { ...initialState(), profile: c.profile, dreams: c.dreams, habits: { family: 'balanced' as const, independence: 'soon' as const } };
      const sim = simulate(state);
      for (const ch of sim.chapters) {
        for (const choice of ch.scenario.choices) {
          const effects = choice.effects(sim.ctx, ch.age);
          const plan = buildPlan({ profile: c.profile, dreams: c.dreams, habits: state.habits, effects });
          const all = projectAll(plan);
          expect(Number.isFinite(all.baseline.rows.at(-1)!.liquid)).toBe(true);
          expect(choice.outcome(sim.ctx, ch.age)).not.toMatch(/NaN|undefined/);
          expect(ch.scenario.story(sim.ctx, ch.age)).not.toMatch(/NaN|undefined/);
        }
      }
    }
  });

  it('replaying a decision is deterministic and reversible', () => {
    const c = surpriseCharacter(7);
    const base = { ...initialState(), profile: c.profile, dreams: { ...c.dreams, pet: { id: 'pet' as const } } };
    const s0 = simulate(base);
    const ch = s0.chapters.find((x) => x.scenario.id === 'pet')!;
    const withA = { ...base, decisions: { pet: 'adopt' } };
    const withB = { ...base, decisions: { pet: 'not_now' } };
    const a1 = simulate(withA).projections.baseline.rows.at(-1)!.liquid;
    const a2 = simulate(withA).projections.baseline.rows.at(-1)!.liquid;
    expect(a1).toBe(a2);
    expect(simulate(withB).projections.baseline.rows.at(-1)!.liquid).toBeGreaterThan(a1);
    const cmp = compareChoice(withA, 'pet', 'adopt');
    expect(cmp.age).toBe(ch.age);
    expect(cmp.surplusAfter).toBeLessThan(cmp.surplusBefore); // adopting costs more than the no-pet counterfactual
    expect(cmp.oneOff).toBeGreaterThan(0);
  });

  it('Change One Thing overrides beat story decisions', () => {
    const c = surpriseCharacter(11);
    const st = { ...initialState(), profile: { ...c.profile, mainIncomeAge: c.profile.age }, dreams: { career_break: { id: 'career_break' as const, age: 30, months: 6 } }, decisions: { career_break: 'full' }, overrides: { breakMonths: 2 } };
    const sim = simulate(st);
    expect(sim.plan.incomeGaps.find((g) => g.id === 'career-break')!.months).toBe(2);
    expect(sim.storyPlan.incomeGaps.find((g) => g.id === 'career-break')!.months).toBe(6);
  });
});
