import { describe, expect, it } from 'vitest';
import { QUESTIONS } from './questions';
import { SKILLS, type SkillId } from '../lite/literacy';
import { SOURCES } from '../data/sources';
import { MAX_HEARTS, addStats, diagnose, forToday, levelOf, newProgress, nextTier, pickQuestion, pointsFor, startTier } from './game';

describe('question bank', () => {
  it('every question is well formed and sourced', () => {
    const ids = new Set<string>();
    for (const q of QUESTIONS) {
      expect(ids.has(q.id), q.id).toBe(false);
      ids.add(q.id);
      expect(SKILLS[q.area], q.id).toBeDefined();
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(3);
      expect(new Set(q.options).size, `${q.id} distinct options`).toBe(q.options.length);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
      expect(`${q.question} ${q.options.join(' ')} ${q.explain}`, q.id).not.toMatch(/NaN|undefined|Infinity/);
      for (const s of q.sourceIds ?? []) expect(SOURCES[s], `${q.id}: ${s}`).toBeDefined();
    }
  });

  it('covers all ten skills, with easy and harder questions in each', () => {
    for (const area of Object.keys(SKILLS) as SkillId[]) {
      const qs = QUESTIONS.filter((q) => q.area === area);
      expect(qs.length, area).toBeGreaterThanOrEqual(4);
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
    expect(nextTier(3, true, 4)).toBe(3);
    expect(nextTier(2, false, 0)).toBe(1);
  });

  it('never repeats a question and spreads across skills', () => {
    const asked = new Set<string>();
    const areas: Partial<Record<SkillId, number>> = {};
    for (let i = 0; i < 10; i++) {
      const q = pickQuestion(QUESTIONS, 1, asked, areas, () => 0.5)!;
      expect(asked.has(q.id)).toBe(false);
      asked.add(q.id);
      areas[q.area] = (areas[q.area] ?? 0) + 1;
    }
    expect(Object.keys(areas).length).toBe(10);
    // Falls back to other tiers when a tier runs out
    const all = new Set(QUESTIONS.filter((q) => q.tier !== 3).map((q) => q.id));
    expect(pickQuestion(QUESTIONS, 1, all, {})!.tier).toBe(3);
    expect(pickQuestion(QUESTIONS, 1, new Set(QUESTIONS.map((q) => q.id)), {})).toBeUndefined();
  });

  it('diagnoses weak and strong areas', () => {
    const q = (area: SkillId) => QUESTIONS.find((x) => x.area === area)!;
    const stats = addStats({}, [
      { question: q('credit'), chosen: 0, right: false },
      { question: q('credit'), chosen: 0, right: false },
      { question: q('scams'), chosen: 1, right: true },
      { question: q('scams'), chosen: 1, right: true },
      { question: q('payslip'), chosen: 1, right: true },
      { question: q('payslip'), chosen: 0, right: false },
    ]);
    const d = diagnose(stats);
    expect(d.weak.map((r) => r.area)).toEqual(['credit', 'payslip']);
    expect(d.strong.map((r) => r.area)).toEqual(['scams']);
  });
});
