import { BHS_2026, BHS_GROWTH, DOWNTURN_DROP, SCENARIOS, type ScenarioKey, type ScenarioParams } from './assumptions';
import { allocate, annualCpfInterest, cpfApplies, cpfTotal, monthlyCpf, type CpfBalances } from './cpf';
import { estimateAnnualTax } from './tax';
import type { Category, Plan, Projection, YearRow } from './types';

const round = (n: number) => Math.round(n * 100) / 100;

const activeAt = (age: number, from: number, to?: number) => age >= from && (to === undefined || age < to);

export function incomePhaseAt(plan: Plan, age: number) {
  const sorted = [...plan.incomePhases].sort((a, b) => a.fromAge - b.fromAge);
  let phase = sorted[0];
  for (const p of sorted) if (p.fromAge <= age) phase = p;
  return phase;
}

/** Monthly gross (nominal) at `age` before gaps, including adjustments and salary growth. */
export function monthlyGrossAt(plan: Plan, age: number, s: ScenarioParams): number {
  if (age >= plan.retireAge) return 0;
  const phase = incomePhaseAt(plan, age);
  if (!phase || phase.kind === 'none') return 0;
  const t = age - plan.startAge;
  const factor = plan.incomeAdjustments
    .filter((a) => activeAt(age, a.fromAge, a.toAge))
    .reduce((f, a) => f * a.factor, 1);
  return phase.monthly * Math.pow(1 + s.salaryGrowth, t) * factor;
}

/** Recurring monthly spending by category at `age` (nominal). In retirement, one all-in figure replaces it. */
export function monthlySpendAt(plan: Plan, age: number, s: ScenarioParams): { total: number; byCategory: Partial<Record<Category, number>> } {
  const t = age - plan.startAge;
  const infl = Math.pow(1 + s.inflation, t);
  if (age >= plan.retireAge) {
    const total = plan.retirementMonthly * infl;
    return { total, byCategory: { essentials: total } };
  }
  const byCategory: Partial<Record<Category, number>> = {};
  let total = 0;
  for (const item of plan.recurring) {
    if (!activeAt(age, item.fromAge, item.toAge)) continue;
    const amt = item.nominal ? item.monthly : item.monthly * infl;
    byCategory[item.category] = (byCategory[item.category] ?? 0) + amt;
    total += amt;
  }
  return { total, byCategory };
}

export interface MonthlySnapshot {
  age: number;
  gross: number;
  employeeCpf: number;
  employerCpf: number;
  tax: number;
  takeHome: number;
  spend: number;
  byCategory: Partial<Record<Category, number>>;
  surplus: number;
  invest: number;
}

/** A "typical month" at a given age — used for immediate consequences in the story. */
export function monthlySnapshot(plan: Plan, age: number, key: ScenarioKey = 'baseline'): MonthlySnapshot {
  const s = SCENARIOS[key];
  const year = plan.startYear + (age - plan.startAge);
  const gross = monthlyGrossAt(plan, age, s);
  const kind = incomePhaseAt(plan, age)?.kind ?? 'none';
  const cpf = cpfApplies(plan.residency, kind) ? monthlyCpf(gross, age, year) : { employee: 0, employer: 0 };
  const tax = gross <= 0 ? 0 : estimateAnnualTax(gross * 12, cpf.employee * 12, age, year).tax / 12;
  const takeHome = gross - cpf.employee - tax;
  const { total, byCategory } = monthlySpendAt(plan, age, s);
  const t = age - plan.startAge;
  return {
    age,
    gross: round(gross),
    employeeCpf: cpf.employee,
    employerCpf: cpf.employer,
    tax: round(tax),
    takeHome: round(takeHome),
    spend: round(total),
    byCategory,
    surplus: round(takeHome - total),
    invest: age < plan.retireAge ? round(plan.investMonthly * Math.pow(1 + s.inflation, t)) : 0,
  };
}

/**
 * Year-by-year projection. Each row covers one year of age; balances are end-of-year.
 * Cash, investments and CPF are tracked separately and never mixed: CPF is not spendable here.
 */
