// Lite inputs as one-tap bands. Each band maps to a midpoint used by the engine and shown back
// to the user ("Based on…") so results are traceable to what they said.

import type { LifeStatus } from '../engine/profile';

export interface Band {
  label: string;
  mid: number;
}

export type IncomeSource = 'allowance' | 'parttime' | 'freelance' | 'internship' | 'salary' | 'ns';

export const INCOME_SOURCES: Record<IncomeSource, { label: string; icon: string; bands: Band[]; wage: boolean }> = {
  allowance: { label: 'Allowance from family', icon: 'HeartHandshake', wage: false, bands: [{ label: 'Under $200', mid: 150 }, { label: '$200–400', mid: 300 }, { label: '$400–700', mid: 550 }, { label: '$700+', mid: 850 }] },
  parttime: { label: 'Part-time job', icon: 'Coffee', wage: true, bands: [{ label: 'Under $500', mid: 350 }, { label: '$500–1k', mid: 750 }, { label: '$1k–1.5k', mid: 1250 }, { label: '$1.5k+', mid: 1800 }] },
  freelance: { label: 'Freelance or gigs', icon: 'Zap', wage: false, bands: [{ label: 'Under $300', mid: 200 }, { label: '$300–800', mid: 550 }, { label: '$800–1.5k', mid: 1150 }, { label: '$1.5k+', mid: 2000 }] },
  internship: { label: 'Internship', icon: 'Briefcase', wage: true, bands: [{ label: 'Under $1k', mid: 800 }, { label: '$1k–1.5k', mid: 1250 }, { label: '$1.5k–2k', mid: 1750 }, { label: '$2k+', mid: 2300 }] },
  salary: { label: 'Full-time salary', icon: 'Briefcase', wage: true, bands: [{ label: 'Under $2.5k', mid: 2100 }, { label: '$2.5k–3.5k', mid: 3000 }, { label: '$3.5k–5k', mid: 4250 }, { label: '$5k+', mid: 6000 }] },
  ns: { label: 'NS allowance', icon: 'ShieldCheck', wage: false, bands: [{ label: 'Under $900', mid: 800 }, { label: '$900–1.3k', mid: 1100 }, { label: '$1.3k+', mid: 1500 }] },
};

/** Which income sources make sense for each situation, and which are pre-selected. */
export const SOURCES_FOR: Record<LifeStatus, { options: IncomeSource[]; preset: IncomeSource[] }> = {
  uni_student: { options: ['allowance', 'parttime', 'freelance', 'internship'], preset: [] },
  poly_student: { options: ['allowance', 'parttime', 'freelance', 'internship'], preset: [] },
  ite_student: { options: ['allowance', 'parttime', 'freelance', 'internship'], preset: [] },
  nsf: { options: ['ns', 'allowance', 'freelance'], preset: ['ns'] },
  employed: { options: ['salary', 'freelance', 'allowance'], preset: ['salary'] },
  part_time_gig: { options: ['freelance', 'parttime', 'allowance'], preset: ['freelance'] },
  between_jobs: { options: ['allowance', 'freelance', 'parttime'], preset: [] },
  self_employed: { options: ['freelance', 'allowance'], preset: ['freelance'] },
  alt_path: { options: ['parttime', 'freelance', 'allowance', 'internship'], preset: [] },
};

export const SAVINGS_BANDS: Band[] = [
  { label: 'Under $1k', mid: 500 },
  { label: '$1k–5k', mid: 3000 },
  { label: '$5k–15k', mid: 10000 },
  { label: '$15k+', mid: 20000 },
];

export const GIVING_BANDS: Band[] = [
  { label: '$0', mid: 0 },
  { label: '~$200', mid: 200 },
  { label: '~$400', mid: 400 },
  { label: '$600+', mid: 650 },
];

export const WORK_START: { label: string; years: number }[] = [
  { label: 'Within a year', years: 1 },
  { label: '1–2 years', years: 2 },
  { label: '3+ years', years: 3 },
];

// ---------- Money habits ----------

export interface LiteHabits {
  food?: number; // band index
  fun?: number; // band index
  surprise?: 'savings' | 'family' | 'card' | 'bnpl';
  saving?: 'first' | 'leftover' | 'rarely';
  tracking?: 'yes' | 'roughly' | 'no';
  bigBuy?: 'save' | 'instalments' | 'bnpl' | 'card';
}

export const FOOD_BANDS: Band[] = [
  { label: 'Under $150', mid: 100 },
  { label: '$150–300', mid: 225 },
  { label: '$300–500', mid: 400 },
  { label: '$500+', mid: 650 },
];
export const FUN_BANDS: Band[] = [
  { label: 'Under $50', mid: 30 },
  { label: '$50–150', mid: 100 },
  { label: '$150–300', mid: 225 },
  { label: '$300+', mid: 400 },
];

export interface HabitQ {
  id: keyof LiteHabits;
  topic: string;
  prompt: string;
  hint?: string;
  options: { value: string | number; label: string }[];
}

export const HABIT_QS: HabitQ[] = [
  { id: 'food', topic: 'Food & going out', prompt: 'In a typical month, how much goes on meals out, cafés, delivery and going out with friends?', options: FOOD_BANDS.map((b, i) => ({ value: i, label: b.label })) },
  { id: 'fun', topic: 'Shopping & subscriptions', prompt: 'And on shopping, hobbies, games and subscriptions?', options: FUN_BANDS.map((b, i) => ({ value: i, label: b.label })) },
  {
    id: 'surprise',
    topic: 'Surprises',
    prompt: 'A $500 bill you didn’t expect lands tomorrow. How would you pay it?',
    options: [
      { value: 'savings', label: 'From my savings' },
      { value: 'family', label: 'Ask family to help' },
      { value: 'card', label: 'Credit card' },
      { value: 'bnpl', label: 'Pay later / instalments' },
    ],
  },
  {
    id: 'saving',
    topic: 'Saving',
    prompt: 'When money comes in, what usually happens?',
    options: [
      { value: 'first', label: 'I set some aside first' },
      { value: 'leftover', label: 'I save whatever’s left' },
      { value: 'rarely', label: 'Not much is left to save' },
    ],
  },
  {
    id: 'tracking',
    topic: 'Tracking',
    prompt: 'Do you know roughly where last month’s money went?',
    options: [
      { value: 'yes', label: 'Yes — I track it' },
      { value: 'roughly', label: 'Roughly' },
      { value: 'no', label: 'Honestly, no idea' },
    ],
  },
  {
    id: 'bigBuy',
    topic: 'Big buys',
    prompt: 'You want something big — say a $1,200 laptop. How do you usually pay?',
    options: [
      { value: 'save', label: 'Save up, then buy' },
      { value: 'instalments', label: '0% instalments' },
      { value: 'bnpl', label: 'Buy now, pay later' },
      { value: 'card', label: 'Credit card, pay over time' },
    ],
  },
];

/** Monthly lifestyle spend implied by the two spending answers (defaults to the second band each). */
export function lifestyleFrom(h: LiteHabits): number {
  return FOOD_BANDS[h.food ?? 1].mid + FUN_BANDS[h.fun ?? 1].mid;
}

/** Transport, phone, toiletries and basics — food is asked separately in Lite. */
export function basicsFor(living: 'family' | 'room' | 'own' | 'whole_unit' | 'other'): number {
  return living === 'family' ? 250 : 500; // + groceries & household items when living independently (illustrative)
}
