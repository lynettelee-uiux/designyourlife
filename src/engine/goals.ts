import { CPF_PAYOUT_AGE, EMERGENCY_FUND, RETIREMENT_SUMS_2026, RETIREMENT_SUM_GROWTH, SCENARIOS } from './assumptions';
import { cpfApplies } from './cpf';
import { inflate } from './finance';
import { money, months as fmtMonths } from './format';
import { resolveDream } from './plan';
import type { AspirationId, Dreams, Profile } from './profile';
import { balancesAtAge, incomePhaseAt, monthlySnapshot, monthlySpendAt } from './projection';
import { CATEGORY_LABEL, type Category, type Plan, type Projection, type ScenarioKey } from './types';

export type GoalStatus = 'on_track' | 'adjust' | 'explore';

export const STATUS_COPY: Record<GoalStatus, string> = {
  on_track: 'On track under current assumptions',
  adjust: 'Some adjustments needed',
  explore: 'Explore alternative pathways',
};

export interface GoalResult {
  id: AspirationId;
  status: GoalStatus;
  headline: string;
  detail: string;
  numbers: { label: string; value: string }[];
  /** Which scenarios keep this goal on track — conveys uncertainty without a single verdict. */
  byScenario: Record<ScenarioKey, GoalStatus>;
  /** How far the baseline path gets toward the goal, 0–1 (1 = there). */
  progress: number;
  /** Plain-language "what would close the gap", when there is one. */
  gap?: string;
  /** Plain-language cause of the distance (why it isn't within reach), when not on track. */
  why?: string;
}

const fromRatio = (r: number): GoalStatus => (r >= 1 ? 'on_track' : r >= 0.7 ? 'adjust' : 'explore');

/** Pre-retirement cash-flow health at a given age. */
/** True if savings are short (or a shortfall is still owed) around `age` — within the next five working years. */
export function shortfallNear(plan: Plan, proj: Projection, age: number): boolean {
  if (balancesAtAge(plan, proj, age).unfunded > 0) return true;
  const end = Math.min(age + 5, plan.retireAge);
  return proj.rows.some((r) => r.age >= age && r.age < end && r.shortfall > 0);
}

function cashflowStatus(plan: Plan, proj: Projection, age: number): { status: GoalStatus; surplus: number; takeHome: number } {
  const snap = monthlySnapshot(plan, age, proj.scenario);
  const preRetShortfall = shortfallNear(plan, proj, age);
  let status: GoalStatus;
  if (preRetShortfall) status = 'explore';
  else if (snap.takeHome > 0 && snap.surplus / snap.takeHome >= 0.1) status = 'on_track';
  else if (snap.surplus >= 0) status = 'adjust';
  else status = 'adjust'; // savings still cover the gap (no shortfall), but monthly flow is negative
  return { status, surplus: snap.surplus, takeHome: snap.takeHome };
}

export function emergencyMonthsAt(plan: Plan, proj: Projection, age: number): number {
  const b = balancesAtAge(plan, proj, age);
  const spend = monthlySpendAt(plan, age, SCENARIOS[proj.scenario]).total;
  return spend > 0 ? b.cash / spend : Infinity;
}

export function emergencyTarget(plan: Plan, dreams: Dreams): number {
  const irregular = incomePhaseAt(plan, plan.startAge + 1)?.kind === 'self' || !!dreams.creative_career;
  return irregular ? EMERGENCY_FUND.irregularMonths : dreams.financial_security?.months ?? EMERGENCY_FUND.maxMonths;
}

