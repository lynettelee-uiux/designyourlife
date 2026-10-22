// Official Singapore resources surfaced in "Your Next Move". Links checked Oct 2026.

export interface Resource {
  title: string;
  org: string;
  url: string;
  why: string;
  tags: string[];
}

export const RESOURCES: Resource[] = [
  { title: 'MoneySense', org: 'MAS', url: 'https://www.moneysense.gov.sg/', why: 'Government financial-literacy guides on budgeting, emergency funds, insurance and investing.', tags: ['all'] },
  { title: 'CPF retirement & payout planners', org: 'CPF Board', url: 'https://www.cpf.gov.sg/payoutestimator', why: 'Official estimates of CPF LIFE payouts from your real balances.', tags: ['retire_early', 'cpf'] },
  { title: 'CPF contribution rates', org: 'CPF Board', url: 'https://www.cpf.gov.sg/conrate2023', why: 'Exactly how much goes to CPF from your pay, by age.', tags: ['cpf', 'paycheck'] },
  { title: 'HDB Flat Portal', org: 'HDB', url: 'https://homes.hdb.gov.sg/', why: 'Check flat eligibility, grants and get an HDB Flat Eligibility (HFE) letter.', tags: ['own_home', 'live_independently'] },
  { title: 'IRAS — individual income tax', org: 'IRAS', url: 'https://www.iras.gov.sg/taxes/individual-income-tax', why: 'Understand when you need to file and which reliefs apply.', tags: ['paycheck'] },
  { title: 'ScamShield', org: 'NCPC / SPF', url: 'https://www.scamshield.gov.sg/', why: 'Check suspicious messages, calls and offers before you act.', tags: ['all', 'scam'] },
  { title: 'MyCareersFuture', org: 'Workforce Singapore', url: 'https://www.mycareersfuture.gov.sg/', why: 'Job listings with salary ranges — useful for negotiating and career moves.', tags: ['career_break', 'creative_career', 'free_time', 'paycheck'] },
  { title: 'SkillsFuture', org: 'SkillsFuture Singapore', url: 'https://www.skillsfuture.gov.sg/', why: 'Courses and credits to build skills during transitions or breaks.', tags: ['career_break', 'creative_career', 'business'] },
  { title: 'Agency for Integrated Care', org: 'AIC', url: 'https://www.aic.sg/', why: 'Caregiving support and schemes for families.', tags: ['support_parents'] },
  { title: 'MOE financial assistance & loans', org: 'MOE', url: 'https://www.moe.gov.sg/financial-matters', why: 'Bursaries and student loans for further study.', tags: ['student'] },
  { title: 'Youth financial literacy (NYC)', org: 'National Youth Council', url: 'https://www.nyc.gov.sg/', why: 'Youth programmes, dialogues and published youth research.', tags: ['all'] },
];
