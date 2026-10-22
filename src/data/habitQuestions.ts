import type { Habits } from '../engine/profile';

export interface HabitOption {
  id: string;
  label: string;
  /** What this choice tells us — shown back to the user as an editable assumption, never as a label of the person. */
  signal: string;
  set: Partial<Habits>;
}

export interface HabitQuestion {
  id: keyof Habits;
  topic: string;
  prompt: string;
  options: HabitOption[];
}

export const HABIT_QUESTIONS: HabitQuestion[] = [
  {
    id: 'social',
    topic: 'Social spending',
    prompt: 'Your friends invite you to a $90 dinner, but you’ve already spent more than planned this month. What do you do?',
    options: [
      { id: 'go', label: 'Go — these moments matter', signal: 'Social plans are a priority', set: { social: 'high' } },
      { id: 'cheaper', label: 'Suggest somewhere cheaper', signal: 'You look for middle ground', set: { social: 'medium' } },
      { id: 'dessert', label: 'Join for dessert only', signal: 'You keep in touch while trimming costs', set: { social: 'medium' } },
      { id: 'skip', label: 'Sit this one out', signal: 'You protect your monthly budget', set: { social: 'low' } },
    ],
  },
  {
    id: 'surprise',
    topic: 'Surprises',
    prompt: 'A $500 bill you didn’t expect lands tomorrow. How would you pay it?',
    options: [
      { id: 'savings', label: 'From my savings', signal: 'You have a cushion for surprises', set: { surprise: 'savings' } },
      { id: 'family', label: 'Ask family to help', signal: 'Family is your safety net for now', set: { surprise: 'family' } },
      { id: 'card', label: 'Credit card', signal: 'You’d lean on credit for surprises', set: { surprise: 'card' } },
      { id: 'bnpl', label: 'Pay later / instalments', signal: 'You’d spread surprise costs over time', set: { surprise: 'bnpl' } },
    ],
  },
  {
    id: 'windfall',
    topic: 'Unexpected money',
    prompt: 'You receive a $1,000 bonus. How would you use it?',
    options: [
      { id: 'save', label: 'Put it all in savings', signal: 'Building a safety net comes first', set: { windfall: 'save' } },
      { id: 'split', label: 'Split: some fun, some saved', signal: 'You balance today and tomorrow', set: { windfall: 'split' } },
      { id: 'invest', label: 'Invest most of it', signal: 'You’re keen to grow money over time', set: { windfall: 'invest' } },
      { id: 'treat', label: 'Treat myself (or family)', signal: 'Enjoying or sharing it now matters', set: { windfall: 'treat' } },
    ],
  },
  {
    id: 'independence',
    topic: 'Independence',
    prompt: 'You’d like more space of your own. Would you rent sooner or save longer?',
    options: [
      { id: 'soon', label: 'Rent sooner — independence matters', signal: 'Living on your own is a near-term priority', set: { independence: 'soon' } },
      { id: 'later', label: 'Save first, move later', signal: 'You’d trade time at home for a bigger buffer', set: { independence: 'later' } },
      { id: 'stay', label: 'I’m happy where I am', signal: 'Moving out isn’t a priority right now', set: { independence: 'stay' } },
    ],
  },
  {
    id: 'risk',
    topic: 'Ups and downs',
    prompt: 'Your investments drop 20% in a market downturn. How do you feel — and what do you do?',
    options: [
      { id: 'sell', label: 'Uneasy — I’d rather sell and stop the fall', signal: 'Steady values matter more than higher potential returns', set: { risk: 'cautious' } },
      { id: 'hold', label: 'Nervous, but I’d wait it out', signal: 'You can live with some swings', set: { risk: 'balanced' } },
      { id: 'buy', label: 'Calm — I might even add more', signal: 'You’re comfortable with bigger swings', set: { risk: 'adventurous' } },
    ],
  },
  {
    id: 'family',
    topic: 'Family',
    prompt: 'A family member needs financial help for a while. How do you balance it with your own commitments?',
    options: [
      { id: 'generous', label: 'Help as much as I can', signal: 'Family support is a top priority', set: { family: 'generous' } },
      { id: 'balanced', label: 'Help with a set amount I can sustain', signal: 'You support family within a plan', set: { family: 'balanced' } },
      { id: 'boundaries', label: 'Help in other ways — time, finding schemes', signal: 'You support family beyond money', set: { family: 'boundaries' } },
    ],
  },
  {
    id: 'tracking',
    topic: 'Tracking',
    prompt: 'Do you know roughly where last month’s money went?',
    options: [
      { id: 'yes', label: 'Yes — I track it', signal: 'You know where your money goes', set: { tracking: 'yes' } },
      { id: 'roughly', label: 'Roughly', signal: 'You have a rough sense of your spending', set: { tracking: 'roughly' } },
      { id: 'no', label: 'Honestly, no idea', signal: 'Your spending is a bit of a mystery right now', set: { tracking: 'no' } },
    ],
  },
];
