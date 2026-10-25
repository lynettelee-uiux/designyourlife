import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionBar, Button, Card, Icon, Screen, StageIntro, StatusDot, cx } from '../components/ui';
import { aspirationById } from '../data/aspirations';
import { sourceById } from '../data/sources';
import { money } from '../engine/format';
import type { AspirationId } from '../engine/profile';
import type { GoalStatus } from '../engine/goals';
import { compareChoice, downturnPaths, useSimulation } from '../state/sim';
import { GuessPanel, LessonReveal } from '../components/Learning';
import { monthlySnapshot } from '../engine/projection';
import { useStore } from '../state/store';

export default function LifeHappens() {
  const { state, dispatch } = useStore();
  const { chapters, ctx } = useSimulation();
  const firstOpen = chapters.findIndex((c) => !state.decisions[c.scenario.id]);
  const [i, setI] = useState(firstOpen === -1 ? 0 : firstOpen);
  const idx = Math.min(i, chapters.length - 1);
  const ch = chapters[idx];
  const choiceId = ch ? state.decisions[ch.scenario.id] : undefined;
  const choice = ch?.scenario.choices.find((c) => c.id === choiceId);
  const guess = ch ? state.guesses?.[ch.scenario.id] : undefined;
  const allDone = chapters.every((c) => state.decisions[c.scenario.id]);
  const resultRef = useRef<HTMLDivElement>(null);

  const cmp = useMemo(() => (ch && choiceId ? compareChoice(state, ch.scenario.id, choiceId) : null), [state, ch, choiceId]);

  useEffect(() => {
    if (choiceId && resultRef.current) resultRef.current.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, [choiceId, guess]);

  if (!ch) return null;
  const s = ch.scenario;

  return (
    <Screen>
      <StageIntro eyebrow="Stage 4 · Life happens" title={s.title}>
        <span className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft">Age {ch.age}</span>
          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft">{s.topic}</span>
          {s.unexpected && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"><Icon name="Zap" className="h-3 w-3" />Unexpected — but plausible</span>}
        </span>
      </StageIntro>

      <Timeline current={idx} onPick={setI} />

      <Card className="rise-2 mt-4">
        <p className="text-[17px] leading-relaxed">{s.story(ctx, ch.age)}</p>
        <div className="mt-5 space-y-2.5" role="group" aria-label="Choose what you'd do">
          {s.choices.map((c) => {
            const on = c.id === choiceId;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => dispatch({ type: 'decide', scenarioId: s.id, choiceId: c.id })}
                className={cx('w-full rounded-2xl border px-4 py-3.5 text-left transition-colors', on ? 'border-navy-800 bg-navy-50' : 'border-mist-300 bg-white hover:border-ink-soft', choiceId && !on && 'opacity-70')}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-semibold">{c.label}</span>
                  {on && <Icon name="CircleCheck" className="h-5 w-5 shrink-0 text-navy-800" />}
                </span>
                {c.detail && <span className="mt-0.5 block text-xs text-ink-mute">{c.detail}</span>}
              </button>
            );
          })}
        </div>
      </Card>

      {choice && cmp && !guess && <GuessPanel age={ch.age} onGuess={(g) => dispatch({ type: 'guess', scenarioId: s.id, guess: g })} />}
      {choice && cmp && guess && (
        <div ref={resultRef} className="mt-4 scroll-mt-28 space-y-3" aria-live="polite">
          <LessonReveal guess={guess} impact={cmp.liquidNextAfter - cmp.liquidNextBefore} lesson={choice.reflection} title={s.learn.title} />
          <Card className="rise">
            <p className="eyebrow">What happens</p>
            <p className="mt-1 text-[16px] leading-relaxed">{choice.outcome(ctx, ch.age)}</p>

            <h3 className="mt-4 text-sm font-semibold text-ink-soft">Straight away</h3>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              <Delta label={`Left over each month at ${cmp.age}`} before={cmp.surplusBefore} after={cmp.surplusAfter} />
              {cmp.oneOff !== 0 ? (
                <div className="rounded-2xl bg-mist-50 p-3.5">
                  <p className="text-xs font-medium text-ink-mute">{cmp.oneOff > 0 ? 'One-off cost' : 'One-off saving'}</p>
                  <p className="tabular mt-0.5 text-xl font-semibold">{money(Math.abs(cmp.oneOff))}</p>
                  <p className="text-xs text-ink-mute">today’s dollars</p>
                </div>
              ) : (
                <Delta label={`Savings & investments at ${cmp.age + 1}`} before={cmp.liquidNextBefore} after={cmp.liquidNextAfter} />
              )}
            </div>

            <h3 className="mt-4 text-sm font-semibold text-ink-soft">Longer term</h3>
            <LongTerm checkAge={cmp.checkAge} before={cmp.longBefore} after={cmp.longAfter} />
            {cmp.goalChanges.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {cmp.goalChanges.map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">{aspirationById(g.id as AspirationId).title}:</span>
                    <StatusDot status={g.from as GoalStatus} label="before" />
                    <Icon name="ArrowRight" className="h-3.5 w-3.5" />
                    <StatusDot status={g.to as GoalStatus} label="now" />
                  </li>
                ))}
              </ul>
            )}
            {s.id === 'downturn' && <DownturnTable checkAge={cmp.checkAge} />}
            {s.id === 'first_offer' && <FirstPay age={ch.age} />}
          </Card>


          <section className="rounded-3xl border border-mist-200 bg-white p-5">
            <p className="text-sm font-semibold">{s.learn.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{s.learn.body}</p>
            {s.learn.sourceIds && s.learn.sourceIds.length > 0 && (
              <p className="mt-2 text-xs text-ink-mute">
                Source:{' '}
                {s.learn.sourceIds.map((id, k) => {
                  const src = sourceById(id);
                  return src ? (
                    <span key={id}>
                      {k > 0 && '; '}
                      <a className="underline underline-offset-2" href={src.url} target="_blank" rel="noreferrer">
                        {src.publisher.split(' (')[0]} — {src.title.length > 60 ? src.title.slice(0, 57) + '…' : src.title}
                      </a>
                    </span>
                  ) : null;
                })}
              </p>
            )}
          </section>

          <div className="flex justify-center">
            <Button variant="ghost" icon="RotateCcw" onClick={() => dispatch({ type: 'undecide', scenarioId: s.id })}>
              Replay this moment
            </Button>
          </div>
        </div>
      )}

      <ActionBar>
        <Button variant="ghost" icon="ArrowLeft" onClick={() => (idx === 0 ? dispatch({ type: 'go', stage: 'habits' }) : setI(idx - 1))}>
          Back
        </Button>
        {idx < chapters.length - 1 ? (
          <Button iconRight="ArrowRight" disabled={!choiceId || !guess} onClick={() => setI(idx + 1)}>
            {!choiceId ? 'Make a choice' : !guess ? 'Make a guess' : 'Got it — next chapter'}
          </Button>
        ) : (
          <Button iconRight="ArrowRight" disabled={!allDone || !guess} onClick={() => dispatch({ type: 'go', stage: 'outlook' })}>
            {allDone ? 'See my outlook' : 'Finish every chapter'}
          </Button>
        )}
      </ActionBar>
    </Screen>
  );
}

