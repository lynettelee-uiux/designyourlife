import { describe, expect, it } from 'vitest';
import { QUESTIONS } from './questions';
import { SOURCES } from '../data/sources';
import { AREAS, AREA_ORDER, GROUPS, groupRelevance, relevance, stageOf, type Area, type Player } from './areas';
import { ageBand, leaderboard, peerAverage } from './peers';
import { MAX_HEARTS, RETRY_GAP, addStats, catchUp, diagnose, forToday, groupScores, levelOf, maxTier, newProgress, nextQuestion, nextTier, pickQuestion, pointsFor, questionsFor, startTier, trackPosition, updateMistakes, type Answer, type Focus } from './game';

const mixed = (p: Player): Focus => ({ kind: 'mixed', stage: stageOf(p), weights: relevance(p) });
const student: Player = { age: 20, situation: 'studying' };
const worker24: Player = { age: 24, situation: 'working' };
const worker31: Player = { age: 31, situation: 'working' };

describe('question bank', () => {
  it('every question is well formed and sourced', () => {
    const ids = new Set<string>();
    for (const q of QUESTIONS) {
      expect(ids.has(q.id), q.id).toBe(false);
      ids.add(q.id);
      expect(AREAS[q.area], q.id).toBeDefined();
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(3);
      expect(new Set(q.options).size, `${q.id} distinct options`).toBe(q.options.length);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
      expect(`${q.question} ${q.options.join(' ')} ${q.explain}`, q.id).not.toMatch(/NaN|undefined|Infinity/);
      for (const s of q.sourceIds ?? []) expect(SOURCES[s], `${q.id}: ${s}`).toBeDefined();
    }
  });

  it('every skill has enough questions for a topic round, from easy to hard', () => {
    for (const area of AREA_ORDER) {
      const qs = QUESTIONS.filter((q) => q.area === area);
      expect(qs.length, area).toBeGreaterThanOrEqual(6);
      expect(qs.some((q) => q.tier === 1), `${area} has a tier-1`).toBe(true);
      expect(qs.some((q) => q.tier >= 2), `${area} has a harder one`).toBe(true);
    }
  });

  it('computed answers match the engine (CPF and tax)', () => {
    const own = QUESTIONS.find((q) => q.id === 'pay-own-cpf')!;
    expect(own.options[own.answer]).toBe('$600');
    const cap = QUESTIONS.find((q) => q.id === 'pay-ceiling-calc')!;
    expect(cap.options[cap.answer]).toBe('$1,600');
    const tax = QUESTIONS.find((q) => q.id === 'pay-tax-calc')!;
    expect(tax.options[tax.answer]).toBe('~$160');
  });

  it('legacy and protection questions lean on MoneySense', () => {
    for (const q of QUESTIONS.filter((x) => x.area === 'legacy' || x.area === 'protection')) expect(q.sourceIds?.length, q.id).toBeGreaterThan(0);
    expect(QUESTIONS.filter((q) => q.sourceIds?.some((s) => s.startsWith('moneysense'))).length).toBeGreaterThanOrEqual(15);
  });
});

describe('life stage', () => {
  it('maps age and situation to a stage', () => {
    expect(stageOf(student)).toBe('student');
    expect(stageOf({ age: 20, situation: 'ns' })).toBe('ns');
    expect(stageOf(worker24)).toBe('starting');
    expect(stageOf(worker31)).toBe('settling');
    expect(stageOf({ age: 29, situation: 'gig' })).toBe('settling');
  });

  it('legacy planning is for later when studying, core when settling; gig work makes irregular income core', () => {
    expect(relevance(student).legacy).toBe(0);
    expect(relevance(worker31).legacy).toBe(2);
    expect(relevance({ age: 24, situation: 'gig' }).irregular).toBe(2);
  });

  it('mixed rounds skip "later" skills and questions meant for other stages', () => {
    const qs = questionsFor(QUESTIONS, mixed(student));
    expect(qs.some((q) => q.area === 'legacy')).toBe(false);
    expect(qs.some((q) => q.id === 'house-oa-buffer')).toBe(false);
    expect(qs.some((q) => q.id === 'bud-allowance')).toBe(true);
    expect(questionsFor(QUESTIONS, mixed(worker31)).some((q) => q.id === 'bud-allowance')).toBe(false);
  });

  it('core skills come up about twice as often as "good to know" ones', () => {
    const p = worker31;
    const focus = mixed(p);
    const asked = new Set<string>();
    const areas: Partial<Record<Area, number>> = {};
    let i = 0;
    for (let k = 0; k < 24; k++) {
      const q = pickQuestion(QUESTIONS, 1, asked, areas, focus, () => (i++ % 7) / 7)!;
      asked.add(q.id);
      areas[q.area] = (areas[q.area] ?? 0) + 1;
    }
    const rel = relevance(p);
    const core = AREA_ORDER.filter((a) => rel[a] === 2);
    const good = AREA_ORDER.filter((a) => rel[a] === 1);
    const avg = (xs: Area[]) => xs.reduce((s, a) => s + (areas[a] ?? 0), 0) / xs.length;
    expect(avg(core)).toBeGreaterThan(avg(good) * 1.5);
  });

  it('topic rounds ask only that key area (both of its skills), and end when it runs out', () => {
    const focus: Focus = { kind: 'topic', group: 'future' };
    const asked = new Set<string>();
    const seen = new Set<Area>();
    for (;;) {
      const q = pickQuestion(QUESTIONS, 1, asked, {}, focus);
      if (!q) break;
      expect(['retirement', 'legacy']).toContain(q.area);
      seen.add(q.area);
      asked.add(q.id);
    }
    expect(seen.size).toBe(2);
    expect(asked.size).toBe(QUESTIONS.filter((q) => q.area === 'retirement' || q.area === 'legacy').length);
  });
});

