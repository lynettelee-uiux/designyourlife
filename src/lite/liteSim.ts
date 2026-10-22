// Simulation glue for Design Your Life (Lite). Same engine as the full version; inputs are
// one-tap bands (income sources, savings, spending habits), dreams get stage-appropriate
// defaults, and life moments are matched to the person's life stage.

import { COST_DEFAULTS } from '../engine/assumptions';
import { evaluateGoals, type GoalResult } from '../engine/goals';
import { buildPlan, type HabitDefaults, type PlanEffect } from '../engine/plan';
import { applyStatusDefaults, defaultProfile, lifeStage, STATUS_INFO, type AspirationId, type Dreams, type LifeStage, type LifeStatus, type Living, type Overrides, type Profile } from '../engine/profile';
import { balancesAtAge, projectAll } from '../engine/projection';
import type { Plan } from '../engine/types';
import { LIFE_SCENARIOS, type LifeScenario, type ScenarioCtx } from '../data/lifeScenarios';
import { GIVING_BANDS, INCOME_SOURCES, SAVINGS_BANDS, basicsFor, lifestyleFrom, type IncomeSource, type LiteHabits } from './inputs';

export const LITE_DREAMS: AspirationId[] = ['travel', 'live_independently', 'pet', 'career_break', 'own_home', 'retire_early'];
export const MAX_DREAMS = 3;

export interface LiteInput {
  age: number;
  status: LifeStatus;
  living: Living;
  /** Students / NS / between jobs: years until full-time work. */
  workStartYears?: number;
  /** Selected income sources → chosen band index (undefined = selected, no band yet). */
  income: Partial<Record<IncomeSource, number | undefined>>;
  savings?: number;
  giving?: number;
  habits: LiteHabits;
  dreams: Dreams;
  decisions: Record<string, string>;
  overrides: Pick<Overrides, 'lifestyle' | 'investMonthly'>;
}

export const emptyInput = (): LiteInput => ({ age: 22, status: 'employed', living: 'family', income: { salary: undefined }, habits: {}, dreams: {}, decisions: {}, overrides: {} });

const notWorkingYet = (s: LifeStatus) => ['uni_student', 'poly_student', 'ite_student', 'nsf', 'between_jobs', 'alt_path'].includes(s);

export function liteProfile(i: LiteInput): Profile {
  const base = applyStatusDefaults({ ...defaultProfile(i.age, i.status), nickname: 'Friend' }, i.status);
  const has = (s: IncomeSource) => s in i.income;
  const mid = (s: IncomeSource) => {
    const b = i.income[s];
    return b === undefined ? 0 : INCOME_SOURCES[s].bands[b].mid;
  };
  const stage = lifeStage(i);
  const mainIncomeAge = notWorkingYet(i.status) ? i.age + (i.workStartYears ?? Math.max(1, STATUS_INFO[i.status].yearsToMain)) : i.age;
  const wages = mid('parttime') + mid('internship') + mid('salary');
  const p: Profile = {
    ...base,
    living: i.living,
    mainIncomeAge,
    essentials: basicsFor(i.living),
    lifestyle: lifestyleFrom(i.habits),
    cash: i.savings !== undefined ? SAVINGS_BANDS[i.savings].mid : base.cash,
    familyAllowance: i.giving !== undefined ? GIVING_BANDS[i.giving].mid : stage === 'student' || stage === 'ns' ? 0 : 200,
    cpfTotal: notWorkingYet(i.status) ? 0 : base.cpfTotal,
  };
  const other: NonNullable<Profile['otherIncome']> = [];
  const stopsAtWork = notWorkingYet(i.status) ? mainIncomeAge : undefined;

  if (i.status === 'employed') {
    p.mainIncome = has('salary') && mid('salary') > 0 ? mid('salary') : wages || base.mainIncome;
    p.currentIncome = p.mainIncome;
  } else if (i.status === 'part_time_gig' || i.status === 'self_employed') {
    // Treated as self-employed income (no CPF). Part-time wages here are an approximation.
    p.mainIncome = mid('freelance') + mid('parttime') || base.mainIncome;
    p.currentIncome = p.mainIncome;
  } else if (i.status === 'nsf') {
    p.currentIncome = has('ns') && mid('ns') > 0 ? mid('ns') : base.currentIncome;
  } else {
    p.currentIncome = wages;
  }
  if (i.status !== 'part_time_gig' && i.status !== 'self_employed' && mid('freelance') > 0)
    other.push({ id: 'freelance', label: 'Freelance or gigs', monthly: mid('freelance'), taxable: true, grows: true, toAge: stopsAtWork });
  if (mid('allowance') > 0) other.push({ id: 'allowance', label: 'Allowance from family', monthly: mid('allowance'), taxable: false, grows: false, toAge: stopsAtWork });
  p.otherIncome = other;

  if (i.living === 'own') Object.assign(p, { homeLoanMonthly: COST_DEFAULTS.homeLoanMonthly, homeLoanCpf: COST_DEFAULTS.homeLoanFromCpf, homeLoanYears: COST_DEFAULTS.homeLoanYears });
  return p;
}

