// Data-driven life scenarios for Stage 4 ("Life Happens").
//
// Each scenario is a pure description: when it applies, at what age, the story, and choices whose
// consequences are expressed as PlanEffects. The engine works out the numbers, so immediate and
// long-term consequences are always computed from the same model as the outlook.

import { COST_DEFAULTS, DOWNTURN_DROP } from '../engine/assumptions';
import { STATUS_INFO, type Dreams, type Habits, type Profile } from '../engine/profile';
import { resolveDream, type PlanEffect } from '../engine/plan';
import type { Plan } from '../engine/types';

export interface ScenarioCtx {
  profile: Profile;
  dreams: Dreams;
  habits: Habits;
  /** Plan before any story decisions — used to size amounts. */
  basePlan: Plan;
  name: string;
}

export interface ScenarioChoice {
  id: string;
  label: string;
  detail?: string;
  effects: (ctx: ScenarioCtx, age: number) => PlanEffect[];
  /** What happens straight away, in words. Numbers are added by the engine. */
  outcome: (ctx: ScenarioCtx, age: number) => string;
  reflection: string;
}

export interface LifeScenario {
  id: string;
  topic: string;
  title: string;
  applies: (ctx: ScenarioCtx) => boolean;
  age: (ctx: ScenarioCtx) => number;
  story: (ctx: ScenarioCtx, age: number) => string;
  choices: ScenarioChoice[];
  /** Short concept card shown after choosing. */
  learn: { title: string; body: string; sourceIds?: string[] };
  /** Unexpected events are flagged so the UI can label them honestly. */
  unexpected?: boolean;
  /**
   * The counterfactual "if this moment hadn't happened". Needed when a dream already put the
   * commitment into the plan (e.g. a pet), otherwise comparisons would show no difference.
   */
  neutral?: (ctx: ScenarioCtx, age: number) => PlanEffect[];
}

const mainAge = (c: ScenarioCtx) => Math.max(c.profile.age, c.profile.mainIncomeAge);
const isSalaried = (c: ScenarioCtx) => STATUS_INFO[c.profile.status].mainKind === 'salary';
const hasInvesting = (c: ScenarioCtx) => c.basePlan.investMonthly > 0 || c.profile.investments > 0;
const fmt = (n: number) => `$${Math.round(n).toLocaleString('en-SG')}`;

