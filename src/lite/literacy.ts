// Turns the gaps found by the simulation into money skills worth learning.
// Every fact here comes from the sources registry (src/data/sources.ts); quick checks
// are simple true/false statements with an explanation.

import type { GoalResult } from '../engine/goals';
import type { AspirationId, LifeStatus } from '../engine/profile';
import type { LiteHabits } from './inputs';
import { money } from '../engine/format';

export type SkillId = 'payslip' | 'budgeting' | 'emergency' | 'retirement' | 'investing' | 'housing' | 'irregular' | 'scams' | 'credit' | 'saving';

export interface Skill {
  id: SkillId;
  title: string;
  short: string; // for the share card
  icon: string;
  facts: string[];
  /** One small action they can take this week. */
  tip: string;
  check: { statement: string; answer: boolean; explain: string };
  learnMore: { label: string; url: string };
}

export const SKILLS: Record<SkillId, Skill> = {
  payslip: {
    id: 'payslip',
    title: 'Reading your payslip',
    short: 'Reading my payslip',
    icon: 'Wallet',
    facts: [
      'If you’re 55 or younger and earn over $750 a month, about 20% of your pay goes to your own CPF. Your employer adds 17% on top.',
      'CPF is charged on up to $8,000 of monthly wages in 2026.',
    ],
    tip: 'When your first payslip arrives, find three numbers: gross pay, your CPF, and take-home. They should add up.',
    check: { statement: 'Your employer’s CPF contribution comes out of your salary.', answer: false, explain: 'It’s paid on top of your salary. Only your own share (about 20%) is deducted from it.' },
    learnMore: { label: 'CPF contribution rates', url: 'https://www.cpf.gov.sg/conrate2023' },
  },
  budgeting: {
    id: 'budgeting',
    title: 'Budgeting for recurring costs',
    short: 'Budgeting for monthly costs',
    icon: 'Repeat',
    facts: [
      'A one-off cost hurts once. A monthly one — rent, a pet, a subscription — repeats every month and tends to rise with prices.',
      'Several dreams that each cost money every month compete for the same take-home pay.',
    ],
    tip: 'Track every spend for one month — a notes app is fine — then pick one category to trim.',
    check: { statement: 'A $50-a-month subscription costs about $600 a year.', answer: true, explain: '$50 × 12 = $600 — small monthly amounts add up fast.' },
    learnMore: { label: 'MoneySense: budgeting', url: 'https://www.moneysense.gov.sg/' },
  },
  emergency: {
    id: 'emergency',
    title: 'Building an emergency fund',
    short: 'Building an emergency fund',
    icon: 'Umbrella',
    facts: [
      'MoneySense suggests keeping 3–6 months of expenses for emergencies.',
      'A buffer buys you time — to search for the right job, take a break, or handle a surprise bill without borrowing.',
    ],
    tip: 'Open a separate savings account just for emergencies and give it a name. It’s easier not to touch.',
    check: { statement: 'An emergency fund is best kept in shares so it grows faster.', answer: false, explain: 'Emergency money should be easy to reach and low-risk, like a savings account — shares can be down just when you need them.' },
    learnMore: { label: 'MoneySense: emergency funds', url: 'https://www.moneysense.gov.sg/' },
  },
  retirement: {
    id: 'retirement',
    title: 'How CPF retirement works',
    short: 'Understanding CPF & retirement',
    icon: 'Sunset',
    facts: [
      'CPF payouts (CPF LIFE) start from age 65 — retiring earlier means your own savings fund the years in between.',
      'Your CPF savings are mostly set aside for housing, healthcare and retirement, so they can’t simply be spent.',
    ],
    tip: 'Log in to my cpf once and look at your three account balances — just to know where you stand.',
    check: { statement: 'CPF payouts can start whenever you decide to stop working.', answer: false, explain: 'The payout eligibility age is 65, separate from when you stop work.' },
    learnMore: { label: 'CPF retirement planning', url: 'https://www.cpf.gov.sg/member/infohub/educational-resources/what-is-the-cpf-retirement-sum' },
  },
  investing: {
    id: 'investing',
    title: 'Investing and risk',
    short: 'Investing & risk',
    icon: 'TrendingUp',
    facts: [
      'Rule of 72: divide 72 by a yearly return to see roughly how long money takes to double — 72 ÷ 4% ≈ 18 years.',
      'Investments can fall and stay down for years. Money you’ll need soon is usually safer not invested, and borrowing to invest is a common cause of big losses.',
    ],
    tip: 'Before investing, get your emergency fund in place — and only invest money you won’t need for years.',
    check: { statement: 'If an investment falls 20%, it needs to rise 25% to get back to where it was.', answer: true, explain: '$100 → $80 after a 20% fall; $80 needs +$20, which is 25% of $80.' },
    learnMore: { label: 'MoneySense: investing', url: 'https://www.moneysense.gov.sg/' },
  },
  housing: {
    id: 'housing',
    title: 'Housing and your CPF',
    short: 'Housing & CPF',
    icon: 'Home',
    facts: [
      'CPF Ordinary Account savings can usually help pay for an HDB flat, subject to HDB and CPF rules.',
      'Singles can generally buy an HDB flat from 35; income ceilings and grants depend on the scheme.',
    ],
    tip: 'Check the eligibility rules for your situation on the HDB Flat Portal before setting a timeline.',
    check: { statement: 'You can usually use CPF Ordinary Account savings towards an HDB flat.', answer: true, explain: 'Yes — subject to rules. Check the HDB Flat Portal for your eligibility and limits.' },
    learnMore: { label: 'HDB Flat Portal', url: 'https://homes.hdb.gov.sg/' },
  },
  irregular: {
    id: 'irregular',
    title: 'Managing irregular income',
    short: 'Managing irregular income',
    icon: 'Zap',
    facts: [
      'If your income changes month to month, MoneySense suggests a bigger cushion — around 12 months of expenses.',
      'Gig and freelance income usually has no employer CPF, so retirement and healthcare savings are more in your hands.',
    ],
    tip: 'On good months, move a fixed share to savings before spending anything.',
    check: { statement: 'People with irregular income need a smaller emergency fund because they can always pick up more work.', answer: false, explain: 'The opposite — a bigger buffer (around 12 months) helps you ride out quiet months.' },
    learnMore: { label: 'MoneySense', url: 'https://www.moneysense.gov.sg/' },
  },
  scams: {
    id: 'scams',
    title: 'Spotting scams',
    short: 'Spotting scams',
    icon: 'ShieldCheck',
    facts: [
      'Singapore saw about $913 million lost to scams in 2025, with investment scams among the costliest.',
      '“Guaranteed” high returns and pressure to act fast are classic red flags.',
    ],
    tip: 'Install ScamShield and check any “too good to be true” offer before you reply or pay.',
    check: { statement: 'An investment promising guaranteed 5% a week is a good opportunity if a friend recommends it.', answer: false, explain: 'Guaranteed high returns are a red flag, whoever shares them. Check with ScamShield first.' },
    learnMore: { label: 'ScamShield', url: 'https://www.scamshield.gov.sg/' },
  },
  credit: {
    id: 'credit',
    title: 'Credit cards and buy-now-pay-later',
    short: 'Using credit wisely',
    icon: 'Wallet',
    facts: [
      'Credit cards in Singapore typically charge about 26–28% a year on any balance you don’t pay in full — plus late fees.',
      'Pay-later providers follow an industry code of conduct developed under MAS guidance that caps fees, but missed payments still cost you — and several plans at once are easy to lose track of.',
    ],
    tip: 'Set a payday reminder to pay your card in full, and keep to one pay-later plan at a time — or none.',
    check: { statement: 'If you pay at least the minimum on your credit card, no interest is charged.', answer: false, explain: 'Interest is charged on whatever you don’t pay off — at around 26–28% a year.' },
    learnMore: { label: 'MoneySense', url: 'https://www.moneysense.gov.sg/' },
  },
  saving: {
    id: 'saving',
    title: 'Paying yourself first',
    short: 'Paying myself first',
    icon: 'PiggyBank',
    facts: [
      '“Pay yourself first” means moving a fixed amount to savings the day money comes in — before you spend.',
      'Automating it (a standing instruction to a separate account) means you don’t rely on willpower at the end of the month.',
    ],
    tip: 'Pick an amount you won’t miss — even $50 — and set it to move automatically on payday.',
    check: { statement: 'It’s easier to save whatever is left at the end of the month than to save first.', answer: false, explain: 'Spending tends to expand to fill what’s available. Saving first makes it happen.' },
    learnMore: { label: 'MoneySense', url: 'https://www.moneysense.gov.sg/' },
  },
};