describe('key areas and demo comparisons', () => {
  it('six key areas cover all twelve skills exactly once', () => {
    const all = GROUPS.flatMap((g) => g.areas);
    expect(GROUPS).toHaveLength(6);
    expect(new Set(all).size).toBe(12);
    expect([...all].sort()).toEqual([...AREA_ORDER].sort());
  });

  it('a key area is as relevant as its most relevant skill', () => {
    const future = GROUPS.find((g) => g.id === 'future')!;
    expect(groupRelevance(student, future)).toBe(1);
    expect(groupRelevance(worker31, future)).toBe(2);
  });

  it('group scores add up their skills', () => {
    const s = groupScores({ retirement: { right: 1, seen: 2 }, legacy: { right: 2, seen: 2 } });
    expect(s.future).toEqual({ right: 3, seen: 4, share: 0.75 });
    expect(s.credit.share).toBeUndefined();
  });

  it('demo peer averages are stable, plausible, and higher where a skill is core', () => {
    const a = peerAverage(worker31);
    expect(peerAverage(worker31)).toEqual(a);
    for (const v of Object.values(a)) {
      expect(v).toBeGreaterThan(0.3);
      expect(v).toBeLessThan(0.8);
    }
    expect(peerAverage(worker31).future).toBeGreaterThan(peerAverage(student).future);
    expect(ageBand(23).label).toBe('21–24');
  });

  it('demo leaderboard: stable for the week, ranks you by your best, never lists you with 0', () => {
    const now = new Date(2026, 9, 25);
    const board = leaderboard(worker24, 0, now);
    expect(board).toHaveLength(9);
    expect(board.some((r) => r.you)).toBe(false);
    expect(leaderboard(worker24, 0, now)).toEqual(board);
    const withMe = leaderboard(worker24, 99, now);
    expect(withMe[0]).toMatchObject({ you: true, rank: 1 });
    for (let i = 1; i < withMe.length; i++) expect(withMe[i].best).toBeLessThanOrEqual(withMe[i - 1].best);
  });
});

describe('rules', () => {
  it('hearts refill on a new day but progress carries over', () => {
    const p = { ...newProgress(new Date(2026, 9, 25)), hearts: 0, xp: 120 };
    expect(forToday(p, new Date(2026, 9, 25, 23, 59)).hearts).toBe(0);
    const next = forToday(p, new Date(2026, 9, 26, 0, 1));
    expect(next.hearts).toBe(MAX_HEARTS);
    expect(next.xp).toBe(120);
  });

  it('levels go up with points', () => {
    expect(levelOf(0).name).toBe('Rookie');
    expect(levelOf(99).name).toBe('Rookie');
    expect(levelOf(100).name).toBe('Saver');
    expect(levelOf(5000)).toMatchObject({ name: 'Money Pro', progress: 1 });
    expect(levelOf(175).progress).toBeCloseTo(0.5);
  });

  it('harder questions and streaks earn more; difficulty adapts', () => {
    expect(pointsFor(3, 0)).toBeGreaterThan(pointsFor(1, 0));
    expect(pointsFor(1, 3)).toBeGreaterThan(pointsFor(1, 2));
    expect(startTier(0)).toBe(1);
    expect(startTier(4)).toBe(3);
    expect(nextTier(1, true, 2)).toBe(2);
    expect(nextTier(1, true, 1)).toBe(1);
    expect(nextTier(3, true, 4)).toBe(4);
    expect(nextTier(3, true, 4, 3)).toBe(3);
    expect(nextTier(2, false, 0)).toBe(1);
  });

  it('never repeats a question and spreads across skills', () => {
    const focus = mixed(worker24);
    const asked = new Set<string>();
    const areas: Partial<Record<Area, number>> = {};
    for (let i = 0; i < 10; i++) {
      const q = pickQuestion(QUESTIONS, 1, asked, areas, focus, () => 0.5)!;
      expect(asked.has(q.id)).toBe(false);
      asked.add(q.id);
      areas[q.area] = (areas[q.area] ?? 0) + 1;
    }
    expect(Object.keys(areas).length).toBeGreaterThanOrEqual(9);
    expect(pickQuestion(QUESTIONS, 1, new Set(QUESTIONS.map((q) => q.id)), {}, focus)).toBeUndefined();
  });

  it('diagnoses weak and strong areas', () => {
    const q = (area: Area) => QUESTIONS.find((x) => x.area === area)!;
    const stats = addStats({}, [
      { question: q('credit'), chosen: 0, right: false },
      { question: q('credit'), chosen: 0, right: false },
      { question: q('scams'), chosen: 1, right: true },
      { question: q('scams'), chosen: 1, right: true },
      { question: q('legacy'), chosen: 1, right: true },
      { question: q('legacy'), chosen: 0, right: false },
    ]);
    const d = diagnose(stats);
    expect(d.weak.map((r) => r.area)).toEqual(['credit', 'legacy']);
    expect(d.strong.map((r) => r.area)).toEqual(['scams']);
  });
});