/** How much the person sets aside to invest, from their saving habit. */
export function liteHabitEdits(h: LiteHabits): Partial<HabitDefaults> {
  return { investShare: h.saving === 'first' ? 0.1 : h.saving === 'leftover' ? 0.05 : h.saving === 'rarely' ? 0 : 0.05, lifestyleFactor: 1 };
}

/** Dreams that don't apply to this living situation (already met). */
export function dreamAlreadyMet(id: AspirationId, living: Living): string | undefined {
  if (id === 'own_home' && living === 'own') return 'You already own one';
  if (id === 'live_independently' && living !== 'family') return 'You already do';
  return undefined;
}

/** Stage-appropriate defaults: students and NSFs travel cheaply, starting now. */
function liteDreams(i: LiteInput): Dreams {
  const stage = lifeStage(i);
  const out: Dreams = {};
  for (const [id, d] of Object.entries(i.dreams) as [AspirationId, Dreams[AspirationId]][]) {
    if (!d || dreamAlreadyMet(id, i.living)) continue;
    out[id] = id === 'travel' && (stage === 'student' || stage === 'ns') ? { count: 2, amount: 600, age: i.age, ...d } : { ...d };
  }
  return out;
}

export interface LiteResult {
  profile: Profile;
  plan: Plan;
  goals: GoalResult[];
  stage: LifeStage;
  pressure?: { id: AspirationId; nearNow: number; nearWithout: number; others: number };
  ctx: ScenarioCtx;
  /** Three life moments matched to life stage: one tied to a near dream (if any), one everyday, one unexpected. */
  chapters: { scenario: LifeScenario; age: number }[];
}

const SCENARIO_DREAM: Record<string, AspirationId> = { pet: 'pet', move_out: 'live_independently', career_break: 'career_break' };

/** Everyday moments by stage, most relevant first. */
const EVERYDAY: Record<LifeStage, string[]> = {
  student: ['grad_trip', 'bnpl', 'internship', 'job_scam'],
  ns: ['grad_trip', 'bnpl', 'job_scam'],
  early_career: ['first_offer', 'bnpl', 'trip', 'insurance', 'scam'],
  established: ['insurance', 'family_help', 'trip', 'downturn'],
};
const UNEXPECTED: Record<LifeStage, string[]> = {
  student: ['late_client', 'laptop'],
  ns: ['laptop'],
  early_career: ['late_client', 'slow_month', 'restructure', 'laptop'],
  established: ['late_client', 'slow_month', 'restructure'],
};