/** Which skill each dream's gap points to. */
const DREAM_SKILL: Record<AspirationId, SkillId> = {
  travel: 'budgeting',
  live_independently: 'budgeting',
  pet: 'budgeting',
  support_parents: 'budgeting',
  start_family: 'budgeting',
  free_time: 'budgeting',
  career_break: 'emergency',
  financial_security: 'emergency',
  business: 'emergency',
  creative_career: 'irregular',
  retire_early: 'retirement',
  own_home: 'housing',
};

/** Choices in the life moments that point to a skill, with the reason shown. */
const CHOICE_SKILL: Record<string, [SkillId, string]> = {
  'bnpl:plan': ['credit', 'You took a “free” phone on a contract — the total cost ended up higher.'],
  'bnpl:bnpl': ['credit', 'You split a big buy with pay-later — easy to stack up.'],
  'grad_trip:japan_card': ['credit', 'You put a trip on a card to sort out later — interest adds up.'],
  'job_scam:try': ['scams', 'You paid a “deposit” to a job offer in your story — and lost it.'],
  'late_client:absorb': ['irregular', 'One client not paying hit your income hard.'],
  'trip:card': ['credit', 'You put a trip on a card to sort out later — interest can make it cost much more.'],
  'scam:test': ['scams', 'You tried a “guaranteed” offer in your story — and lost it.'],
  'pet:adopt': ['budgeting', 'Your pet adds a monthly cost for 10–15 years.'],
  'move_out:move': ['budgeting', 'Rent is now your biggest monthly cost.'],
  'career_break:full': ['emergency', 'A full break runs on savings alone.'],
};
const SURPRISE_SKILL: Record<string, SkillId> = { restructure: 'emergency', laptop: 'emergency', slow_month: 'irregular' };

