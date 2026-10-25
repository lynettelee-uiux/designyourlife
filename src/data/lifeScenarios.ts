// Data-driven life scenarios for Stage 4 ("Life Happens").
//
// Each scenario is a pure description: when it applies, at what age, the story, and choices whose
// consequences are expressed as PlanEffects. The engine works out the numbers, so immediate and
// long-term consequences are always computed from the same model as the outlook.

import { COST_DEFAULTS, DOWNTURN_DROP } from '../engine/assumptions';
import { STATUS_INFO, lifeStage, type Dreams, type Habits, type LifeStage, type Profile } from '../engine/profile';
import { resolveDream, type PlanEffect } from '../engine/plan';
import type { Plan } from '../engine/types';
import { monthlyCpf } from '../engine/cpf';
import { balancesAtAge, monthlySnapshot, projectAll } from '../engine/projection';

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

/** A "quick guess" asked after the choice and before the outcome — designed so the answer isn't obvious. */
export interface Quiz {
  question: string;
  options: { id: string; label: string }[];
  answer: string;
  explain: string;
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
  /** Life stages this moment fits (used by Lite to keep scenarios age-appropriate). Omitted = any. */
  stages?: LifeStage[];
  /** The quick-guess question for this moment (attached below from QUIZZES). */
  quiz?: (ctx: ScenarioCtx, age: number) => Quiz;
}

const mainAge = (c: ScenarioCtx) => Math.max(c.profile.age, c.profile.mainIncomeAge);
const isSalaried = (c: ScenarioCtx) => STATUS_INFO[c.profile.status].mainKind === 'salary';
const hasInvesting = (c: ScenarioCtx) => c.basePlan.investMonthly > 0 || c.profile.investments > 0;
const fmt = (n: number) => `$${Math.round(n).toLocaleString('en-SG')}`;

