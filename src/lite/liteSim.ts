// Simulation glue for Design Your Life (Lite). Same engine as the full version;
// fewer inputs: profile defaults, up to 3 dreams, one life moment, two levers.

import { COST_DEFAULTS } from '../engine/assumptions';
import { evaluateGoals, type GoalResult } from '../engine/goals';
import { buildPlan, type PlanEffect } from '../engine/plan';
import { applyStatusDefaults, defaultProfile, type AspirationId, type Dreams, type LifeStatus, type Living, type Overrides, type Profile } from '../engine/profile';
import { projectAll } from '../engine/projection';
import type { Plan } from '../engine/types';
import { selectScenarios, type LifeScenario, type ScenarioCtx } from '../data/lifeScenarios';

export const LITE_DREAMS: AspirationId[] = ['travel', 'live_independently', 'pet', 'career_break', 'own_home', 'retire_early'];
export const MAX_DREAMS = 3;

export interface LiteInput {
  age: number;
  status: LifeStatus;
  living: Living;
  dreams: Dreams;
  /** Choice made in the one life moment, if any. */
  twistChoice?: string;
  overrides: Pick<Overrides, 'lifestyle' | 'investMonthly'>;
}

export function liteProfile(i: Pick<LiteInput, 'age' | 'status' | 'living'>): Profile {
  const base = applyStatusDefaults({ ...defaultProfile(i.age, i.status), nickname: 'Friend' }, i.status);
  const p: Profile = { ...base, living: i.living, essentials: i.living === 'family' ? COST_DEFAULTS.essentialsWithFamily : COST_DEFAULTS.essentialsIndependent };
  if (i.living === 'own') Object.assign(p, { homeLoanMonthly: COST_DEFAULTS.homeLoanMonthly, homeLoanCpf: COST_DEFAULTS.homeLoanFromCpf, homeLoanYears: COST_DEFAULTS.homeLoanYears });
  return p;
}

/** Dreams that don't apply to this living situation (already met). */
export function dreamAlreadyMet(id: AspirationId, living: Living): string | undefined {
  if (id === 'own_home' && living === 'own') return 'You already own one';
  if (id === 'live_independently' && living !== 'family') return 'You already do';
  return undefined;
}

export interface LiteResult {
  profile: Profile;
  plan: Plan;
  goals: GoalResult[];
  pressure?: { id: AspirationId; nearNow: number; nearWithout: number; others: number };
  twist?: { scenario: LifeScenario; age: number; ctx: ScenarioCtx };
}

function plansFor(profile: Profile, dreams: Dreams, effects: PlanEffect[], overrides: Overrides) {
  const plan = buildPlan({ profile, dreams, habits: {}, effects, overrides });
  return { plan, goals: evaluateGoals(plan, projectAll(plan), profile, dreams) };
}

export function liteSimulate(i: LiteInput): LiteResult {
  const profile = liteProfile(i);
  const dreams: Dreams = Object.fromEntries(Object.entries(i.dreams).filter(([id]) => !dreamAlreadyMet(id as AspirationId, i.living)));
  const basePlan = buildPlan({ profile, dreams, habits: {} });
  const ctx: ScenarioCtx = { profile, dreams, habits: {}, basePlan, name: 'Friend' };
  const chapter = selectScenarios(ctx).find((c) => c.scenario.unexpected);
  const choice = chapter?.scenario.choices.find((c) => c.id === i.twistChoice);
  const effects = chapter && choice ? choice.effects(ctx, chapter.age) : [];
  const { plan, goals } = plansFor(profile, dreams, effects, i.overrides);

  // Biggest pressure: the dream whose removal brings the most other dreams within reach.
  let pressure: LiteResult['pressure'];
  const ids = Object.keys(dreams) as AspirationId[];
  if (ids.length >= 2) {
    for (const id of ids) {
      const rest = { ...dreams };
      delete rest[id];
      const without = plansFor(profile, rest, effects, i.overrides).goals;
      const nearNow = goals.filter((g) => g.id !== id && g.status === 'on_track').length;
      const nearWithout = without.filter((g) => g.status === 'on_track').length;
      if (nearWithout > nearNow && (!pressure || nearWithout - nearNow > pressure.nearWithout - pressure.nearNow)) pressure = { id, nearNow, nearWithout, others: ids.length - 1 };
    }
  }
  return { profile, plan, goals, pressure, twist: chapter ? { ...chapter, ctx } : undefined };
}