describe('Duolingo-style progression', () => {
  it('the level bar sits between your level and the next on the full track (the 230/250 bug)', () => {
    expect(trackPosition(0)).toBe(0);
    expect(trackPosition(230)).toBeCloseTo((1 + 130 / 150) / 4); // Saver, most of the way to Planner
    expect(trackPosition(230)).toBeLessThan(0.5); // before Planner's marker, nowhere near Strategist
    expect(trackPosition(5000)).toBe(1);
  });

  it('harder tiers unlock as you level up, and locked questions are never asked', () => {
    expect(maxTier(levelOf(0).index)).toBe(2);
    expect(maxTier(levelOf(100).index)).toBe(3);
    expect(maxTier(levelOf(500).index)).toBe(4);
    const rookie: Focus = { kind: 'mixed', stage: 'starting', weights: relevance(worker24), maxTier: 2 };
    expect(questionsFor(QUESTIONS, rookie).every((q) => q.tier <= 2)).toBe(true);
    expect(QUESTIONS.filter((q) => q.tier === 4).length).toBeGreaterThanOrEqual(12);
    expect(pointsFor(4, 0)).toBe(40);
  });

  it('every key area has an Expert question', () => {
    for (const g of GROUPS) expect(QUESTIONS.some((q) => q.tier === 4 && g.areas.includes(q.area)), g.id).toBe(true);
  });

  const ans = (id: string, right: boolean): Answer => ({ question: QUESTIONS.find((q) => q.id === id)!, chosen: 0, right });

  it('mistakes are remembered until put right', () => {
    let m = updateMistakes([], [ans('pay-own-cpf', false), ans('ret-age', true), ans('leg-age', false)]);
    expect(m).toEqual(['pay-own-cpf', 'leg-age']);
    m = updateMistakes(m, [ans('pay-own-cpf', true)]);
    expect(m).toEqual(['leg-age']);
  });

  it('a question missed in this round comes back after a few others', () => {
    const focus: Focus = { kind: 'mixed', stage: 'starting', weights: relevance(worker24), maxTier: 4 };
    const answers = [ans('pay-own-cpf', false)];
    const retries = [{ id: 'pay-own-cpf', due: 1 + RETRY_GAP }];
    const base = { tier: 1 as const, asked: new Set(['pay-own-cpf']), roundAreas: {}, focus, retries, past: [] };
    expect(nextQuestion(QUESTIONS, { ...base, answers }).question?.id).not.toBe('pay-own-cpf');
    const later = [...answers, ans('ret-age', true), ans('emg-size', true), ans('bud-leftover', true)];
    expect(nextQuestion(QUESTIONS, { ...base, answers: later })).toMatchObject({ question: { id: 'pay-own-cpf' }, retry: true });
  });

  it('past mistakes are mixed into the next round', () => {
    const focus: Focus = { kind: 'mixed', stage: 'starting', weights: relevance(worker24), maxTier: 4 };
    const n = nextQuestion(QUESTIONS, { tier: 1, asked: new Set(['ret-age']), roundAreas: {}, focus, answers: [ans('ret-age', true)], retries: [], past: ['leg-age'] });
    expect(n).toMatchObject({ question: { id: 'leg-age' }, retry: true });
  });

  it('catch-up picks areas below peers, core ones first', () => {
    const you = groupScores({ credit: { right: 1, seen: 4 }, budgeting: { right: 1, seen: 2 }, retirement: { right: 2, seen: 2 } });
    const peers = { everyday: 0.6, safety: 0.6, credit: 0.6, earning: 0.6, growing: 0.6, future: 0.6 };
    const rel = { everyday: 1, safety: 2, credit: 2, earning: 2, growing: 2, future: 1 } as const;
    expect(catchUp(you, peers, rel)).toEqual(['credit', 'everyday']);
  });
});
