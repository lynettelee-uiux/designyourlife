// Game rules for Design Your Life (Sprint): a 60-second round, 5 hearts a day, levels earned by
// points, difficulty that adapts within a round, questions matched to life stage (or one chosen
// topic), and a diagnosis of weak money skills.
// Pure functions only, so the rules are testable; the UI owns timers and storage.

import { GROUPS, groupById, type Area, type GroupId, type Player, type Relevance, type Stage } from './areas';
import type { Question, Tier } from './questions';

export const MAX_HEARTS = 5;
export const SPRINT_SECONDS = 60;
const KEY = 'dyl-sprint-v1';

export const LEVELS = [
  { name: 'Rookie', xp: 0 },
  { name: 'Saver', xp: 100 },
  { name: 'Planner', xp: 250 },
  { name: 'Strategist', xp: 500 },
  { name: 'Money Pro', xp: 900 },
] as const;

export interface AreaStat {
  right: number;
  seen: number;
}

/** Everything kept between visits (in this browser only). */
export interface Progress {
  xp: number;
  /** Most correct answers in one timed sprint. */
  best: number;
  stats: Partial<Record<Area, AreaStat>>;
  /** Age and situation, asked once and editable. */
  player?: Player;
  /** Questions answered wrongly and not yet put right — they come back in later sprints. */
  mistakes?: string[];
  /** Local date (YYYY-MM-DD) the hearts belong to. */
  day: string;
  hearts: number;
}

export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const newProgress = (now = new Date()): Progress => ({ xp: 0, best: 0, stats: {}, day: localDay(now), hearts: MAX_HEARTS });

/** Hearts refill to 5 on a new day; everything else carries over. */
export function forToday(p: Progress, now = new Date()): Progress {
  return p.day === localDay(now) ? p : { ...p, day: localDay(now), hearts: MAX_HEARTS };
}

export function loadProgress(now = new Date()): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Progress;
      if (typeof p.xp === 'number' && typeof p.hearts === 'number') {
        const player = p.player && typeof p.player.age === 'number' && typeof p.player.situation === 'string' ? p.player : undefined;
        const mistakes = Array.isArray(p.mistakes) ? p.mistakes.filter((x) => typeof x === 'string') : [];
        return forToday({ ...newProgress(now), ...p, player, mistakes }, now);
      }
    }
  } catch {
    /* storage unavailable — play without saving */
  }
  return newProgress(now);
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** Position along the whole Rookie → Money Pro track (0–1), for a bar with all five levels on it. */
export function trackPosition(xp: number) {
  const lv = levelOf(xp);
  return Math.min(1, (lv.index + (lv.next ? lv.progress : 0)) / (LEVELS.length - 1));
}

export function levelOf(xp: number) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) index = i;
  const next = LEVELS[index + 1];
  const progress = next ? (xp - LEVELS[index].xp) / (next.xp - LEVELS[index].xp) : 1;
  return { index, name: LEVELS[index].name, next, progress };
}

/** Harder questions are worth more (10 / 20 / 30 / 40); a streak of 3+ adds a bonus. */
export const pointsFor = (tier: Tier, streak: number) => tier * 10 + (streak >= 3 ? 5 : 0);

/** Duolingo-style unlocks: Hard opens at Saver, Expert at Strategist. */
export const maxTier = (levelIndex: number): Tier => (levelIndex >= 3 ? 4 : levelIndex >= 1 ? 3 : 2);
/** Which level unlocks a tier. */
export const UNLOCK_AT: Record<Tier, number> = { 1: 0, 2: 0, 3: 1, 4: 3 };

/** Where a round starts: higher levels start on harder questions. */
export const startTier = (levelIndex: number): Tier => (levelIndex >= 4 ? 3 : levelIndex >= 2 ? 2 : 1);

/** Two right in a row moves you up a tier (up to what you've unlocked); a wrong answer moves you down one. */
export function nextTier(tier: Tier, right: boolean, streak: number, cap: Tier = 4): Tier {
  if (!right) return Math.max(1, tier - 1) as Tier;
  if (streak > 0 && streak % 2 === 0) return Math.min(cap, tier + 1) as Tier;
  return tier;
}

/** What a round draws from: everything relevant to your stage (weighted), or one key area. */
export type Focus = ({ kind: 'mixed'; stage: Stage; weights: Record<Area, Relevance> } | { kind: 'topic'; group: GroupId }) & {
  /** Highest tier unlocked at the player's level. */
  maxTier?: Tier;
};

export function questionsFor(bank: Question[], focus: Focus): Question[] {
  const unlocked = bank.filter((q) => q.tier <= (focus.maxTier ?? 4));
  if (focus.kind === 'topic') {
    const areas = groupById(focus.group).areas as Area[];
    return unlocked.filter((q) => areas.includes(q.area));
  }
  return unlocked.filter((q) => focus.weights[q.area] > 0 && (!q.stages || q.stages.includes(focus.stage)));
}

/**
 * Picks the next question, never repeating within a round. First the skill: in mixed rounds, core
 * skills for your stage come up about twice as often as "good to know" ones, and skills are spread
 * out so the diagnosis covers as many as possible. Then the question nearest the current tier.
 */
