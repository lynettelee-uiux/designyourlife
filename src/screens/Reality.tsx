import { ActionBar, Button, Card, Disclosure, Icon, Screen, StageIntro, Stat, cx } from '../components/ui';
import { DISTANCE, DistanceBadge, DistanceBar } from '../components/Distance';
import { aspirationById } from '../data/aspirations';
import { SCENARIOS } from '../engine/assumptions';
import { money, pct } from '../engine/format';
import type { GoalStatus } from '../engine/goals';
import { monthlySnapshot } from '../engine/projection';
import { SAVE_RATES, type RealityItem } from '../engine/reality';
import { useReality } from '../state/sim';
import { useStore } from '../state/store';

export default function Reality() {
  const { state, dispatch } = useStore();
  const { plan, items, goals, pressure } = useReality();
  const p = state.profile;
  const mainAge = Math.max(p.age, p.mainIncomeAge);
  const later = monthlySnapshot(plan, mainAge);
  const near = goals.filter((g) => g.status === 'on_track').length;
  const order: GoalStatus[] = ['explore', 'adjust', 'on_track'];
  // Dreams that need most attention first.
  const sorted = [...goals].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.progress - b.progress);
  const headline =
    near === goals.length ? 'Every dream looks within reach' : near === 0 ? 'Your dreams are further away — for now' : `${near} of ${goals.length} dreams ${near === 1 ? 'looks' : 'look'} within reach`;

  return (
    <Screen>
      <StageIntro eyebrow="Stage 2 · Reality check" title="How close is the future you want?">
        If you carried on exactly as you are today — before any of life’s twists — here’s how near each dream could be.
      </StageIntro>

      {/* Verdict */}
      <section aria-labelledby="verdict" className="rise-2 overflow-hidden rounded-3xl bg-navy-800 p-5 text-white sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-magenta-300">Your starting point</p>
        <h2 id="verdict" className="display mt-1 text-[26px] leading-tight text-white sm:text-3xl">
          {headline}
        </h2>
        <ul className="mt-5 space-y-3.5">
          {sorted.map((g) => {
            const a = aspirationById(g.id);
            return (
              <li key={g.id}>
                <a href={`#dream-${g.id}`} className="block rounded-xl">
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-[15px]">
                    <span className="flex items-center gap-2 font-semibold">
                      <Icon name={a.icon} className="h-4 w-4 text-magenta-300" />
                      {a.title}
                    </span>
                    <span className="text-xs font-semibold text-navy-100">{DISTANCE[g.status].label}</span>
                  </div>
                  <DistanceBar status={g.status} progress={g.progress} onDark label={`${a.title}: distance`} />
                </a>
              </li>
            );
          })}
        </ul>
        {pressure && (
          <div className="mt-5 rounded-2xl bg-white/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <Icon name="Lightbulb" className="h-4 w-4 text-magenta-300" />
              Biggest pressure: {aspirationById(pressure.id).title.toLowerCase()}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-navy-100">
              It competes with your other dreams for the same money. Set aside for now, {pressure.nearWithout} of your {pressure.others} other dream{pressure.others === 1 ? '' : 's'} would look within reach (now {pressure.nearNow}). Moving it later or making it cheaper could also help.
            </p>
            <button type="button" onClick={() => dispatch({ type: 'go', stage: 'dream' })} className="mt-2 text-sm font-semibold text-white underline underline-offset-4">
              Adjust my dreams
            </button>
          </div>
        )}
        <p className="mt-5 text-xs leading-relaxed text-navy-100">
          Baseline assumptions: prices rise about {pct(SCENARIOS.baseline.inflation)} a year and pay grows about {pct(SCENARIOS.baseline.salaryGrowth)}. An illustration, not a prediction.
        </p>
      </section>

      {/* One card per dream */}
      <ul className="mt-5 space-y-3">
        {sorted.map((g) => {
          const a = aspirationById(g.id);
          const it = items.find((i) => i.id === g.id)!;
          return (
            <Card as="li" key={g.id}>
              <div id={`dream-${g.id}`} className="flex scroll-mt-32 items-start gap-3">
                <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-2xl', a.tint)}>
                  <Icon name={a.icon} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{a.title}</h3>
                    <DistanceBadge status={g.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-ink-mute">{it.summary}</p>
                </div>
              </div>

              <div className="mt-4">
                <DistanceBar status={g.status} progress={g.progress} label={`${a.title}: distance`} />
                <p className="mt-1.5 text-xs font-semibold text-ink-mute">{g.progress >= 1 ? 'Your current path gets you there' : g.progress < 0.05 ? 'Not within reach on your current path yet' : `About ${Math.round(g.progress * 100)}% of the way on your current path`}</p>
              </div>

              <p className="mt-3 text-[16px] leading-snug">{g.headline}</p>

              {g.gap && (
                <div className="mt-3 flex gap-2.5 rounded-2xl bg-blush-100 p-3.5 text-[14px] leading-relaxed">
                  <Icon name="Lightbulb" className="mt-0.5 h-4 w-4 shrink-0 text-magenta-700" />
                  <p>
                    <strong>What could close the gap: </strong>
                    {g.gap}
                  </p>
                </div>
              )}

              <Disclosure summary="See the numbers" className="mt-3">
                <Numbers it={it} />
              </Disclosure>
            </Card>
          );
        })}
      </ul>

      <Disclosure summary={`Your monthly money ${mainAge > p.age ? `once main work starts at ${mainAge}` : 'today'}`} className="mt-4">
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label="Take-home after CPF & tax" value={money(later.takeHome)} sub={later.employeeCpf ? `+ ${money(later.employeeCpf + later.employerCpf)} into CPF` : undefined} />
          <Stat label="Costs at that point" value={money(later.spend)} sub={`${money(later.surplus)} left`} tone={later.surplus < 0 ? 'warn' : 'default'} />
        </div>
        <p className="mt-3">Every dream above is checked against this same budget, so dreams that cost money every month compete with each other.</p>
      </Disclosure>

      <section className="mt-8 rounded-3xl bg-blush-100 p-6 text-center">
        <h2 className="display text-2xl">Still the future you want?</h2>
        <p className="mt-2 text-ink-soft">Next, see how your everyday choices — and a few of life’s surprises — move you nearer or further. You can change your dreams any time.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button iconRight="ArrowRight" onClick={() => dispatch({ type: 'go', stage: 'habits' })}>
            Yes — let’s live it
          </Button>
          <Button variant="secondary" icon="Pencil" onClick={() => dispatch({ type: 'go', stage: 'dream' })}>
            Tweak my dreams
          </Button>
        </div>
      </section>

      <ActionBar>
        <Button variant="ghost" icon="ArrowLeft" onClick={() => dispatch({ type: 'go', stage: 'dream' })}>
          Back
        </Button>
        <Button iconRight="ArrowRight" onClick={() => dispatch({ type: 'go', stage: 'habits' })}>
          Continue
        </Button>
      </ActionBar>
    </Screen>
  );
}