export const LIFE_SCENARIOS: LifeScenario[] = [
  // 1 — First job and salary negotiation
  {
    id: 'first_offer',
    topic: 'First job',
    title: 'The offer letter',
    applies: isSalaried,
    age: mainAge,
    story: (c, age) =>
      `It's ${age > c.profile.age ? `${age - c.profile.age} year${age - c.profile.age > 1 ? 's' : ''} from now` : 'this month'}. ${c.name}, you've been offered a full-time role at ${fmt(c.profile.mainIncome)} a month. A second company offers ${fmt(c.profile.mainIncome * 0.9)} — less pay, but a structured training programme and a mentor.`,
    choices: [
      {
        id: 'accept',
        label: 'Accept the first offer as it is',
        effects: () => [],
        outcome: (c) => `You start at ${fmt(c.profile.mainIncome)} a month gross.`,
        reflection: 'Your gross salary isn’t what lands in your bank account. CPF and tax come off first — but employer CPF is extra money set aside for you.',
      },
      {
        id: 'negotiate',
        label: 'Negotiate politely, with evidence',
        detail: 'You research typical pay for the role and ask for 5% more.',
        effects: () => [{ kind: 'mainIncomeFactor', factor: 1.03 }],
        outcome: (c) => `In this story, they meet you halfway: ${fmt(c.profile.mainIncome * 1.03)} a month (+3%). Real negotiations can go either way.`,
        reflection: 'A small raise at the start compounds: future increments are often a percentage of your current pay, and CPF contributions rise with it.',
      },
      {
        id: 'training',
        label: 'Take the lower offer with training',
        effects: (_c, age) => [
          { kind: 'mainIncomeFactor', factor: 0.9 },
          { kind: 'incomeAdjust', item: { id: 'training-payoff', fromAge: age + 3, factor: 1.15, label: 'Skills pay off (illustrative +15% from year 4)', source: 'first_offer' } },
        ],
        outcome: (c) => `You start at ${fmt(c.profile.mainIncome * 0.9)}. In this story, the skills lead to a 15% bigger role after three years — an illustration, not a guarantee.`,
        reflection: 'Lower pay now can be worth it if it builds skills employers value. The trade-off is real either way — there’s no single right answer.',
      },
    ],
    learn: {
      title: 'Gross vs take-home',
      body: 'If you’re 55 or younger and earn over $750 a month, about 20% of your wage goes to your own CPF and your employer adds 17% on top (on wages up to $8,000 a month in 2026). CPF is split across your Ordinary, Special and MediSave accounts — it’s yours, but mostly locked for housing, healthcare and retirement.',
      sourceIds: ['cpfConRate', 'cpfAlloc2026'],
    },
  },

  // 1b — Irregular income (gig / self-employed)
  {
    id: 'slow_month',
    topic: 'Irregular income',
    title: 'The quiet months',
    applies: (c) => !isSalaried(c),
    age: (c) => c.profile.age,
    story: (c) => `${c.name}, work has slowed. For the next two months you expect only about half your usual ${fmt(c.profile.currentIncome)} income. Rent and bills don’t pause.`,
    choices: [
      {
        id: 'buffer',
        label: 'Use my savings to ride it out',
        effects: (_c, age) => [{ kind: 'incomeGap', item: { id: 'slow-months', age, months: 2, partialFactor: 0.5, label: 'Two slow months', source: 'slow_month' } }],
        outcome: () => 'Your savings absorb the dip. This is exactly what a buffer is for.',
        reflection: 'With irregular income, MoneySense suggests a bigger cushion — around 12 months of expenses.',
      },
      {
        id: 'hustle',
        label: 'Take extra gigs and cut back on outings',
        effects: (_c, age) => [
          { kind: 'incomeGap', item: { id: 'slow-months', age, months: 2, partialFactor: 0.8, label: 'Two slow months (extra gigs)', source: 'slow_month' } },
          { kind: 'oneOff', item: { id: 'slow-months-trim', label: 'Less spent on outings', age, amount: -300, source: 'slow_month' } },
        ],
        outcome: () => 'You claw back most of the gap — at the cost of some rest and social time.',
        reflection: 'Flexing both income and spending protects your buffer, but watch for burnout.',
      },
    ],
    learn: {
      title: 'Irregular income and CPF',
      body: 'Self-employed people and gig workers don’t have mandatory employee CPF in this model, so building retirement and healthcare savings is more in your hands. Self-employed persons earning over $6,000 a year must contribute to MediSave (not modelled here).',
      sourceIds: ['moneysenseEF'],
    },
  },

  // 2 — Moving out
  {
    id: 'move_out',
    topic: 'Housing',
    title: 'A room comes up',
    neutral: () => [
      { kind: 'removeRecurring', id: 'move-out-rent' },
      { kind: 'removeRecurring', id: 'move-out-essentials' },
    ],
    applies: (c) => c.profile.living === 'family' && (!!c.dreams.live_independently || c.habits.independence === 'soon'),
    age: (c) => (c.dreams.live_independently ? resolveDream(c.dreams.live_independently, c.profile).age! : mainAge(c) + 1),
    story: (c) => {
      const rent = c.dreams.live_independently ? resolveDream(c.dreams.live_independently, c.profile).amount! : COST_DEFAULTS.roomRent;
      return `A friend is moving overseas and offers you their room for ${fmt(rent)} a month, utilities extra. It’s near work. ${c.name}, your family says you’re welcome to stay — and they wouldn’t mind a little more help with household costs.`;
    },
    choices: [
      {
        id: 'move',
        label: 'Take the room now',
        effects: (c, age) => moveOutEffects(c, age),
        outcome: (c) => `You get your own space. Monthly costs rise by roughly ${fmt(rentOf(c) + COST_DEFAULTS.utilitiesWhenRenting + 150)} including utilities and groceries.`,
        reflection: 'Independence has real value. The cost is a smaller monthly surplus — which can push back other goals like travel or a buffer.',
      },
      {
        id: 'later',
        label: 'Stay two more years and save hard',
        effects: (c, age) => moveOutEffects(c, age + 2),
        outcome: () => 'You stay home for now and plan to move in two years, with a bigger cushion.',
        reflection: 'Delaying a big recurring cost is one of the most powerful levers you have — it isn’t forever, just later.',
      },
      {
        id: 'stay',
        label: 'Stay and contribute more at home',
        effects: (_c, age) => [
          { kind: 'removeRecurring', id: 'move-out-rent' },
          { kind: 'removeRecurring', id: 'move-out-essentials' },
          { kind: 'recurring', item: { id: 'family-extra', label: 'Extra household contribution', category: 'family', monthly: 200, fromAge: age, source: 'move_out' } },
        ],
        outcome: () => 'You stay and add $200 a month towards household costs.',
        reflection: 'Living with family can be a shared arrangement. Contributing at home is part of many Singaporean households’ plans.',
      },
    ],
    learn: {
      title: 'Recurring costs add up',
      body: 'A one-off expense hurts once. A recurring cost — like rent — repeats every month and rises with inflation. That’s why “when” matters as much as “whether”. HDB common rooms were listed around $800–$1,600 a month in 2026.',
      sourceIds: ['roomRent'],
    },
  },

  // 3 — Travel with friends
  {
    id: 'trip',
    topic: 'Friends & travel',
    title: 'The group chat trip',
    applies: () => true,
    age: (c) => c.profile.age + 1,
    story: (c) => `The group chat lights up: a week in Japan, about $2,500 each, flights in four months. Everyone’s in. ${c.name}, what do you say?`,
    choices: [
      {
        id: 'card',
        label: 'Book now on my credit card, sort it later',
        effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'trip', label: 'Japan trip + card interest (illustrative)', age, amount: 2800, source: 'trip' } }],
        outcome: () => 'You’re going! Paying it off over several months adds interest — about $300 extra in this illustration.',
        reflection: 'Credit card interest is high. Paying only the minimum can make a holiday cost much more than its price tag.',
      },
      {
        id: 'save_first',
        label: 'Go, but save up for it first',
        effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'trip', label: 'Japan trip (saved up)', age, amount: 2500, source: 'trip' } }],
        outcome: () => 'You set aside about $625 a month for four months. Same trip, no interest.',
        reflection: 'A “sinking fund” turns a big expense into small, planned steps.',
      },
      {
        id: 'cheaper',
        label: 'Suggest a shorter regional trip instead',
        effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'trip', label: 'Regional trip', age, amount: 900, source: 'trip' } }],
        outcome: () => 'Half the group joins a long weekend in the region for about $900.',
        reflection: 'There’s often a version of the plan that keeps the friendship and the budget.',
      },
      {
        id: 'skip',
        label: 'Skip this one',
        effects: () => [],
        outcome: () => 'You sit this one out. FOMO is real — but so is your plan.',
        reflection: 'Saying no to one thing is saying yes to something else you care about.',
      },
    ],
    learn: {
      title: 'Spending and social pressure',
      body: 'In NYC’s 2026 youth dialogue, panellists noted that wealth can be misrepresented on social media and encouraged youths not to measure themselves against curated highlights.',
      sourceIds: ['nydFinLit2026'],
    },
  },

  // 4 — Pet adoption
  {
    id: 'pet',
    topic: 'Pets',
    title: 'Adoption day',
    neutral: () => [{ kind: 'removeRecurring', id: 'pet' }],
    applies: (c) => !!c.dreams.pet,
    age: (c) => resolveDream(c.dreams.pet!, c.profile).age!,
    story: (c) => {
      const d = resolveDream(c.dreams.pet!, c.profile);
      return `At a weekend adoption drive, a ${d.variant === 'cat' ? 'cat' : 'dog'} won’t stop following you around. The shelter says they’re ready to go home. ${c.name}, is this the day?`;
    },
    choices: [
      {
        id: 'adopt',
        label: 'Adopt today',
        effects: (c, age) => {
          const v = resolveDream(c.dreams.pet!, c.profile).variant;
          return [
            { kind: 'recurring', item: { id: 'pet', label: v === 'cat' ? 'Cat care' : 'Dog care', category: 'pet', monthly: v === 'cat' ? COST_DEFAULTS.catMonthly : COST_DEFAULTS.dogMonthly, fromAge: age, toAge: age + 13, source: 'pet' } },
            { kind: 'oneOff', item: { id: 'pet-setup', label: 'Adoption & setup', age, amount: v === 'cat' ? COST_DEFAULTS.catSetup : COST_DEFAULTS.dogSetup, source: 'pet' } },
          ];
        },
        outcome: (c) => {
          const cat = resolveDream(c.dreams.pet!, c.profile).variant === 'cat';
          return `Welcome home! Setup is about ${fmt(cat ? COST_DEFAULTS.catSetup : COST_DEFAULTS.dogSetup)}, then roughly ${fmt(cat ? COST_DEFAULTS.catMonthly : COST_DEFAULTS.dogMonthly)} a month for 10–15 years.`;
        },
        reflection: 'A pet is a long commitment. Its monthly cost will follow you into every later decision — including any career break.',
      },
      {
        id: 'foster',
        label: 'Foster first, adopt next year',
        effects: (_c, age) => [
          { kind: 'shiftRecurring', id: 'pet', fromAge: age + 1 },
          { kind: 'oneOff', item: { id: 'foster', label: 'Fostering costs', age, amount: 300, source: 'pet' } },
        ],
        outcome: () => 'You foster for a few months to see how a pet fits your routine and budget.',
        reflection: 'Trying before committing is a smart way to test a recurring cost.',
      },
      {
        id: 'not_now',
        label: 'Not now',
        effects: () => [{ kind: 'removeRecurring', id: 'pet' }],
        outcome: () => 'You decide to wait until your situation feels more settled.',
        reflection: 'Waiting isn’t giving up. You can revisit this dream when it fits.',
      },
    ],
    learn: {
      title: 'The true cost of a pet',
      body: 'Basic dog costs (licence, routine vet, food) were estimated at roughly $560–$2,600 a year, before grooming, boarding or emergencies. Only approved dog breeds are allowed in HDB flats.',
      sourceIds: ['dogCost'],
    },
  },

  // 5 — Insurance pitch
  {
    id: 'insurance',
    topic: 'Insurance',
    title: 'Coffee with an old classmate',
    applies: (c) => c.profile.age >= 20,
    age: (c) => mainAge(c) + 1,
    story: (c) => `An old classmate, now selling insurance, buys you coffee. They show you a plan with $250 monthly premiums for 25 years that “protects you and grows your money”. ${c.name}, they’d love you to sign today.`,
    choices: [
      {
        id: 'sign',
        label: 'Sign today — they’re a friend',
        effects: (_c, age) => [{ kind: 'recurring', item: { id: 'insurance', label: 'Insurance premiums', category: 'insurance', monthly: 250, fromAge: age, toAge: age + 25, nominal: true, source: 'insurance' } }],
        outcome: () => 'You’re now committed to $3,000 a year in premiums for 25 years.',
        reflection: 'Some policies are right for some people. But a long commitment deserves time: what does it cover, what happens if you stop paying, and could you keep paying during a career break?',
      },
      {
        id: 'needs_first',
        label: 'Ask for the documents and work out what I actually need',
        effects: (_c, age) => [{ kind: 'recurring', item: { id: 'insurance', label: 'Protection premiums (illustrative)', category: 'insurance', monthly: 60, fromAge: age, nominal: true, source: 'insurance' } }],
        outcome: () => 'You compare options and choose a smaller protection budget of about $60 a month for now (illustrative).',
        reflection: 'Start from what you need to protect — your health, your income, people who depend on you — then find cover that fits.',
      },
      {
        id: 'later',
        label: 'Rely on MediShield Life for now and review later',
        effects: () => [],
        outcome: () => 'You stay with the basic cover every Singapore Citizen and PR has, and set a reminder to review when your life changes.',
        reflection: 'MediShield Life is basic health insurance. It doesn’t replace income if you can’t work — a gap to revisit as you take on commitments.',
      },
    ],
    learn: {
      title: 'Save, protect, then grow',
      body: 'At NYC’s 2026 youth dialogue, panellists suggested building savings before investing or buying more insurance, and noted MediShield Life covers youths in early working years. This prototype doesn’t recommend any product.',
      sourceIds: ['nydFinLit2026'],
    },
  },

  // 6a — Unexpected: job change (salaried)
  {
    id: 'restructure',
    topic: 'Unexpected event',
    title: 'Restructuring',
    unexpected: true,
    applies: isSalaried,
    age: (c) => mainAge(c) + 2,
    story: (c) => `Your company is restructuring and your contract won’t be renewed. ${c.name}, you have a month’s notice. It’s not about you — but the bills are.`,
    choices: [
      {
        id: 'quick',
        label: 'Take the first offer I get (10% less pay)',
        effects: (_c, age) => [
          { kind: 'incomeGap', item: { id: 'job-gap', age, months: 1, label: 'One month between jobs', source: 'restructure' } },
          { kind: 'incomeAdjust', item: { id: 'job-change', fromAge: age, toAge: age + 3, factor: 0.9, label: 'Lower-paid role for a while', source: 'restructure' } },
        ],
        outcome: () => 'You’re back at work within a month, on 10% less pay for a few years.',
        reflection: 'Speed protects your savings, but can cost income later. Your buffer decides how much choice you have.',
      },
      {
        id: 'search',
        label: 'Search properly for 3 months',
        effects: (_c, age) => [{ kind: 'incomeGap', item: { id: 'job-gap', age, months: 3, label: 'Three months between jobs', source: 'restructure' } }],
        outcome: () => 'You take three months to find a role that fits, at similar pay. No salary — and no CPF — for those months.',
        reflection: 'This is what an emergency fund buys: time to make a good decision instead of a rushed one.',
      },
      {
        id: 'freelance',
        label: 'Freelance while I search',
        effects: (_c, age) => [{ kind: 'incomeGap', item: { id: 'job-gap', age, months: 3, partialFactor: 0.4, label: 'Three months freelancing', source: 'restructure' } }],
        outcome: () => 'Freelance work covers about 40% of your usual pay while you look.',
        reflection: 'Partial income stretches your runway — and can open new doors.',
      },
    ],
    learn: {
      title: 'Why buffers matter',
      body: 'MoneySense suggests keeping 3–6 months of expenses for emergencies. Government support such as SkillsFuture and MyCareersFuture can help during career transitions.',
      sourceIds: ['moneysenseEF', 'nydFinLit2026'],
    },
  },

  // 6b — Unexpected: device breaks (students, NSFs, gig)
  {
    id: 'laptop',
    topic: 'Unexpected event',
    title: 'The laptop that wouldn’t boot',
    unexpected: true,
    applies: (c) => !isSalaried(c) || c.profile.mainIncomeAge > c.profile.age,
    age: (c) => c.profile.age,
    story: (c) => `A week before a big deadline, ${c.name}'s laptop won’t turn on. Repair isn’t worth it. A comparable new one costs about $1,600.`,
    choices: [
      {
        id: 'new',
        label: 'Buy new from my savings',
        effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'laptop', label: 'New laptop', age, amount: 1600, source: 'laptop' } }],
        outcome: () => 'Sorted — your savings take a $1,600 hit.',
        reflection: 'This is a classic emergency-fund moment: not a disaster, just a bill you didn’t plan.',
      },
      {
        id: 'refurb',
        label: 'Get a refurbished one',
        effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'laptop', label: 'Refurbished laptop', age, amount: 750, source: 'laptop' } }],
        outcome: () => 'A refurbished model for about $750 does the job.',
        reflection: '“Good enough” options can halve the cost of surprises.',
      },
      {
        id: 'instalments',
        label: 'Pay in 0% instalments over a year',
        effects: (_c, age) => [{ kind: 'recurring', item: { id: 'laptop-instalment', label: 'Laptop instalments', category: 'debt', monthly: 134, fromAge: age, toAge: age + 1, nominal: true, source: 'laptop' } }],
        outcome: () => 'About $134 a month for 12 months. No interest if every payment is on time.',
        reflection: 'Instalments spread the cost but lock in a monthly commitment. Late fees can apply if you miss one.',
      },
    ],
    learn: {
      title: 'Plan for the unplanned',
      body: 'Small, plausible surprises happen to everyone. MoneySense suggests building towards 3–6 months of expenses — and starting small still counts.',
      sourceIds: ['moneysenseEF'],
    },
  },

  // 7 — Market downturn
  {
    id: 'downturn',
    topic: 'Investing',
    title: 'Red everywhere',
    applies: hasInvesting,
    age: (c) => mainAge(c) + 3,
    story: (c) => {
      const drop = Math.round(DOWNTURN_DROP[c.basePlan.riskLevel] * 100);
      return `Markets tumble. Headlines are grim and your investment app shows your portfolio down about ${drop}% this year. ${c.name}, a friend says they’ve sold everything.`;
    },
    choices: [
      {
        id: 'sell',
        label: 'Sell everything and keep it in cash',
        effects: (_c, age) => [{ kind: 'downturn', age, response: 'sell' }],
        outcome: () => 'You lock in the fall and stop investing. Your money no longer swings — but it won’t share in any recovery either.',
        reflection: 'Selling after a fall turns a paper loss into a real one. That can still be the right call if you need the money soon.',
      },
      {
        id: 'hold',
        label: 'Hold, but pause new investing this year',
        effects: (_c, age) => [{ kind: 'downturn', age, response: 'hold' }],
        outcome: () => 'You ride it out and keep your monthly savings in cash for now.',
        reflection: 'Holding gives investments time. Recovery is never guaranteed — that’s why money you need soon shouldn’t be invested.',
      },
      {
        id: 'keep',
        label: 'Keep investing every month as planned',
        effects: (_c, age) => [{ kind: 'downturn', age, response: 'keep_investing' }],
        outcome: () => 'You keep buying at lower prices. Whether that pays off depends on what markets do next.',
        reflection: 'Investing regularly through ups and downs spreads your risk over time. It only works if your buffer means you never have to sell at a bad moment.',
      },
    ],
    learn: {
      title: 'Risk is the price of potential returns',
      body: 'Investments can fall and stay low for years. This simulator shows a favourable, baseline and challenging path — and never assumes a recovery.',
      sourceIds: [],
    },
  },

  // 8 — Career break
  {
    id: 'career_break',
    topic: 'Career break',
    title: 'Time to step away',
    neutral: (_c, age) => [{ kind: 'incomeGap', item: { id: 'career-break', age, months: 0, label: 'No break', source: 'career_break' } }],
    applies: (c) => !!c.dreams.career_break,
    age: (c) => resolveDream(c.dreams.career_break!, c.profile).age!,
    story: (c) => {
      const d = resolveDream(c.dreams.career_break!, c.profile);
      return `You’re ${d.age}. ${c.name}, the break you dreamed about — ${d.months} months to rest, travel or learn — is finally on the table. Your manager says your role can’t be held open.`;
    },
    choices: [
      {
        id: 'full',
        label: 'Take the full break',
        effects: (c, age) => [{ kind: 'incomeGap', item: { id: 'career-break', age, months: resolveDream(c.dreams.career_break!, c.profile).months!, label: 'Career break', source: 'career_break' } }],
        outcome: (c) => `You step away for ${resolveDream(c.dreams.career_break!, c.profile).months} months. Every recurring cost — rent, pets, family support — keeps running.`,
        reflection: 'A break is easier when your fixed costs are low and your buffer is high. CPF contributions also pause without a salary.',
      },
      {
        id: 'shorter',
        label: 'Go shorter and freelance a little',
        effects: (c, age) => {
          const m = Math.max(1, Math.round(resolveDream(c.dreams.career_break!, c.profile).months! / 2));
          return [{ kind: 'incomeGap', item: { id: 'career-break', age, months: m, partialFactor: 0.3, label: 'Shorter break with freelancing', source: 'career_break' } }];
        },
        outcome: () => 'You take half the time off and earn about 30% of your pay from freelance work.',
        reflection: 'A partial break can give you rest while keeping skills and some income flowing.',
      },
      {
        id: 'postpone',
        label: 'Postpone two years and build a bigger buffer',
        effects: (c, age) => [{ kind: 'incomeGap', item: { id: 'career-break', age: age + 2, months: resolveDream(c.dreams.career_break!, c.profile).months!, label: 'Career break (later)', source: 'career_break' } }],
        outcome: () => 'You keep working for now and plan the break two years later.',
        reflection: 'Postponing isn’t cancelling. Two more years of saving can make the same break much less stressful.',
      },
    ],
    learn: {
      title: 'Runway = savings ÷ monthly costs',
      body: 'How long a break lasts depends as much on your monthly commitments as on your savings. Every decision you made earlier shows up here.',
    },
  },

  // 9 — Family needs help
  {
    id: 'family_help',
    topic: 'Family',
    title: 'A call from home',
    applies: (c) => !!c.dreams.support_parents || c.habits.family !== undefined,
    age: (c) => mainAge(c) + 2,
    story: (c) => `Your parent’s working hours have been cut, and the household is short about $400 a month for now. ${c.name}, nobody’s asking directly — but you know.`,
    choices: [
      {
        id: 'full',
        label: 'Give $400 a month for two years',
        effects: (_c, age) => [{ kind: 'recurring', item: { id: 'family-help', label: 'Helping at home', category: 'family', monthly: 400, fromAge: age, toAge: age + 2, source: 'family_help' } }],
        outcome: () => 'You cover the gap. It means less left over each month for your own plans for a while.',
        reflection: 'Supporting family is a value, not a mistake. Setting a time frame helps you plan for both.',
      },
      {
        id: 'partial',
        label: 'Give $200 a month and help them check support schemes',
        effects: (_c, age) => [{ kind: 'recurring', item: { id: 'family-help', label: 'Helping at home', category: 'family', monthly: 200, fromAge: age, toAge: age + 2, source: 'family_help' } }],
        outcome: () => 'You share the load and spend an evening going through government support options together.',
        reflection: 'Non-cash help — like navigating schemes — can be as valuable as money.',
      },
      {
        id: 'lump',
        label: 'Give a one-off $2,000 from savings',
        effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'family-help', label: 'One-off help at home', age, amount: 2000, source: 'family_help' } }],
        outcome: () => 'A lump sum gives breathing room without an ongoing commitment.',
        reflection: 'One-off help protects your monthly budget, but may not cover a longer gap.',
      },
    ],
    learn: {
      title: 'Caring across generations',
      body: 'Panellists at NYC’s 2026 dialogue noted that MediSave can be used for parents’ approved medical bills, and that MediFund helps lower-income patients who can’t afford medical costs.',
      sourceIds: ['nydFinLit2026'],
    },
  },

  // 10 — Scam
  {
    id: 'scam',
    topic: 'Scams',
    title: '“Guaranteed 5% a week”',
    applies: () => true,
    age: (c) => c.profile.age + 1,
    story: (c) => `${c.name} gets added to a chat group. Screenshots of profits, a friendly “mentor”, and an offer: start with just $500, guaranteed 5% returns every week.`,
    choices: [
      {
        id: 'report',
        label: 'Leave, block and report it',
        effects: () => [],
        outcome: () => 'You leave the group and report it. Nothing lost.',
        reflection: 'Guaranteed high returns are a classic red flag. When in doubt, check with ScamShield before acting.',
      },
      {
        id: 'test',
        label: 'Try $500 “just to test it”',
        effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'scam', label: 'Lost to a scam', age, amount: 500, source: 'scam' } }],
        outcome: () => 'The app shows gains — until you try to withdraw and are asked for a “release fee”. The $500 is gone.',
        reflection: 'Scams often let you “win” at first to build trust. Small tests are how bigger losses start.',
      },
      {
        id: 'ask',
        label: 'Ask a friend who knows about investing',
        effects: () => [],
        outcome: () => 'Your friend spots the signs immediately. You report it together.',
        reflection: 'A second opinion is a powerful scam filter.',
      },
    ],
    learn: {
      title: 'Scams in Singapore',
      body: 'Singapore saw 37,308 scam cases and about $913 million lost in 2025, with investment scams among the costliest — and most victims were under 65.',
      sourceIds: ['spfScams2025'],
    },
  },
];

