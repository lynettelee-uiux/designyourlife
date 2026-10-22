import { COST_DEFAULTS, INCOME_DEFAULTS, type RiskLevel } from './assumptions';
import type { IncomeKind, Residency } from './cpf';

export type LifeStatus =
  | 'uni_student'
  | 'poly_student'
  | 'ite_student'
  | 'nsf'
  | 'employed'
  | 'part_time_gig'
  | 'between_jobs'
  | 'self_employed'
  | 'alt_path';

export type Living = 'family' | 'room' | 'whole_unit' | 'own' | 'other';

export interface Profile {
  nickname: string;
  avatar: string;
  age: number;
  status: LifeStatus;
  residency: Residency;
  financeMode: 'fictional' | 'personal';
  /** Current monthly income (today's dollars). */
  currentIncome: number;
  /** Age when full-time / main income begins (same as age if already working). */
  mainIncomeAge: number;
  /** Expected monthly income once main work starts (today's dollars). */
  mainIncome: number;
  cash: number;
  investments: number;
  cpfTotal: number;
  living: Living;
  essentials: number;
  lifestyle: number;
  familyAllowance: number;
  studentLoan: boolean;
  /** Only used when living === 'own'. Monthly home-loan instalment, the part paid from CPF OA, and years left. */
  homeLoanMonthly: number;
  homeLoanCpf: number;
  homeLoanYears: number;
}

export type AspirationId =
  | 'retire_early'
  | 'travel'
  | 'own_home'
  | 'live_independently'
  | 'pet'
  | 'business'
  | 'career_break'
  | 'support_parents'
  | 'creative_career'
  | 'start_family'
  | 'free_time'
  | 'financial_security';

/** User-tunable parameters of a chosen aspiration. Which fields are used depends on the aspiration. */
export interface DreamSelection {
  id: AspirationId;
  age?: number;
  amount?: number;
  months?: number;
  count?: number;
  variant?: string;
}
export type Dreams = Partial<Record<AspirationId, DreamSelection>>;

export interface Habits {
  social?: 'low' | 'medium' | 'high';
  career?: 'pay' | 'balance' | 'growth';
  windfall?: 'save' | 'split' | 'invest' | 'treat';
  independence?: 'soon' | 'later' | 'stay';
  risk?: RiskLevel;
  family?: 'generous' | 'balanced' | 'boundaries';
}

/** "Change One Thing" overrides, applied last. */
export interface Overrides {
  retireAge?: number;
  investMonthly?: number;
  lifestyle?: number;
  moveOutAge?: number;
  homeAge?: number;
  breakMonths?: number;
  tripsPerYear?: number;
}

export interface StatusInfo {
  label: string;
  kind: IncomeKind;
  mainKind: IncomeKind;
  currentIncome: number;
  yearsToMain: number;
  mainIncome: number;
  cash: number;
  hint: string;
}

export const STATUS_INFO: Record<LifeStatus, StatusInfo> = {
  uni_student: { label: 'University student', kind: 'salary', mainKind: 'salary', currentIncome: INCOME_DEFAULTS.partTimeStudent, yearsToMain: 2, mainIncome: INCOME_DEFAULTS.uniGrad, cash: 2000, hint: 'Part-time income now, first full-time job after graduation' },
  poly_student: { label: 'Polytechnic student', kind: 'salary', mainKind: 'salary', currentIncome: INCOME_DEFAULTS.partTimeStudent, yearsToMain: 1, mainIncome: INCOME_DEFAULTS.polyGrad, cash: 1500, hint: 'Part-time income now, work or further study next' },
  ite_student: { label: 'ITE student', kind: 'salary', mainKind: 'salary', currentIncome: INCOME_DEFAULTS.partTimeStudent, yearsToMain: 1, mainIncome: INCOME_DEFAULTS.iteGrad, cash: 1200, hint: 'Part-time income now, first job soon' },
  nsf: { label: 'Serving National Service', kind: 'allowance', mainKind: 'salary', currentIncome: INCOME_DEFAULTS.nsfAllowance, yearsToMain: 1, mainIncome: INCOME_DEFAULTS.polyGrad, cash: 3000, hint: 'NS allowance now; what comes after ORD is up to you' },
  employed: { label: 'Working full-time', kind: 'salary', mainKind: 'salary', currentIncome: INCOME_DEFAULTS.polyGrad, yearsToMain: 0, mainIncome: INCOME_DEFAULTS.polyGrad, cash: 8000, hint: 'Regular salary with CPF' },
  part_time_gig: { label: 'Part-time or gig work', kind: 'self', mainKind: 'self', currentIncome: INCOME_DEFAULTS.gigMonthly, yearsToMain: 0, mainIncome: INCOME_DEFAULTS.gigMonthly, cash: 3000, hint: 'Income that changes month to month' },
  between_jobs: { label: 'Between jobs', kind: 'none', mainKind: 'salary', currentIncome: 0, yearsToMain: 1, mainIncome: INCOME_DEFAULTS.otherFirstJob, cash: 5000, hint: 'Looking for the next role' },
  self_employed: { label: 'Self-employed', kind: 'self', mainKind: 'self', currentIncome: 2500, yearsToMain: 0, mainIncome: 2500, cash: 5000, hint: 'Running your own thing' },
  alt_path: { label: 'Another pathway', kind: 'salary', mainKind: 'salary', currentIncome: 1500, yearsToMain: 1, mainIncome: INCOME_DEFAULTS.otherFirstJob, cash: 2000, hint: 'Traineeship, apprenticeship, gap year or something else' },
};