function evaluateOne(id: AspirationId, plan: Plan, proj: Projection, profile: Profile, dreams: Dreams): Omit<GoalResult, 'byScenario' | 'progress' | 'gap'> {
  const d = resolveDream(dreams[id]!, profile);
  const s = SCENARIOS[proj.scenario];
  const a = plan.startAge;
  const yearsTo = (age: number) => Math.max(0, age - a);

  switch (id) {
    case 'retire_early': {
      const R = plan.retireAge;
      if (R >= CPF_PAYOUT_AGE) {
        return cpfOutlook(id, plan, proj, profile);
      }
      const bridge = CPF_PAYOUT_AGE - R;
      const atR = balancesAtAge(plan, proj, R);
      const short = proj.rows.find((r) => r.age >= R && r.shortfall > 0)?.age;
      const funded = atR.unfunded > 0 ? 0 : short === undefined ? bridge : Math.max(0, short - R);
      const status = fromRatio(funded / bridge);
      const yearlyAtR = inflate(plan.retirementMonthly * 12, s.inflation, yearsTo(R));
      return {
        id,
        status,
        headline: short === undefined ? `Your savings could cover all ${bridge} years from ${R} until CPF payouts start at ${CPF_PAYOUT_AGE}.` : `Your savings could cover about ${funded} of the ${bridge} years between ${R} and ${CPF_PAYOUT_AGE}.`,
        detail: `CPF payouts generally can't start before ${CPF_PAYOUT_AGE}, so retiring at ${R} means your own savings and investments fund ${bridge} years first. CPF savings are not counted as spendable here.`,
        numbers: [
          { label: `Savings & investments at ${R}`, value: money(atR.liquid) },
          { label: `First retirement year's spending (${money(plan.retirementMonthly)}/mo today)`, value: money(yearlyAtR) },
          { label: 'Years to bridge before CPF payouts', value: `${bridge}` },
        ],
      };
    }
    case 'travel': {
      const from = plan.recurring.find((r) => r.id === 'travel')?.fromAge ?? a;
      const cf = cashflowStatus(plan, proj, Math.max(a + 1, from));
      const yearly = (d.count ?? 0) * (d.amount ?? 0);
      return {
        id,
        status: cf.status,
        headline: `${d.count} trip${d.count === 1 ? '' : 's'} a year is about ${money(yearly)} in today's dollars.`,
        detail: cf.surplus >= 0 ? `After travel and everything else, you'd still have about ${money(cf.surplus)} a month left at ${Math.max(a + 1, from)}.` : `At ${Math.max(a + 1, from)}, spending including travel is about ${money(-cf.surplus)} a month more than take-home pay.`,
        numbers: [{ label: 'Travel budget per month', value: money(yearly / 12) }],
      };
    }
    case 'own_home': {
      const H = d.age!;
      const b = balancesAtAge(plan, proj, H);
      const target = inflate(d.amount!, s.inflation, yearsTo(H));
      const have = Math.max(0, b.liquid) + b.cpf.oa;
      return {
        id,
        status: fromRatio(have / target),
        headline: `By ${H}, cash + investments + CPF OA could be about ${money(have)} vs an upfront target of ${money(target)}.`,
        detail: 'Upfront home costs can often be paid partly with CPF Ordinary Account savings, subject to HDB/CPF rules. Eligibility (e.g. singles from 35, income ceilings) and loans are not modelled — check the HDB Flat Portal.',
        numbers: [
          { label: 'Upfront target (today’s dollars)', value: money(d.amount!) },
          { label: `CPF OA at ${H}`, value: money(b.cpf.oa) },
          { label: `Cash + investments at ${H} (net)`, value: money(b.liquid) },
        ],
      };
    }
    case 'live_independently': {
      const from = plan.recurring.find((r) => r.id === 'move-out-rent')?.fromAge ?? d.age!;
      const cf = cashflowStatus(plan, proj, from);
      return {
        id,
        status: cf.status,
        headline: cf.surplus >= 0 ? `Moving out at ${from}, you'd have about ${money(cf.surplus)} a month left after rent and living costs.` : `Moving out at ${from}, monthly costs could exceed take-home pay by about ${money(-cf.surplus)}.`,
        detail: 'Rent, utilities and extra groceries are included. Room rents vary widely by location and flat type.',
        numbers: [{ label: 'Rent + utilities (today’s dollars)', value: money((d.amount ?? 0) + 80) + '/mo' }],
      };
    }
    case 'pet': {
      const cf = cashflowStatus(plan, proj, d.age!);
      const monthly = plan.recurring.find((r) => r.id === 'pet')?.monthly ?? 0;
      return {
        id,
        status: monthly === 0 ? 'adjust' : cf.status,
        headline: monthly === 0 ? 'You chose not to adopt for now — your pet dream is on hold.' : `A ${d.variant === 'cat' ? 'cat' : 'dog'} adds about ${money(monthly)} a month for around 13 years.`,
        detail: 'Pet costs carry into every later decision — including how long your savings last during a career break.',
        numbers: [{ label: 'Pet care per year (today’s dollars)', value: money(monthly * 12) }],
      };
    }
    case 'business': {
      const B = d.age!;
      const b = balancesAtAge(plan, proj, B);
      const capital = inflate(d.amount!, s.inflation, yearsTo(B));
      const buffer = monthlySpendAt(plan, B, s).total * 6;
      return {
        id,
        status: fromRatio(b.liquid / (capital + buffer)),
        headline: `At ${B}, you could have ${money(b.liquid)} vs ${money(capital + buffer)} for starting capital plus a 6-month personal buffer.`,
        detail: 'Many new businesses take time to pay their founder. A personal buffer gives you room to try.',
        numbers: [
          { label: 'Starting capital (today’s dollars)', value: money(d.amount!) },
          { label: '6-month personal buffer', value: money(buffer) },
        ],
      };
    }
    case 'career_break': {
      const gap = plan.incomeGaps.find((g) => g.id === 'career-break');
      const B = d.age!;
      const m = gap?.months ?? 0;
      if (m === 0) return { id, status: 'on_track', headline: 'No career break planned right now.', detail: '', numbers: [] };
      const b = balancesAtAge(plan, proj, B);
      const spend = monthlySpendAt(plan, B, s);
      const need = spend.total * (m + 3);
      const commitments = (Object.entries(spend.byCategory) as [Category, number][])
        .filter(([c]) => c !== 'essentials' && c !== 'lifestyle')
        .map(([c, v]) => `${CATEGORY_LABEL[c].toLowerCase()} ${money(v)}`)
        .join(', ');
      return {
        id,
        status: fromRatio(b.liquid / need),
        headline: `A ${m}-month break at ${B} needs about ${money(need)} (the break plus a 3-month cushion). You could have ${money(b.liquid)}.`,
        detail: `Monthly costs during the break would be about ${money(spend.total)}${commitments ? `, including ${commitments}` : ''}. Investments may be worth less if markets are down when you need them.`,
        numbers: [
          { label: 'Runway at that point', value: fmtMonths(b.liquid / spend.total) },
          { label: 'Monthly costs during break', value: money(spend.total) },
        ],
      };
    }
    case 'support_parents': {
      const cf = cashflowStatus(plan, proj, d.age!);
      const total = plan.recurring.filter((r) => r.category === 'family').reduce((x, r) => x + (r.fromAge <= d.age! && (r.toAge === undefined || r.toAge > d.age!) ? r.monthly : 0), 0);
      return {
        id,
        status: cf.status,
        headline: `Supporting family with about ${money(total)} a month leaves ${money(cf.surplus)} monthly for your own goals at ${d.age}.`,
        detail: 'Support can also be non-cash: helping parents check eligibility for schemes, or using your MediSave for their approved medical bills (subject to CPF rules).',
        numbers: [{ label: 'Family support per month (today’s dollars)', value: money(total) }],
      };
    }
    case 'creative_career':
    case 'financial_security': {
      const target = emergencyTarget(plan, dreams);
      const checkAge = a + 3;
      const have = emergencyMonthsAt(plan, proj, checkAge);
      return {
        id,
        status: fromRatio(have / target),
        headline: id === 'creative_career' ? `With less predictable income, a ${target}-month buffer helps. By ${checkAge} your cash could cover about ${fmtMonths(have)}.` : `By ${checkAge}, your cash could cover about ${fmtMonths(have)} of expenses (target: ${target}).`,
        detail: id === 'creative_career' ? 'We modelled creative work as about 20% lower and less predictable income than your main path — an illustration, not a prediction.' : 'MoneySense suggests 3–6 months of expenses, and around 12 months if income is irregular.',
        numbers: [{ label: 'Emergency buffer target', value: `${target} months` }],
      };
    }
    case 'start_family': {
      const cf = cashflowStatus(plan, proj, d.age! + 1);
      return {
        id,
        status: cf.status,
        headline: `From ${d.age}, an illustrative ${money(d.amount!)}/month for raising a child leaves about ${money(cf.surplus)} a month.`,
        detail: 'Family costs vary enormously and government support schemes are not modelled. This is a placeholder to help you see the trade-off.',
        numbers: [],
      };
    }
    case 'free_time': {
      const cf = cashflowStatus(plan, proj, d.age! + 1);
      return {
        id,
        status: cf.status,
        headline: `A four-day week from ${d.age} (about 80% pay) leaves around ${money(cf.surplus)} a month after costs.`,
        detail: 'Less income also means smaller CPF contributions. The trade-off is time — which this simulator can’t put a price on.',
        numbers: [],
      };
    }
  }
}

