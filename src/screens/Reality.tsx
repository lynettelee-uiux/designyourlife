import { ActionBar, Button, Card, Icon, Note, Screen, StageIntro, Stat, cx } from '../components/ui';
import { aspirationById } from '../data/aspirations';
import { SCENARIOS } from '../engine/assumptions';
import { money, pct } from '../engine/format';
import { monthlySnapshot } from '../engine/projection';
import { SAVE_RATES } from '../engine/reality';
import { useReality } from '../state/sim';
import { useStore } from '../state/store';

export default function Reality() {
  const { state, dispatch } = useStore();
  const { plan, items } = useReality();
  const p = state.profile;
  const mainAge = Math.max(p.age, p.mainIncomeAge);
  const now = monthlySnapshot(plan, p.age);
  const later = monthlySnapshot(plan, mainAge);
  const recurring = items.reduce((s, i) => s + (i.recurringMonthly ?? 0), 0);

  return (
    <Screen>
      <StageIntro eyebrow="Stage 2 · Reality check" title="Here’s what your future might involve">
        Rough, indicative numbers in 2026 prices. We assume prices rise about {pct(SCENARIOS.baseline.inflation)} a year — a baseline, not a forecast.
      </StageIntro>

      <Card className="rise-2">
        <h2 className="font-semibold">Your monthly money {mainAge > p.age ? `once main work starts at ${mainAge}` : 'today'}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Stat label="Take-home after CPF & tax" value={money(later.takeHome)} sub={later.employeeCpf ? `+ ${money(later.employeeCpf + later.employerCpf)} into CPF` : undefined} />
          <Stat label="Costs at that point" value={money(later.spend)} sub={`${money(later.surplus)} left`} tone={later.surplus < 0 ? 'warn' : 'default'} />
        </div>
        {mainAge > p.age && (
          <p className="mt-3 text-sm text-ink-mute">
            Right now: about {money(now.takeHome)} coming in and {money(now.spend)} going out each month.
          </p>
        )}
        {recurring > 0 && later.takeHome > 0 && (
          <p className="mt-3 text-sm">
            Once they’ve all started, your dreams’ recurring costs add up to about <strong>{money(recurring)}/month</strong> — roughly <strong>{pct(recurring / later.takeHome)}</strong> of that take-home pay.
          </p>
        )}
      </Card>

      <ul className="mt-4 space-y-3">
        {items.map((it) => {
          const a = aspirationById(it.id);
          return (
            <Card as="li" key={it.id}>
              <div className="flex items-start gap-3">
                <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-2xl', a.tint)}>
                  <Icon name={a.icon} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="text-[15px] leading-snug text-ink-soft">{it.summary}</p>
                </div>
              </div>
              <dl className="mt-3 space-y-1.5">
                {it.lines.map((l) => (
                  <div key={l.label} className="flex items-baseline justify-between gap-3 text-sm">
                    <dt className="text-ink-mute">
                      {l.label}
                      {l.note && <span className="block text-xs">{l.note}</span>}
                    </dt>
                    <dd className="tabular shrink-0 font-semibold">
                      {money(l.value)}
                      {l.suffix}
                    </dd>
                  </div>
                ))}
                {it.yearsToPrepare !== undefined && it.yearsToPrepare > 0 && (
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <dt className="text-ink-mute">Time to prepare</dt>
                    <dd className="font-semibold">
                      {it.yearsToPrepare} year{it.yearsToPrepare === 1 ? '' : 's'}
                    </dd>
                  </div>
                )}
              </dl>
              {it.monthlyToSave && it.target && Number.isFinite(it.monthlyToSave.cash) && (
                <div className="mt-3 rounded-2xl bg-mist-50 p-3 text-sm">
                  <p className="font-semibold">
                    To build {money(it.target.amount)} by {it.target.age}, starting from zero:
                  </p>
                  <p className="mt-1 text-ink-soft">
                    about <strong className="text-ink">{money(it.monthlyToSave.cash)}/mo</strong> in savings (~{pct(SAVE_RATES.cash)} interest), or <strong className="text-ink">{money(it.monthlyToSave.invested)}/mo</strong> if invested at an illustrative {pct(SAVE_RATES.invested)} — which is not guaranteed and could be lower or negative.
                  </p>
                </div>
              )}
              {it.caveats.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs leading-relaxed text-ink-mute">
                  {it.caveats.map((c) => (
                    <li key={c} className="flex gap-2">
                      <span aria-hidden>·</span>
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </ul>

      <div className="mt-4">
        <Note>
          Each dream is shown on its own here, so the monthly amounts aren’t meant to be added up — the same savings can’t pay for everything. The next stages show how they fit together.
        </Note>
      </div>

      <section className="mt-8 rounded-3xl bg-blush-100 p-6 text-center">
        <h2 className="display text-2xl">Still the future you want?</h2>
        <p className="mt-2 text-ink-soft">Let’s see how your decisions could shape it. You can change your dreams any time — no penalty.</p>
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
