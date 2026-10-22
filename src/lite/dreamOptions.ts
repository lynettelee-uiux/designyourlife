// One-tap choices for each Lite dream: mostly "when", plus "how big" where it changes the answer.
// Selecting a dream starts from the first highlighted defaults, so nothing is hidden.

import type { AspirationId, DreamSelection, LifeStage } from '../engine/profile';

export interface DreamOptionRow {
  key: 'age' | 'months' | 'count' | 'amount' | 'variant';
  label: string;
  options: { value: number | string; label: string }[];
}

export interface DreamOptions {
  defaults: Partial<DreamSelection>;
  rows: DreamOptionRow[];
}

const uniq = (xs: number[]) => [...new Set(xs)].sort((a, b) => a - b);

export function dreamOptions(id: AspirationId, age: number, stage: LifeStage): DreamOptions {
  const ages = (candidates: number[], min: number, max = 64) => uniq(candidates.filter((x) => x >= min && x <= max)).slice(0, 4);
  const ageRow = (label: string, xs: number[]): DreamOptionRow => ({ key: 'age', label, options: xs.map((x) => ({ value: x, label: `${x}` })) });
  const soon = (label: string): DreamOptionRow => ({ key: 'age', label, options: [{ value: age, label: 'Now' }, { value: age + 2, label: 'In 2 years' }, { value: age + 5, label: 'In 5 years' }] });
  const pick = (xs: number[], preferred: number) => (xs.includes(preferred) ? preferred : xs[Math.min(1, xs.length - 1)]);

  switch (id) {
    case 'travel': {
      const budget = stage === 'student' || stage === 'ns';
      return {
        defaults: { count: 2, amount: budget ? 600 : 1500, age },
        rows: [
          { key: 'count', label: 'Trips a year', options: [1, 2, 3].map((n) => ({ value: n, label: `${n}` })) },
          { key: 'amount', label: 'Style', options: [{ value: 600, label: 'Budget ~$600' }, { value: 1500, label: 'Regional ~$1.5k' }, { value: 4000, label: 'Long-haul ~$4k' }] },
        ],
      };
    }
    case 'live_independently':
      return {
        defaults: { age: age + 2, amount: 1100 },
        rows: [soon('Move out'), { key: 'amount', label: 'Rent', options: [{ value: 900, label: 'Room ~$900' }, { value: 1100, label: 'Room ~$1.1k' }, { value: 2000, label: 'Studio share ~$2k' }] }],
      };
    case 'pet':
      return {
        defaults: { age: age + 2, variant: 'dog' },
        rows: [soon('Adopt'), { key: 'variant', label: 'Which?', options: [{ value: 'dog', label: 'Dog' }, { value: 'cat', label: 'Cat' }] }],
      };
    case 'career_break': {
      const xs = ages([age + 3, 30, 35, 40], age + 2);
      return {
        defaults: { age: pick(xs, 30), months: 6 },
        rows: [ageRow('At age', xs), { key: 'months', label: 'For', options: [3, 6, 12].map((m) => ({ value: m, label: `${m} months` })) }],
      };
    }
    case 'own_home': {
      const xs = ages([age + 4, 30, 35, 40], age + 2);
      return { defaults: { age: pick(xs, 35), amount: 30000 }, rows: [ageRow('By age', xs)] };
    }
    case 'retire_early': {
      const xs = ages([45, 50, 55, 60], age + 15);
      return {
        defaults: { age: pick(xs, 55), amount: 3000 },
        rows: [ageRow('Stop working at', xs), { key: 'amount', label: 'Lifestyle (today’s $)', options: [{ value: 1800, label: 'Simple $1.8k' }, { value: 3000, label: 'Comfy $3k' }, { value: 6000, label: 'Lavish $6k' }] }],
      };
    }
    default:
      return { defaults: {}, rows: [] };
  }
}