function Numbers({ it }: { it: RealityItem }) {
  return (
    <div className="space-y-3">
      <dl className="space-y-1.5">
        {it.lines.map((l) => (
          <div key={l.label} className="flex items-baseline justify-between gap-3">
            <dt>
              {l.label}
              {l.note && <span className="block text-xs text-ink-mute">{l.note}</span>}
            </dt>
            <dd className="tabular shrink-0 font-semibold text-ink">
              {money(l.value)}
              {l.suffix}
            </dd>
          </div>
        ))}
        {it.yearsToPrepare !== undefined && it.yearsToPrepare > 0 && (
          <div className="flex items-baseline justify-between gap-3">
            <dt>Time to prepare</dt>
            <dd className="font-semibold text-ink">
              {it.yearsToPrepare} year{it.yearsToPrepare === 1 ? '' : 's'}
            </dd>
          </div>
        )}
      </dl>
      {it.monthlyToSave && it.target && Number.isFinite(it.monthlyToSave.cash) && (
        <p className="rounded-2xl bg-mist-50 p-3">
          On its own, building {money(it.target.amount)} by {it.target.age} from zero takes about <strong className="text-ink">{money(it.monthlyToSave.cash)}/mo</strong> in savings (~{pct(SAVE_RATES.cash)} interest), or{' '}
          <strong className="text-ink">{money(it.monthlyToSave.invested)}/mo</strong> if invested at an illustrative {pct(SAVE_RATES.invested)} — not guaranteed, and could be lower or negative.
        </p>
      )}
      {it.caveats.length > 0 && (
        <ul className="space-y-1 text-xs text-ink-mute">
          {it.caveats.map((c) => (
            <li key={c}>· {c}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