export function project(plan: Plan, key: ScenarioKey = 'baseline'): Projection {
  const s = SCENARIOS[key];
  const rows: YearRow[] = [];
  let cash = plan.cash;
  let inv = plan.investments;
  let cpf: CpfBalances = { ...plan.cpf };
  let sold = false;
  let totalShortfall = 0;
  let unfunded = 0; // deficits not covered by savings — must be repaid from later surpluses (no interest modelled)
  let firstShortfallAge: number | undefined;

  for (let age = plan.startAge; age < plan.endAge; age++) {
    const t = age - plan.startAge;
    const year = plan.startYear + t;
    const infl = Math.pow(1 + s.inflation, t);
    const retired = age >= plan.retireAge;

    // ---- Income ----
    const monthly = monthlyGrossAt(plan, age, s);
    const kind = incomePhaseAt(plan, age)?.kind ?? 'none';
    const gaps = plan.incomeGaps.filter((g) => g.age === age);
    const gapMonths = Math.min(12, gaps.reduce((m, g) => m + g.months, 0));
    const partialIncome = gaps.reduce((sum, g) => sum + g.months * (g.partialFactor ?? 0), 0) * monthly;
    const workMonths = 12 - gapMonths;
    const regularGross = monthly * workMonths;
    const gross = regularGross + partialIncome;

    const cpfOn = cpfApplies(plan.residency, kind) && !retired;
    const m = cpfOn ? monthlyCpf(monthly, age, year) : { employee: 0, employer: 0, total: 0 };
    const employeeCpf = m.employee * workMonths;
    const employerCpf = m.employer * workMonths;
    const tax = gross > 0 ? estimateAnnualTax(gross, employeeCpf, age, year).tax : 0;
    const takeHome = gross - employeeCpf - tax;

    // ---- Spending ----
    const { total: monthlySpend, byCategory } = monthlySpendAt(plan, age, s);
    const spending = monthlySpend * 12;
    const oneOffs = plan.oneOffs.filter((o) => o.age === age).reduce((sum, o) => sum + o.amount * infl, 0);
    const net = takeHome - spending - oneOffs;

    // ---- Investing (only from a positive surplus, never borrowed) ----
    const isDownturn = plan.downturn?.age === age;
    const pauseThisYear = isDownturn && plan.downturn?.response === 'hold';
    const canInvest = !retired && !sold && !pauseThisYear;
    const planned = canInvest ? plan.investMonthly * infl * (workMonths / 12) * 12 : 0;
    const invested = Math.max(0, Math.min(planned, net));
    let cashFlow = net - invested;

    // ---- Returns ----
    const r = isDownturn ? -DOWNTURN_DROP[plan.riskLevel] : s.investReturn[plan.riskLevel];
    const invOpen = inv;
    inv = invOpen * (1 + r) + invested * (1 + r / 2);
    const investReturn = inv - invOpen - invested;
    if (isDownturn && plan.downturn?.response === 'sell') {
      cashFlow += inv; // realise the loss into cash
      inv = 0;
      sold = true;
    }
    cash = cash * (1 + s.cashReturn) + cashFlow;

    // ---- Cover any deficit: cash first, then investments; anything left is unfunded ----
    let shortfall = 0;
    if (cash < 0) {
      const fromInv = Math.min(inv, -cash);
      inv -= fromInv;
      cash += fromInv;
      if (cash < 0) {
        shortfall = -cash;
        cash = 0;
        totalShortfall += shortfall;
        unfunded += shortfall;
        if (firstShortfallAge === undefined) firstShortfallAge = age;
      }
    } else if (unfunded > 0) {
      const repay = Math.min(cash, unfunded);
      cash -= repay;
      unfunded -= repay;
    }

    // ---- CPF (modelled below 55 only) ----
    const cpfModelled = age < 55;
    if (cpfModelled) {
      const interest = annualCpfInterest(cpf);
      const alloc = allocate(m.total * workMonths, age);
      cpf = {
        oa: cpf.oa + interest.oa + alloc.oa,
        sa: cpf.sa + interest.sa + alloc.sa,
        ma: cpf.ma + interest.ma + alloc.ma,
      };
      const bhs = BHS_2026 * Math.pow(1 + BHS_GROWTH, t);
      if (cpf.ma > bhs) {
        cpf.sa += cpf.ma - bhs;
        cpf.ma = bhs;
      }
    }

    const liquid = cash + inv;
    const endInfl = Math.pow(1 + s.inflation, t + 1);
    rows.push({
      age,
      year,
      retired,
      gross: round(gross),
      employeeCpf: round(employeeCpf),
      employerCpf: round(employerCpf),
      tax: round(tax),
      takeHome: round(takeHome),
      spending: round(spending),
      oneOffs: round(oneOffs),
      invested: round(invested),
      investReturn: round(investReturn),
      cash: round(cash),
      investments: round(inv),
      liquid: round(liquid),
      liquidReal: round(liquid / endInfl),
      unfunded: round(unfunded),
      net: round(liquid - unfunded),
      netReal: round((liquid - unfunded) / endInfl),
      cpf: { oa: round(cpf.oa), sa: round(cpf.sa), ma: round(cpf.ma) },
      cpfTotal: round(cpfTotal(cpf)),
      cpfReal: round(cpfTotal(cpf) / endInfl),
      cpfModelled,
      shortfall: round(shortfall),
      monthlySpend: round(monthlySpend),
      spendByCategory: byCategory,
    });
  }

  return { scenario: key, rows, firstShortfallAge, totalShortfall: round(totalShortfall) };
}

export function projectAll(plan: Plan): Record<ScenarioKey, Projection> {
  return { favourable: project(plan, 'favourable'), baseline: project(plan, 'baseline'), challenging: project(plan, 'challenging') };
}

/** End-of-year row for the year *before* `age`, i.e. balances on reaching `age`. */
export function balancesAtAge(plan: Plan, proj: Projection, age: number) {
  if (age <= plan.startAge) {
    return { cash: plan.cash, investments: plan.investments, liquid: plan.cash + plan.investments, cpf: plan.cpf, liquidReal: plan.cash + plan.investments, unfunded: 0 };
  }
  const row = proj.rows.find((r) => r.age === age - 1) ?? proj.rows[proj.rows.length - 1];
  // `liquid` here is the net position: savings + investments minus any unfunded shortfall still owed.
  return { cash: row.cash, investments: row.investments, liquid: row.net, cpf: row.cpf, liquidReal: row.netReal, unfunded: row.unfunded };
}