export function defaultProfile(age = 22, status: LifeStatus = 'uni_student'): Profile {
  const info = STATUS_INFO[status];
  const working = info.yearsToMain === 0;
  return {
    nickname: '',
    avatar: 'sunrise',
    age,
    status,
    residency: 'citizen',
    financeMode: 'fictional',
    currentIncome: info.currentIncome,
    mainIncomeAge: age + info.yearsToMain,
    mainIncome: info.mainIncome,
    cash: info.cash,
    investments: 0,
    cpfTotal: working ? 12000 : 0,
    living: 'family',
    essentials: COST_DEFAULTS.essentialsWithFamily,
    lifestyle: COST_DEFAULTS.lifestyle,
    familyAllowance: working ? COST_DEFAULTS.familyAllowance : 100,
    studentLoan: false,
    homeLoanMonthly: 0,
    homeLoanCpf: 0,
    homeLoanYears: 0,
  };
}

/** Re-applies status-driven defaults while keeping identity fields. */
export function applyStatusDefaults(p: Profile, status: LifeStatus): Profile {
  const d = defaultProfile(p.age, status);
  return { ...p, status, currentIncome: d.currentIncome, mainIncomeAge: d.mainIncomeAge, mainIncome: d.mainIncome, cash: d.cash, cpfTotal: d.cpfTotal, familyAllowance: d.familyAllowance };
}

// ---------- Surprise me ----------

const NAMES = ['Aisyah', 'Jun Hao', 'Priya', 'Marcus', 'Wei Ling', 'Daniel', 'Nur', 'Kai', 'Shu Ting', 'Arjun', 'Hidayah', 'Zhi Yi', 'Ravi', 'Mei', 'Farhan', 'Jolene'];
const AVATARS = ['sunrise', 'wave', 'leaf', 'spark', 'moon', 'mountain'];

export interface SurpriseCharacter {
  profile: Profile;
  dreams: Dreams;
  blurb: string;
}

/** Deterministic for a given seed so tests and "try again" behave predictably. */
export function surpriseCharacter(seed = Date.now()): SurpriseCharacter {
  let x = seed % 2147483647 || 1;
  const rand = () => (x = (x * 16807) % 2147483647) / 2147483647;
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  const status = pick<LifeStatus>(['uni_student', 'poly_student', 'ite_student', 'nsf', 'employed', 'employed', 'part_time_gig', 'between_jobs', 'self_employed', 'alt_path']);
  const age = 20 + Math.floor(rand() * 5);
  const base = defaultProfile(age, status);
  const living = pick<Living>(['family', 'family', 'family', 'room']);
  const profile: Profile = {
    ...base,
    nickname: pick(NAMES),
    avatar: pick(AVATARS),
    living,
    essentials: living === 'family' ? COST_DEFAULTS.essentialsWithFamily : COST_DEFAULTS.essentialsIndependent,
    lifestyle: 250 + Math.round(rand() * 6) * 50,
    studentLoan: status === 'uni_student' ? rand() > 0.5 : false,
  };
  const pool: AspirationId[] = ['travel', 'pet', 'live_independently', 'career_break', 'support_parents', 'retire_early', 'own_home', 'creative_career', 'free_time', 'business'];
  const dreams: Dreams = { financial_security: { id: 'financial_security', months: 6 } };
  while (Object.keys(dreams).length < 4) {
    const id = pick(pool);
    if (id === 'live_independently' && living !== 'family') continue;
    dreams[id] = { id };
  }
  const blurb = `${profile.nickname}, ${age}, ${STATUS_INFO[status].label.toLowerCase()}, ${living === 'family' ? 'living with family' : 'renting a room'}.`;
  return { profile, dreams, blurb };
}