function Timeline({ current, onPick }: { current: number; onPick: (i: number) => void }) {
  const { state } = useStore();
  const { chapters } = useSimulation();
  return (
    <nav aria-label="Life chapters" className="-mx-4 overflow-x-auto px-4">
      <ol className="flex min-w-max gap-2">
        {chapters.map((c, k) => {
          const done = !!state.decisions[c.scenario.id];
          return (
            <li key={c.scenario.id}>
              <button
                type="button"
                onClick={() => onPick(k)}
                aria-current={k === current ? 'step' : undefined}
                className={cx('flex min-h-[40px] items-center gap-1.5 rounded-full border px-3 text-xs font-semibold', k === current ? 'border-navy-800 bg-navy-800 text-white' : done ? 'border-mist-300 bg-white text-ink' : 'border-dashed border-mist-300 text-ink-mute')}
              >
                {done && k !== current && <Icon name="Check" className="h-3.5 w-3.5" />}
                {c.age} · {c.scenario.topic}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Delta({ label, before, after }: { label: string; before: number; after: number }) {
  const d = after - before;
  return (
    <div className="rounded-2xl bg-mist-50 p-3.5">
      <p className="text-xs font-medium text-ink-mute">{label}</p>
      <p className="tabular mt-0.5 text-xl font-semibold">{money(after)}</p>
      <p className={cx('tabular text-xs font-semibold', d < 0 ? 'text-magenta-700' : d > 0 ? 'text-sage-700' : 'text-ink-mute')}>{Math.abs(d) < 1 ? 'no change' : `${money(d, { sign: true })} vs if this hadn’t happened`}</p>
    </div>
  );
}

function LongTerm({ checkAge, before, after }: { checkAge: number; before: number; after: number }) {
  const d = after - before;
  const tone = Math.abs(d) < 50 ? 'text-ink-soft' : d < 0 ? 'text-magenta-700' : 'text-sage-700';
  return (
    <p className="mt-1 text-[15px] leading-relaxed">
      By age {checkAge}, your savings and investments could be about <strong>{money(after)}</strong> in today’s dollars —{' '}
      <span className={cx('font-semibold', tone)}>{Math.abs(d) < 50 ? 'about the same as' : `${money(Math.abs(d))} ${d < 0 ? 'less' : 'more'} than`}</span> if this moment hadn’t happened, under baseline assumptions.
    </p>
  );
}

function DownturnTable({ checkAge }: { checkAge: number }) {
  const { state } = useStore();
  const rows = useMemo(() => downturnPaths(state, checkAge), [state, checkAge]);
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-ink-soft">Same choice, different futures (savings at {checkAge}, today’s $)</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Savings and investments at age {checkAge} for each response, under three market scenarios</caption>
          <thead>
            <tr className="text-xs text-ink-mute">
              <th scope="col" className="py-1.5 pr-2 font-medium">Response</th>
              <th scope="col" className="px-2 py-1.5 text-right font-medium">Favourable</th>
              <th scope="col" className="px-2 py-1.5 text-right font-medium">Baseline</th>
              <th scope="col" className="py-1.5 pl-2 text-right font-medium">Challenging</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-mist-200">
                <th scope="row" className="py-2 pr-2 font-semibold">{r.label.split(' ').slice(0, 3).join(' ')}…</th>
                <td className="px-2 py-2 text-right">{money(r.favourable, { compact: true })}</td>
                <td className="px-2 py-2 text-right">{money(r.baseline, { compact: true })}</td>
                <td className="py-2 pl-2 text-right">{money(r.challenging, { compact: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-mute">No path is guaranteed. In the challenging case, markets don’t recover within the period shown.</p>
    </div>
  );
}

function FirstPay({ age }: { age: number }) {
  const { plan } = useSimulation();
  const m = monthlySnapshot(plan, age);
  if (m.employeeCpf === 0) return null;
  return (
    <div className="mt-4 rounded-2xl bg-mist-50 p-4">
      <h3 className="text-sm font-semibold">Your first payslip, roughly</h3>
      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between"><dt className="text-ink-soft">Gross pay</dt><dd className="tabular font-semibold">{money(m.gross)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-soft">Your CPF (20%)</dt><dd className="tabular font-semibold text-magenta-700">{money(-m.employeeCpf)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-soft">Tax set-aside (est.)</dt><dd className="tabular font-semibold text-magenta-700">{money(-m.tax)}</dd></div>
        <div className="flex justify-between border-t border-mist-200 pt-1"><dt className="font-semibold">Take-home</dt><dd className="tabular font-semibold">{money(m.takeHome)}</dd></div>
      </dl>
      <p className="mt-2 text-xs text-ink-mute">Plus {money(m.employerCpf)} from your employer straight into your CPF — on top of your gross pay.</p>
    </div>
  );
}
