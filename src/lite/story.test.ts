import { describe, expect, it } from 'vitest';
import { futureQuote, strengths } from './story';
import type { GoalResult } from '../engine/goals';

const g = (id: GoalResult['id'], status: GoalResult['status']) => ({ id, status, progress: status === 'on_track' ? 1 : 0.5 }) as GoalResult;

describe('future quote', () => {
  it('reflects the outcome without labelling the person', () => {
    expect(futureQuote([g('travel', 'on_track'), g('pet', 'on_track')])).toBe('Seeing the world and a furry flatmate — closer than I thought.');
    expect(futureQuote([g('travel', 'explore')])).toBe('Seeing the world. Further away for now — not forever.');
    expect(futureQuote([g('travel', 'on_track'), g('pet', 'adjust'), g('career_break', 'explore')])).toBe('Seeing the world, a furry flatmate and time to breathe — and a plan to get there.');
    expect(futureQuote([])).toMatch(/few versions/);
  });
});

describe('strengths', () => {
  it('draws on results and choices, and always returns at least one', () => {
    const s = strengths({ goals: [g('travel', 'on_track')], status: 'employed', living: 'family', moments: [{ scenario: 'restructure', choice: 'freelance' }], investMonthly: 200, dreamTitle: () => 'Travel often' });
    expect(s[0]).toBe('“Travel often” is within reach');
    expect(s).toContain('You’re resourceful when plans change');
    expect(s.length).toBeLessThanOrEqual(3);
    expect(strengths({ goals: [], status: 'between_jobs', living: 'room', moments: [], investMonthly: 0, dreamTitle: () => '' }).length).toBe(1);
  });
});
