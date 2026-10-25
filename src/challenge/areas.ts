// The money skills the Sprint tests, and which matter most at each life stage.
// Ten skills are shared with Lite; Sprint adds protection (insurance) and legacy planning,
// which matter more as people settle down. Stage guidance follows MoneySense's life-stage
// material ("Your Financial Basics" and "Setting financial goals at every life stage").

import { SKILLS, type SkillId } from '../lite/literacy';

export type Area = SkillId | 'protection' | 'legacy';

/** Fixed order — also the order of the spider diagram's spokes. */
export const AREA_ORDER: Area[] = ['budgeting', 'saving', 'emergency', 'credit', 'scams', 'payslip', 'irregular', 'investing', 'protection', 'housing', 'retirement', 'legacy'];

export interface AreaInfo {
  id: Area;
  title: string;
  /** Spoke label on the spider diagram. */
  axis: string;
  icon: string;
  fact: string;
  tip: string;
  /** Official readings, MoneySense first where it covers the topic. */
  readings: { label: string; org: string; url: string }[];
  practise: { label: string; href: string };
}

const MS = 'MoneySense (MAS)';
const lite = (label = 'Play a few life moments in Lite') => ({ label, href: '../lite/' });
const full = (label: string) => ({ label, href: '../' });

const fromSkill = (id: SkillId, axis: string, readings: AreaInfo['readings'], practise: AreaInfo['practise']): AreaInfo => ({
  id,
  title: SKILLS[id].title,
  axis,
  icon: SKILLS[id].icon,
  fact: SKILLS[id].facts[0],
  tip: SKILLS[id].tip,
  readings,
  practise,
});

