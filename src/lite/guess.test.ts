import { describe, expect, it } from 'vitest';
import { guessAnswer } from '../components/Learning';
import { emptyInput, liteSimulate, momentImpact } from './liteSim';

describe('quick guess answers', () => {
  it('treats small differences as about the same', () => {
    expect(guessAnswer(-40)).toBe('same');
    expect(guessAnswer(51)).toBe('up');
    expect(guessAnswer(-51)).toBe('down');
  });

  it('gives sensible answers for real moments', () => {
    const base = { ...emptyInput(), age: 23, status: 'uni_student' as const, income: { freelance: 1, allowance: 1 }, dreams: { travel: { id: 'travel' as const } } };
    const ids = liteSimulate(base).chapters.map((c) => c.scenario.id);
    expect(ids).toContain('grad_trip');
    // A $700 budget trip lowers savings; skipping for a $150 staycation lowers them less.
    const trip = (choice: string) => momentImpact({ ...base, decisions: { grad_trip: choice } }, 'grad_trip');
    expect(guessAnswer(trip('budget'))).toBe('down');
    expect(trip('skip')).toBeGreaterThan(trip('japan_card'));
    // Reporting a scam costs nothing.
    const scam = liteSimulate({ ...base, status: 'nsf', income: { ns: 0 } }).chapters.find((c) => c.scenario.id === 'job_scam');
    if (scam) expect(guessAnswer(momentImpact({ ...base, status: 'nsf', income: { ns: 0 }, decisions: { job_scam: 'report' } }, 'job_scam'))).toBe('same');
  });
});