export const LIFE_SCENARIOS: LifeScenario[] = [
  // 1 — First job and salary negotiation
  {
    id: 'first_offer',
    stages: ['student', 'ns', 'early_career'],
    topic: 'First job',
    title: 'Two offers',
    applies: isSalaried,
    age: mainAge,
    story: (c) => {
      const o = offers(c);
      return `${c.name}, two job offers land in the same week. Offer A: ${fmt(o.a)} a month, plus a 2-month year-end bonus in the contract. Offer B: ${fmt(o.b)} a month, no bonus. Same kind of role.`;
    },
    choices: [
      {
        id: 'a',
        label: 'Offer A — lower monthly pay, with a bonus',
        effects: (c) => [{ kind: 'mainIncomeFactor', factor: (offers(c).a * 14) / 12 / c.profile.mainIncome }],
        outcome: (c) => `You earn ${fmt(offers(c).a)} a month plus about two months’ bonus — around ${fmt(offers(c).a * 14)} a year. (We spread the bonus across the year in this illustration.)`,
        reflection: 'Compare job offers by the yearly package, not the monthly figure. Bonuses also attract CPF — but check whether they’re guaranteed in the contract.',
      },
      {
        id: 'b',
        label: 'Offer B — higher monthly pay, no bonus',
        effects: () => [],
        outcome: (c) => `You earn ${fmt(offers(c).b)} a month — about ${fmt(offers(c).b * 12)} a year, steady and predictable.`,
        reflection: 'A higher monthly number feels better, but the yearly total is what pays for your plans. Steady pay without a bonus does make budgeting simpler.',
      },
      {
        id: 'negotiate',
        label: 'Ask Offer B to come closer to A’s yearly total',
        detail: 'You show both offers and ask politely.',
        effects: () => [{ kind: 'mainIncomeFactor', factor: 1.03 }],
        outcome: (c) => `In this story, B meets you partway: ${fmt(offers(c).b * 1.03)} a month. Real negotiations can go either way.`,
        reflection: 'Knowing the yearly value of each offer gives you a fair, evidence-based way to negotiate.',
      },
    ],
    learn: {
      title: 'Look at the yearly package',
      body: 'Monthly pay, bonuses and CPF all add up to your real package. If you’re 55 or younger, 20% of your pay goes to your CPF and your employer adds 17% on top (on wages up to $8,000 a month in 2026).',
      sourceIds: ['cpfConRate'],
    },
  },

  // 1b — Irregular income (gig / self-employed)
  {
    id: 'slow_month',
    stages: ['student', 'early_career', 'established'],
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
    stages: ['early_career', 'established'],
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
    stages: ['early_career', 'established'],
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
    stages: ['early_career', 'established'],
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
    stages: ['early_career', 'established'],
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
    stages: ['student', 'ns', 'early_career'],
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
    stages: ['early_career', 'established'],
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
    stages: ['early_career', 'established'],
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
    stages: ['early_career', 'established'],
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
  // ---------- Stage-matched moments (students, NS, early career) ----------

  {
    id: 'bnpl',
    topic: 'Spending',
    title: 'The new phone',
    stages: ['student', 'ns', 'early_career'],
    applies: () => true,
    age: (c) => c.profile.age,
    story: () => 'Your phone finally dies. The one you want costs $1,200. The shop offers three ways to get it — or you could repair the old one for about $250.',
    choices: [
      {
        id: 'upfront',
        label: 'Pay $1,200 upfront from savings',
        effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'bnpl', label: 'New phone (paid upfront)', age, amount: 1200, source: 'bnpl' } }],
        outcome: () => 'Done — no debt, but your savings drop by $1,200 straight away.',
        reflection: 'Paying upfront is usually the cheapest way — as long as it doesn’t empty your emergency cushion.',
      },
      {
        id: 'bnpl',
        label: 'Pay later: 3 × $400 at 0% interest',
        effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'bnpl', label: 'New phone (pay later)', age, amount: 1200, source: 'bnpl' } }],
        outcome: () => 'Same $1,200 in total — if every payment is on time. Miss one and fees apply.',
        reflection: 'Pay-later makes big buys feel smaller. One plan is manageable; several at once are easy to lose track of.',
      },
      {
        id: 'plan',
        label: 'Get it “free” on a 2-year mobile plan (~$60/month more)',
        effects: (_c, age) => [{ kind: 'recurring', item: { id: 'bnpl-plan', label: 'Bundled phone plan (extra vs SIM-only, illustrative)', category: 'other', monthly: 60, fromAge: age, toAge: age + 2, nominal: true, source: 'bnpl' } }],
        outcome: () => 'No upfront cost — but about $60 more every month for 2 years. That’s around $1,440 in total.',
        reflection: '“Free” is rarely free. Spreading a cost inside a contract can make it more expensive — always compare the total.',
      },
      {
        id: 'repair',
        label: 'Repair the old phone (~$250) and keep saving',
        effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'bnpl', label: 'Phone repair', age, amount: 250, source: 'bnpl' } }],
        outcome: () => 'The repair costs about $250 and buys you time to save for the upgrade.',
        reflection: '“Do I need new, or do I need working?” is one of the most useful money questions there is.',
      },
    ],
    learn: {
      title: 'Compare the total cost',
      body: 'Upfront, pay-later and bundled plans can cost very different amounts for the same thing. Credit cards typically charge about 26–28% a year on unpaid balances, and pay-later providers follow a code of conduct developed under MAS guidance that caps fees — but late payments still cost you.',
      sourceIds: ['creditCards', 'masBnpl'],
    },
  },

  {
    id: 'job_scam',
    topic: 'Scams',
    title: '“Earn $300 a day from home”',
    stages: ['student', 'ns', 'early_career'],
    applies: () => true,
    age: (c) => c.profile.age,
    story: () => `A friendly message lands in your Telegram: “Earn $300 a day liking videos! Just a small $200 deposit to unlock your first tasks.” Screenshots show other people’s payouts.`,
    choices: [
      { id: 'report', label: 'Block and report it', effects: () => [], outcome: () => 'You block, report and move on. Nothing lost.', reflection: 'Real jobs don’t ask you to pay to start. A “deposit to unlock tasks” is a classic job-scam pattern.' },
      {
        id: 'try',
        label: 'Pay the $200 deposit “just to see”',
        effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'job_scam', label: 'Lost to a job scam', age, amount: 200, source: 'job_scam' } }],
        outcome: () => 'You “earn” a little at first. Then you’re asked for a bigger deposit to withdraw. The $200 is gone.',
        reflection: 'Job scams often pay small amounts first to build trust — the losses come next.',
      },
      { id: 'ask', label: 'Ask a friend or check ScamShield first', effects: () => [], outcome: () => 'It matches a known scam pattern. You report it together.', reflection: 'A 30-second check is the cheapest protection you’ll ever buy.' },
    ],
    learn: { title: 'Job scams target young people', body: 'Job scams were among the top five scam types by number of cases in Singapore in 2025, and among the costliest. Most scam victims were under 65.', sourceIds: ['spfScams2025'] },
  },

  {
    id: 'grad_trip',
    topic: 'Friends & travel',
    title: 'The big trip',
    stages: ['student', 'ns'],
    applies: () => true,
    age: (c) => c.profile.age,
    story: (c) => `${c.profile.status === 'nsf' ? 'Your section is planning a post-ORD trip' : 'Your friends are planning a grad trip'}. The group chat is split: a budget week in Bangkok (~$700) or Japan (~$2,500). What’s your call?`,
    choices: [
      { id: 'budget', label: 'Bangkok, budget style (~$700)', effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'grad_trip', label: 'Budget trip', age, amount: 700, source: 'grad_trip' } }], outcome: () => 'Hostels, street food, great memories — about $700 all in.', reflection: 'The best trips aren’t always the most expensive ones. Cheaper trips mean you can go more often.' },
      { id: 'japan_card', label: 'Japan with everyone — on a card, sort it later', effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'grad_trip', label: 'Japan trip + card interest (illustrative)', age, amount: 2800, source: 'grad_trip' } }], outcome: () => 'Amazing trip. Paying it off slowly adds roughly $300 in interest (illustrative).', reflection: 'Borrowing for experiences means paying for them twice — once in money, once in interest.' },
      { id: 'japan_save', label: 'Japan — but save up for it first', effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'grad_trip', label: 'Japan trip (saved up)', age, amount: 2500, source: 'grad_trip' } }], outcome: () => 'You set a target, pick up extra hours, and pay upfront. Same trip, no debt.', reflection: 'A clear target with a date makes saving feel like progress, not sacrifice.' },
      { id: 'skip', label: 'Skip it — staycation instead (~$150)', effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'grad_trip', label: 'Staycation', age, amount: 150, source: 'grad_trip' } }], outcome: () => 'A fun weekend at home for about $150, and your savings stay intact.', reflection: 'Saying no to one plan is saying yes to something else you care about.' },
    ],
    learn: { title: 'Plan big spends as a “sinking fund”', body: 'Split a big cost into small monthly amounts before it happens. In NYC’s 2026 youth dialogue, panellists encouraged youths not to measure themselves against curated highlights on social media.', sourceIds: ['nydFinLit2026'] },
  },

  {
    id: 'late_client',
    topic: 'Unexpected event',
    title: 'The client goes quiet',
    unexpected: true,
    stages: ['student', 'early_career', 'established'],
    applies: (c) => (c.profile.otherIncome ?? []).some((o) => o.id === 'freelance' && o.monthly > 0) || c.profile.status === 'part_time_gig' || c.profile.status === 'self_employed',
    age: (c) => c.profile.age,
    story: () => `A client cancels an $800 project halfway — and stops replying about paying for the work you already did.`,
    choices: [
      { id: 'absorb', label: 'Let it go and absorb the loss', effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'late_client', label: 'Unpaid freelance work', age, amount: 800, source: 'late_client' } }], outcome: () => 'You lose the $800 you were counting on.', reflection: 'With freelance work, income isn’t income until it’s in your account. A buffer stops one client from wrecking your month.' },
      { id: 'chase', label: 'Follow up politely, with your messages as proof', effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'late_client', label: 'Partly unpaid freelance work', age, amount: 400, source: 'late_client' } }], outcome: () => 'After a few weeks they pay half — $400.', reflection: 'Written scope, a deposit upfront and clear payment terms protect you before work starts.' },
      { id: 'refill', label: 'Find replacement gigs fast', effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'late_client', label: 'Income gap, partly refilled', age, amount: 300, source: 'late_client' } }], outcome: () => 'You fill most of the gap with smaller gigs — about $300 short in the end.', reflection: 'More than one client means no single one can sink you.' },
    ],
    learn: { title: 'Irregular income needs a bigger cushion', body: 'MoneySense suggests around 12 months of expenses as an emergency fund when income is irregular, compared with 3–6 months for steady income.', sourceIds: ['moneysenseEF'] },
  },

  {
    id: 'internship',
    topic: 'Work & study',
    title: 'The internship offer',
    stages: ['student'],
    applies: () => true,
    age: (c) => c.profile.age,
    story: () => `You’re offered a 3-month paid internship at $1,200 a month. It clashes with your current gigs — and exams are coming.`,
    choices: [
      { id: 'take', label: 'Take the internship', effects: (_c, age) => [{ kind: 'oneOff', item: { id: 'internship', label: 'Internship pay (after CPF, illustrative)', age, amount: -2880, source: 'internship' } }], outcome: () => 'About $2,880 take-home over 3 months — after 20% goes to your CPF. Your employer adds 17% more to CPF too.', reflection: 'Paid work experience can lift your first full-time salary — and your first CPF contributions start building.' },
      { id: 'gigs', label: 'Keep my current gigs', effects: () => [], outcome: () => 'Your income stays the same, and you keep flexible hours.', reflection: 'Flexibility has value too. The trade-off is experience that could pay off later.' },
      { id: 'study', label: 'Pause work and focus on exams', effects: (c, age) => { const f = (c.profile.otherIncome ?? []).find((o) => o.id === 'freelance')?.monthly ?? 0; return f > 0 ? [{ kind: 'oneOff', item: { id: 'internship', label: 'Paused freelance work', age, amount: f * 2, source: 'internship' } }] : []; }, outcome: () => 'You earn less for a couple of months, but your grades get your full attention.', reflection: 'Your studies are an investment too. Planning for a lower-income stretch is what a buffer is for.' },
    ],
    learn: { title: 'Your first CPF', body: 'Once you earn over $750 a month as an employee (aged 55 or below), 20% of your pay goes to your CPF and your employer adds 17% on top — even for internships.', sourceIds: ['cpfConRate'] },
  },

  // 12 — Dream: give back to parents
  {
    id: 'give_back',
    topic: 'Family',
    title: 'Giving back at home',
    neutral: () => [{ kind: 'removeRecurring', id: 'parents-support' }],
    applies: (c) => !!c.dreams.support_parents,
    age: (c) => resolveDream(c.dreams.support_parents!, c.profile).age!,
    story: (c, age) => {
      const d = resolveDream(c.dreams.support_parents!, c.profile);
      return `You’re ${age}. ${c.name}, you’ve always planned to give your parents ${fmt(d.amount!)} a month. When you bring it up, they say, “No need — keep it for yourself.” You know things are a bit tight at home.`;
    },
    choices: [
      {
        id: 'planned',
        label: 'Give the full amount from now',
        effects: (c, age) => [{ kind: 'recurring', item: { id: 'parents-support', label: 'Supporting parents', category: 'family', monthly: resolveDream(c.dreams.support_parents!, c.profile).amount!, fromAge: age, source: 'give_back' } }],
        outcome: (c) => `You set up ${fmt(resolveDream(c.dreams.support_parents!, c.profile).amount!)} a month on payday. It’s now one of your fixed costs, alongside everything else.`,
        reflection: 'Giving regularly is a commitment like rent: plan it in, and the rest of your budget fits around it.',
      },
      {
        id: 'step',
        label: 'Start at half, step up as my pay grows',
        effects: (c, age) => {
          const amt = resolveDream(c.dreams.support_parents!, c.profile).amount!;
          return [
            { kind: 'recurring', item: { id: 'parents-support', label: 'Supporting parents (starting amount)', category: 'family', monthly: Math.round(amt / 2), fromAge: age, toAge: age + 3, source: 'give_back' } },
            { kind: 'recurring', item: { id: 'parents-support-later', label: 'Supporting parents', category: 'family', monthly: amt, fromAge: age + 3, source: 'give_back' } },
          ];
        },
        outcome: (c) => `You give ${fmt(resolveDream(c.dreams.support_parents!, c.profile).amount! / 2)} a month for the first 3 years, then the full amount.`,
        reflection: 'Starting smaller and stepping up keeps giving sustainable while your own cushion is still thin.',
      },
      {
        id: 'cushion',
        label: 'Build a 3-month cushion first, start next year',
        effects: (_c, age) => [{ kind: 'shiftRecurring', id: 'parents-support', fromAge: age + 1 }],
        outcome: () => 'You save hard for a year, then start giving with a safety net behind you.',
        reflection: 'A cushion means a surprise bill never forces you to stop helping at home.',
      },
    ],
    learn: {
      title: 'Plan giving like any big goal',
      body: 'Supporting parents may also lower your own income tax once you pay tax: IRAS Parent Relief (conditions apply, such as your parent being 55+ with a low income), and CPF cash top-ups to a parent’s account can qualify for up to $8,000 of relief a year.',
      sourceIds: ['irasParentRelief', 'cpfTopUpRelief'],
    },
  },

  // 13 — Dream: start my own thing
  {
    id: 'launch',
    topic: 'Business',
    title: 'Launch day',
    neutral: () => [{ kind: 'removeRecurring', id: 'business' }],
    applies: (c) => !!c.dreams.business,
    age: (c) => resolveDream(c.dreams.business!, c.profile).age!,
    story: (c, age) => {
      const d = resolveDream(c.dreams.business!, c.profile);
      return `You’re ${age}. ${c.name}, your idea — a small online shop — is ready to go. Doing it properly needs about ${fmt(d.amount!)} for stock, a website and marketing. Friends say they’d buy. How do you start?`;
    },
    choices: [
      {
        id: 'all_in',
        label: 'Go all in: put in the full amount and go full-time',
        effects: (c, age) => [
          { kind: 'oneOff', item: { id: 'business-capital', label: 'Business starting capital', age, amount: resolveDream(c.dreams.business!, c.profile).amount!, source: 'launch' } },
          { kind: 'incomeGap', item: { id: 'business-ramp', age, months: 6, partialFactor: 0.3, label: 'First 6 months of the business', source: 'launch' } },
        ],
        outcome: (c) => `You put in ${fmt(resolveDream(c.dreams.business!, c.profile).amount!)}. For the first 6 months the shop pays you about 30% of what a job would (illustrative).`,
        reflection: 'Most new businesses take time to pay their founder. Your personal buffer decides how long you can keep going.',
      },
      {
        id: 'test',
        label: 'Test it small first, alongside work or school',
        effects: (c, age) => [{ kind: 'oneOff', item: { id: 'business-capital', label: 'Testing the business idea', age, amount: Math.max(500, Math.round(resolveDream(c.dreams.business!, c.profile).amount! / 10 / 100) * 100), source: 'launch' } }],
        outcome: (c) => `You spend about ${fmt(Math.max(500, Math.round(resolveDream(c.dreams.business!, c.profile).amount! / 10 / 100) * 100))} on a small first batch to see if strangers — not just friends — will pay.`,
        reflection: 'Testing with a small amount tells you if there’s real demand before you risk the full amount.',
      },
      {
        id: 'later',
        label: 'Save for two more years, then launch',
        effects: (c, age) => [{ kind: 'oneOff', item: { id: 'business-capital', label: 'Business starting capital', age: age + 2, amount: resolveDream(c.dreams.business!, c.profile).amount!, source: 'launch' } }],
        outcome: () => 'You keep your income for now and launch in two years with a bigger cushion.',
        reflection: 'Waiting costs time, but a bigger buffer gives the business more room to find its feet.',
      },
    ],
    learn: {
      title: 'Know your break-even',
      body: 'Each sale only helps after its own costs are paid. Knowing how many sales cover your fixed costs — and keeping 3–6 months of personal expenses aside — lets you try without risking everything.',
      sourceIds: ['moneysenseEF'],
    },
  },
];

