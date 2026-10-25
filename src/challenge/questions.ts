// Question bank for Design Your Life (Sprint). Every question belongs to one money skill (the same
// ten skills Lite recommends), has a difficulty tier (1 basics → 3 tricky), and an explanation.
// Figures come from the sources registry (src/data/sources.ts) or are computed with the engine, so
// the quiz and the simulators never disagree. Anything illustrative says so.

import type { SkillId } from '../lite/literacy';
import { monthlyCpf } from '../engine/cpf';
import { residentTax } from '../engine/tax';
import { BASE_YEAR, EARNED_INCOME_RELIEF_BELOW_55 } from '../engine/assumptions';
import { cardExtra } from '../data/lifeScenarios';

export type Tier = 1 | 2 | 3;

export interface Question {
  id: string;
  area: SkillId;
  tier: Tier;
  question: string;
  options: string[];
  /** Index into options. */
  answer: number;
  explain: string;
  sourceIds?: string[];
}

const $ = (n: number) => `$${Math.round(n).toLocaleString('en-SG')}`;
const fv = (monthly: number, yearly: number, years: number) => {
  const r = yearly / 12;
  return (monthly * (Math.pow(1 + r, years * 12) - 1)) / r;
};

// Worked numbers, from the engine
const cpf3k = monthlyCpf(3000, 23, BASE_YEAR);
const cpf10k = monthlyCpf(10000, 25, BASE_YEAR);
const tax36k = residentTax(36000 - cpf3k.employee * 12 - EARNED_INCOME_RELIEF_BELOW_55);
const tax36kNoRelief = residentTax(36000);
const card = cardExtra(2500);
const invest200 = fv(200, 0.04, 10);
const early = fv(200, 0.04, 40);
const late = fv(200, 0.04, 30);
const scam = 500 * Math.pow(1.05, 52);
const inflated = 1000 * Math.pow(1.02, 20);