export function liteChapters(ctx: ScenarioCtx, habits: LiteHabits): { scenario: LifeScenario; age: number }[] {
  const stage = lifeStage(ctx.profile);
  const find = (id: string) => LIFE_SCENARIOS.find((s) => s.id === id && s.applies(ctx) && (!s.stages || s.stages.includes(stage)));
  const ageOf = (s: LifeScenario) => Math.max(ctx.profile.age, Math.min(s.age(ctx), 64));
  const picked: LifeScenario[] = [];

  // A dream-linked moment only if it happens soon (within 3 years) — keeps the story about "you, now".
  for (const id of ['move_out', 'pet', 'career_break']) {
    const s = find(id);
    if (s && SCENARIO_DREAM[id] in ctx.dreams && ageOf(s) <= ctx.profile.age + 3) {
      picked.push(s);
      break;
    }
  }
  // Everyday moments: put the ones their habits suggest first.
  const credit = habits.bigBuy === 'bnpl' || habits.bigBuy === 'card' || habits.surprise === 'card' || habits.surprise === 'bnpl';
  const first = (list: string[], ids: string[]) => [...list.filter((x) => ids.includes(x)), ...list.filter((x) => !ids.includes(x))];
  let everyday = [...EVERYDAY[stage]];
  if (credit) everyday = first(everyday, ['bnpl']);
  if (ctx.dreams.travel) everyday = first(everyday, ['grad_trip', 'trip']);
  for (const id of everyday) {
    if (picked.length >= 2) break;
    const s = find(id);
    if (s) picked.push(s);
  }
  const surprise = UNEXPECTED[stage].map(find).find(Boolean);
  if (surprise) picked.push(surprise);
  for (const id of everyday) {
    if (picked.length >= 3) break;
    const s = find(id);
    if (s && !picked.includes(s)) picked.push(s);
  }
  return picked.map((scenario) => ({ scenario, age: ageOf(scenario) })).sort((a, b) => a.age - b.age);
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

function plansFor(profile: Profile, dreams: Dreams, habits: LiteHabits, effects: PlanEffect[], overrides: Overrides) {
  const plan = buildPlan({ profile, dreams, habits: {}, habitEdits: liteHabitEdits(habits), effects, overrides });
  return { plan, goals: evaluateGoals(plan, projectAll(plan), profile, dreams) };
}

export function liteSimulate(i: LiteInput): LiteResult {
  const profile = liteProfile(i);
  const dreams = liteDreams(i);
  const basePlan = buildPlan({ profile, dreams, habits: {}, habitEdits: liteHabitEdits(i.habits) });
  const ctx: ScenarioCtx = { profile, dreams, habits: {}, basePlan, name: 'Friend' };
  const chapters = liteChapters(ctx, i.habits);
  const effects = effectsFor(chapters, ctx, i.decisions);
  const { plan, goals } = plansFor(profile, dreams, i.habits, effects, i.overrides);

  // Biggest pressure: the dream whose removal brings the most other dreams within reach.
  let pressure: LiteResult['pressure'];
  const ids = Object.keys(dreams) as AspirationId[];
  if (ids.length >= 2) {
    for (const id of ids) {
      const rest = { ...dreams };
      delete rest[id];
      const without = plansFor(profile, rest, i.habits, effectsFor(chapters, ctx, i.decisions, { withoutDream: id }), i.overrides).goals;
      const nearNow = goals.filter((g) => g.id !== id && g.status === 'on_track').length;
      const nearWithout = without.filter((g) => g.status === 'on_track').length;
      if (nearWithout > nearNow && (!pressure || nearWithout - nearNow > pressure.nearWithout - pressure.nearNow)) pressure = { id, nearNow, nearWithout, others: ids.length - 1 };
    }
  }
  return { profile, plan, goals, stage: lifeStage(i), pressure, ctx, chapters };
}

/** Net savings one year after a moment, with the chosen response vs if it hadn't happened. */
export function momentImpact(i: LiteInput, scenarioId: string): number {
  const r = liteSimulate(i);
  const ch = r.chapters.find((c) => c.scenario.id === scenarioId);
  if (!ch || !i.decisions[scenarioId]) return 0;
  const without = buildPlan({ profile: r.profile, dreams: r.ctx.dreams, habits: {}, habitEdits: liteHabitEdits(i.habits), effects: effectsFor(r.chapters, r.ctx, i.decisions, { skip: scenarioId }), overrides: i.overrides });
  const at = (plan: Plan) => balancesAtAge(plan, projectAll(plan).baseline, ch.age + 1).liquid;
  return at(r.plan) - at(without);
}
