// Financial assumptions used by the simulation engine.
//
// Each value carries provenance so the UI ("How we calculated this") and docs can
// show where it came from and how much to trust it:
//   verified     — taken from an official source for the stated period
//   illustrative — a teaching value chosen by the design team; NOT a forecast
//   estimated    — derived from secondary/market data; treat as a rough range
//
// Review cadence: CPF rates/ceilings and retirement sums change every 1 January;
// CPF interest rates are set quarterly; tax bands change with the annual Budget.

export type Status = 'verified' | 'illustrative' | 'estimated';

export interface AssumptionMeta {
  label: string;
  status: Status;
  sourceIds: string[];
  effective: string;
  appliesTo: string;
  conditions?: string;
  nextReview: string;
}

// ---------- CPF contribution rates (wages > $750/month) ----------

export interface CpfRateBand {
  maxAge: number; // inclusive upper bound ("55 and below" => 55)
  employer: number;
  employee: number;
}

/** Rate tables keyed by the calendar year they take effect. Later years fall back to the latest known table. */
export const CPF_RATE_TABLES: Record<number, CpfRateBand[]> = {
  2026: [
    { maxAge: 55, employer: 0.17, employee: 0.2 },
    { maxAge: 60, employer: 0.16, employee: 0.18 },
    { maxAge: 65, employer: 0.125, employee: 0.125 },
    { maxAge: 70, employer: 0.09, employee: 0.075 },
    { maxAge: Infinity, employer: 0.075, employee: 0.05 },
  ],
  2027: [
    { maxAge: 55, employer: 0.17, employee: 0.2 },
    { maxAge: 60, employer: 0.165, employee: 0.19 },
    { maxAge: 65, employer: 0.13, employee: 0.13 },
    { maxAge: 70, employer: 0.09, employee: 0.075 },
    { maxAge: Infinity, employer: 0.075, employee: 0.05 },
  ],
};

export const CPF_RATES_META: AssumptionMeta = {
  label: 'CPF contribution rates by age (SC and SPR 3rd year onwards, private sector)',
  status: 'verified',
  sourceIds: ['cpfConRate'],
  effective: '1 Jan 2026 (and announced 1 Jan 2027 changes for ages above 55)',
  appliesTo: 'Employees who are Singapore Citizens or PRs from their 3rd year, earning > $750/month',
  conditions:
    'Wages $50–$750 use reduced rates (modelled). PRs in their first two years have graduated rates (NOT modelled — full rates used as a labelled approximation). Self-employed and platform workers follow different rules (not modelled).',
  nextReview: '1 Jan 2027',
};

/** Monthly Ordinary Wage ceiling by year. */
export const CPF_OW_CEILING: Record<number, number> = { 2026: 8000 };
export const CPF_ANNUAL_SALARY_CEILING = 102000;
export const CPF_CEILING_META: AssumptionMeta = {
  label: 'CPF Ordinary Wage ceiling $8,000/month; annual salary ceiling $102,000',
  status: 'verified',
  sourceIds: ['cpfConRate'],
  effective: '1 Jan 2026',
  appliesTo: 'All CPF-contributing employees',
  conditions: 'Bonuses (Additional Wages) count toward the $102,000 annual ceiling; this prototype does not model bonuses separately.',
  nextReview: '1 Jan 2027',
};

// ---------- CPF allocation ----------

export interface AllocationBand {
  maxAge: number;
  oa: number;
  sa: number; // Special Account (Retirement Account from 55 — not modelled)
  ma: number;
}

export const CPF_ALLOCATION_2026: AllocationBand[] = [
  { maxAge: 35, oa: 0.6217, sa: 0.1621, ma: 0.2162 },
  { maxAge: 45, oa: 0.5677, sa: 0.1891, ma: 0.2432 },
  { maxAge: 50, oa: 0.5136, sa: 0.2162, ma: 0.2702 },
  { maxAge: 55, oa: 0.4055, sa: 0.3108, ma: 0.2837 },
];
export const CPF_ALLOCATION_META: AssumptionMeta = {
  label: 'CPF allocation ratios (OA / SA / MA)',
  status: 'verified',
  sourceIds: ['cpfAlloc2026'],
  effective: '1 Jan 2026',
  appliesTo: 'Private-sector / non-pensionable employees aged 55 and below',
  conditions: 'MA computed first, then SA, remainder to OA (CPF method). From 55, SA is closed and an RA is created — not modelled.',
  nextReview: '1 Jan 2027',
};

// ---------- CPF interest ----------