// ---------- Quick-guess questions ----------
// Each asks about something worth thinking about (yearly packages, interest, compounding, totals),
// with answers computed from the same numbers the simulation uses.

function offers(c: ScenarioCtx) {
  const p = c.profile.mainIncome;
  return { a: Math.round((p * 0.9) / 50) * 50, b: p };
}

const nice = (n: number) => {
  const v = Math.abs(n);
  const r = v >= 10000 ? Math.round(v / 1000) * 1000 : v >= 1000 ? Math.round(v / 100) * 100 : Math.round(v / 10) * 10;
  return `~${fmt(r)}`;
};

/** Three options around a value; `pos` sets where the right answer sits so it isn't always in the middle. */
function numQuiz(question: string, value: number, explain: string, pos: 0 | 1 | 2, spread: [number, number] = [0.3, 2.5]): Quiz {
  const vals = [value * spread[0], value, value * spread[1]];
  const labels = vals.map(nice);
  const order = pos === 0 ? [1, 0, 2] : pos === 1 ? [0, 1, 2] : [0, 2, 1];
  return { question, options: order.map((k) => ({ id: `o${k}`, label: labels[k] })), answer: 'o1', explain };
}

/** Extra paid when a balance is cleared in 12 equal monthly payments at ~27% a year (illustrative). */
export function cardExtra(amount: number, apr = 0.27): number {
  const r = apr / 12;
  const pay = (amount * r) / (1 - Math.pow(1 + r, -12));
  return pay * 12 - amount;
}