export function pickQuestion(bank: Question[], tier: Tier, asked: Set<string>, roundAreas: Partial<Record<Area, number>>, focus: Focus, rand = Math.random): Question | undefined {
  const fresh = questionsFor(bank, focus).filter((q) => !asked.has(q.id));
  if (fresh.length === 0) return undefined;
  // +1 so core skills lead from the very first question, rather than every skill getting one turn first.
  const load = (a: Area) => ((roundAreas[a] ?? 0) + 1) / (focus.kind === 'mixed' ? focus.weights[a] : 1);
  const areas = [...new Set(fresh.map((q) => q.area))];
  const least = Math.min(...areas.map(load));
  const tied = areas.filter((a) => load(a) === least);
  const area = tied[Math.floor(rand() * tied.length)];
  const inArea = fresh.filter((q) => q.area === area);
  const nearest = [0, 1, 2, 3].map((d) => inArea.filter((q) => Math.abs(q.tier - tier) === d)).find((xs) => xs.length > 0)!;
  return nearest[Math.floor(rand() * nearest.length)];
}

export interface Answer {
  question: Question;
  chosen: number | null; // null = ran out of time
  right: boolean;
}

export function addStats(stats: Progress['stats'], answers: Answer[]): Progress['stats'] {
  const out: Progress['stats'] = { ...stats };
  for (const a of answers) {
    const s = out[a.question.area] ?? { right: 0, seen: 0 };
    out[a.question.area] = { right: s.right + (a.right ? 1 : 0), seen: s.seen + 1 };
  }
  return out;
}

export interface AreaResult {
  area: Area;
  right: number;
  seen: number;
  share: number;
}

/**
 * Weak areas: anything answered wrongly, lowest accuracy first (more mistakes break ties).
 * Strong areas: at least 2 answered and 80%+ right.
 */
export function diagnose(stats: Progress['stats']) {
  const rows: AreaResult[] = (Object.entries(stats) as [Area, AreaStat][])
    .filter(([, s]) => s.seen > 0)
    .map(([area, s]) => ({ area, right: s.right, seen: s.seen, share: s.right / s.seen }));
  const weak = rows.filter((r) => r.right < r.seen).sort((a, b) => a.share - b.share || b.seen - b.right - (a.seen - a.right));
  const strong = rows.filter((r) => r.seen >= 2 && r.share >= 0.8).sort((a, b) => b.share - a.share || b.seen - a.seen);
  return { rows: rows.sort((a, b) => a.share - b.share), weak, strong };
}

/** Share right per key area (undefined if not tried yet). */
export function groupScores(stats: Progress['stats']): Record<GroupId, { right: number; seen: number; share?: number }> {
  return Object.fromEntries(
    GROUPS.map((g) => {
      const right = g.areas.reduce((x, a) => x + (stats[a]?.right ?? 0), 0);
      const seen = g.areas.reduce((x, a) => x + (stats[a]?.seen ?? 0), 0);
      return [g.id, { right, seen, share: seen ? right / seen : undefined }];
    }),
  ) as Record<GroupId, { right: number; seen: number; share?: number }>;
}

// ---------- Mistakes come back (Duolingo-style) ----------

/** A question missed in this round is asked again after this many others. */
export const RETRY_GAP = 3;
const MAX_MISTAKES = 30;

/** Wrong answers join the list; putting one right takes it off. Most recent last. */
export function updateMistakes(prev: string[] = [], answers: Answer[]): string[] {
  let out = [...prev];
  for (const a of answers) {
    out = out.filter((id) => id !== a.question.id);
    if (!a.right) out.push(a.question.id);
  }
  return out.slice(-MAX_MISTAKES);
}

/**
 * What to ask next: a question missed earlier in this round once it's due; otherwise, on every
 * other turn, one missed in a past round (if it fits this round's focus); otherwise a fresh pick.
 */
export function nextQuestion(
  bank: Question[],
  o: { tier: Tier; asked: Set<string>; roundAreas: Partial<Record<Area, number>>; focus: Focus; answers: Answer[]; retries: { id: string; due: number }[]; past: string[] },
  rand = Math.random,
): { question?: Question; retry: boolean } {
  const byId = (id: string) => bank.find((q) => q.id === id);
  const due = o.retries.find((r) => r.due <= o.answers.length);
  if (due) return { question: byId(due.id), retry: true };
  const inFocus = new Set(questionsFor(bank, o.focus).map((q) => q.id));
  const past = o.past.find((id) => inFocus.has(id) && !o.asked.has(id));
  if (past && o.answers.length % 2 === 1) return { question: byId(past), retry: true };
  const fresh = pickQuestion(bank, o.tier, o.asked, o.roundAreas, o.focus, rand);
  if (fresh) return { question: fresh, retry: false };
  // Nothing new left: finish any retries still waiting.
  const waiting = o.retries[0];
  return waiting ? { question: byId(waiting.id), retry: true } : { retry: false };
}

// ---------- Catch up ----------

/** Key areas where you're furthest below players your age; core areas for your stage first. */
export function catchUp(you: Record<GroupId, { seen: number; share?: number }>, peers: Record<GroupId, number>, rel: Record<GroupId, Relevance>, n = 2): GroupId[] {
  return GROUPS.filter((g) => you[g.id].seen > 0 && (you[g.id].share ?? 0) < peers[g.id])
    .sort((a, b) => rel[b.id] - rel[a.id] || peers[b.id] - (you[b.id].share ?? 0) - (peers[a.id] - (you[a.id].share ?? 0)))
    .slice(0, n)
    .map((g) => g.id);
}

// ---------- Shuffled answers ----------

/** A copy of the question with its options in random order (the answer index follows), so the right answer isn't always B. */
export function shuffled(q: Question, rand = Math.random): Question {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
}
