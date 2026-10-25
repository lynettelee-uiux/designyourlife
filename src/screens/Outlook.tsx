import { ActionBar, Button, Card, Disclosure, Icon, Note, Screen, StageIntro, Stat, StatusBadge, StatusDot, cx } from '../components/ui';
import { OutlookChart } from '../components/LazyOutlookChart';
import { aspirationById } from '../data/aspirations';
import { sourceById } from '../data/sources';
import { ALL_ASSUMPTIONS, SCENARIOS } from '../engine/assumptions';
import { cpfApplies } from '../engine/cpf';
import { inflate } from '../engine/finance';
import { money, months, pct } from '../engine/format';
import { emergencyMonthsAt, emergencyTarget, type GoalResult } from '../engine/goals';
import { balancesAtAge, incomePhaseAt, monthlySnapshot } from '../engine/projection';
import { CATEGORY_LABEL, type Category } from '../engine/types';
import { compareChoice, useSimulation } from '../state/sim';
import { useMemo } from 'react';
import { DISTANCE } from '../components/Distance';
import { LessonsRecap } from '../components/Learning';
import { FutureCard, ShareBar, SkillCard, dreamEmoji, verdictHeadline } from '../components/FutureCard';
import { pickSkills } from '../lite/literacy';
import { futureQuote, strengths } from '../lite/story';
import type { CardData } from '../lite/shareCard';
import { useStore } from '../state/store';

