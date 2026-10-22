import { describe, expect, it } from 'vitest';
import { dreamOptions } from './dreamOptions';
import { emptyInput, liteSimulate, LITE_DREAMS } from './liteSim';
import type { AspirationId } from '../engine/profile';

const worker = (dreams: Record<string, object>) => liteSimulate({ ...emptyInput(), age: 23, income: { salary: 1 }, savings: 1, habits: { food: 1, fun: 1 }, dreams: dreams as never });

describe('dream timing and size', () => {
  it('the same career break is further at 26, a stretch at 30, within reach at 40', () => {
    // Timing matters most when dreams compete: here, moving out now on a ~$3,000 salary.
    const at = (age: number) =>
      liteSimulate({
        ...emptyInput(),
        age: 23,
        income: { salary: 1 },
        savings: 0,
        habits: { food: 1, fun: 1 },
        dreams: { live_independently: { id: 'live_independently', age: 23, amount: 1100 }, career_break: { id: 'career_break', age, months: 12 } },
      }).goals.find((g) => g.id === 'career_break')!;
    expect(at(26).status).toBe('explore');
    expect(at(30).status).toBe('adjust');
    expect(at(40).status).toBe('on_track');
    expect(at(30).progress).toBeGreaterThan(at(26).progress);
    expect(at(26).headline).toMatch(/at 26/);
    expect(at(40).headline).toMatch(/at 40/);
  });

  it('a longer break, or a home sooner, is further away', () => {
    const brk = (months: number) => worker({ career_break: { id: 'career_break', age: 30, months } }).goals[0].progress;
    expect(brk(12)).toBeLessThanOrEqual(brk(3));
    const home = (age: number) => worker({ own_home: { id: 'own_home', age, amount: 30000 } }).goals[0].progress;
    expect(home(28)).toBeLessThanOrEqual(home(40));
  });

  it('every dream offers choices, defaults are among them, and every combination simulates', () => {
    for (const stage of ['student', 'ns', 'early_career', 'established'] as const)
      for (const age of [19, 23, 30]) {
        for (const id of LITE_DREAMS as AspirationId[]) {
          const o = dreamOptions(id, age, stage);
          expect(o.rows.length).toBeGreaterThan(0);
          for (const row of o.rows) {
            expect(row.options.length).toBeGreaterThan(1);
            const def = o.defaults[row.key];
            if (def !== undefined) expect(row.options.map((x) => x.value)).toContain(def);
            for (const opt of row.options) {
              const r = worker({ [id]: { id, ...o.defaults, [row.key]: opt.value } });
              for (const g of r.goals) expect(g.headline).not.toMatch(/NaN|undefined/);
            }
          }
        }
      }
  });
});