export const CPF_INTEREST = {
  oa: 0.025,
  smra: 0.04,
  extraRate: 0.01, // below 55
  extraCombinedCap: 60000,
  extraOaCap: 20000,
};
export const CPF_INTEREST_META: AssumptionMeta = {
  label: 'CPF interest: OA 2.5%, SA/MA 4%, +1% on first $60,000 (OA capped at $20,000) for members below 55',
  status: 'verified',
  sourceIds: ['cpfInterest', 'cpfFloor2027'],
  effective: 'Q4 2026; 4% SMRA floor extended to 31 Dec 2027',
  appliesTo: 'Members below 55',
  conditions:
    'Rates are reviewed quarterly. Beyond 2027 we assume today’s rates continue (illustrative). CPF computes interest monthly on the lowest balance and credits it yearly; we use a simplified annual calculation. Extra interest earned on OA is credited to SA.',
  nextReview: 'Quarterly (next: Jan 2027)',
};

export const BHS_2026 = 79000;
export const BHS_GROWTH = 0.035;
export const BHS_META: AssumptionMeta = {
  label: 'Basic Healthcare Sum $79,000 (below 65); excess MediSave contributions flow to other CPF accounts',
  status: 'verified',
  sourceIds: ['cpfBhs2026'],
  effective: '1 Jan 2026',
  appliesTo: 'Members below 65',
  conditions: 'Future BHS growth of 3.5% a year is an illustrative assumption. Overflow is sent to SA in this model.',
  nextReview: '1 Jan 2027',
};

export const RETIREMENT_SUMS_2026 = { brs: 110200, frs: 220400, ers: 440800 };
export const CPF_LIFE_EST_PAYOUT_2026 = { brs: 950, frs: 1780, ers: 3440 };
export const RETIREMENT_SUM_GROWTH = 0.035;
export const CPF_PAYOUT_AGE = 65;
export const RETIREMENT_SUMS_META: AssumptionMeta = {
  label: 'Retirement sums for members turning 55 in 2026: BRS $110,200 / FRS $220,400 / ERS $440,800; CPF payouts start at 65',
  status: 'verified',
  sourceIds: ['cpfRetSum', 'cpfPayoutAge'],
  effective: 'Cohort turning 55 in 2026',
  appliesTo: 'Singapore Citizens and PRs',
  conditions:
    'Estimated CPF LIFE Standard Plan payouts ($950 / $1,780 / $3,440 a month) are CPF Board estimates for the 2026 cohort, not for today’s youths. Projecting future sums at +3.5% a year follows the 2023–2026 pattern but future sums are not yet announced (illustrative).',
  nextReview: '1 Jan 2027',
};

// ---------- Income tax (resident) ----------

export interface TaxBand {
  upTo: number;
  rate: number;
}
export const RESIDENT_TAX_BANDS: TaxBand[] = [
  { upTo: 20000, rate: 0 },
  { upTo: 30000, rate: 0.02 },
  { upTo: 40000, rate: 0.035 },
  { upTo: 80000, rate: 0.07 },
  { upTo: 120000, rate: 0.115 },
  { upTo: 160000, rate: 0.15 },
  { upTo: 200000, rate: 0.18 },
  { upTo: 240000, rate: 0.19 },
  { upTo: 280000, rate: 0.195 },
  { upTo: 320000, rate: 0.2 },
  { upTo: 500000, rate: 0.22 },
  { upTo: 1000000, rate: 0.23 },
  { upTo: Infinity, rate: 0.24 },
];
export const EARNED_INCOME_RELIEF_BELOW_55 = 1000;
export const TAX_META: AssumptionMeta = {
  label: 'Resident income tax rates (0% on first $20,000 up to 24%)',
  status: 'verified',
  sourceIds: ['irasRates', 'irasReliefs'],
  effective: 'YA 2024 onwards (unchanged for YA 2026)',
  appliesTo: 'Tax residents',
  conditions:
    'Only Earned Income Relief ($1,000 below 55) and CPF Relief on compulsory employee contributions are applied. Tax is paid the year after income is earned; we show it as a same-year set-aside. Rebates and other reliefs are ignored. Non-resident tax is not modelled.',
  nextReview: 'After Budget 2027 (Feb 2027)',
};

// ---------- Macro / scenario assumptions (illustrative) ----------

export type ScenarioKey = 'favourable' | 'baseline' | 'challenging';
export type RiskLevel = 'cautious' | 'balanced' | 'adventurous';

export interface ScenarioParams {
  key: ScenarioKey;
  label: string;
  inflation: number;
  salaryGrowth: number;
  cashReturn: number;
  investReturn: Record<RiskLevel, number>;
}

