// Game rules for Design Your Life (Sprint): a 60-second round, 5 hearts a day, levels earned by
// points, difficulty that adapts within a round, and a diagnosis of weak money skills.
// Pure functions only, so the rules are testable; the UI owns timers and storage.

import type { SkillId } from '../lite/literacy';
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
  stats: Partial<Record<SkillId, AreaStat>>;
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
      if (typeof p.xp === 'number' && typeof p.hearts === 'number') return forToday({ ...newProgress(now), ...p }, now);
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

export function levelOf(xp: number) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) index = i;
  const next = LEVELS[index + 1];
  const progress = next ? (xp - LEVELS[index].xp) / (next.xp - LEVELS[index].xp) : 1;
  return { index, name: LEVELS[index].name, next, progress };
}

/** Harder questions are worth more; a streak of 3+ adds a bonus. */
export const pointsFor = (tier: Tier, streak: number) => tier * 10 + (streak >= 3 ? 5 : 0);

/** Where a round starts: higher levels start on harder questions. */
export const startTier = (levelIndex: number): Tier => (levelIndex >= 4 ? 3 : levelIndex >= 2 ? 2 : 1);

/** Two right in a row moves you up a tier; a wrong answer moves you down one. */
export function nextTier(tier: Tier, right: boolean, streak: number): Tier {
  if (!right) return Math.max(1, tier - 1) as Tier;
  if (streak > 0 && streak % 2 === 0) return Math.min(3, tier + 1) as Tier;
  return tier;
}

/**
 * Picks the next question at (or nearest to) the tier, never repeating within a round.
 * It favours skills seen least in this round, so the diagnosis covers as many areas as possible.
 */
export function pickQuestion(bank: Question[], tier: Tier, asked: Set<string>, roundAreas: Partial<Record<SkillId, number>>, rand = Math.random): Question | undefined {
  const fresh = bank.filter((q) => !asked.has(q.id));
  if (fresh.length === 0) return undefined;
  const byDistance = [0, 1, 2].map((d) => fresh.filter((q) => Math.abs(q.tier - tier) === d)).find((xs) => xs.length > 0)!;
  const least = Math.min(...byDistance.map((q) => roundAreas[q.area] ?? 0));
  const pool = byDistance.filter((q) => (roundAreas[q.area] ?? 0) === least);
  return pool[Math.floor(rand() * pool.length)];
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
  area: SkillId;
  right: number;
  seen: number;
  share: number;
}

/**
 * Weak areas: anything answered wrongly, lowest accuracy first (more mistakes break ties).
 * Strong areas: at least 2 answered and 80%+ right.
 */
export function diagnose(stats: Progress['stats']) {
  const rows: AreaResult[] = (Object.entries(stats) as [SkillId, AreaStat][])
    .filter(([, s]) => s.seen > 0)
    .map(([area, s]) => ({ area, right: s.right, seen: s.seen, share: s.right / s.seen }));
  const weak = rows.filter((r) => r.right < r.seen).sort((a, b) => a.share - b.share || b.seen - b.right - (a.seen - a.right));
  const strong = rows.filter((r) => r.seen >= 2 && r.share >= 0.8).sort((a, b) => b.share - a.share || b.seen - a.seen);
  return { rows: rows.sort((a, b) => a.share - b.share), weak, strong };
}
