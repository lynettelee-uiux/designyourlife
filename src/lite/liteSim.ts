// Simulation glue for Design Your Life (Lite). Same engine as the full version;
// fewer inputs: profile defaults, up to 3 dreams, three life moments, two levers.

import { COST_DEFAULTS } from '../engine/assumptions';
import { evaluateGoals, type GoalResult } from '../engine/goals';
import { buildPlan, type PlanEffect } from '../engine/plan';
import { applyStatusDefaults, defaultProfile, type AspirationId, type Dreams, type LifeStatus, type Living, type Overrides, type Profile } from '../engine/profile';
import { balancesAtAge, projectAll } from '../engine/projection';
import type { Plan } from '../engine/types';
import { LIFE_SCENARIOS, type LifeScenario, type ScenarioCtx } from '../data/lifeScenarios';

export const LITE_DREAMS: AspirationId[] = ['travel', 'live_independently', 'pet', 'career_break', 'own_home', 'retire_early'];
export const MAX_DREAMS = 3;

export interface LiteInput {
  age: number;
  status: LifeStatus;
  living: Living;
  dreams: Dreams;
  /** Choices made in the life moments, by scenario id. */
  decisions: Record<string, string>;
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
  ctx: ScenarioCtx;
  /** Three life moments: one tied to a dream, one everyday money moment, one unexpected event. */
  chapters: { scenario: LifeScenario; age: number }[];
}

const DREAM_LINKED = ['pet', 'move_out', 'career_break'];
const SCENARIO_DREAM: Record<string, AspirationId> = { pet: 'pet', move_out: 'live_independently', career_break: 'career_break' };

/** Picks Lite's three moments for this person, in age order. */
export function liteChapters(ctx: ScenarioCtx): { scenario: LifeScenario; age: number }[] {
  const ok = (id: string) => LIFE_SCENARIOS.find((s) => s.id === id && s.applies(ctx));
  const picked: LifeScenario[] = [];
  const dream = DREAM_LINKED.map(ok).find(Boolean);
  if (dream) picked.push(dream);
  const everyday = ctx.dreams.travel ? ['trip', 'scam'] : ['scam', 'trip'];
  for (const id of everyday) if (picked.length < 2 && ok(id)) picked.push(ok(id)!);
  const unexpected = LIFE_SCENARIOS.find((s) => s.unexpected && s.applies(ctx));
  if (unexpected) picked.push(unexpected);
  for (const id of everyday) if (picked.length < 3 && ok(id) && !picked.includes(ok(id)!)) picked.push(ok(id)!);
  return picked
    .map((scenario) => ({ scenario, age: Math.max(ctx.profile.age, Math.min(scenario.age(ctx), 64)) }))
    .sort((a, b) => a.age - b.age);
}

function effectsFor(chapters: LiteResult['chapters'], ctx: ScenarioCtx, decisions: Record<string, string>, opts: { skip?: string; withoutDream?: AspirationId } = {}): PlanEffect[] {
  const out: PlanEffect[] = [];
  for (const ch of chapters) {
    if (ch.scenario.id === opts.skip) {
      out.push(...(ch.scenario.neutral?.(ctx, ch.age) ?? []));
      continue;
    }
    if (opts.withoutDream && SCENARIO_DREAM[ch.scenario.id] === opts.withoutDream) continue;
    const choice = ch.scenario.choices.find((c) => c.id === decisions[ch.scenario.id]);
    if (choice) out.push(...choice.effects(ctx, ch.age));
  }
  return out;
}

/** Savings (net) one year after a moment, with the chosen response vs if it hadn't happened. */
export function momentImpact(i: LiteInput, scenarioId: string): number {
  const r = liteSimulate(i);
  const ch = r.chapters.find((c) => c.scenario.id === scenarioId);
  if (!ch || !i.decisions[scenarioId]) return 0;
  const dreams = activeDreams(i);
  const without = buildPlan({ profile: r.profile, dreams, habits: {}, effects: effectsFor(r.chapters, r.ctx, i.decisions, { skip: scenarioId }), overrides: i.overrides });
  const at = (plan: Plan) => balancesAtAge(plan, projectAll(plan).baseline, ch.age + 1).liquid;
  return at(r.plan) - at(without);
}

function activeDreams(i: LiteInput): Dreams {
  return Object.fromEntries(Object.entries(i.dreams).filter(([id]) => !dreamAlreadyMet(id as AspirationId, i.living)));
}

function plansFor(profile: Profile, dreams: Dreams, effects: PlanEffect[], overrides: Overrides) {
  const plan = buildPlan({ profile, dreams, habits: {}, effects, overrides });
  return { plan, goals: evaluateGoals(plan, projectAll(plan), profile, dreams) };
}

export function liteSimulate(i: LiteInput): LiteResult {
  const profile = liteProfile(i);
  const dreams = activeDreams(i);
  const basePlan = buildPlan({ profile, dreams, habits: {} });
  const ctx: ScenarioCtx = { profile, dreams, habits: {}, basePlan, name: 'Friend' };
  const chapters = liteChapters(ctx);
  const effects = effectsFor(chapters, ctx, i.decisions);
  const { plan, goals } = plansFor(profile, dreams, effects, i.overrides);

  // Biggest pressure: the dream whose removal brings the most other dreams within reach.
  let pressure: LiteResult['pressure'];
  const ids = Object.keys(dreams) as AspirationId[];
  if (ids.length >= 2) {
    for (const id of ids) {
      const rest = { ...dreams };
      delete rest[id];
      const without = plansFor(profile, rest, effectsFor(chapters, ctx, i.decisions, { withoutDream: id }), i.overrides).goals;
      const nearNow = goals.filter((g) => g.id !== id && g.status === 'on_track').length;
      const nearWithout = without.filter((g) => g.status === 'on_track').length;
      if (nearWithout > nearNow && (!pressure || nearWithout - nearNow > pressure.nearWithout - pressure.nearNow)) pressure = { id, nearNow, nearWithout, others: ids.length - 1 };
    }
  }
  return { profile, plan, goals, pressure, ctx, chapters };
}
