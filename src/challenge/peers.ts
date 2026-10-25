// DEMO DATA. There are no real players yet, so the leaderboard and "players your age" averages are
// generated, and the UI always labels them as demo. They're deterministic (same age band and week →
// same numbers) and shaped to be plausible: people score higher on skills that matter at their stage.
// Replace `peerAverage` and `leaderboard` with anonymous aggregates once real scores are collected.

import { GROUPS, groupRelevance, type GroupId, type Player } from './areas';

export interface AgeBand {
  from: number;
  to: number;
  label: string;
}

const BANDS: AgeBand[] = [
  { from: 0, to: 20, label: '17–20' },
  { from: 21, to: 24, label: '21–24' },
  { from: 25, to: 29, label: '25–29' },
  { from: 30, to: 99, label: '30–35' },
];

export const ageBand = (age: number) => BANDS.find((b) => age >= b.from && age <= b.to)!;

/** Small deterministic hash → [0, 1). */
function rand(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

const BASE = { 2: 0.66, 1: 0.56, 0: 0.44 } as const;

/** Demo: average share right for players in your age band, per key area. */
export function peerAverage(p: Player): Record<GroupId, number> {
  const band = ageBand(p.age).label;
  return Object.fromEntries(GROUPS.map((g) => [g.id, Math.round((BASE[groupRelevance(p, g)] + (rand(band + g.id) - 0.5) * 0.12) * 100) / 100])) as Record<GroupId, number>;
}

const HANDLES = ['kopi_saver', 'hawker_hero', 'bto_dreamer', 'frugal_fox', 'mrt_millionaire', 'cpf_curious', 'side_hustler', 'compound_kid', 'rainyday_ray', 'budget_boss', 'teh_peng_trader', 'ang_bao_ace'];

export interface BoardRow {
  name: string;
  best: number;
  you?: boolean;
  rank: number;
}

/** ISO-ish week number, so the demo board changes weekly. */
export function weekKey(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 1);
  return `${d.getFullYear()}-w${Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)}`;
}

/** Demo: this week's best sprint scores in your age band, with you slotted in by your personal best. */
export function leaderboard(p: Player, best: number, now = new Date()): BoardRow[] {
  const band = ageBand(p.age).label;
  const wk = weekKey(now);
  // A different nine sample players each week, with scores of 3–13 right.
  const demo = [...HANDLES]
    .sort((a, b) => rand(band + wk + a) - rand(band + wk + b))
    .slice(0, 9)
    .map((name) => ({ name, best: 3 + Math.floor(rand(band + wk + name + 's') * 11), you: false }));
  const all = [...demo, ...(best > 0 ? [{ name: 'You', best, you: true }] : [])].sort((a, b) => b.best - a.best || Number(b.you) - Number(a.you));
  return all.map((r, i) => ({ ...r, rank: i + 1 }));
}