export interface SkillPick {
  skill: Skill;
  /** Why this matters for this person, based on their result. */
  why: string;
}

export interface SkillInputs {
  goals: GoalResult[];
  /** Money-habit answers (Lite). Weak spots here come first. */
  habits?: LiteHabits;
  /** Share of take-home spent on food, fun & shopping. */
  lifestyleShare?: number;
  /** What their own ranges say should be left each month. */
  monthlyLeftover?: number;
  status: LifeStatus;
  /** Life moments: scenario id, chosen option, and change in savings vs if it hadn't happened. */
  moments: { scenario: string; choice?: string; impact: number }[];
  invested: boolean;
  dreamTitle: (id: AspirationId) => string;
}

/**
 * Ranks money skills by how much they'd help close this person's gaps. Gaps from dreams
 * come first (biggest gap first), then the life moment, then context (payslip, investing,
 * scams) to always return three.
 */
export function pickSkills(i: SkillInputs, max = 3): SkillPick[] {
  const out: SkillPick[] = [];
  const add = (id: SkillId, why: string) => {
    if (!out.some((p) => p.skill.id === id)) out.push({ skill: SKILLS[id], why });
  };
  const h = i.habits ?? {};
  const via = { card: 'a credit card', bnpl: 'a pay-later plan', instalments: 'instalments', family: 'family', savings: 'savings', save: 'savings' } as const;
  // When answers and numbers disagree, that gap is the most useful thing to learn about.
  if ((h.saving === 'rarely' || h.saving === 'leftover') && (i.monthlyLeftover ?? 0) >= 100)
    add('budgeting', `Your ranges suggest about ${money(i.monthlyLeftover!)} should be left each month — but you said ${h.saving === 'rarely' ? 'not much is' : 'you only save what’s left'}. Tracking for a month shows where it goes.`);
  if (h.surprise === 'card' || h.surprise === 'bnpl') add('credit', `You’d put a surprise $500 bill on ${via[h.surprise]}.`);
  if (h.bigBuy === 'card' || h.bigBuy === 'bnpl') add('credit', `You’d use ${via[h.bigBuy]} for big buys.`);
  if (h.surprise === 'family') add('emergency', 'You’d need family to cover a surprise $500 bill.');
  if (h.surprise && h.surprise !== 'savings') add('emergency', 'A surprise $500 bill would need more than your savings.');
  if (h.saving === 'rarely') add('saving', 'Not much is left to save at the end of most months.');
  if (h.tracking === 'no') add('budgeting', 'You’re not sure where last month’s money went.');
  if (i.lifestyleShare !== undefined && i.lifestyleShare > 0.4) add('budgeting', `Food, fun and shopping take about ${Math.round(i.lifestyleShare * 100)}% of your take-home pay.`);
  if (h.saving === 'leftover') add('saving', 'You save what’s left — which some months is nothing.');

  const gaps = [...i.goals].filter((g) => g.status !== 'on_track').sort((a, b) => a.progress - b.progress);
  for (const g of gaps) {
    const id = DREAM_SKILL[g.id];
    const name = i.dreamTitle(g.id).toLowerCase();
    const why =
      id === 'budgeting'
        ? `Your “${name}” dream is squeezed by monthly costs.`
        : id === 'emergency'
          ? `Your “${name}” dream needs a bigger savings cushion.`
          : id === 'retirement'
            ? `Your “${name}” dream depends on savings before CPF payouts at 65.`
            : id === 'housing'
              ? `Your “${name}” dream depends on how CPF and HDB rules work for you.`
              : `Your “${name}” dream depends on steadying an uneven income.`;
    add(id, why);
  }
  for (const m of i.moments) {
    const hit = m.choice ? CHOICE_SKILL[`${m.scenario}:${m.choice}`] : undefined;
    if (hit) add(hit[0], hit[1]);
    if (SURPRISE_SKILL[m.scenario] && m.impact < -1) add(SURPRISE_SKILL[m.scenario], 'Life’s surprise took a bite out of your savings — a buffer softens the next one.');
  }
  if (i.status === 'part_time_gig') add('irregular', 'Your income can change month to month.');
  if (['uni_student', 'poly_student', 'nsf', 'between_jobs'].includes(i.status)) add('payslip', 'Your first full-time payslip is coming — know where every dollar goes.');
  if (i.invested) add('investing', 'You’re setting money aside to invest — know the ups and downs first.');
  add('payslip', 'Knowing gross vs take-home pay makes every other plan more accurate.');
  add('scams', 'Scams target young adults too — a quick skill that protects everything else.');
  add('emergency', 'A cushion of 3–6 months protects every dream from life’s surprises.');
  add('budgeting', 'Knowing where your money goes each month is the base for every goal.');
  return out.slice(0, max);
}
