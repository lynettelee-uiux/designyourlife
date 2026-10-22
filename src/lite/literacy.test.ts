import { describe, expect, it } from 'vitest';
import { pickSkills, SKILLS } from './literacy';
import { emptyInput, liteSimulate } from './liteSim';
import { aspirationById } from '../data/aspirations';

describe('money skills from gaps', () => {
  it('maps a stretched career break to emergency funds and retiring early to CPF retirement', () => {
    const r = liteSimulate({ ...emptyInput(), dreams: { career_break: { id: 'career_break', age: 25, months: 12 }, retire_early: { id: 'retire_early', age: 45 } } });
    const picks = pickSkills({ goals: r.goals, status: 'employed', moments: [], invested: true, dreamTitle: (id) => aspirationById(id).title });
    const ids = picks.map((p) => p.skill.id);
    expect(ids).toContain('retirement');
    expect(ids.length).toBe(3);
  });

  it('always returns three distinct skills, even when every dream is within reach', () => {
    const picks = pickSkills({ goals: [], status: 'employed', moments: [], invested: false, dreamTitle: () => '' });
    expect(picks).toHaveLength(3);
    expect(new Set(picks.map((p) => p.skill.id)).size).toBe(3);
  });

  it('puts habit weak spots first, with the reason', () => {
    const picks = pickSkills({ goals: [], status: 'uni_student', moments: [], invested: false, habits: { surprise: 'bnpl', saving: 'rarely', tracking: 'no' }, dreamTitle: () => '' });
    expect(picks.map((p) => p.skill.id)).toEqual(['credit', 'emergency', 'saving']);
    expect(picks[0].why).toMatch(/pay-later/);
  });

  it('flags when someone says nothing is left but their ranges say otherwise', () => {
    const picks = pickSkills({ goals: [], status: 'uni_student', moments: [], invested: false, habits: { saving: 'rarely' }, monthlyLeftover: 337, dreamTitle: () => '' });
    expect(picks[0].skill.id).toBe('budgeting');
    expect(picks[0].why).toMatch(/\$337/);
  });

  it('turns a risky story choice into the matching skill', () => {
    const picks = pickSkills({ goals: [], status: 'employed', moments: [{ scenario: 'scam', choice: 'test', impact: -500 }], invested: false, dreamTitle: () => '' });
    expect(picks[0].skill.id).toBe('scams');
  });

  it('has a quick check, two facts and an official link for every skill', () => {
    for (const s of Object.values(SKILLS)) {
      expect(s.facts.length).toBeGreaterThanOrEqual(2);
      expect(s.tip.length).toBeGreaterThan(20);
      expect(typeof s.check.answer).toBe('boolean');
      expect(s.learnMore.url).toMatch(/^https:\/\/(www\.)?(cpf|moneysense|scamshield)\.gov\.sg|^https:\/\/homes\.hdb\.gov\.sg/);
    }
  });
});