const QUIZZES: Record<string, (c: ScenarioCtx, age: number) => Quiz> = {
  first_offer: (c) => {
    const o = offers(c);
    return {
      question: 'Which offer pays more over a whole year?',
      options: [
        { id: 'b', label: `Offer B (${fmt(o.b)}/month)` },
        { id: 'a', label: `Offer A (${fmt(o.a)}/month + bonus)` },
        { id: 'same', label: 'About the same' },
      ],
      answer: o.a * 14 > o.b * 12 * 1.02 ? 'a' : o.b * 12 > o.a * 14 * 1.02 ? 'b' : 'same',
      explain: `Offer A: ${fmt(o.a)} × 14 months = ${fmt(o.a * 14)}. Offer B: ${fmt(o.b)} × 12 = ${fmt(o.b * 12)}.`,
    };
  },
  bnpl: () => ({
    question: 'Over 2 years, which way of getting the new phone costs the most?',
    options: [
      { id: 'upfront', label: 'Paying upfront' },
      { id: 'plan', label: 'The “free” phone plan' },
      { id: 'bnpl', label: 'Pay later, on time' },
    ],
    answer: 'plan',
    explain: 'Upfront: $1,200. Pay later on time: $1,200. “Free” phone: about $60 × 24 months = $1,440.',
  }),
  grad_trip: () => numQuiz('If the $2,500 Japan trip goes on a credit card and is paid off over a year at about 27% interest, roughly how much extra do you pay?', cardExtra(2500), `Twelve payments of about ${fmt((2500 + cardExtra(2500)) / 12)} = ${fmt(2500 + cardExtra(2500))} — about ${fmt(cardExtra(2500))} more than the trip itself.`, 1, [0.1, 3]),
  trip: () => numQuiz('If the $2,500 trip goes on a credit card and is paid off over a year at about 27% interest, roughly how much extra do you pay?', cardExtra(2500), `Twelve payments of about ${fmt((2500 + cardExtra(2500)) / 12)} = ${fmt(2500 + cardExtra(2500))} — about ${fmt(cardExtra(2500))} more than the trip itself.`, 2, [0.1, 3]),
  internship: (c, age) => {
    const cpf = monthlyCpf(1200, age, c.basePlan.startYear + (age - c.profile.age));
    const internTotal = 1200 - cpf.employee + cpf.total;
    return {
      question: 'Internship: $1,200 a month as an employee. Freelance: $1,400 a month, no CPF. Counting money that goes into your CPF too, which gives you more each month?',
      options: [
        { id: 'freelance', label: 'Freelance' },
        { id: 'same', label: 'About the same' },
        { id: 'intern', label: 'Internship' },
      ],
      answer: Math.abs(internTotal - 1400) <= 50 ? 'same' : internTotal > 1400 ? 'intern' : 'freelance',
      explain: `Internship: ${fmt(1200 - cpf.employee)} take-home + ${fmt(cpf.total)} into your CPF (yours ${fmt(cpf.employee)} + employer ${fmt(cpf.employer)}) = ${fmt(internTotal)}. Freelance: $1,400, with no CPF.`,
    };
  },
  job_scam: () => ({
    question: 'Which of these is the biggest red flag in a job offer?',
    options: [
      { id: 'friendly', label: 'The recruiter is very friendly' },
      { id: 'deposit', label: 'You must pay a deposit to start' },
      { id: 'remote', label: 'The work is remote' },
    ],
    answer: 'deposit',
    explain: 'Real employers pay you — they never ask you to pay to start work or “unlock” tasks.',
  }),
  scam: () => numQuiz('If “5% a week” were real, what would $500 grow to in one year?', 500 * Math.pow(1.05, 52), `$500 × 1.05 compounded 52 times ≈ ${fmt(500 * Math.pow(1.05, 52))}. No genuine investment does this — that’s the tell.`, 2, [0.15, 0.3]),
  late_client: () => ({
    question: 'What protects a freelancer most from this happening again?',
    options: [
      { id: 'faster', label: 'Working faster' },
      { id: 'cheaper', label: 'Charging less' },
      { id: 'deposit', label: 'A written scope and a deposit upfront' },
    ],
    answer: 'deposit',
    explain: 'A clear written scope and a 30–50% deposit (a common practice) mean you’re never working entirely unpaid.',
  }),
  slow_month: () => ({
    question: 'With irregular income, how many months of expenses does MoneySense suggest keeping as a cushion?',
    options: [
      { id: '3', label: 'About 3 months' },
      { id: '6', label: 'About 6 months' },
      { id: '12', label: 'About 12 months' },
    ],
    answer: '12',
    explain: 'Around 12 months for irregular income, versus 3–6 months when income is steady.',
  }),
  laptop: () => numQuiz('You buy refurbished ($750) instead of new ($1,600) and invest the $850 difference. At an illustrative 4% a year, roughly what is it worth in 10 years?', 850 * Math.pow(1.04, 10), `$850 × 1.04¹⁰ ≈ ${fmt(850 * Math.pow(1.04, 10))} — illustrative, not guaranteed. Small savings grow when they’re left alone.`, 0, [0.75, 2.6]),
  restructure: (c, age) => {
    const proj = projectAll(c.basePlan).baseline;
    const saved = Math.max(0, balancesAtAge(c.basePlan, proj, age).liquid);
    const spend = monthlySnapshot(c.basePlan, age).spend;
    const m = spend > 0 ? saved / spend : 0;
    const label = (x: number) => (x < 1 ? 'Under a month' : `About ${Math.round(x)} month${Math.round(x) === 1 ? '' : 's'}`);
    const vals = m < 1 ? [m, 3, 8] : [Math.max(0.5, m / 3), m, m * 3];
    const right = m < 1 ? 0 : 1;
    const opts = vals.map((v, k) => ({ id: `o${k}`, label: label(v) }));
    return {
      question: `With no salary, how long could your savings at ${age} cover your monthly costs?`,
      options: [opts[1], opts[0], opts[2]],
      answer: `o${right}`,
      explain: `About ${fmt(saved)} in savings ÷ about ${fmt(spend)} of monthly costs ≈ ${m < 1 ? 'less than a month' : `${m.toFixed(1)} months`}. MoneySense suggests 3–6 months.`,
    };
  },
  insurance: () => numQuiz('$250 a month in premiums for 25 years adds up to roughly…?', 250 * 12 * 25, '$250 × 12 months × 25 years = $75,000 — a big commitment to be sure about.', 2, [0.1, 0.4]),
  family_help: () => ({
    question: 'Besides cash, which of these can help pay a parent’s approved medical bills?',
    options: [
      { id: 'oa', label: 'Your CPF Ordinary Account' },
      { id: 'ma', label: 'Your MediSave' },
      { id: 'none', label: 'Nothing else' },
    ],
    answer: 'ma',
    explain: 'MediSave can be used for approved medical bills of family members, subject to CPF rules. MediFund also helps lower-income patients.',
  }),
  downturn: () => ({
    question: 'If your investments fall 20%, how much do they need to rise to get back to where they were?',
    options: [
      { id: '20', label: '20%' },
      { id: '25', label: '25%' },
      { id: '40', label: '40%' },
    ],
    answer: '25',
    explain: '$100 falls to $80. Getting back to $100 needs +$20, which is 25% of $80.',
  }),
  move_out: (c, age) => {
    const rent = rentOf(c) + COST_DEFAULTS.utilitiesWhenRenting;
    let total = 0;
    for (let k = 0; k < 3; k++) total += rent * 12 * Math.pow(1.02, k);
    return numQuiz(`Rent and utilities of about ${fmt(rent)} a month from ${age}. Roughly how much is that over 3 years?`, total, `${fmt(rent)} × 36 months, rising about 2% a year ≈ ${fmt(total)}. Recurring costs add up fast.`, 0, [0.33, 2]);
  },
  pet: (c) => {
    const d = resolveDream(c.dreams.pet ?? { id: 'pet' }, c.profile);
    const cat = d.variant === 'cat';
    const monthly = cat ? COST_DEFAULTS.catMonthly : COST_DEFAULTS.dogMonthly;
    let total = cat ? COST_DEFAULTS.catSetup : COST_DEFAULTS.dogSetup;
    for (let k = 0; k < 13; k++) total += monthly * 12 * Math.pow(1.02, k);
    return numQuiz(`A ${cat ? 'cat' : 'dog'} at about ${fmt(monthly)} a month. Over about 13 years, roughly what does it cost in total?`, total, `Setup plus ${fmt(monthly)} a month for 13 years, rising with prices ≈ ${fmt(total)}.`, 1, [0.2, 3]);
  },
  career_break: () => ({
    question: 'During a career break with no salary, what else stops?',
    options: [
      { id: 'cpf', label: 'Your CPF contributions' },
      { id: 'tax', label: 'Your income tax for past years' },
      { id: 'nothing', label: 'Nothing else' },
    ],
    answer: 'cpf',
    explain: 'No salary means no employee or employer CPF contributions for those months — your retirement and housing savings pause too.',
  }),
  give_back: () => ({
    question: 'Your parents are 55+, earn very little, and live in their own flat. You give them $200 a month in cash. Can that lower your own income tax?',
    options: [
      { id: 'no', label: 'No — only CPF top-ups count' },
      { id: 'together', label: 'Only if they live with you' },
      { id: 'yes', label: 'Yes — through Parent Relief' },
    ],
    answer: 'yes',
    explain: '$200 × 12 = $2,400 a year, above the $2,000 of support IRAS asks for when a parent lives elsewhere — so you may claim Parent Relief ($5,500 per parent; $9,000 if they live with you). CPF cash top-ups to their account can add up to $8,000 more. Conditions apply, and relief only helps once you pay tax.',
  }),
  launch: () => ({
    question: 'You sell each item for $30. Making and delivering it costs $18, and the platform and booth cost $600 a month. How many must you sell each month just to break even?',
    options: [
      { id: '20', label: '20' },
      { id: '33', label: '33' },
      { id: '50', label: '50' },
    ],
    answer: '50',
    explain: 'Each sale leaves only $30 − $18 = $12 towards fixed costs. $600 ÷ $12 = 50. Dividing by the price ($600 ÷ $30 = 20) is the common trap. Figures are illustrative.',
  }),
};

for (const s of LIFE_SCENARIOS) s.quiz = QUIZZES[s.id];

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
  // Dream-linked chapters follow the user's own timing; everything else is matched to their current life stage.
  const stage = lifeStage(ctx.profile);
  const dreamLinked = ['move_out', 'pet', 'career_break', 'give_back', 'launch'];
  const priority = ['first_offer', 'slow_month', 'move_out', 'give_back', 'launch', 'pet', 'career_break', 'restructure', 'late_client', 'laptop', 'grad_trip', 'bnpl', 'downturn', 'family_help', 'internship', 'job_scam', 'trip', 'insurance', 'scam'];
  const chosen: LifeScenario[] = [];
  let unexpected = false;
  for (const id of priority) {
    const s = byId(id);
    if (!s.applies(ctx)) continue;
    if (s.stages && !s.stages.includes(stage) && !dreamLinked.includes(id)) continue;
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
