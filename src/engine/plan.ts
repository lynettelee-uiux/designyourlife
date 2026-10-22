import { BASE_YEAR, COST_DEFAULTS, CPF_ALLOCATION_2026, type RiskLevel } from './assumptions';
import { paycheck } from './paycheck';
import { STATUS_INFO, type AspirationId, type DreamSelection, type Dreams, type Habits, type Overrides, type Profile } from './profile';
import type { DownturnResponse, IncomeAdjustment, IncomeGap, OneOffItem, Plan, RecurringItem } from './types';

export const END_AGE = 65;

// ---------- Plan effects (produced by story decisions) ----------

export type PlanEffect =
  | { kind: 'recurring'; item: RecurringItem }
  | { kind: 'oneOff'; item: OneOffItem }
  | { kind: 'incomeAdjust'; item: IncomeAdjustment }
  | { kind: 'incomeGap'; item: IncomeGap }
  | { kind: 'removeRecurring'; id: string }
  | { kind: 'shiftRecurring'; id: string; fromAge: number }
  | { kind: 'downturn'; age: number; response: DownturnResponse }
  | { kind: 'investFactor'; factor: number }
  | { kind: 'mainIncomeFactor'; factor: number };

// ---------- Aspiration defaults ----------

/** Fills any missing fields of a dream with sensible, editable defaults for this profile. */
export function resolveDream(sel: DreamSelection, p: Profile): Required<Pick<DreamSelection, 'id'>> & DreamSelection {
  const a = p.age;
  const d: Record<AspirationId, Partial<DreamSelection>> = {
    retire_early: { age: 55, amount: 2500 },
    travel: { count: 2, amount: COST_DEFAULTS.regionalTrip, age: Math.max(a, p.mainIncomeAge) },
    own_home: { age: Math.max(a + 6, 28), amount: 30000 },
    live_independently: { age: Math.max(a + 2, p.mainIncomeAge + 1), amount: COST_DEFAULTS.roomRent },
    pet: { age: Math.max(a + 2, p.mainIncomeAge + 1), variant: 'dog' },
    business: { age: Math.max(a + 5, 27), amount: 20000 },
    career_break: { age: Math.max(a + 5, p.mainIncomeAge + 4), months: 6 },
    support_parents: { age: p.mainIncomeAge, amount: 300 },
    creative_career: { age: p.mainIncomeAge },
    start_family: { age: Math.max(a + 10, 32), amount: COST_DEFAULTS.childMonthly },
    free_time: { age: Math.max(a + 6, 28) },
    financial_security: { months: 6 },
  };
  return { ...d[sel.id], ...stripUndefined(sel) } as DreamSelection;
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export const petMonthly = (variant?: string) => (variant === 'cat' ? COST_DEFAULTS.catMonthly : COST_DEFAULTS.dogMonthly);
export const petSetup = (variant?: string) => (variant === 'cat' ? COST_DEFAULTS.catSetup : COST_DEFAULTS.dogSetup);
export const PET_YEARS = 13;

// ---------- Habits ----------

export const SOCIAL_FACTOR = { low: 0.85, medium: 1, high: 1.2 } as const;
export const INVEST_SHARE = { save: 0.05, treat: 0.05, split: 0.1, invest: 0.15 } as const;

export interface HabitDefaults {
  lifestyleFactor: number;
  investShare: number;
  riskLevel: RiskLevel;
}

export function habitDefaults(h: Habits): HabitDefaults {
  return {
    lifestyleFactor: SOCIAL_FACTOR[h.social ?? 'medium'],
    investShare: INVEST_SHARE[h.windfall ?? 'split'],
    riskLevel: h.risk ?? 'balanced',
  };
}

// ---------- Builder ----------

export interface PlanInputs {
  profile: Profile;
  dreams: Dreams;
  habits: Habits;
  effects?: PlanEffect[];
  overrides?: Overrides;
  /** Profile-level edits to habit-derived values (the editable behavioural profile). */
  habitEdits?: Partial<HabitDefaults>;
  startYear?: number;
}

export function buildPlan(inp: PlanInputs): Plan {
  const { profile: p, dreams, habits } = inp;
  const ov = inp.overrides ?? {};
  const info = STATUS_INFO[p.status];
  const hd = { ...habitDefaults(habits), ...(inp.habitEdits ?? {}) };
  const a = p.age;

  // Income
  const incomePhases: Plan['incomePhases'] = [{ fromAge: a, monthly: p.currentIncome, kind: info.kind, label: info.label }];
  if (p.mainIncomeAge > a) {
    incomePhases.push({ fromAge: p.mainIncomeAge, monthly: p.mainIncome, kind: info.mainKind, label: 'Main work' });
  } else {
    incomePhases[0].monthly = p.mainIncome || p.currentIncome;
  }

  const recurring: RecurringItem[] = [
    { id: 'essentials', label: 'Food, transport, phone & personal', category: 'essentials', monthly: p.essentials, fromAge: a, source: 'profile' },
    { id: 'lifestyle', label: 'Social, shopping, hobbies & subscriptions', category: 'lifestyle', monthly: Math.round(p.lifestyle * hd.lifestyleFactor), fromAge: p.mainIncomeAge > a ? p.mainIncomeAge : a, source: 'profile' },
  ];
  // Before main work starts (studying, NS, job search) we assume a leaner lifestyle: half the usual amount (illustrative).
  if (p.mainIncomeAge > a) {
    recurring.push({ id: 'lifestyle-early', label: 'Lifestyle while studying / before main work (50%, illustrative)', category: 'lifestyle', monthly: Math.round(p.lifestyle * hd.lifestyleFactor * 0.5), fromAge: a, toAge: p.mainIncomeAge, source: 'profile' });
  }
  if (p.familyAllowance > 0) recurring.push({ id: 'family-allowance', label: 'Allowance to family', category: 'family', monthly: p.familyAllowance, fromAge: a, source: 'profile' });
  if (p.living === 'room') recurring.push({ id: 'rent', label: 'Room rent & utilities', category: 'housing', monthly: COST_DEFAULTS.roomRent + COST_DEFAULTS.utilitiesWhenRenting, fromAge: a, source: 'profile' });
  const ownsHome = p.living === 'own';
  if (ownsHome) {
    recurring.push({ id: 'home-running', label: 'Home running costs: S&CC, utilities, upkeep (illustrative)', category: 'housing', monthly: COST_DEFAULTS.ownHomeRunning, fromAge: a, source: 'profile' });
    const cashPart = Math.max(0, p.homeLoanMonthly - p.homeLoanCpf);
    if (cashPart > 0 && p.homeLoanYears > 0) recurring.push({ id: 'home-loan-cash', label: 'Home loan (cash portion)', category: 'housing', monthly: cashPart, fromAge: a, toAge: a + p.homeLoanYears, nominal: true, source: 'profile' });
  }
  if (p.living === 'whole_unit') recurring.push({ id: 'rent', label: 'Rent share & utilities', category: 'housing', monthly: COST_DEFAULTS.wholeUnitRentShare, fromAge: a, source: 'profile' });
  if (p.studentLoan) {
    const start = Math.max(a, p.mainIncomeAge);
    recurring.push({ id: 'student-loan', label: 'Student loan repayment (illustrative)', category: 'debt', monthly: COST_DEFAULTS.studentLoanMonthly, fromAge: start, toAge: start + 10, nominal: true, source: 'profile' });
  }

  const oneOffs: OneOffItem[] = [];
  const incomeAdjustments: IncomeAdjustment[] = [];
  const incomeGaps: IncomeGap[] = [];
  let retireAge = END_AGE;
  let retirementMonthly = 2500;

  // Dreams
  for (const raw of Object.values(dreams)) {
    if (!raw) continue;
    const d = resolveDream(raw, p);
    switch (d.id) {
      case 'retire_early':
        retireAge = d.age!;
        retirementMonthly = d.amount!;
        break;
      case 'travel': {
        const trips = ov.tripsPerYear ?? d.count!;
        if (trips > 0) recurring.push({ id: 'travel', label: `${trips} trip${trips === 1 ? '' : 's'} a year`, category: 'travel', monthly: Math.round((trips * d.amount!) / 12), fromAge: Math.max(a, d.age!), source: 'dream' });
        break;
      }
      case 'live_independently': {
        if (p.living !== 'family') break;
        const from = d.age!;
        recurring.push({ id: 'move-out-rent', label: 'Rent & utilities (living independently)', category: 'housing', monthly: d.amount! + COST_DEFAULTS.utilitiesWhenRenting, fromAge: from, source: 'dream' });
        recurring.push({ id: 'move-out-essentials', label: 'Extra groceries & household items', category: 'essentials', monthly: COST_DEFAULTS.essentialsIndependent - COST_DEFAULTS.essentialsWithFamily, fromAge: from, source: 'dream' });
        break;
      }
      case 'pet': {
        recurring.push({ id: 'pet', label: d.variant === 'cat' ? 'Cat care' : 'Dog care', category: 'pet', monthly: petMonthly(d.variant), fromAge: d.age!, toAge: d.age! + PET_YEARS, source: 'dream' });
        oneOffs.push({ id: 'pet-setup', label: 'Adoption & setup', age: d.age!, amount: petSetup(d.variant), source: 'dream' });
        break;
      }
      case 'own_home': {
        if (ownsHome) break; // already owns a home
        recurring.push({ id: 'home-costs', label: 'Home running costs (illustrative)', category: 'housing', monthly: 400, fromAge: d.age!, source: 'dream' });
        break;
      }
      case 'career_break': {
        if (d.months! > 0) incomeGaps.push({ id: 'career-break', age: d.age!, months: d.months!, label: `${d.months}-month career break`, source: 'dream' });
        break;
      }
      case 'business':
        oneOffs.push({ id: 'business-capital', label: 'Business starting capital', age: d.age!, amount: d.amount!, source: 'dream' });
        break;
      case 'support_parents':
        recurring.push({ id: 'parents-support', label: 'Supporting parents', category: 'family', monthly: d.amount!, fromAge: d.age!, source: 'dream' });
        break;
      case 'creative_career':
        incomeAdjustments.push({ id: 'creative', fromAge: d.age!, factor: 0.8, label: 'Creative career (illustrative 20% lower, less predictable income)', source: 'dream' });
        break;
      case 'start_family':
        recurring.push({ id: 'children', label: 'Raising a child (illustrative)', category: 'children', monthly: d.amount!, fromAge: d.age!, toAge: d.age! + 22, source: 'dream' });
        break;
      case 'free_time':
        incomeAdjustments.push({ id: 'four-day-week', fromAge: d.age!, factor: 0.8, label: 'Four-day week (80% pay)', source: 'dream' });
        break;
      case 'financial_security':
        break;
    }
  }

  // Investing: share of expected take-home once main income starts.
  const mainPay = paycheck(p.mainIncome, Math.max(a, p.mainIncomeAge), p.residency, info.mainKind, inp.startYear ?? BASE_YEAR);
  const investMonthly = Math.round((mainPay.spendable * hd.investShare) / 10) * 10;

  const plan: Plan = {
    startAge: a,
    startYear: inp.startYear ?? BASE_YEAR,
    residency: p.residency,
    incomePhases,
    incomeAdjustments,
    incomeGaps,
    otherIncome: (p.otherIncome ?? []).filter((o) => o.monthly > 0).map((o) => ({ ...o, fromAge: a })),
    recurring,
    oneOffs,
    cash: p.cash,
    investments: p.investments,
    cpf: splitCpf(p.cpfTotal),
    investMonthly,
    riskLevel: hd.riskLevel,
    retireAge,
    retirementMonthly,
    endAge: END_AGE,
    cpfHousing: ownsHome && p.homeLoanCpf > 0 && p.homeLoanYears > 0 ? { monthly: Math.min(p.homeLoanCpf, p.homeLoanMonthly || p.homeLoanCpf), fromAge: a, toAge: a + p.homeLoanYears } : undefined,
  };

  for (const e of inp.effects ?? []) applyEffect(plan, e);

  // Overrides that act on the final plan
  if (ov.lifestyle !== undefined) {
    const item = plan.recurring.find((r) => r.id === 'lifestyle');
    const early = plan.recurring.find((r) => r.id === 'lifestyle-early');
    if (item) {
      if (early && item.monthly > 0) early.monthly = Math.round((early.monthly * ov.lifestyle) / item.monthly);
      item.monthly = ov.lifestyle;
    }
  }
  if (ov.investMonthly !== undefined) plan.investMonthly = ov.investMonthly;
  if (ov.retireAge !== undefined) plan.retireAge = ov.retireAge;
  if (ov.breakMonths !== undefined) {
    plan.incomeGaps = plan.incomeGaps.map((g) => (g.id === 'career-break' ? { ...g, months: ov.breakMonths!, partialFactor: undefined } : g)).filter((g) => g.months > 0);
  }
  if (ov.moveOutAge !== undefined) applyEffect(plan, { kind: 'shiftRecurring', id: 'move-out', fromAge: ov.moveOutAge });
  if (ov.homeAge !== undefined) applyEffect(plan, { kind: 'shiftRecurring', id: 'home-costs', fromAge: ov.homeAge });

  // Owning a home replaces rent from the purchase age.
  const home = plan.recurring.find((r) => r.id === 'home-costs');
  if (home) {
    plan.recurring = plan.recurring.map((r) => (r.id === 'rent' || r.id === 'move-out-rent' ? { ...r, toAge: Math.max(r.fromAge, home.fromAge) } : r));
  }
  return plan;
}

export function applyEffect(plan: Plan, e: PlanEffect): void {
  switch (e.kind) {
    case 'recurring':
      plan.recurring = plan.recurring.filter((r) => r.id !== e.item.id).concat(e.item);
      break;
    case 'oneOff':
      plan.oneOffs = plan.oneOffs.filter((o) => o.id !== e.item.id).concat(e.item);
      break;
    case 'incomeAdjust':
      plan.incomeAdjustments = plan.incomeAdjustments.filter((x) => x.id !== e.item.id).concat(e.item);
      break;
    case 'incomeGap':
      plan.incomeGaps = plan.incomeGaps.filter((x) => x.id !== e.item.id).concat(e.item);
      break;
    case 'removeRecurring':
      plan.recurring = plan.recurring.filter((r) => r.id !== e.id);
      plan.oneOffs = plan.oneOffs.filter((o) => !o.id.startsWith(e.id));
      break;
    case 'shiftRecurring':
    {
      const match = (id: string) => id === e.id || id.startsWith(e.id + '-');
      plan.recurring = plan.recurring.map((r) => {
        if (!match(r.id)) return r;
        const delta = e.fromAge - r.fromAge;
        return { ...r, fromAge: e.fromAge, toAge: r.toAge === undefined ? undefined : r.toAge + delta };
      });
      plan.oneOffs = plan.oneOffs.map((o) => (match(o.id) ? { ...o, age: e.fromAge } : o));
      break;
    }
    case 'downturn':
      plan.downturn = { age: e.age, response: e.response };
      break;
    case 'investFactor':
      plan.investMonthly = Math.round(plan.investMonthly * e.factor);
      break;
    case 'mainIncomeFactor':
      plan.incomePhases = plan.incomePhases.map((ph, i) => (i === plan.incomePhases.length - 1 ? { ...ph, monthly: Math.round(ph.monthly * e.factor) } : ph));
      break;
  }
}

/** Splits a user-entered CPF total using the age-35-and-below allocation ratios (approximation). */
export function splitCpf(total: number) {
  const r = CPF_ALLOCATION_2026[0];
  const ma = Math.round(total * r.ma);
  const sa = Math.round(total * r.sa);
  return { oa: total - ma - sa, sa, ma };
}