export const AREAS: Record<Area, AreaInfo> = {
  budgeting: fromSkill('budgeting', 'Budgeting', [{ label: 'Your Financial Basics', org: MS, url: 'https://www.moneysense.gov.sg/planning-your-finances-well/' }], lite()),
  saving: fromSkill('saving', 'Saving', [{ label: 'Setting financial goals at every life stage', org: MS, url: 'https://www.moneysense.gov.sg/investments/financial-goals/' }], lite()),
  emergency: fromSkill('emergency', 'Emergency', [{ label: 'Your Financial Basics — emergency funds', org: MS, url: 'https://www.moneysense.gov.sg/planning-your-finances-well/' }], lite()),
  credit: fromSkill('credit', 'Credit', [
    { label: 'Understanding credit cards', org: MS, url: 'https://www.moneysense.gov.sg/understanding-credit-cards/' },
    { label: 'Issuing credit cards — the rules', org: 'MAS', url: 'https://www.mas.gov.sg/regulation/explainers/Issuing-Credit-Cards' },
  ], lite()),
  scams: fromSkill('scams', 'Scams', [
    { label: 'ScamShield — check before you act', org: 'NCPC / SPF', url: 'https://www.scamshield.gov.sg/' },
    { label: 'MoneySense', org: MS, url: 'https://www.moneysense.gov.sg/' },
  ], lite()),
  payslip: fromSkill('payslip', 'Payslip & CPF', [
    { label: 'CPF contribution rates', org: 'CPF Board', url: 'https://www.cpf.gov.sg/conrate2023' },
    { label: 'Individual income tax basics', org: 'IRAS', url: 'https://www.iras.gov.sg/taxes/individual-income-tax' },
  ], full('See your take-home and CPF in the full version')),
  irregular: fromSkill('irregular', 'Gig income', [{ label: 'Your Financial Basics — emergency funds', org: MS, url: 'https://www.moneysense.gov.sg/planning-your-finances-well/' }], lite('Play Lite as a freelancer')),
  investing: fromSkill('investing', 'Investing', [
    { label: 'Setting financial goals at every life stage', org: MS, url: 'https://www.moneysense.gov.sg/investments/financial-goals/' },
    { label: 'Your Financial Basics — invest at least 10%', org: MS, url: 'https://www.moneysense.gov.sg/planning-your-finances-well/' },
  ], lite()),
  protection: {
    id: 'protection',
    title: 'Protecting yourself with insurance',
    axis: 'Insurance',
    icon: 'Users',
    fact: 'MoneySense’s rules of thumb: death & total permanent disability cover of 9× your annual income, critical illness cover of 4×, and at most 15% of income spent on protection.',
    tip: 'List what cover you already have — MediShield Life, CPF’s Dependants’ Protection Scheme once you work, any employer plans — before buying anything new.',
    readings: [
      { label: 'Your Financial Basics — protection', org: MS, url: 'https://www.moneysense.gov.sg/planning-your-finances-well/' },
      { label: 'Understanding health insurance', org: MS, url: 'https://www.moneysense.gov.sg/health-insurance/' },
      { label: 'Dependants’ Protection Scheme', org: 'CPF Board', url: 'https://www.cpf.gov.sg/service/article/what-is-the-dependants-protection-scheme' },
    ],
    practise: full('Try the insurance moment in the full version'),
  },
  housing: fromSkill('housing', 'Housing', [
    { label: 'Setting financial goals — BTO downpayment', org: MS, url: 'https://www.moneysense.gov.sg/investments/financial-goals/' },
    { label: 'HDB Flat Portal — eligibility and grants', org: 'HDB', url: 'https://homes.hdb.gov.sg/' },
  ], full('Try “own a home” in the full version')),
  retirement: fromSkill('retirement', 'Retirement', [
    { label: 'Retirement planning', org: MS, url: 'https://www.moneysense.gov.sg/retirement-planning/' },
    { label: 'What is the CPF retirement sum?', org: 'CPF Board', url: 'https://www.cpf.gov.sg/member/infohub/educational-resources/what-is-the-cpf-retirement-sum' },
  ], full('Try “retire early” in the full version')),
  legacy: {
    id: 'legacy',
    title: 'Legacy planning',
    axis: 'Legacy',
    icon: 'HeartHandshake',
    fact: 'MoneySense: every Singaporean needs a will, a Lasting Power of Attorney and a CPF nomination — not just the wealthy. CPF savings aren’t covered by a will.',
    tip: 'Make (or check) your CPF nomination online — it takes minutes and decides who receives your CPF savings.',
    readings: [
      { label: 'Legacy planning', org: MS, url: 'https://www.moneysense.gov.sg/legacy-planning/' },
      { label: 'What is a will?', org: MS, url: 'https://www.moneysense.gov.sg/legacy-planning/will/' },
      { label: 'Lasting Power of Attorney', org: MS, url: 'https://www.moneysense.gov.sg/legacy-planning/lpa/' },
      { label: 'CPF nomination', org: 'CPF Board', url: 'https://www.cpf.gov.sg/member/plan-with-cpf/legacy-planning' },
    ],
    practise: full('Plan your later years in the full version'),
  },
};

// ---------- Life stage ----------

export type Situation = 'studying' | 'ns' | 'working' | 'gig' | 'between';
export type Stage = 'student' | 'ns' | 'starting' | 'settling';

export interface Player {
  age: number;
  situation: Situation;
}

export const SITUATIONS: { value: Situation; label: string; icon: string }[] = [
  { value: 'studying', label: 'Studying', icon: 'GraduationCap' },
  { value: 'ns', label: 'Serving NS', icon: 'ShieldCheck' },
  { value: 'working', label: 'Working', icon: 'Briefcase' },
  { value: 'gig', label: 'Gig / freelance', icon: 'Zap' },
  { value: 'between', label: 'Between jobs', icon: 'Compass' },
];

/** Working people up to 27 are "starting out" (MoneySense: 20s); from 28, "setting up" (30s goals start to apply). */
export function stageOf(p: Player): Stage {
  if (p.situation === 'studying') return 'student';
  if (p.situation === 'ns') return 'ns';
  return p.age >= 28 ? 'settling' : 'starting';
}