export default function Outlook() {
  const { state, dispatch } = useStore();
  const sim = useSimulation();
  const { plan, projections, goals, chapters, dreams } = sim;
  const p = state.profile;
  const base = projections.baseline;
  const checkAge = Math.max(35, p.age + 10);
  const at = balancesAtAge(plan, base, checkAge);
  const bufferAge = p.age + 3;
  const buffer = emergencyMonthsAt(plan, base, bufferAge);
  const target = emergencyTarget(plan, dreams);
  const mainAge = Math.max(p.age, p.mainIncomeAge);
  const cpfOn = cpfApplies(plan.residency, incomePhaseAt(plan, mainAge)?.kind ?? 'none');
  const cpf55 = balancesAtAge(plan, base, 55).cpf;
  const cpf55Total = cpf55.oa + cpf55.sa + cpf55.ma;
  const inflYears = 20;
  const thousandLater = inflate(1000, SCENARIOS.baseline.inflation, inflYears);
  const snap = monthlySnapshot(plan, mainAge + 2);
  const commitments = (Object.entries(snap.byCategory) as [Category, number][]).sort((a, b) => b[1] - a[1]);
  const counts = goals.reduce((m, g) => ({ ...m, [g.status]: (m[g.status] ?? 0) + 1 }), {} as Record<string, number>);
  const hasOverrides = Object.keys(state.overrides).length > 0;

  // Same principles as Lite: skills come from habits, story choices and gaps; the card never shows amounts.
  const moments = useMemo(
    () =>
      chapters
        .filter((c) => state.decisions[c.scenario.id])
        .map((c) => {
          const cmp = compareChoice(state, c.scenario.id, state.decisions[c.scenario.id]);
          return { scenario: c.scenario.id, choice: state.decisions[c.scenario.id], impact: cmp.liquidNextAfter - cmp.liquidNextBefore };
        }),
    [state, chapters],
  );
  const title = (id: GoalResult['id']) => aspirationById(id).title;
  const nowSnap = monthlySnapshot(plan, p.age);
  const habits = { surprise: state.habits.surprise, tracking: state.habits.tracking };
  const skills = pickSkills({ goals, status: p.status, moments, habits, monthlyLeftover: undefined, lifestyleShare: nowSnap.takeHome > 0 ? (nowSnap.byCategory.lifestyle ?? 0) / nowSnap.takeHome : undefined, invested: plan.investMonthly > 0, dreamTitle: title });
  const strong = strengths({ goals, status: p.status, living: p.living, moments, habits, investMonthly: plan.investMonthly, dreamTitle: title });
  const near = goals.filter((g) => g.status === 'on_track').length;
  const cardGoals = [...goals].sort((a, b) => b.progress - a.progress).slice(0, 3);
  const learned = chapters
    .filter((c) => state.decisions[c.scenario.id])
    .map((c) => {
      const choice = c.scenario.choices.find((x) => x.id === state.decisions[c.scenario.id])!;
      const g = state.guesses?.[c.scenario.id];
      return { title: c.scenario.learn.title, lesson: choice.reflection, right: g ? g === c.scenario.quiz?.(sim.ctx, c.age).answer : undefined };
    });
  const card: CardData = {
    lessons: learned.length,
    headline: verdictHeadline(near, goals.length),
    quote: futureQuote(cardGoals),
    strength: strong.find((t) => !t.includes('within reach')) ?? strong[0],
    skill: skills[0].skill.short,
    dreams: cardGoals.map((g) => ({ title: title(g.id), emoji: dreamEmoji(g.id, dreams.pet?.variant), label: DISTANCE[g.status].label, status: g.status, progress: g.progress })),
    url: new URL('./lite/', window.location.href).href,
  };

  return (
    <Screen wide>
      <StageIntro eyebrow="Stage 5 · Your outlook" title={<>{p.nickname || 'Your'}’s outlook, under today’s assumptions</>}>
        An illustration of where this version of your life could lead — not a prediction, and not financial advice.
      </StageIntro>

      {hasOverrides && (
        <div className="mb-4">
          <Note tone="pink" icon="SlidersHorizontal">
            This includes the changes you tried in “Change one thing”.{' '}
            <button type="button" className="font-semibold underline" onClick={() => dispatch({ type: 'overrides', overrides: {} })}>
              Undo them
            </button>
          </Note>
        </div>
      )}

      <section className="rise-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4" aria-label="Key numbers">
        <Stat label={`Emergency buffer at ${bufferAge}`} value={months(buffer)} sub={`target ${target} months`} tone={buffer >= target ? 'good' : 'warn'} />
        <Stat label={`Net savings & investments at ${checkAge}`} value={money(at.liquidReal, { compact: true })} sub="today’s dollars, baseline" />
        <Stat label="CPF at 55 (simplified)" value={cpfOn ? money(cpf55Total, { compact: true }) : 'Not modelled'} sub={cpfOn ? 'future dollars; not spendable' : 'no mandatory CPF in your path'} />
        <Stat label={`$1,000 of today’s stuff in ${inflYears} yrs`} value={money(thousandLater)} sub={`at ${pct(SCENARIOS.baseline.inflation)} inflation a year`} />
      </section>

      <Card className="mt-4">
        <OutlookChart projections={projections} retireAge={plan.retireAge} />
        {base.firstShortfallAge !== undefined && (
          <div className="mt-3">
            <Note icon="TriangleAlert">
              Under baseline assumptions, savings could run out around age {base.firstShortfallAge}. That’s a signal to explore options — not a verdict.
            </Note>
          </div>
        )}
      </Card>

      <section className="mt-8" aria-labelledby="goals-h">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="goals-h" className="display text-2xl">
            Your dreams, checked
          </h2>
          <p className="text-sm text-ink-mute">
            {counts.on_track ?? 0} on track · {counts.adjust ?? 0} need adjusting · {counts.explore ?? 0} to explore
          </p>
        </div>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {goals.map((g) => (
            <GoalCard key={g.id} g={g} />
          ))}
        </ul>
      </section>

      <LessonsRecap items={learned} />

      <section className="mt-8" aria-labelledby="skills-h">
        <h2 id="skills-h" className="display text-2xl">
          What to work on
        </h2>
        <p className="mt-1 text-sm text-ink-mute">Three money skills from your habits, choices and gaps. Tap one for a tip and a quick check.</p>
        <ol className="mt-3 grid gap-3 sm:grid-cols-1">
          {skills.map((s, i) => (
            <SkillCard key={s.skill.id} pick={s} n={i + 1} />
          ))}
        </ol>
        {strong.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-card">
            <p className="text-sm font-semibold">Your strengths in this version</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {strong.map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-3 py-1 text-xs font-semibold text-sage-700">
                  <Icon name="CircleCheck" className="h-3.5 w-3.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-8" aria-labelledby="card-h">
        <h2 id="card-h" className="display text-2xl">
          Your Future Card
        </h2>
        <p className="mb-3 mt-1 text-sm text-ink-mute">Share where this version could lead — your dreams and skills, never your numbers.</p>
        <div className="mx-auto max-w-md">
          <FutureCard data={card} />
          <ShareBar data={card} />
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Where your money goes at {mainAge + 2}</h2>
          <p className="text-sm text-ink-mute">Take-home about {money(snap.takeHome)}/month (future dollars)</p>
          <SpendBar items={commitments} total={Math.max(snap.takeHome, snap.spend)} />
          <ul className="mt-3 space-y-1 text-sm">
            {commitments.map(([c, v]) => (
              <li key={c} className="flex justify-between gap-3">
                <span className="text-ink-soft">{CATEGORY_LABEL[c]}</span>
                <span className="tabular font-semibold">{money(v)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 border-t border-mist-200 pt-1">
              <span className="text-ink-soft">{snap.surplus >= 0 ? 'Left over (saved or invested)' : 'Shortfall'}</span>
              <span className={cx('tabular font-semibold', snap.surplus < 0 && 'text-magenta-700')}>{money(snap.surplus)}</span>
            </li>
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">The trade-offs you made</h2>
          <ul className="mt-2 space-y-2.5 text-sm">
            {chapters.map((c) => {
              const ch = c.scenario.choices.find((x) => x.id === state.decisions[c.scenario.id]);
              return (
                <li key={c.scenario.id} className="flex gap-3">
                  <span className="w-10 shrink-0 font-semibold text-ink-mute">{c.age}</span>
                  <span>
                    <span className="font-semibold">{c.scenario.title}:</span> {ch ? ch.label.toLowerCase() : <em>not decided</em>}
                  </span>
                </li>
              );
            })}
          </ul>
          <Button variant="ghost" icon="RotateCcw" className="mt-2 -ml-3" onClick={() => dispatch({ type: 'go', stage: 'life' })}>
            Replay a decision
          </Button>
        </Card>
      </section>

      <section className="mt-8 space-y-3" aria-labelledby="how-h">
        <h2 id="how-h" className="display text-2xl">
          How we calculated this
        </h2>
        <Disclosure summary="The method, step by step">
          <ol className="list-decimal space-y-2 pl-5">
            <li>We simulate one year at a time from age {p.age} to 65, in three scenarios (favourable, baseline, challenging) that differ in inflation, pay growth and investment returns.</li>
            <li>Income: your gross pay grows each year; employee CPF (age-based rates, capped at the $8,000 Ordinary Wage ceiling) and estimated resident income tax are taken off to get take-home pay. Employer CPF goes straight to CPF and is never counted as spendable.</li>
            <li>Costs: every recurring cost is entered in today’s dollars and rises with inflation; one-off costs from your story are added in the year they happen.</li>
            <li>Whatever is left goes to investing (up to your planned amount) and then cash. Deficits draw on cash first, then investments. If both run out, we record a shortfall rather than borrowing.</li>
            <li>CPF: contributions are split into OA/SA/MA using 2026 allocation ratios and earn 2.5% (OA) / 4% (SA, MA) plus extra interest on the first $60,000. We stop modelling CPF at 55, when the Retirement Account rules start.</li>
            <li>Goals are checked against these balances. “On track” means the baseline meets the goal; “some adjustments” means it gets at least 70% of the way; otherwise we suggest exploring alternatives.</li>
          </ol>
        </Disclosure>
        <Disclosure summary="The three scenarios">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-ink-mute">
                <th scope="col" className="py-1 font-medium">Scenario</th>
                <th scope="col" className="py-1 text-right font-medium">Inflation</th>
                <th scope="col" className="py-1 text-right font-medium">Pay growth</th>
                <th scope="col" className="py-1 text-right font-medium">Your investments</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {Object.values(SCENARIOS).map((s) => (
                <tr key={s.key} className="border-t border-mist-200">
                  <th scope="row" className="py-1.5 font-semibold">{s.label}</th>
                  <td className="py-1.5 text-right">{pct(s.inflation, 1)}</td>
                  <td className="py-1.5 text-right">{pct(s.salaryGrowth, 1)}</td>
                  <td className="py-1.5 text-right">{pct(s.investReturn[plan.riskLevel], 1)}/yr</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2">These are teaching values, not forecasts. Real returns can be negative for years.</p>
        </Disclosure>
        <Disclosure summary="Assumptions & sources">
          <ul className="space-y-3">
            {ALL_ASSUMPTIONS.map((a) => (
              <li key={a.label}>
                <p className="font-semibold text-ink">
                  {a.label}{' '}
                  <span className={cx('ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', a.status === 'verified' ? 'bg-sage-100 text-sage-700' : a.status === 'estimated' ? 'bg-amber-100 text-amber-700' : 'bg-navy-50 text-navy-700')}>{a.status}</span>
                </p>
                {a.conditions && <p className="mt-0.5">{a.conditions}</p>}
                <p className="mt-0.5 text-xs">
                  {a.sourceIds.map((id, k) => {
                    const s = sourceById(id);
                    return s ? (
                      <span key={id}>
                        {k > 0 && ' · '}
                        <a className="underline underline-offset-2" href={s.url} target="_blank" rel="noreferrer">
                          {s.publisher}
                        </a>
                      </span>
                    ) : null;
                  })}
                  {' '}· Next review: {a.nextReview}
                </p>
              </li>
            ))}
          </ul>
        </Disclosure>
      </section>

      <div className="mt-6">
        <Note icon="Info">
          Illustrative scenarios for learning, based on simplified 2026 Singapore rules. They can’t predict your future, guarantee returns, or replace CPF Board’s own calculators or professional advice.
        </Note>
      </div>

      <ActionBar>
        <Button variant="ghost" icon="ArrowLeft" onClick={() => dispatch({ type: 'go', stage: 'life' })}>
          Back
        </Button>
        <Button iconRight="ArrowRight" onClick={() => dispatch({ type: 'go', stage: 'next' })}>
          Change one thing
        </Button>
      </ActionBar>
    </Screen>
  );
}

export function GoalCard({ g, compact }: { g: GoalResult; compact?: boolean }) {
  const a = aspirationById(g.id);
  return (
    <Card as="li" className="flex flex-col">
      <div className="flex items-start gap-3">
        <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-2xl', a.tint)}>
          <Icon name={a.icon} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{a.title}</h3>
          <div className="mt-1">
            <StatusBadge status={g.status} />
          </div>
        </div>
      </div>
      <p className="mt-3 text-[15px] leading-snug">{g.headline}</p>
      {g.why && (
        <p className="mt-1.5 text-sm leading-snug text-ink-soft">
          <strong className="text-ink">{g.status === 'on_track' ? 'Why it’s within reach: ' : 'Why: '}</strong>
          {g.why}
        </p>
      )}
      {g.gap && (
        <p className="mt-2 rounded-2xl bg-blush-100 p-3 text-sm leading-snug">
          <strong>Closing the gap: </strong>
          {g.gap}
        </p>
      )}
      {!compact && g.detail && <p className="mt-1.5 text-sm leading-relaxed text-ink-mute">{g.detail}</p>}
      {!compact && g.numbers.length > 0 && (
        <dl className="mt-3 space-y-1 text-sm">
          {g.numbers.map((n) => (
            <div key={n.label} className="flex justify-between gap-3">
              <dt className="text-ink-mute">{n.label}</dt>
              <dd className="tabular shrink-0 font-semibold">{n.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-auto flex flex-wrap gap-1.5 pt-3" aria-label="Status in each scenario">
        <StatusDot status={g.byScenario.favourable} label="Favourable" />
        <StatusDot status={g.byScenario.baseline} label="Baseline" />
        <StatusDot status={g.byScenario.challenging} label="Challenging" />
      </div>
    </Card>
  );
}

const CAT_COLOR: Partial<Record<Category, string>> = {
  essentials: '#1A56E5',
  housing: '#D8137A',
  lifestyle: '#2E9A6B',
  family: '#B9608F',
  pet: '#C98A2B',
  travel: '#4FA3B8',
  insurance: '#7A6BC2',
  debt: '#5E5C7A',
  children: '#8A7B5F',
  other: '#A3A8BD',
};

function SpendBar({ items, total }: { items: [Category, number][]; total: number }) {
  return (
    <div className="mt-3 flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-mist-100" aria-hidden>
      {items.map(([c, v]) => (
        <div key={c} style={{ width: `${(v / total) * 100}%`, background: CAT_COLOR[c] }} className="h-full first:rounded-l-full" title={CATEGORY_LABEL[c]} />
      ))}
    </div>
  );
}
