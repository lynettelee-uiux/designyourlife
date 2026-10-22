import {
  CPF_RATE_TABLES,
  CPF_OW_CEILING,
  CPF_ALLOCATION_2026,
  CPF_INTEREST,
  type CpfRateBand,
} from './assumptions';

export type Residency = 'citizen' | 'pr' | 'other' | 'undisclosed';
export type IncomeKind = 'salary' | 'allowance' | 'self' | 'none';

export interface CpfBalances {
  oa: number;
  sa: number;
  ma: number;
}

export const emptyCpf = (): CpfBalances => ({ oa: 0, sa: 0, ma: 0 });

/** Returns the latest table whose effective year is <= `year` (falls back to the earliest known). */
function tableFor<T>(tables: Record<number, T>, year: number): T {
  const years = Object.keys(tables)
    .map(Number)
    .sort((a, b) => a - b);
  let chosen = years[0];
  for (const y of years) if (y <= year) chosen = y;
  return tables[chosen];
}

export function owCeiling(year: number): number {
  return tableFor(CPF_OW_CEILING, year);
}

export function rateBand(age: number, year: number): CpfRateBand {
  const bands = tableFor(CPF_RATE_TABLES, year);
  return bands.find((b) => age <= b.maxAge) ?? bands[bands.length - 1];
}

/**
 * Mandatory CPF applies to employees (salary) who are SC/PR. NS allowances are not CPF-contributable.
 * "Prefer not to say" is treated like a citizen, with a note in the UI.
 */
export function cpfApplies(residency: Residency, kind: IncomeKind): boolean {
  if (kind !== 'salary') return false;
  return residency === 'citizen' || residency === 'pr' || residency === 'undisclosed';
}

export interface MonthlyCpf {
  wage: number;
  cappedWage: number;
  employee: number;
  employer: number;
  total: number;
}

/**
 * Monthly CPF on Ordinary Wages, following CPF's published method:
 *   TW <= $50: none
 *   $50 < TW <= $500: employer share only
 *   $500 < TW < $750: employer share + employee 3 × rate × (TW − 500), phased in
 *   TW >= $750: full rates, wages capped at the OW ceiling
 * Total is rounded to the nearest dollar; employee share is rounded down; employer = total − employee.
 */
export function monthlyCpf(wage: number, age: number, year: number): MonthlyCpf {
  const w = Math.max(0, wage);
  const band = rateBand(age, year);
  const capped = Math.min(w, owCeiling(year));
  let employee = 0;
  let employerRaw = 0;
  if (w <= 50) {
    return { wage: w, cappedWage: capped, employee: 0, employer: 0, total: 0 };
  } else if (w <= 500) {
    employerRaw = band.employer * w;
  } else if (w < 750) {
    employerRaw = band.employer * w;
    employee = Math.min(band.employee * w, 3 * band.employee * (w - 500));
  } else {
    employerRaw = band.employer * capped;
    employee = band.employee * capped;
  }
  const total = Math.round(employerRaw + employee);
  const employeeFloor = Math.floor(employee);
  return { wage: w, cappedWage: capped, employee: employeeFloor, employer: total - employeeFloor, total };
}

/** Splits a contribution into OA/SA/MA. MA and SA are computed first; OA takes the remainder. */
export function allocate(total: number, age: number): CpfBalances {
  const band = CPF_ALLOCATION_2026.find((b) => age <= b.maxAge);
  if (!band) {
    // Above 55 allocation involves the Retirement Account, which this prototype does not model.
    return { oa: 0, sa: 0, ma: 0 };
  }
  const ma = round2(total * band.ma);
  const sa = round2(total * band.sa);
  return { oa: round2(total - ma - sa), sa, ma };
}

/**
 * Simplified annual CPF interest for a member below 55.
 * Base: OA 2.5%, SA/MA 4%. Extra 1% on the first $60k of combined balances (OA counts up to $20k),
 * applied OA first, then SA, then MA, and credited to SA (as CPF does for members below 55).
 */
export function annualCpfInterest(b: CpfBalances): CpfBalances {
  const base = {
    oa: b.oa * CPF_INTEREST.oa,
    sa: b.sa * CPF_INTEREST.smra,
    ma: b.ma * CPF_INTEREST.smra,
  };
  let room = CPF_INTEREST.extraCombinedCap;
  const oaEligible = Math.min(b.oa, CPF_INTEREST.extraOaCap, room);
  room -= oaEligible;
  const saEligible = Math.min(b.sa, room);
  room -= saEligible;
  const maEligible = Math.min(b.ma, room);
  const extra = (oaEligible + saEligible + maEligible) * CPF_INTEREST.extraRate;
  return { oa: round2(base.oa), sa: round2(base.sa + extra), ma: round2(base.ma) };
}

export const cpfTotal = (b: CpfBalances) => b.oa + b.sa + b.ma;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