export const STAGE_INFO: Record<Stage, { label: string; focus: string }> = {
  student: { label: 'Studying', focus: 'Budgeting your allowance or part-time pay, saving first, staying clear of debt traps and scams — and knowing what your first payslip will look like.' },
  ns: { label: 'Serving NS', focus: 'Budgeting your allowance, saving first, credit and scams — and getting ready for your first job’s payslip and CPF.' },
  starting: { label: 'Starting out', focus: 'MoneySense’s 20s goals: repay study loans, build a 3–6 month emergency fund, save for an HDB downpayment and start retirement savings — plus reading your payslip and basic insurance.' },
  settling: { label: 'Setting up', focus: 'MoneySense’s 30s goals: mortgage repayments, enough life and health insurance, and investing for the long term. MoneySense also says every adult needs a will, a Lasting Power of Attorney and a CPF nomination — not just the wealthy.' },
};

/** 2 = core now, 1 = good to know, 0 = later. */
export type Relevance = 0 | 1 | 2;

const REL: Record<Stage, Record<Area, Relevance>> = {
  student: { budgeting: 2, saving: 2, emergency: 2, credit: 2, scams: 2, payslip: 1, irregular: 1, investing: 1, protection: 1, housing: 1, retirement: 1, legacy: 0 },
  ns: { budgeting: 2, saving: 2, emergency: 2, credit: 2, scams: 2, payslip: 1, irregular: 0, investing: 1, protection: 1, housing: 1, retirement: 1, legacy: 0 },
  starting: { budgeting: 2, saving: 2, emergency: 2, credit: 2, scams: 2, payslip: 2, irregular: 1, investing: 2, protection: 2, housing: 2, retirement: 1, legacy: 1 },
  settling: { budgeting: 1, saving: 1, emergency: 2, credit: 1, scams: 1, payslip: 1, irregular: 1, investing: 2, protection: 2, housing: 2, retirement: 2, legacy: 2 },
};

export function relevance(p: Player): Record<Area, Relevance> {
  const r = { ...REL[stageOf(p)] };
  if (p.situation === 'gig') r.irregular = 2;
  if (p.situation === 'between') r.emergency = 2;
  return r;
}

/** Where "what to know at your stage" sits on the spider diagram. */
export const TARGET: Record<Relevance, number> = { 2: 1, 1: 0.6, 0: 0.2 };

// ---------- Key areas: the 12 skills grouped into 6 for the map and topic rounds ----------

export type GroupId = 'everyday' | 'safety' | 'credit' | 'earning' | 'growing' | 'future';

export interface Group {
  id: GroupId;
  title: string;
  /** Spoke label on the spider diagram. */
  axis: string;
  icon: string;
  blurb: string;
  areas: [Area, Area];
}

export const GROUPS: Group[] = [
  { id: 'everyday', title: 'Spending & saving', axis: 'Spending & saving', icon: 'PiggyBank', blurb: 'Budgets, saving first, goals', areas: ['budgeting', 'saving'] },
  { id: 'safety', title: 'Safety nets', axis: 'Safety nets', icon: 'Umbrella', blurb: 'Emergency fund, insurance', areas: ['emergency', 'protection'] },
  { id: 'credit', title: 'Credit & scams', axis: 'Credit & scams', icon: 'ShieldCheck', blurb: 'Cards, pay-later, red flags', areas: ['credit', 'scams'] },
  { id: 'earning', title: 'Pay, CPF & gig income', axis: 'Pay & CPF', icon: 'Wallet', blurb: 'Payslips, tax, freelancing', areas: ['payslip', 'irregular'] },
  { id: 'growing', title: 'Investing & home', axis: 'Investing & home', icon: 'TrendingUp', blurb: 'Risk, growth, HDB & CPF', areas: ['investing', 'housing'] },
  { id: 'future', title: 'Retirement & legacy', axis: 'Retirement & legacy', icon: 'Sunset', blurb: 'CPF LIFE, wills, nominations', areas: ['retirement', 'legacy'] },
];

export const groupOf = (a: Area): Group => GROUPS.find((g) => g.areas.includes(a))!;
export const groupById = (id: GroupId): Group => GROUPS.find((g) => g.id === id)!;

/** A key area is as relevant as its most relevant skill. */
export const groupRelevance = (p: Player, g: Group): Relevance => Math.max(...g.areas.map((a) => relevance(p)[a])) as Relevance;