/** Long-term CPF outlook: compares projected OA+SA at 55 with the projected Full Retirement Sum. Shown only when modelled. */
function cpfOutlook(id: AspirationId, plan: Plan, proj: Projection, profile: Profile): Omit<GoalResult, 'byScenario' | 'progress' | 'gap'> {
  const kind = incomePhaseAt(plan, profile.mainIncomeAge)?.kind ?? 'none';
  if (!cpfApplies(plan.residency, kind)) {
    return { id, status: 'adjust', headline: 'Retiring at 65 or later — your CPF is not modelled for your situation.', detail: 'Self-employed people, gig workers and foreigners have different CPF rules. Your own savings would fund more of retirement.', numbers: [] };
  }
  const at55 = balancesAtAge(plan, proj, 55);
  const yearTurning55 = plan.startYear + (55 - plan.startAge);
  const frs = inflate(RETIREMENT_SUMS_2026.frs, RETIREMENT_SUM_GROWTH, yearTurning55 - 2026);
  const ratio = (at55.cpf.oa + at55.cpf.sa) / frs;
  return {
    id,
    status: fromRatio(ratio),
    headline: `By 55, OA + SA could be about ${money(at55.cpf.oa + at55.cpf.sa)} vs a projected Full Retirement Sum of ${money(frs)}.`,
    detail: 'Simplified: assumes no CPF used for housing or education and today’s interest rates continue. CPF LIFE payouts start from 65. Use CPF’s own planners for real estimates.',
    numbers: [{ label: 'Projected FRS (illustrative, +3.5% a year)', value: money(frs) }],
  };
}

