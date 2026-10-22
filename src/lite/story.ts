// Personal, shareable copy for the Future Card: a quote built from the person's own dreams and
// outcome, plus strengths drawn from what happened in their version. Deliberately no personality
// labels — it describes choices and results, not who someone is.

import type { GoalResult } from '../engine/goals';
import type { AspirationId, LifeStatus, Living } from '../engine/profile';

const PHRASE: Record<AspirationId, string> = {
  travel: 'seeing the world',
  live_independently: 'a place of my own',
  pet: 'a furry flatmate',
  career_break: 'time to breathe',
  own_home: 'a home that’s mine',
  retire_early: 'work becoming optional',
  support_parents: 'looking after my family',
  business: 'building my own thing',
  creative_career: 'making things for a living',
  start_family: 'a family of my own',
  free_time: 'more time for life',
  financial_security: 'a cushion for surprises',
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function listPhrases(ids: AspirationId[]): string {
  const p = ids.map((id) => PHRASE[id]);
  if (p.length <= 1) return p[0] ?? 'a future of my own';
  if (p.length === 2) return `${p[0]} and ${p[1]}`;
  return `${p.slice(0, -1).join(', ')} and ${p[p.length - 1]}`;
}

/** A short first-person quote for the card. Deterministic for the same inputs. */
export function futureQuote(goals: GoalResult[]): string {
  const ids = goals.map((g) => g.id);
  const near = goals.filter((g) => g.status === 'on_track').length;
  const dreams = cap(listPhrases(ids));
  if (goals.length === 0) return 'My future isn’t decided — I’m trying a few versions.';
  if (near === goals.length) return `${dreams} — closer than I thought.`;
  if (near === 0) return `${dreams}. Further away for now — not forever.`;
  return `${dreams} — and a plan to get there.`;
}

export interface StrengthInputs {
  goals: GoalResult[];
  status: LifeStatus;
  living: Living;
  moments: { scenario: string; choice?: string }[];
  investMonthly: number;
  dreamTitle: (id: AspirationId) => string;
}

const CHOICE_STRENGTH: Record<string, string> = {
  'trip:save_first': 'You save up before you spend',
  'trip:cheaper': 'You find a version that fits your budget',
  'trip:skip': 'You can say no to protect your plans',
  'scam:report': 'You spot red flags',
  'scam:ask': 'You get a second opinion before acting',
  'pet:foster': 'You test big commitments before signing up',
  'move_out:later': 'You time big commitments well',
  'move_out:stay': 'You keep fixed costs low',
  'career_break:shorter': 'You plan breaks around your buffer',
  'career_break:postpone': 'You build the cushion before the leap',
  'restructure:quick': 'You bounce back fast when work changes',
  'restructure:search': 'You protect your options when work changes',
  'restructure:freelance': 'You’re resourceful when plans change',
  'laptop:new': 'You can absorb a surprise bill',
  'laptop:refurb': 'You look for smart alternatives',
  'laptop:instalments': 'You plan around big costs',
  'slow_month:buffer': 'Your savings carry you through quiet months',
  'slow_month:hustle': 'You adapt when income dips',
};

/** Up to three strengths, most specific first. Always at least one. */
export function strengths(i: StrengthInputs): string[] {
  const out: string[] = [];
  const near = i.goals.filter((g) => g.status === 'on_track');
  if (near.length) out.push(`${near.map((g) => i.dreamTitle(g.id)).join(' and ')} ${near.length === 1 ? 'is' : 'are'} within reach`);
  for (const m of i.moments) {
    const s = m.choice ? CHOICE_STRENGTH[`${m.scenario}:${m.choice}`] : undefined;
    if (s && !out.includes(s)) out.push(s);
  }
  if (i.living === 'family') out.push('Low housing costs give you room to save');
  if (i.investMonthly > 0) out.push('You’re starting early — time is your biggest advantage');
  if (i.status === 'employed') out.push('A steady income, with CPF building in the background');
  if (['uni_student', 'poly_student', 'nsf'].includes(i.status)) out.push('You’re planning before your first full-time pay — most people don’t');
  if (out.length === 0) out.push('You’re thinking about your future early — most people don’t');
  return out.slice(0, 3);
}