export const QUESTIONS: Question[] = [
  // ---------- Reading your payslip ----------
  {
    id: 'pay-own-cpf', area: 'payslip', tier: 1,
    question: 'You’re 23 and earn $3,000 a month. Roughly how much goes into your own CPF each month?',
    options: ['$300', $(cpf3k.employee), $(cpf3k.total)], answer: 1,
    explain: `About 20% of your pay (${$(cpf3k.employee)}) is your share. Your employer adds ${$(cpf3k.employer)} on top, so ${$(cpf3k.total)} goes in altogether.`,
    sourceIds: ['cpfConRate'],
  },
  {
    id: 'pay-employer', area: 'payslip', tier: 1,
    question: 'Where does your employer’s CPF contribution come from?',
    options: ['It’s deducted from your salary', 'It’s paid on top of your salary', 'It’s optional for the employer'], answer: 1,
    explain: 'Your employer pays their share on top of your salary. Only your own share is deducted from it.',
    sourceIds: ['cpfConRate'],
  },
  {
    id: 'pay-ceiling', area: 'payslip', tier: 2,
    question: 'In 2026, CPF contributions are charged on monthly wages up to…',
    options: ['$6,000', '$8,000', '$10,000'], answer: 1,
    explain: 'The Ordinary Wage ceiling is $8,000 a month in 2026. Pay above that doesn’t attract monthly CPF.',
    sourceIds: ['cpfConRate'],
  },
  {
    id: 'pay-ceiling-calc', area: 'payslip', tier: 3,
    question: 'You’re 25 and earn $10,000 a month. How much is your own monthly CPF contribution?',
    options: ['$2,000', $(cpf10k.employee), '$1,000'], answer: 1,
    explain: `Only the first $8,000 counts: 20% × $8,000 = ${$(cpf10k.employee)}, not 20% of $10,000.`,
    sourceIds: ['cpfConRate'],
  },
  {
    id: 'pay-tax-free', area: 'payslip', tier: 2,
    question: 'For a Singapore tax resident, how much of your chargeable income is taxed at 0%?',
    options: ['The first $10,000', 'The first $20,000', 'The first $30,000'], answer: 1,
    explain: 'The first $20,000 of chargeable income is taxed at 0%; rates then rise in steps.',
    sourceIds: ['irasRates'],
  },
  {
    id: 'pay-tax-calc', area: 'payslip', tier: 3,
    question: 'You’re 23 and earn $36,000 a year. After CPF Relief and Earned Income Relief, roughly how much income tax do you pay?',
    options: ['$0', `~${$(Math.round(tax36k / 10) * 10)}`, `~${$(Math.round(tax36kNoRelief / 10) * 10)}`], answer: 1,
    explain: `Chargeable income = $36,000 − ${$(cpf3k.employee * 12)} CPF Relief − $1,000 Earned Income Relief = ${$(36000 - cpf3k.employee * 12 - 1000)}. 0% on the first $20,000 and 2% on the rest ≈ ${$(tax36k)}. Without reliefs it would be about ${$(tax36kNoRelief)}.`,
    sourceIds: ['irasRates', 'irasReliefs'],
  },

  // ---------- Budgeting ----------
  {
    id: 'bud-bubbletea', area: 'budgeting', tier: 1,
    question: 'A $5.50 bubble tea, four times a week. Roughly how much is that a year?',
    options: ['~$290', '~$1,140', '~$2,900'], answer: 1,
    explain: '$5.50 × 4 × 52 weeks ≈ $1,144. Small, frequent spends add up to big yearly totals.',
  },
  {
    id: 'bud-leftover', area: 'budgeting', tier: 1,
    question: 'Take-home pay $2,400. Rent $900, food $600, transport $150, phone $40. What’s left?',
    options: ['$610', '$710', '$810'], answer: 1,
    explain: '$900 + $600 + $150 + $40 = $1,690. $2,400 − $1,690 = $710.',
  },
  {
    id: 'bud-recurring', area: 'budgeting', tier: 2,
    question: 'Which usually does the most damage to a budget over a few years?',
    options: ['A one-off $300 concert ticket', 'A $40-a-month subscription you forgot about', 'A $100 birthday gift'], answer: 1,
    explain: 'The subscription repeats: $40 × 12 = $480 a year, every year, until you notice. Recurring costs are the ones to review first.',
  },
  {
    id: 'bud-inflation', area: 'budgeting', tier: 3,
    question: 'If prices rise about 2% a year, something that costs $1,000 today costs roughly how much in 20 years?',
    options: ['~$1,200', '~$1,400', `~${$(Math.round(inflated / 10) * 10)}`], answer: 2,
    explain: `Price rises compound: $1,000 × 1.02²⁰ ≈ ${$(inflated)}. Adding 2% × 20 = 40% ($1,400) misses the compounding.`,
    sourceIds: ['inflationHistory'],
  },
  {
    id: 'bud-split', area: 'budgeting', tier: 2,
    question: 'You start renting a room for $1,100 a month. Roughly what does that add up to over 3 years?',
    options: ['~$13,000', '~$40,000', '~$100,000'], answer: 1,
    explain: '$1,100 × 36 months = $39,600 — before any rent increases.',
    sourceIds: ['roomRent'],
  },

  // ---------- Emergency fund ----------
  {
    id: 'emg-size', area: 'emergency', tier: 1,
    question: 'If your income is steady, how big an emergency fund does MoneySense suggest?',
    options: ['About 1 month of expenses', '3–6 months of expenses', '2 years of expenses'], answer: 1,
    explain: 'MoneySense suggests 3–6 months of expenses, and more if your income is irregular.',
    sourceIds: ['moneysenseEF'],
  },
  {
    id: 'emg-where', area: 'emergency', tier: 2,
    question: 'Where is emergency money usually best kept?',
    options: ['In shares, so it grows faster', 'In a savings account you can reach quickly', 'In a fixed deposit locked for 2 years'], answer: 1,
    explain: 'Emergency money needs to be safe and quick to reach. Shares can be down, and locked deposits can’t be touched, just when you need them.',
    sourceIds: ['moneysenseEF'],
  },
  {
    id: 'emg-runway', area: 'emergency', tier: 1,
    question: 'Your monthly costs are $1,800 and you have $5,400 saved. With no income, how long would it last?',
    options: ['2 months', '3 months', '5 months'], answer: 1,
    explain: 'Runway = savings ÷ monthly costs = $5,400 ÷ $1,800 = 3 months.',
  },
  {
    id: 'emg-cpf', area: 'emergency', tier: 2,
    question: 'Three months without a salary also means…',
    options: ['Your CPF contributions pause too', 'Last year’s income tax is waived', 'Your phone contract pauses'], answer: 0,
    explain: 'No salary means no employee or employer CPF for those months, so your housing and retirement savings pause too.',
    sourceIds: ['cpfConRate'],
  },
  {
    id: 'emg-cut', area: 'emergency', tier: 3,
    question: 'Costs $2,000 a month, savings $6,000. Which makes your savings last longest if you lose your job?',
    options: ['Cut costs to $1,500 a month', 'Earn $400 a month freelancing', 'Both are about the same'], answer: 0,
    explain: 'Cutting to $1,500: $6,000 ÷ $1,500 = 4 months. Freelancing: $6,000 ÷ ($2,000 − $400) = 3.75 months. Close — but cutting costs wins here.',
  },

  // ---------- CPF & retirement ----------
  {
    id: 'ret-age', area: 'retirement', tier: 1,
    question: 'From what age do CPF LIFE payouts start?',
    options: ['55', '60', '65'], answer: 2,
    explain: 'The payout eligibility age is 65. If you stop work earlier, your own savings cover the years in between.',
    sourceIds: ['cpfPayoutAge'],
  },
  {
    id: 'ret-frs', area: 'retirement', tier: 2,
    question: 'For members turning 55 in 2026, what is the Full Retirement Sum?',
    options: ['$110,200', '$220,400', '$440,800'], answer: 1,
    explain: 'FRS is $220,400. The Basic Retirement Sum is half that ($110,200) and the Enhanced is double ($440,800).',
    sourceIds: ['cpfRetSum'],
  },
  {
    id: 'ret-oa', area: 'retirement', tier: 2,
    question: 'What interest does the CPF Ordinary Account earn (before extra interest)?',
    options: ['1%', '2.5%', '4%'], answer: 1,
    explain: 'The OA earns 2.5%. The Special, MediSave and Retirement Accounts earn 4% (floor).',
    sourceIds: ['cpfInterest'],
  },
  {
    id: 'ret-gap', area: 'retirement', tier: 2,
    question: 'You stop work at 55 and want $3,000 a month until CPF payouts start at 65. How much would you need saved (ignoring prices and growth)?',
    options: ['$36,000', '$360,000', '$3.6 million'], answer: 1,
    explain: '$3,000 × 12 months × 10 years = $360,000 — that’s the gap retiring early creates.',
    sourceIds: ['cpfPayoutAge'],
  },
  {
    id: 'ret-extra', area: 'retirement', tier: 3,
    question: 'If you’re below 55, CPF pays an extra 1% interest on the first … of your combined balances.',
    options: ['$20,000', '$60,000', '$100,000'], answer: 1,
    explain: 'Extra 1% on the first $60,000 of combined balances, with up to $20,000 of that from the OA.',
    sourceIds: ['cpfInterest'],
  },

  // ---------- Investing & risk ----------
  {
    id: 'inv-recover', area: 'investing', tier: 1,
    question: 'Your investments fall 20%. How much must they rise to get back to where they were?',
    options: ['20%', '25%', '40%'], answer: 1,
    explain: '$100 → $80. Getting back to $100 needs +$20, which is 25% of $80.',
  },
  {
    id: 'inv-72', area: 'investing', tier: 2,
    question: 'Rule of 72: at 6% a year, roughly how long does money take to double?',
    options: ['6 years', '12 years', '18 years'], answer: 1,
    explain: '72 ÷ 6 = 12 years. At 4% it’s about 18 years.',
  },
  {
    id: 'inv-diversify', area: 'investing', tier: 2,
    question: 'Spreading your money across many investments mainly…',
    options: ['Guarantees a profit', 'Lowers the damage if one goes badly', 'Only adds fees'], answer: 1,
    explain: 'Diversifying doesn’t guarantee returns, but one bad investment hurts less.',
  },
  {
    id: 'inv-monthly', area: 'investing', tier: 3,
    question: 'You invest $200 a month for 10 years at an illustrative 4% a year. Roughly what is it worth?',
    options: ['~$24,000', `~${$(Math.round(invest200 / 1000) * 1000)}`, '~$40,000'], answer: 1,
    explain: `You put in $24,000; growth adds about ${$(invest200 - 24000)} for ≈ ${$(invest200)}. Illustrative — returns are never guaranteed.`,
  },
  {
    id: 'inv-soon', area: 'investing', tier: 1,
    question: 'You need $3,000 for a course in 6 months. Where should it sit?',
    options: ['Shares — they might grow', 'A savings account', 'Crypto — faster growth'], answer: 1,
    explain: 'Money needed soon shouldn’t be invested: markets can be down exactly when you need it.',
  },

  // ---------- Housing ----------
  {
    id: 'house-oa', area: 'housing', tier: 1,
    question: 'Which CPF account can usually help pay for an HDB flat?',
    options: ['Ordinary Account', 'MediSave Account', 'Retirement Account'], answer: 0,
    explain: 'Ordinary Account savings can usually go towards an HDB flat, subject to HDB and CPF rules.',
  },
  {
    id: 'house-single', area: 'housing', tier: 2,
    question: 'Singles can generally buy an HDB BTO flat from what age?',
    options: ['21', '28', '35'], answer: 2,
    explain: 'Singles can generally buy from 35, with an income ceiling of $8,000 from 24 Aug 2026.',
    sourceIds: ['hdbIncomeCeiling'],
  },
  {
    id: 'house-ceiling', area: 'housing', tier: 3,
    question: 'From 24 Aug 2026, what is the BTO income ceiling for families?',
    options: ['$14,000', '$16,000', '$21,000'], answer: 1,
    explain: 'It was raised to $16,000 a month for families ($8,000 for singles 35+).',
    sourceIds: ['hdbIncomeCeiling'],
  },
  {
    id: 'house-bhs', area: 'housing', tier: 3,
    question: 'Once your MediSave reaches the Basic Healthcare Sum ($79,000 in 2026), where do extra MediSave contributions go?',
    options: ['They’re refunded as cash', 'They flow to your other CPF accounts', 'They’re lost'], answer: 1,
    explain: 'Contributions above the BHS flow to your other CPF accounts — which can help with housing or retirement.',
    sourceIds: ['cpfBhs2026'],
  },

  // ---------- Irregular income ----------
  {
    id: 'irr-cushion', area: 'irregular', tier: 1,
    question: 'If your income changes month to month, how big a cushion does MoneySense suggest?',
    options: ['About 3 months', 'About 6 months', 'About 12 months'], answer: 2,
    explain: 'Around 12 months of expenses for irregular income, versus 3–6 months when income is steady.',
    sourceIds: ['moneysenseEF'],
  },
  {
    id: 'irr-cpf', area: 'irregular', tier: 2,
    question: 'You freelance for a client full-time for a year. Who adds an employer CPF contribution?',
    options: ['The client, at 17%', 'Nobody — there’s no employer share', 'The government matches it'], answer: 1,
    explain: 'Freelancers don’t get employer CPF, so retirement and healthcare savings are more in your own hands.',
    sourceIds: ['cpfConRate'],
  },
  {
    id: 'irr-deposit', area: 'irregular', tier: 1,
    question: 'What best protects a freelancer from clients paying late?',
    options: ['Working faster', 'Charging less', 'A written scope and a deposit upfront'], answer: 2,
    explain: 'A clear written scope and a deposit (30–50% is common practice) mean you’re never working entirely unpaid.',
  },
  {
    id: 'irr-budget', area: 'irregular', tier: 3,
    question: 'Your last six months of freelance income: $3,000, $500, $2,500, $0, $4,000, $2,000. What’s the safest amount to plan monthly spending around?',
    options: ['$4,000 — my best month', '$2,000 — my average', 'Less than my average, saving the rest'], answer: 2,
    explain: 'The average is $2,000, but two months were $500 and $0. Planning below the average, and saving good months, smooths the gaps.',
  },

  // ---------- Scams ----------
  {
    id: 'scam-job', area: 'scams', tier: 1,
    question: 'Which is the biggest red flag in a job offer?',
    options: ['The recruiter is very friendly', 'You must pay a deposit to start', 'The work is remote'], answer: 1,
    explain: 'Real employers pay you — they never ask you to pay to start work or “unlock” tasks.',
  },
  {
    id: 'scam-compound', area: 'scams', tier: 2,
    question: 'If “5% a week” were real, roughly what would $500 grow to in a year?',
    options: ['~$1,800', `~${$(Math.round(scam / 100) * 100)}`, '~$900'], answer: 1,
    explain: `$500 × 1.05 compounded 52 times ≈ ${$(scam)}. No genuine investment does this — that’s the tell.`,
  },
  {
    id: 'scam-tool', area: 'scams', tier: 1,
    question: 'Which official app helps you check and block suspicious calls and messages?',
    options: ['Singpass', 'ScamShield', 'MyCareersFuture'], answer: 1,
    explain: 'ScamShield checks suspicious messages, calls and offers before you act.',
  },
  {
    id: 'scam-size', area: 'scams', tier: 2,
    question: 'Roughly how much was lost to scams in Singapore in 2025?',
    options: ['~$91 million', '~$913 million', '~$9 billion'], answer: 1,
    explain: 'About S$913 million across more than 37,000 cases.',
    sourceIds: ['spfScams2025'],
  },
  {
    id: 'scam-otp', area: 'scams', tier: 2,
    question: 'A caller says they’re from your bank and need your OTP to “secure your account”. They know your name and NRIC. What do you do?',
    options: ['Give it — they already know my details', 'Ask for their staff ID first', 'Hang up and call the number on the bank’s official site'], answer: 2,
    explain: 'Banks never ask for OTPs. Knowing your details proves nothing — data leaks happen. Call back on an official number.',
  },

  // ---------- Credit ----------
  {
    id: 'cred-min', area: 'credit', tier: 1,
    question: 'You pay only the minimum on your credit card bill. What happens?',
    options: ['No interest — you paid on time', 'Interest is charged on the unpaid balance', 'The bank waives the rest'], answer: 1,
    explain: 'Paying the minimum avoids a late fee, but interest is charged on everything you didn’t pay.',
    sourceIds: ['creditCards'],
  },
  {
    id: 'cred-rate', area: 'credit', tier: 2,
    question: 'Unpaid credit card balances in Singapore are typically charged about … a year.',
    options: ['5%', '12%', '27%'], answer: 2,
    explain: 'Card key facts sheets show effective rates around 26–28% a year.',
    sourceIds: ['creditCards'],
  },
  {
    id: 'cred-trip', area: 'credit', tier: 3,
    question: 'A $2,500 trip on a card, paid off in 12 equal monthly payments at about 27% a year. Roughly how much extra do you pay?',
    options: ['~$40', `~${$(Math.round(card / 10) * 10)}`, '~$675'], answer: 1,
    explain: `Twelve payments of about ${$((2500 + card) / 12)} = ${$(2500 + card)}. Interest shrinks as you repay, so it’s less than 27% × $2,500 ($675).`,
    sourceIds: ['creditCards'],
  },
  {
    id: 'cred-phone', area: 'credit', tier: 3,
    question: 'Over 2 years, which costs less: a $1,200 phone plus a $15-a-month SIM-only plan, or a “free” phone on a $60-a-month contract? (illustrative prices)',
    options: ['The $1,200 phone + SIM-only', 'The “free” phone contract', 'Exactly the same'], answer: 1,
    explain: '$1,200 + $15 × 24 = $1,560, versus $60 × 24 = $1,440. Here the contract is cheaper — always add up the total instead of going by “free”.',
  },
  {
    id: 'cred-bnpl', area: 'credit', tier: 2,
    question: 'What’s the main risk of running three buy-now-pay-later plans at once?',
    options: ['They charge high interest upfront', 'It’s easy to lose track and miss payments, which costs fees', 'They lower your CPF'], answer: 1,
    explain: 'Pay-later plans are usually interest-free if paid on time, but several at once are easy to lose track of — and late fees apply.',
    sourceIds: ['masBnpl'],
  },

  // ---------- Paying yourself first ----------
  {
    id: 'save-first', area: 'saving', tier: 1,
    question: '“Pay yourself first” means…',
    options: ['Treat yourself on payday', 'Move a fixed amount to savings on payday, before spending', 'Pay your bills before anything else'], answer: 1,
    explain: 'Saving first — ideally automatically — means you don’t rely on what’s left at the end of the month.',
  },
  {
    id: 'save-early', area: 'saving', tier: 2,
    question: 'Saving $200 a month at an illustrative 4% a year until 62: starting at 22 instead of 32 gives you roughly…',
    options: ['1.3× as much', `${(early / late).toFixed(1)}× as much`, '4× as much'], answer: 1,
    explain: `From 22: ≈ ${$(early)}. From 32: ≈ ${$(late)}. You only add $24,000 more, but 10 extra years of growth do the rest.`,
  },
  {
    id: 'save-conditions', area: 'saving', tier: 2,
    question: 'Bank A pays 2.5% on savings. Bank B pays “up to 4%” if you credit your salary and spend $500 a month on its card. You can’t meet B’s conditions. Which pays you more?',
    options: ['Bank A', 'Bank B', 'The same'], answer: 0,
    explain: '“Up to” rates depend on conditions. If you can’t meet them, Bank B’s base rate is usually much lower. Illustrative rates.',
  },
  {
    id: 'save-27', area: 'saving', tier: 3,
    question: 'Which is like earning a guaranteed 27% return?',
    options: ['Paying off a credit card balance charging 27%', 'A 4% savings account', 'A stranger’s “guaranteed 27%” investment'], answer: 0,
    explain: 'Every dollar of a 27% balance you pay off saves 27% a year in interest — guaranteed. A stranger’s guarantee is a scam red flag.',
    sourceIds: ['creditCards'],
  },
];
