// Glue between app state and the pure engine. Everything here is deterministic and UI-free.

import { useMemo } from 'react';
import { evaluateGoals, type GoalResult } from '../engine/goals';
import { buildPlan, type PlanEffect } from '../engine/plan';
import type { Dreams, Overrides } from '../engine/profile';
import { balancesAtAge, monthlySnapshot, projectAll } from '../engine/projection';
import { realityCheck } from '../engine/reality';
import type { Plan, Projection, ScenarioKey } from '../engine/types';
import { LIFE_SCENARIOS, selectScenarios, type LifeScenario, type ScenarioCtx } from '../data/lifeScenarios';
import { useStore, type AppState } from './store';

export interface Chapter {
  scenario: LifeScenario;
  age: number;
}

export function applyOverridesToDreams(dreams: Dreams, ov: Overrides): Dreams {
  const d: Dreams = JSON.parse(JSON.stringify(dreams));
  if (ov.retireAge !== undefined && d.retire_early) d.retire_early.age = ov.retireAge;
  if (ov.homeAge !== undefined && d.own_home) d.own_home.age = ov.homeAge;
  if (ov.breakMonths !== undefined && d.career_break) d.career_break.months = ov.breakMonths;
  if (ov.tripsPerYear !== undefined && d.travel) d.travel.count = ov.tripsPerYear;
  if (ov.moveOutAge !== undefined && d.live_independently) d.live_independently.age = ov.moveOutAge;
  return d;
}

export function makeCtx(state: AppState): { ctx: ScenarioCtx; chapters: Chapter[] } {
  const basePlan = buildPlan({ profile: state.profile, dreams: state.dreams, habits: state.habits, habitEdits: state.habitEdits });
  const ctx: ScenarioCtx = { profile: state.profile, dreams: state.dreams, habits: state.habits, basePlan, name: state.profile.nickname || 'Friend' };
  return { ctx, chapters: selectScenarios(ctx) };
}

export function decisionEffects(state: AppState, chapters: Chapter[], ctx: ScenarioCtx, skip?: string): PlanEffect[] {
  const out: PlanEffect[] = [];
  for (const ch of chapters) {
    if (ch.scenario.id === skip) continue;
    const choiceId = state.decisions[ch.scenario.id];
    const choice = ch.scenario.choices.find((c) => c.id === choiceId);
    if (choice) out.push(...choice.effects(ctx, ch.age));
  }
  return out;
}

export interface Simulation {
  ctx: ScenarioCtx;
  chapters: Chapter[];
  plan: Plan;
  /** Plan without Change One Thing overrides — the "story" outcome. */
  storyPlan: Plan;
  projections: Record<ScenarioKey, Projection>;
  storyProjections: Record<ScenarioKey, Projection>;
  goals: GoalResult[];
  storyGoals: GoalResult[];
  dreams: Dreams;
}

export function simulate(state: AppState): Simulation {
  const { ctx, chapters } = makeCtx(state);
  const effects = decisionEffects(state, chapters, ctx);
  const common = { profile: state.profile, habits: state.habits, habitEdits: state.habitEdits, effects };
  const storyPlan = buildPlan({ ...common, dreams: state.dreams });
  const dreams = applyOverridesToDreams(state.dreams, state.overrides);
  const plan = buildPlan({ ...common, dreams, overrides: state.overrides });
  const storyProjections = projectAll(storyPlan);
  const projections = projectAll(plan);
  return {
    ctx,
    chapters,
    plan,
    storyPlan,
    projections,
    storyProjections,
    goals: evaluateGoals(plan, projections, state.profile, dreams),
    storyGoals: evaluateGoals(storyPlan, storyProjections, state.profile, state.dreams),
    dreams,
  };
}

export function useSimulation(): Simulation {
  const { state } = useStore();
  return useMemo(() => simulate(state), [state.profile, state.dreams, state.habits, state.habitEdits, state.decisions, state.overrides]);
}