export function evaluateGoals(plan: Plan, projections: Record<ScenarioKey, Projection>, profile: Profile, dreams: Dreams): GoalResult[] {
  const ids = Object.keys(dreams) as AspirationId[];
  return ids.map((id) => {
    const base = evaluateOne(id, plan, projections.baseline, profile, dreams);
    const short = projections.baseline.firstShortfallAge;
    if (base.status === 'explore' && short !== undefined && short < plan.retireAge && id !== 'retire_early' && id !== 'own_home' && id !== 'business' && id !== 'career_break') {
      base.detail = `Your savings could run short around age ${short} — so this dream is competing with your other commitments. ${base.detail}`.trim();
    }
    const byScenario = {
      favourable: evaluateOne(id, plan, projections.favourable, profile, dreams).status,
      baseline: base.status,
      challenging: evaluateOne(id, plan, projections.challenging, profile, dreams).status,
    };
    return { ...base, byScenario, ...goalDistance(id, base.status, plan, projections.baseline, profile, dreams) };
  });
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/**
 * Distance to a goal on the baseline path: a 0–1 progress value for a bar, and one plain line on
 * what could close the gap. Ratio goals use have ÷ need; monthly-budget goals use the margin left
 * after costs (10% of take-home counts as comfortable).
 */
export function goalDistance(id: AspirationId, status: GoalStatus, plan: Plan, proj: Projection, profile: Profile, dreams: Dreams): { progress: number; gap?: string; why?: string } {
  const d = resolveDream(dreams[id]!, profile);
  const s = SCENARIOS[proj.scenario];
  const a = plan.startAge;
  const perMonth = (amount: number, age: number) => amount / Math.max(12, (age - a) * 12);
  const ratioGoal = (have: number, need: number, age: number, alt: string) => {
    const progress = need > 0 ? clamp01(have / need) : 1;
    const short = need - Math.max(0, have);
    return { progress, gap: progress < 1 ? `About ${money(perMonth(short, age))} more saved each month until ${age} — ${alt}.` : undefined };
  };
  const budgetGoal = (age: number, what: string) => {
    const snap = monthlySnapshot(plan, age, proj.scenario);
    const comfy = 0.1 * Math.max(0, snap.takeHome);
    const margin = comfy > 0 ? clamp01(snap.surplus / comfy) : 0;
    const progress = status === 'on_track' ? 1 : status === 'adjust' ? 0.7 + 0.25 * margin : 0.6 * margin;
    if (status === 'on_track') return { progress, why: `At ${age}, you’d still have about ${money(snap.surplus)} a month left after costs — including this one.` };
    const free = Math.max(0, comfy - snap.surplus);
    const others = Object.keys(dreams).length > 1 ? ' (including your other dreams)' : '';
    if (free < 10) {
      // Monthly budget is fine at this age; the pressure comes from other commitments later on.
      const short = proj.firstShortfallAge;
      return {
        progress,
        why: `On its own it fits, but with your other plans your savings could run short${short !== undefined ? ` around ${short}` : ''}.`,
        gap: `This one fits your monthly budget, but your savings could run short${short !== undefined ? ` around ${short}` : ''} once your other dreams start — easing those, or ${what}, would help.`,
      };
    }
    const why =
      snap.surplus < 0
        ? `At ${age}, monthly costs${others} would be about ${money(-snap.surplus)} more than your take-home pay.`
        : `At ${age}, only about ${money(snap.surplus)} a month would be left after costs${others} — a comfortable margin is around ${money(comfy)}.`;
    return { progress, why, gap: `Freeing up about ${money(free)} a month at ${age} — or ${what} — would give you breathing room.` };
  };

  switch (id) {
    case 'retire_early': {
      const R = plan.retireAge;
      if (R >= CPF_PAYOUT_AGE) {
        const at55 = balancesAtAge(plan, proj, 55);
        const frs = inflate(RETIREMENT_SUMS_2026.frs, RETIREMENT_SUM_GROWTH, plan.startYear + (55 - a) - 2026);
        const progress = clamp01((at55.cpf.oa + at55.cpf.sa) / frs);
        return { progress, gap: progress < 1 ? 'Your CPF builds automatically while you earn a salary; extra growth would come from your own savings or CPF top-ups.' : undefined };
      }
      const bridge = CPF_PAYOUT_AGE - R;
      const atR = balancesAtAge(plan, proj, R);
      const short = proj.rows.find((r) => r.age >= R && r.shortfall > 0)?.age;
      const funded = atR.unfunded > 0 ? 0 : short === undefined ? bridge : Math.max(0, short - R);
      const progress = clamp01(funded / bridge);
      if (progress >= 1) return { progress };
      const missing = (bridge - funded) * inflate(plan.retirementMonthly * 12, s.inflation, R - a);
      return { progress, gap: `Roughly ${money(perMonth(missing, R))} more a month until ${R} (before any investment growth) — or retiring a few years later.` };
    }
    case 'own_home': {
      const b = balancesAtAge(plan, proj, d.age!);
      return ratioGoal(Math.max(0, b.liquid) + b.cpf.oa, inflate(d.amount!, s.inflation, d.age! - a), d.age!, 'or a later timeline');
    }
    case 'business': {
      const b = balancesAtAge(plan, proj, d.age!);
      const need = inflate(d.amount!, s.inflation, d.age! - a) + monthlySpendAt(plan, d.age!, s).total * 6;
      return ratioGoal(b.liquid, need, d.age!, 'or starting smaller or later');
    }
    case 'career_break': {
      const gap = plan.incomeGaps.find((g) => g.id === 'career-break');
      if (!gap || gap.months === 0) return { progress: 1 };
      const b = balancesAtAge(plan, proj, gap.age);
      const need = monthlySpendAt(plan, gap.age, s).total * (gap.months + 3);
      return ratioGoal(b.liquid, need, gap.age, 'or a shorter or later break');
    }
    case 'creative_career':
    case 'financial_security': {
      const age = a + 3;
      const target = emergencyTarget(plan, dreams);
      const spend = monthlySpendAt(plan, age, s).total;
      return ratioGoal(balancesAtAge(plan, proj, age).cash, spend * target, age, 'or a smaller cushion to start');
    }
    case 'travel': {
      const from = plan.recurring.find((r) => r.id === 'travel')?.fromAge ?? a;
      return budgetGoal(Math.max(a + 1, from), 'fewer or cheaper trips');
    }
    case 'live_independently':
      return budgetGoal(plan.recurring.find((r) => r.id === 'move-out-rent')?.fromAge ?? d.age!, 'a cheaper room or moving a little later');
    case 'pet':
      return budgetGoal(d.age!, 'adopting a little later');
    case 'support_parents':
      return budgetGoal(d.age!, 'a smaller amount you can sustain');
    case 'start_family':
      return budgetGoal(d.age! + 1, 'trimming other commitments');
    case 'free_time':
      return budgetGoal(d.age! + 1, 'starting the four-day week later');
  }
}