export const SCENARIOS: Record<ScenarioKey, ScenarioParams> = {
  favourable: {
    key: 'favourable',
    label: 'More favourable',
    inflation: 0.015,
    salaryGrowth: 0.04,
    cashReturn: 0.015,
    investReturn: { cautious: 0.035, balanced: 0.06, adventurous: 0.08 },
  },
  baseline: {
    key: 'baseline',
    label: 'Baseline',
    inflation: 0.02,
    salaryGrowth: 0.03,
    cashReturn: 0.01,
    investReturn: { cautious: 0.025, balanced: 0.04, adventurous: 0.05 },
  },
  challenging: {
    key: 'challenging',
    label: 'More challenging',
    inflation: 0.03,
    salaryGrowth: 0.015,
    cashReturn: 0.005,
    investReturn: { cautious: 0.01, balanced: 0.01, adventurous: 0.0 },
  },
};

/** One-year fall applied when the user experiences the market-downturn scenario. */
export const DOWNTURN_DROP: Record<RiskLevel, number> = { cautious: 0.08, balanced: 0.2, adventurous: 0.35 };

export const SCENARIO_META: AssumptionMeta = {
  label: 'Inflation, salary growth and investment returns',
  status: 'illustrative',
  sourceIds: ['masInflation', 'inflationHistory', 'mtiCpi2025'],
  effective: 'Design assumption, Oct 2026',
  appliesTo: 'All projections',
  conditions:
    'Baseline inflation of 2% sits near Singapore’s ~2.1% 20-year headline average and MAS’s 1–2% 2026 forecast. Salary growth and investment returns are teaching values, not forecasts: real outcomes can be higher, lower or negative. No recovery after a downturn is assumed in the challenging case.',
  nextReview: 'Every 6 months',
};

// ---------- Cost-of-living defaults (illustrative, today's dollars per month) ----------

export const COST_DEFAULTS = {
  essentialsWithFamily: 650, // food, transport, phone, personal care
  essentialsIndependent: 800, // as above + groceries/household items
  roomRent: 1100,
  utilitiesWhenRenting: 80,
  wholeUnitRentShare: 1800,
  lifestyle: 400,
  familyAllowance: 300,
  dogMonthly: 220,
  dogSetup: 1500,
  catMonthly: 120,
  catSetup: 800,
  regionalTrip: 1500,
  longHaulTrip: 4500,
  studentLoanMonthly: 250,
  childMonthly: 1200,
};
export const COST_META: AssumptionMeta = {
  label: 'Everyday cost defaults (food, rent, pets, travel)',
  status: 'estimated',
  sourceIds: ['roomRent', 'dogCost'],
  effective: 'Mid–late 2026 market listings and guides',
  appliesTo: 'Fictional characters and starting suggestions — every value is editable',
  conditions:
    'Room rent default ($1,100) sits within listing ranges of ~$800–$1,600 for an HDB common room. Dog costs ($220/month) cover food, licence, routine vet and grooming, above the ~$560–$2,600/year basics reported. Trip, family and child costs are illustrative.',
  nextReview: 'Every 6 months',
};

// ---------- Income defaults ----------

export const INCOME_DEFAULTS = {
  uniGrad: 4500,
  polyGrad: 3000,
  iteGrad: 2300,
  nsfAllowance: 790,
  partTimeStudent: 600,
  gigMonthly: 1800,
  otherFirstJob: 2500,
};
export const INCOME_META: AssumptionMeta = {
  label: 'Starting income defaults by pathway',
  status: 'estimated',
  sourceIds: ['jauges2025', 'polyGes2025', 'iteGes', 'nsAllowance'],
  effective: 'Graduate surveys 2023–2025; NS allowance from 1 Jul 2025',
  appliesTo: 'Default suggestions only — users can type any figure',
  conditions:
    'University ($4,500) and polytechnic ($3,000) are 2025 medians for full-time permanent jobs; ITE ($2,300) is a midpoint of 2023 medians ($2,000–$2,490) and is older data. Medians hide wide variation by course. Part-time, gig and “other pathway” figures are illustrative.',
  nextReview: 'When 2026 graduate surveys are published (~Q1 2027)',
};

export const EMERGENCY_FUND = { minMonths: 3, maxMonths: 6, irregularMonths: 12 };
export const EMERGENCY_META: AssumptionMeta = {
  label: 'Emergency fund: 3–6 months of expenses; ~12 months if income is irregular',
  status: 'verified',
  sourceIds: ['moneysenseEF'],
  effective: 'MoneySense guidance',
  appliesTo: 'General educational guidance',
  conditions: 'A rule of thumb, not a requirement. Original PDF could not be re-fetched during research (404); confirm on moneysense.gov.sg.',
  nextReview: 'Annually',
};

export const ALL_ASSUMPTIONS: AssumptionMeta[] = [
  CPF_RATES_META,
  CPF_CEILING_META,
  CPF_ALLOCATION_META,
  CPF_INTEREST_META,
  BHS_META,
  RETIREMENT_SUMS_META,
  TAX_META,
  SCENARIO_META,
  INCOME_META,
  COST_META,
  EMERGENCY_META,
];

export const BASE_YEAR = 2026;