export function useReality() {
  const { state } = useStore();
  return useMemo(() => {
    const plan = buildPlan({ profile: state.profile, dreams: state.dreams, habits: state.habits, habitEdits: state.habitEdits });
    return { plan, items: realityCheck(plan, state.profile, state.dreams) };
  }, [state.profile, state.dreams, state.habits, state.habitEdits]);
}

export interface ChoiceComparison {
  age: number;
  surplusBefore: number;
  surplusAfter: number;
  oneOff: number;
  liquidNextBefore: number;
  liquidNextAfter: number;
  checkAge: number;
  longBefore: number;
  longAfter: number;
  goalChanges: { id: string; from: string; to: string }[];
}

/** Compares the plan without this chapter's decision vs with a given choice (other decisions kept). */
export function compareChoice(state: AppState, scenarioId: string, choiceId: string): ChoiceComparison {
  const { ctx, chapters } = makeCtx(state);
  const ch = chapters.find((c) => c.scenario.id === scenarioId) ?? { scenario: LIFE_SCENARIOS.find((s) => s.id === scenarioId)!, age: state.profile.age };
  const others = decisionEffects(state, chapters, ctx, scenarioId);
  const choice = ch.scenario.choices.find((c) => c.id === choiceId)!;
  const common = { profile: state.profile, dreams: state.dreams, habits: state.habits, habitEdits: state.habitEdits };
  const before = buildPlan({ ...common, effects: [...others, ...(ch.scenario.neutral?.(ctx, ch.age) ?? [])] });
  const after = buildPlan({ ...common, effects: [...others, ...choice.effects(ctx, ch.age)] });
  const pb = projectAll(before);
  const pa = projectAll(after);
  const checkAge = Math.min(64, Math.max(ch.age + 8, 35));
  const oneOff = after.oneOffs.filter((o) => o.age === ch.age).reduce((s, o) => s + o.amount, 0) - before.oneOffs.filter((o) => o.age === ch.age).reduce((s, o) => s + o.amount, 0);
  const gb = evaluateGoals(before, pb, state.profile, state.dreams);
  const ga = evaluateGoals(after, pa, state.profile, state.dreams);
  return {
    age: ch.age,
    surplusBefore: monthlySnapshot(before, ch.age).surplus,
    surplusAfter: monthlySnapshot(after, ch.age).surplus,
    oneOff,
    liquidNextBefore: balancesAtAge(before, pb.baseline, ch.age + 1).liquid,
    liquidNextAfter: balancesAtAge(after, pa.baseline, ch.age + 1).liquid,
    checkAge,
    longBefore: balancesAtAge(before, pb.baseline, checkAge).liquidReal,
    longAfter: balancesAtAge(after, pa.baseline, checkAge).liquidReal,
    goalChanges: ga
      .map((g) => ({ id: g.id, from: gb.find((x) => x.id === g.id)?.status ?? g.status, to: g.status }))
      .filter((c) => c.from !== c.to),
  };
}

/** For the downturn chapter: savings (today's dollars) at a check age under each response and scenario. */
export function downturnPaths(state: AppState, checkAge: number) {
  const { ctx, chapters } = makeCtx(state);
  const ch = chapters.find((c) => c.scenario.id === 'downturn');
  if (!ch) return [];
  const others = decisionEffects(state, chapters, ctx, 'downturn');
  const common = { profile: state.profile, dreams: state.dreams, habits: state.habits, habitEdits: state.habitEdits };
  return ch.scenario.choices.map((choice) => {
    const plan = buildPlan({ ...common, effects: [...others, ...choice.effects(ctx, ch.age)] });
    const all = projectAll(plan);
    return {
      id: choice.id,
      label: choice.label,
      favourable: balancesAtAge(plan, all.favourable, checkAge).liquidReal,
      baseline: balancesAtAge(plan, all.baseline, checkAge).liquidReal,
      challenging: balancesAtAge(plan, all.challenging, checkAge).liquidReal,
    };
  });
}
