import { describe, expect, it } from 'vitest';
import { liteSimulate, momentImpact, LITE_DREAMS } from './liteSim';
import type { LifeStatus, Living } from '../engine/profile';

const statuses: LifeStatus[] = ['uni_student', 'poly_student', 'nsf', 'employed', 'part_time_gig', 'between_jobs'];
const livings: Living[] = ['family', 'room', 'own'];

describe('Lite simulation', () => {
  it('works for every situation × living × dream pair, with exactly one life moment', () => {
    for (const status of statuses)
      for (const living of livings)
        for (let i = 0; i < LITE_DREAMS.length - 1; i++) {
          const dreams = { [LITE_DREAMS[i]]: { id: LITE_DREAMS[i] }, [LITE_DREAMS[i + 1]]: { id: LITE_DREAMS[i + 1] } };
          const r = liteSimulate({ age: 22, status, living, dreams, decisions: {}, overrides: {} });
          expect(r.chapters).toHaveLength(3);
          expect(r.chapters.filter((c) => c.scenario.unexpected)).toHaveLength(1);
          for (let k = 1; k < r.chapters.length; k++) expect(r.chapters[k].age).toBeGreaterThanOrEqual(r.chapters[k - 1].age);
          for (const g of r.goals) {
            expect(g.headline).not.toMatch(/NaN|undefined/);
            expect(g.progress >= 1).toBe(g.status === 'on_track');
          }
          for (const ch of r.chapters)
            for (const c of ch.scenario.choices) {
              const input = { age: 22, status, living, dreams, decisions: { [ch.scenario.id]: c.id }, overrides: {} };
              expect(Number.isFinite(liteSimulate(input).plan.cash)).toBe(true);
              expect(Number.isFinite(momentImpact(input, ch.scenario.id))).toBe(true);
            }
        }
  });

  it('drops dreams already met by the living situation', () => {
    const r = liteSimulate({ age: 24, status: 'employed', living: 'own', dreams: { own_home: { id: 'own_home' }, travel: { id: 'travel' } }, decisions: {}, overrides: {} });
    expect(r.goals.map((g) => g.id)).toEqual(['travel']);
  });

  it('the lifestyle lever moves dreams nearer', () => {
    const dreams = { live_independently: { id: 'live_independently' as const }, travel: { id: 'travel' as const }, pet: { id: 'pet' as const } };
    const before = liteSimulate({ age: 22, status: 'employed', living: 'family', dreams, decisions: {}, overrides: {} });
    const after = liteSimulate({ age: 22, status: 'employed', living: 'family', dreams, decisions: {}, overrides: { lifestyle: 0 } });
    const near = (r: typeof before) => r.goals.reduce((s, g) => s + g.progress, 0);
    expect(near(after)).toBeGreaterThan(near(before));
  });
});

describe('Lite life moments', () => {
  it('includes the dream-linked moment and shows adopting costs savings vs not adopting', () => {
    const input = { age: 22, status: 'employed' as const, living: 'family' as const, dreams: { pet: { id: 'pet' as const }, travel: { id: 'travel' as const } }, decisions: { pet: 'adopt' }, overrides: {} };
    const r = liteSimulate(input);
    expect(r.chapters.map((c) => c.scenario.id)).toEqual(expect.arrayContaining(['pet', 'trip']));
    expect(momentImpact(input, 'pet')).toBeLessThan(0);
  });
});