function rentOf(c: ScenarioCtx) {
  return c.dreams.live_independently ? resolveDream(c.dreams.live_independently, c.profile).amount! : COST_DEFAULTS.roomRent;
}

function moveOutEffects(c: ScenarioCtx, age: number): PlanEffect[] {
  return [
    { kind: 'recurring', item: { id: 'move-out-rent', label: 'Rent & utilities (living independently)', category: 'housing', monthly: rentOf(c) + COST_DEFAULTS.utilitiesWhenRenting, fromAge: age, source: 'move_out' } },
    { kind: 'recurring', item: { id: 'move-out-essentials', label: 'Extra groceries & household items', category: 'essentials', monthly: COST_DEFAULTS.essentialsIndependent - COST_DEFAULTS.essentialsWithFamily, fromAge: age, source: 'move_out' } },
  ];
}

const MAX_CHAPTERS = 7;

/**
 * Picks this person's chapters: personal aspirations first, then one unexpected event and the downturn,
 * then fillers, capped at 7 and sorted by age so the story moves forward in time.
 */
export function selectScenarios(ctx: ScenarioCtx): { scenario: LifeScenario; age: number }[] {
  const byId = (id: string) => LIFE_SCENARIOS.find((s) => s.id === id)!;
  const priority = ['first_offer', 'slow_month', 'move_out', 'pet', 'career_break', 'restructure', 'laptop', 'downturn', 'family_help', 'trip', 'insurance', 'scam'];
  const chosen: LifeScenario[] = [];
  let unexpected = false;
  for (const id of priority) {
    const s = byId(id);
    if (!s.applies(ctx)) continue;
    if (s.unexpected) {
      if (unexpected) continue;
      unexpected = true;
    }
    chosen.push(s);
    if (chosen.length >= MAX_CHAPTERS) break;
  }
  return chosen
    .map((scenario) => ({ scenario, age: Math.max(ctx.profile.age, Math.min(scenario.age(ctx), 64)) }))
    .sort((a, b) => a.age - b.age || priority.indexOf(a.scenario.id) - priority.indexOf(b.scenario.id));
}
