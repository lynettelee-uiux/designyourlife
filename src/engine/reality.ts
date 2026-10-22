import { CPF_LIFE_EST_PAYOUT_2026, CPF_PAYOUT_AGE, SCENARIOS } from './assumptions';
import { inflate, monthlySavingNeeded } from './finance';
import { PET_YEARS, petMonthly, petSetup, resolveDream } from './plan';
import type { AspirationId, Dreams, Profile } from './profile';
import { monthlyGrossAt, monthlySpendAt } from './projection';
import type { Plan } from './types';

/** Illustrative growth rates used only to show "if saved in cash vs if invested". Not forecasts. */
export const SAVE_RATES = { cash: SCENARIOS.baseline.cashReturn, invested: SCENARIOS.baseline.investReturn.balanced };

export interface RealityItem {
  id: AspirationId;
  /** One-line summary of what this dream might cost. */
  summary: string;
  lines: { label: string; value: number; suffix?: string; note?: string }[];
  /** Target amount to build up (nominal) and by when — drives monthly saving estimates. */
  target?: { amount: number; age: number };
  monthlyToSave?: { cash: number; invested: number };
  recurringMonthly?: number;
  yearsToPrepare?: number;
  caveats: string[];
}

export function realityCheck(plan: Plan, profile: Profile, dreams: Dreams): RealityItem[] {
  const s = SCENARIOS.baseline;
  const a = profile.age;
  const startCash = 0; // each goal is shown on its own, starting from zero, so goals don't double-count the same savings
  const infl = (amt: number, age: number) => inflate(amt, s.inflation, age - a);
  const savingFor = (amount: number, age: number) => {
    const m = Math.max(1, (age - a) * 12);
    return { cash: monthlySavingNeeded(amount, startCash, m, SAVE_RATES.cash), invested: monthlySavingNeeded(amount, startCash, m, SAVE_RATES.invested) };
  };
  const costAt = (age: number) => monthlySpendAt(plan, age, s).total;

  return (Object.keys(dreams) as AspirationId[]).map((id): RealityItem => {
    const d = resolveDream(dreams[id]!, profile);
    switch (id) {
      case 'retire_early': {
        const R = d.age!;
        const M = d.amount!;
        if (R >= CPF_PAYOUT_AGE) {
          return {
            id,
            summary: `$${M.toLocaleString()} a month in today's dollars would be about $${Math.round(infl(M, R)).toLocaleString()} a month at ${R}.`,
            lines: [
              { label: `Monthly spending at ${R} (future dollars)`, value: infl(M, R) },
              { label: 'CPF LIFE estimate for someone turning 55 in 2026 with the Full Retirement Sum', value: CPF_LIFE_EST_PAYOUT_2026.frs, suffix: '/mo', note: 'For context only — your own payouts will differ' },
            ],
            yearsToPrepare: R - a,
            caveats: ['CPF payouts begin at 65 and depend on your CPF savings at 55.'],
          };
        }
        const bridge = CPF_PAYOUT_AGE - R;
        let total = 0;
        for (let k = 0; k < bridge; k++) total += infl(M * 12, R + k);
        return {
          id,
          summary: `Retiring at ${R} means funding ${bridge} years yourself before CPF payouts can start at 65.`,
          lines: [
            { label: `Monthly lifestyle at ${R} (future dollars)`, value: infl(M, R), suffix: '/mo' },
            { label: `Total for ${bridge} bridge years (no growth assumed)`, value: total },
          ],
          target: { amount: total, age: R },
          monthlyToSave: savingFor(total, R),
          yearsToPrepare: R - a,
          caveats: ['Investments left invested during retirement could stretch this further — or fall in value.', 'CPF savings generally cannot be withdrawn to fund early retirement.'],
        };
      }
      case 'travel': {
        const yearly = d.count! * d.amount!;
        return {
          id,
          summary: `${d.count} trip${d.count === 1 ? '' : 's'} a year at about $${d.amount!.toLocaleString()} each.`,
          lines: [
            { label: 'Per year (today’s dollars)', value: yearly },
            { label: 'Same trips in 10 years (future dollars)', value: infl(yearly, a + 10) },
          ],
          recurringMonthly: yearly / 12,
          caveats: ['Airfares and accommodation can swing well beyond general inflation.'],
        };
      }
      case 'own_home': {
        const H = d.age!;
        const target = infl(d.amount!, H);
        return {
          id,
          summary: `An upfront home fund of $${d.amount!.toLocaleString()} today is about $${Math.round(target).toLocaleString()} by ${H}.`,
          lines: [{ label: `Upfront fund at ${H} (future dollars)`, value: target }],
          target: { amount: target, age: H },
          monthlyToSave: savingFor(target, H),
          yearsToPrepare: H - a,
          caveats: ['CPF Ordinary Account savings can usually help with HDB down payments and loans, so cash needed may be lower.', 'Eligibility: singles generally from 35; income ceilings apply. Check the HDB Flat Portal.', 'The $30,000 default is a teaching placeholder, not an HDB figure.'],
        };
      }
      case 'live_independently': {
        const from = d.age!;
        const monthly = d.amount! + 80 + 150;
        const moveIn = d.amount! + 1500;
        return {
          id,
          summary: `Living on your own from ${from}: about $${monthly.toLocaleString()} a month more in today's dollars.`,
          lines: [
            { label: 'Rent + utilities + extra groceries', value: monthly, suffix: '/mo' },
            { label: 'Move-in fund (deposit + basics)', value: moveIn },
          ],
          recurringMonthly: monthly,
          target: { amount: infl(moveIn, from), age: from },
          monthlyToSave: savingFor(infl(moveIn, from), from),
          yearsToPrepare: from - a,
          caveats: ['Rents vary widely (HDB common rooms roughly $800–$1,600 in 2026 listings).'],
        };
      }
      case 'pet': {
        const monthly = petMonthly(d.variant);
        let lifetime = petSetup(d.variant);
        for (let k = 0; k < PET_YEARS; k++) lifetime += infl(monthly * 12, d.age! + k);
        return {
          id,
          summary: `A ${d.variant === 'cat' ? 'cat' : 'dog'}: about $${monthly}/month plus setup — for 10–15 years.`,
          lines: [
            { label: 'Setup (adoption, gear, first vet visits)', value: petSetup(d.variant) },
            { label: 'Ongoing care', value: monthly, suffix: '/mo' },
            { label: `Lifetime over ~${PET_YEARS} years (future dollars)`, value: lifetime },
          ],
          recurringMonthly: monthly,
          yearsToPrepare: d.age! - a,
          caveats: ['Unexpected vet bills can run into the thousands. HDB flats allow only approved dog breeds.'],
        };
      }
      case 'business': {
        const B = d.age!;
        const buffer = costAt(B) * 6;
        const target = infl(d.amount!, B) + buffer;
        return {
          id,
          summary: `Starting capital of $${d.amount!.toLocaleString()} plus 6 months of personal costs.`,
          lines: [
            { label: `Capital at ${B} (future dollars)`, value: infl(d.amount!, B) },
            { label: '6-month personal buffer', value: buffer },
          ],
          target: { amount: target, age: B },
          monthlyToSave: savingFor(target, B),
          yearsToPrepare: B - a,
          caveats: ['Business costs vary hugely by type. This is a placeholder you can edit.'],
        };
      }
      case 'career_break': {
        const B = d.age!;
        const m = d.months!;
        const monthly = costAt(B);
        const target = monthly * (m + 3);
        return {
          id,
          summary: `A ${m}-month break at ${B}: about $${Math.round(monthly).toLocaleString()}/month of costs keep running.`,
          lines: [
            { label: 'Monthly costs at that age (future dollars)', value: monthly, suffix: '/mo' },
            { label: `Break + 3-month cushion`, value: target },
          ],
          target: { amount: target, age: B },
          monthlyToSave: savingFor(target, B),
          yearsToPrepare: B - a,
          caveats: ['Every recurring commitment you add (rent, a pet, family support) makes the break cost more.', 'No CPF contributions are made while you have no salary.'],
        };
      }
      case 'support_parents':
        return {
          id,
          summary: `$${d.amount!.toLocaleString()} a month to family from ${d.age}.`,
          lines: [{ label: 'Per year (today’s dollars)', value: d.amount! * 12 }],
          recurringMonthly: d.amount!,
          caveats: ['Support doesn’t have to be cash only — helping family navigate schemes matters too.'],
        };
      case 'creative_career': {
        const buffer = costAt(d.age!) * 12;
        return {
          id,
          summary: 'Creative work often means irregular income — a bigger buffer gives you room.',
          lines: [
            { label: 'Illustrative income change', value: -0.2 * monthlyGrossAt(plan, d.age!, s), suffix: '/mo' },
            { label: '12-month buffer at that age', value: buffer },
          ],
          target: { amount: buffer, age: Math.max(d.age!, a + 3) },
          monthlyToSave: savingFor(buffer, Math.max(d.age!, a + 3)),
          caveats: ['Creative incomes range widely. The 20% figure is an illustration.'],
        };
      }
      case 'start_family':
        return {
          id,
          summary: `An illustrative $${d.amount!.toLocaleString()}/month from ${d.age} for raising a child.`,
          lines: [{ label: 'Per year (today’s dollars)', value: d.amount! * 12 }],
          recurringMonthly: d.amount!,
          yearsToPrepare: d.age! - a,
          caveats: ['Placeholder only — government support (e.g. Baby Bonus) and real costs are not modelled.'],
        };
      case 'free_time': {
        const lost = 0.2 * monthlyGrossAt(plan, d.age!, s);
        return {
          id,
          summary: `A four-day week from ${d.age}: roughly 20% less pay in exchange for one extra day a week.`,
          lines: [{ label: 'Pay difference at that age (future dollars)', value: -lost, suffix: '/mo' }],
          yearsToPrepare: d.age! - a,
          caveats: ['Not every employer offers this; some roles pay pro-rated salaries differently.'],
        };
      }
      case 'financial_security': {
        const monthly = costAt(a);
        return {
          id,
          summary: `${d.months} months of today's expenses is about $${Math.round(monthly * d.months!).toLocaleString()}.`,
          lines: [{ label: 'Your monthly costs today', value: monthly, suffix: '/mo' }],
          target: { amount: monthly * d.months!, age: a + 3 },
          monthlyToSave: savingFor(monthly * d.months!, a + 3),
          caveats: ['MoneySense suggests 3–6 months, or about 12 if your income is irregular.'],
        };
      }
    }
  });
}
