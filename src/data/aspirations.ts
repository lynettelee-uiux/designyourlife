import type { AspirationId } from '../engine/profile';

export interface ParamSpec {
  key: 'age' | 'amount' | 'months' | 'count' | 'variant';
  label: string;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  options?: { value: string; label: string }[];
  help?: string;
}

export interface AspirationDef {
  id: AspirationId;
  title: string;
  blurb: string;
  icon: string;
  tint: string;
  params: ParamSpec[];
  /** Short phrase used in the Future Vision summary. */
  vision: (p: { age?: number; amount?: number; months?: number; count?: number; variant?: string }) => string;
}

export const ASPIRATIONS: AspirationDef[] = [
  {
    id: 'travel',
    title: 'Travel often',
    blurb: 'New places, every year',
    icon: 'Plane',
    tint: 'bg-navy-50',
    params: [
      { key: 'count', label: 'Trips a year', min: 0, max: 6, step: 1 },
      { key: 'age', label: 'Starting from age', min: 18, max: 40, step: 1 },
      { key: 'amount', label: 'Budget per trip', min: 300, max: 8000, step: 100, prefix: '$', help: 'A regional trip might be ~$1,500; long-haul more like $4,000+' },
    ],
    vision: (p) => `${p.count} trip${p.count === 1 ? '' : 's'} a year from ${p.age}`,
  },
  {
    id: 'live_independently',
    title: 'Live on my own',
    blurb: 'Rent a room or a place',
    icon: 'KeyRound',
    tint: 'bg-magenta-50',
    params: [
      { key: 'age', label: 'Move out at age', min: 18, max: 40, step: 1 },
      { key: 'amount', label: 'Monthly rent', min: 500, max: 3500, step: 50, prefix: '$', help: 'HDB common rooms were roughly $800–$1,600 in 2026 listings' },
    ],
    vision: (p) => `living independently from ${p.age}`,
  },
  {
    id: 'pet',
    title: 'Have a pet',
    blurb: 'A furry flatmate',
    icon: 'PawPrint',
    tint: 'bg-navy-50',
    params: [
      { key: 'variant', label: 'Which?', options: [{ value: 'dog', label: 'Dog' }, { value: 'cat', label: 'Cat' }] },
      { key: 'age', label: 'Adopt at age', min: 18, max: 45, step: 1 },
    ],
    vision: (p) => `a ${p.variant === 'cat' ? 'cat' : 'dog'} from ${p.age}`,
  },
  {
    id: 'career_break',
    title: 'Take a career break',
    blurb: 'Rest, travel, learn, reset',
    icon: 'PauseCircle',
    tint: 'bg-magenta-50',
    params: [
      { key: 'age', label: 'At age', min: 20, max: 50, step: 1 },
      { key: 'months', label: 'For how long', min: 1, max: 24, step: 1, suffix: ' months' },
    ],
    vision: (p) => `a ${p.months}-month break at ${p.age}`,
  },
  {
    id: 'own_home',
    title: 'Own a home',
    blurb: 'A place that’s yours',
    icon: 'Home',
    tint: 'bg-navy-50',
    params: [
      { key: 'age', label: 'By age', min: 21, max: 50, step: 1, help: 'Singles can generally buy HDB flats from 35; couples earlier under specific schemes' },
      { key: 'amount', label: 'Upfront fund to build (today’s $)', min: 5000, max: 200000, step: 5000, prefix: '$', help: 'A placeholder for down payment and fees — CPF OA can usually help' },
    ],
    vision: (p) => `a home of my own by ${p.age}`,
  },
  {
    id: 'retire_early',
    title: 'Retire early',
    blurb: 'Work becomes optional',
    icon: 'Sunset',
    tint: 'bg-magenta-50',
    params: [
      { key: 'age', label: 'Stop working at', min: 35, max: 70, step: 1 },
      {
        key: 'amount',
        label: 'Monthly lifestyle in today’s dollars',
        min: 1000,
        max: 8000,
        step: 100,
        prefix: '$',
        help: '“Today’s dollars” means: what this amount buys now. Prices rise over time, so the future amount will be larger.',
      },
    ],
    vision: (p) => `retiring at ${p.age} on ${p.amount ? `$${p.amount.toLocaleString()}` : ''} a month (today’s $)`,
  },
  {
    id: 'support_parents',
    title: 'Give back to my parents',
    blurb: 'A regular amount at home',
    icon: 'HeartHandshake',
    tint: 'bg-navy-50',
    params: [
      { key: 'amount', label: 'Monthly support (in total)', min: 50, max: 2000, step: 50, prefix: '$' },
      { key: 'age', label: 'From age', min: 18, max: 45, step: 1 },
    ],
    vision: (p) => `giving my parents $${p.amount}/month`,
  },
  {
    id: 'business',
    title: 'Start my own thing',
    blurb: 'A side hustle or business',
    icon: 'Rocket',
    tint: 'bg-magenta-50',
    params: [
      { key: 'age', label: 'Launch at age', min: 20, max: 50, step: 1 },
      { key: 'amount', label: 'Starting capital (today’s $)', min: 1000, max: 100000, step: 1000, prefix: '$' },
    ],
    vision: (p) => `launching my own business at ${p.age}`,
  },
  {
    id: 'creative_career',
    title: 'Creative career',
    blurb: 'Make things for a living',
    icon: 'Palette',
    tint: 'bg-navy-50',
    params: [{ key: 'age', label: 'Go creative from age', min: 18, max: 45, step: 1 }],
    vision: (p) => `a creative career from ${p.age}`,
  },
  {
    id: 'start_family',
    title: 'Start a family',
    blurb: 'If and when it feels right',
    icon: 'Baby',
    tint: 'bg-magenta-50',
    params: [
      { key: 'age', label: 'Around age', min: 22, max: 45, step: 1 },
      { key: 'amount', label: 'Monthly cost (illustrative)', min: 300, max: 3000, step: 100, prefix: '$' },
    ],
    vision: (p) => `starting a family around ${p.age}`,
  },
  {
    id: 'free_time',
    title: 'More free time',
    blurb: 'A four-day week',
    icon: 'Clock',
    tint: 'bg-navy-50',
    params: [{ key: 'age', label: 'From age', min: 21, max: 50, step: 1 }],
    vision: (p) => `a four-day week from ${p.age}`,
  },
  {
    id: 'financial_security',
    title: 'Feel financially secure',
    blurb: 'A cushion for surprises',
    icon: 'ShieldCheck',
    tint: 'bg-magenta-50',
    params: [{ key: 'months', label: 'Months of expenses saved', min: 1, max: 12, step: 1, suffix: ' months' }],
    vision: (p) => `${p.months} months of savings as a cushion`,
  },
];

export const aspirationById = (id: AspirationId) => ASPIRATIONS.find((a) => a.id === id)!;
