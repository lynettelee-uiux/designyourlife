import type { CpfBalances, IncomeKind, Residency } from './cpf';
import type { RiskLevel, ScenarioKey } from './assumptions';

export type { CpfBalances, IncomeKind, Residency, RiskLevel, ScenarioKey };

export type Category =
  | 'essentials'
  | 'housing'
  | 'lifestyle'
  | 'family'
  | 'pet'
  | 'insurance'
  | 'travel'
  | 'debt'
  | 'children'
  | 'other';

export const CATEGORY_LABEL: Record<Category, string> = {
  essentials: 'Everyday essentials',
  housing: 'Housing',
  lifestyle: 'Lifestyle & social',
  family: 'Family support',
  pet: 'Pet care',
  insurance: 'Insurance',
  travel: 'Travel',
  debt: 'Loan repayments',
  children: 'Children',
  other: 'Other',
};

/** A recurring monthly cost. Amounts are in today's dollars and inflate unless `nominal` is set. */
export interface RecurringItem {
  id: string;
  label: string;
  category: Category;
  monthly: number;
  fromAge: number;
  /** Exclusive end age. */
  toAge?: number;
  nominal?: boolean;
  source: string;
}

/** A one-off cost (positive) or windfall (negative) in today's dollars. */
export interface OneOffItem {
  id: string;
  label: string;
  age: number;
  amount: number;
  source: string;
}

export interface IncomePhase {
  fromAge: number;
  /** Monthly gross in today's dollars. */
  monthly: number;
  kind: IncomeKind;
  label: string;
}

/** Multiplies income from `fromAge` (e.g. a lower-paid role 0.9, a four-day week 0.8). */
export interface IncomeAdjustment {
  id: string;
  fromAge: number;
  toAge?: number;
  factor: number;
  label: string;
  source: string;
}

/** Months without regular pay in the year the person is `age` (career break, job search). */
export interface IncomeGap {
  id: string;
  age: number;
  months: number;
  /** Share of normal income still earned during the gap (e.g. freelancing 0.4). */
  partialFactor?: number;
  label: string;
  source: string;
}

export type DownturnResponse = 'sell' | 'hold' | 'keep_investing';

/** Income that isn't a CPF-paying wage: family allowance (not taxable), freelance/gig work (taxable, no CPF). */
export interface OtherIncome {
  id: string;
  label: string;
  /** Today's dollars per month. */
  monthly: number;
  fromAge: number;
  toAge?: number;
  taxable: boolean;
  /** Grows with pay (freelance) or stays flat (family allowance). */
  grows: boolean;
}

export interface Plan {
  startAge: number;
  startYear: number;
  residency: Residency;
  incomePhases: IncomePhase[];
  incomeAdjustments: IncomeAdjustment[];
  incomeGaps: IncomeGap[];
  otherIncome?: OtherIncome[];
  recurring: RecurringItem[];
  oneOffs: OneOffItem[];
  cash: number;
  investments: number;
  cpf: CpfBalances;
  /** Planned monthly investing in today's dollars, only from surplus. */
  investMonthly: number;
  riskLevel: RiskLevel;
  downturn?: { age: number; response: DownturnResponse };
  /** Monthly home-loan instalment paid from CPF OA (today's figure, nominal — loan instalments don't inflate). */
  cpfHousing?: { monthly: number; fromAge: number; toAge: number };
  retireAge: number;
  /** All-in monthly spending in retirement, today's dollars. */
  retirementMonthly: number;
  endAge: number;
}

export interface YearRow {
  age: number;
  year: number;
  retired: boolean;
  gross: number;
  employeeCpf: number;
  employerCpf: number;
  tax: number;
  takeHome: number;
  spending: number;
  oneOffs: number;
  invested: number;
  investReturn: number;
  cash: number;
  investments: number;
  liquid: number;
  /** Liquid assets in today's dollars. */
  liquidReal: number;
  /** Deficits not covered by savings, carried until repaid from later surpluses. */
  unfunded: number;
  /** liquid − unfunded: below zero means borrowing would be needed. */
  net: number;
  netReal: number;
  cpf: CpfBalances;
  cpfTotal: number;
  cpfReal: number;
  cpfModelled: boolean;
  /** Home-loan instalments paid from CPF OA this year. */
  cpfHousing: number;
  shortfall: number;
  /** Monthly recurring spend this year (nominal). */
  monthlySpend: number;
  spendByCategory: Partial<Record<Category, number>>;
}

export interface Projection {
  scenario: ScenarioKey;
  rows: YearRow[];
  firstShortfallAge?: number;
  totalShortfall: number;
}
