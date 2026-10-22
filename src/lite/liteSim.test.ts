import { describe, expect, it } from 'vitest';
import { liteSimulate, LITE_DREAMS } from './liteSim';
import type { LifeStatus, Living } from '../engine/profile';

const statuses: LifeStatus[] = ['uni_student', 'poly_student', 'nsf', 'employed', 'part_time_gig', 'between_jobs'];
const livings: Living[] = ['family', 'room', 'own'];

describe('Lite simulation', () => {
  it('works for every situation × living × dream pair, with exactly one life moment', () => {
    for (const status of statuses)
      for (const living of livings)
        for (let i = 0; i < LITE_DREAMS.length - 1; i++) {
          const dreams = { [LITE_DREAMS[i]]: { id: LITE_DREAMS[i] }, [LITE_DREAMS[i + 1]]: { id: LITE_DREAMS[i + 1] } };
          const r = liteSimulate({ age: 22, status, living, dreams, overrides: {} });
          expect(r.twist?.scenario.unexpected).toBe(true);
          for (const g of r.goals) {
            expect(g.headline).not.toMatch(/NaN|undefined/);
            expect(g.progress >= 1).toBe(g.status === 'on_track');
          }
          for (const c of r.twist!.scenario.choices) {
            const withChoice = liteSimulate({ age: 22, status, living, dreams, twistChoice: c.id, overrides: {} });
            expect(Number.isFinite(withChoice.plan.cash)).toBe(true);
          }
        }
  });

  it('drops dreams already met by the living situation', () => {
    const r = liteSimulate({ age: 24, status: 'employed', living: 'own', dreams: { own_home: { id: 'own_home' }, travel: { id: 'travel' } }, overrides: {} });
    expect(r.goals.map((g) => g.id)).toEqual(['travel']);
  });

  it('the lifestyle lever moves dreams nearer', () => {
    const dreams = { live_independently: { id: 'live_independently' as const }, travel: { id: 'travel' as const }, pet: { id: 'pet' as const } };
    const before = liteSimulate({ age: 22, status: 'employed', living: 'family', dreams, overrides: {} });
    const after = liteSimulate({ age: 22, status: 'employed', living: 'family', dreams, overrides: { lifestyle: 0 } });
    const near = (r: typeof before) => r.goals.reduce((s, g) => s + g.progress, 0);
    expect(near(after)).toBeGreaterThan(near(before));
  });
});
