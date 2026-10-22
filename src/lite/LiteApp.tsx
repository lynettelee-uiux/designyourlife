import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionBar, Button, Card, Icon, Note, Segmented, Slider, cx } from '../components/ui';
import { DISTANCE, DistanceBadge, DistanceBar } from '../components/Distance';
import { aspirationById } from '../data/aspirations';
import { money } from '../engine/format';
import { paycheck } from '../engine/paycheck';
import { STATUS_INFO, type AspirationId, type Dreams, type LifeStatus, type Living } from '../engine/profile';
import { balancesAtAge, projectAll } from '../engine/projection';
import type { GoalResult } from '../engine/goals';
import { LITE_DREAMS, MAX_DREAMS, dreamAlreadyMet, liteSimulate, type LiteInput, type LiteResult } from './liteSim';

const STEPS = ['You', 'Dreams', 'Life happens', 'Results'];

const SITUATIONS: { value: LifeStatus; label: string; icon: string }[] = [
  { value: 'uni_student', label: 'Studying at uni', icon: 'GraduationCap' },
  { value: 'poly_student', label: 'Studying at poly / ITE', icon: 'GraduationCap' },
  { value: 'nsf', label: 'Serving NS', icon: 'ShieldCheck' },
  { value: 'employed', label: 'Working full-time', icon: 'Briefcase' },
  { value: 'part_time_gig', label: 'Gig or part-time', icon: 'Zap' },
  { value: 'between_jobs', label: 'Between jobs', icon: 'Compass' },
];

const LINKS = [
  { title: 'MoneySense', url: 'https://www.moneysense.gov.sg/', why: 'Free guides on budgeting, saving and insurance' },
  { title: 'CPF Board', url: 'https://www.cpf.gov.sg/', why: 'How CPF works for housing, health and retirement' },
  { title: 'ScamShield', url: 'https://www.scamshield.gov.sg/', why: 'Check suspicious offers before you act' },
];

export default function LiteApp() {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<LiteInput>({ age: 22, status: 'employed', living: 'family', dreams: {}, overrides: {} });
  const set = (patch: Partial<LiteInput>) => setInput((i) => ({ ...i, ...patch }));
  const result = useMemo(() => liteSimulate(input), [input]);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    const h = document.querySelector<HTMLElement>('main h1');
    h?.setAttribute('tabindex', '-1');
    h?.focus({ preventScroll: true });
  }, [step]);

  const picked = Object.keys(input.dreams).length;
  const canNext = step === 1 ? result.goals.length > 0 : step === 2 ? !!input.twistChoice || !result.twist : true;

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-mist-200/80 bg-mist-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-2.5">
          <span className="flex items-center gap-2">
            <span aria-hidden className="grid h-7 w-7 place-items-center rounded-[9px] bg-navy-800">
              <span className="h-2.5 w-2.5 rounded-full bg-magenta-500" />
            </span>
            <span className="display text-[17px]">Design Your Life</span>
            <span className="rounded-full bg-magenta-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-magenta-700">Lite</span>
          </span>
          <a href="../" className="text-sm font-semibold text-ink-soft underline-offset-4 hover:underline">
            Full version
          </a>
        </div>
        <nav aria-label="Progress" className="mx-auto max-w-xl px-4 pb-2.5">
          <ol className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <li key={s} className="flex-1" aria-current={i === step ? 'step' : undefined}>
                <span className={cx('block h-1.5 rounded-full', i < step ? 'bg-navy-800' : i === step ? 'bg-magenta-500' : 'bg-mist-200')} />
                <span className="sr-only">{`${i + 1}. ${s}`}</span>
              </li>
            ))}
          </ol>
          <p className="mt-1 text-[11px] font-semibold text-ink-mute">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </p>
        </nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-xl px-4 pb-28 pt-4">
        {step === 0 && <StepYou input={input} set={set} />}
        {step === 1 && <StepDreams input={input} set={set} result={result} picked={picked} />}
        {step === 2 && <StepTwist input={input} set={set} result={result} />}
        {step === 3 && <StepResults input={input} set={set} result={result} onRestart={() => { setInput({ age: 22, status: 'employed', living: 'family', dreams: {}, overrides: {} }); setStep(0); }} />}
      </main>

      {step < 3 && (
        <ActionBar>
          <Button variant="ghost" icon="ArrowLeft" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </Button>
          <Button iconRight="ArrowRight" disabled={!canNext} onClick={() => setStep(step + 1)}>
            {step === 0 ? 'Next' : step === 1 ? (canNext ? 'Add a twist' : 'Pick a dream') : canNext ? 'See my results' : 'Make a choice'}
          </Button>
        </ActionBar>
      )}
    </>
  );
}

type StepProps = { input: LiteInput; set: (p: Partial<LiteInput>) => void };

function Intro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="rise mb-5 mt-2">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-2 text-[28px] leading-[1.15]">{title}</h1>
      {children && <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{children}</p>}
    </header>
  );
}

function StepYou({ input, set }: StepProps) {
  return (
    <>
      <Intro eyebrow="Your future in 3 minutes" title="Let’s start with you">
        Three quick taps. No names, no sign-up — and nothing is saved.
      </Intro>
      <Card className="rise-2 space-y-6">
        <Slider label="Your age" value={input.age} min={18} max={35} onChange={(v) => set({ age: v })} />
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink-soft">Right now I’m…</legend>
          <div className="grid grid-cols-2 gap-2">
            {SITUATIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={input.status === s.value}
                onClick={() => set({ status: s.value, twistChoice: undefined })}
                className={cx('flex min-h-[56px] items-center gap-2 rounded-2xl border px-3 text-left text-sm font-semibold', input.status === s.value ? 'border-navy-800 bg-navy-50' : 'border-mist-300 bg-white')}
              >
                <Icon name={s.icon} className="h-4 w-4 shrink-0 text-ink-soft" />
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">I live…</p>
          <Segmented<Living>
            label="Living arrangement"
            value={input.living}
            onChange={(v) => set({ living: v, twistChoice: undefined })}
            options={[
              { value: 'family', label: 'With family' },
              { value: 'room', label: 'Renting' },
              { value: 'own', label: 'Own home' },
            ]}
          />
        </div>
      </Card>
      <p className="mt-4 text-center text-xs text-ink-mute">We fill in typical income and costs for your situation. Want to use your own numbers? Try the full version.</p>
    </>
  );
}

function StepDreams({ input, set, result, picked }: StepProps & { result: LiteResult; picked: number }) {
  const toggle = (id: AspirationId) => {
    const d: Dreams = { ...input.dreams };
    if (d[id]) delete d[id];
    else if (picked < MAX_DREAMS) d[id] = { id };
    set({ dreams: d, twistChoice: undefined });
  };
  return (
    <>
      <Intro eyebrow="Dream" title="Pick up to 3 dreams">
        We’ll show how near each one is if you carry on as you are today.
      </Intro>
      <div className="rise-2 grid grid-cols-2 gap-2.5" role="group" aria-label="Dreams">
        {LITE_DREAMS.map((id) => {
          const a = aspirationById(id);
          const met = dreamAlreadyMet(id, input.living);
          const on = !!input.dreams[id] && !met;
          const full = !on && picked >= MAX_DREAMS;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              disabled={!!met || full}
              onClick={() => toggle(id)}
              className={cx(
                'relative flex min-h-[96px] flex-col items-start rounded-3xl border p-3.5 text-left transition-colors',
                on ? 'border-navy-800 bg-white shadow-card' : 'border-mist-200 bg-white/60',
                (met || full) && 'cursor-not-allowed opacity-55',
              )}
            >
              <span className={cx('grid h-9 w-9 place-items-center rounded-2xl', a.tint)}>
                <Icon name={a.icon} />
              </span>
              <span className="mt-2 text-[15px] font-semibold leading-tight">{a.title}</span>
              <span className="text-xs text-ink-mute">{met ?? a.blurb}</span>
              {on && (
                <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-navy-800 text-white">
                  <Icon name="Check" className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-mute" aria-live="polite">
        {picked}/{MAX_DREAMS} picked · typical amounts and timings used
      </p>
      {result.goals.length > 0 && <Verdict result={result} title="Your starting point" />}
    </>
  );
}

function Verdict({ result, title }: { result: LiteResult; title: string }) {
  const { goals, pressure } = result;
  const near = goals.filter((g) => g.status === 'on_track').length;
  const headline = near === goals.length ? 'Every dream looks within reach' : near === 0 ? 'Your dreams are further away — for now' : `${near} of ${goals.length} dreams ${near === 1 ? 'looks' : 'look'} within reach`;
  return (
    <section aria-live="polite" className="mt-5 rounded-3xl bg-navy-800 p-5 text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-magenta-300">{title}</p>
      <h2 className="display mt-1 text-2xl leading-tight text-white">{headline}</h2>
      <ul className="mt-4 space-y-3">
        {goals.map((g) => (
          <GoalRow key={g.id} g={g} />
        ))}
      </ul>
      {pressure && (
        <p className="mt-4 flex gap-2 rounded-2xl bg-white/10 p-3 text-sm leading-relaxed text-navy-100">
          <Icon name="Lightbulb" className="mt-0.5 h-4 w-4 shrink-0 text-magenta-300" />
          <span>
            <strong className="text-white">{aspirationById(pressure.id).title}</strong> puts the most pressure on the others. Eased or moved later, {othersPhrase(pressure.nearWithout, pressure.others)} could be within reach.
          </span>
        </p>
      )}
    </section>
  );
}

function GoalRow({ g }: { g: GoalResult }) {
  const a = aspirationById(g.id);
  return (
    <li>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[15px]">
        <span className="flex items-center gap-2 font-semibold">
          <Icon name={a.icon} className="h-4 w-4 text-magenta-300" />
          {a.title}
        </span>
        <span className="text-xs font-semibold text-navy-100">{DISTANCE[g.status].label}</span>
      </div>
      <DistanceBar status={g.status} progress={g.progress} onDark label={`${a.title}: distance`} />
    </li>
  );
}

function StepTwist({ input, set, result }: StepProps & { result: LiteResult }) {
  const t = result.twist;
  const without = useMemo(() => liteSimulate({ ...input, twistChoice: undefined }), [input]);
  if (!t) return <Intro eyebrow="Life happens" title="No surprises this time" />;
  const choice = t.scenario.choices.find((c) => c.id === input.twistChoice);
  const savedAt = (r: LiteResult) => balancesAtAge(r.plan, projectAll(r.plan).baseline, t.age + 1).liquid;
  const delta = choice ? savedAt(result) - savedAt(without) : 0;
  return (
    <>
      <Intro eyebrow={`Life happens · age ${t.age}`} title={t.scenario.title} />
      <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        <Icon name="Zap" className="h-3 w-3" />
        Unexpected — but plausible
      </span>
      <Card className="rise-2">
        <p className="text-[17px] leading-relaxed">{t.scenario.story(t.ctx, t.age)}</p>
        <div className="mt-5 space-y-2.5" role="group" aria-label="What would you do?">
          {t.scenario.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === input.twistChoice}
              onClick={() => set({ twistChoice: c.id })}
              className={cx('w-full rounded-2xl border px-4 py-3.5 text-left text-[15px] font-semibold', c.id === input.twistChoice ? 'border-navy-800 bg-navy-50' : 'border-mist-300 bg-white')}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Card>
      {choice && (
        <Card className="rise mt-3" as="div">
          <p className="eyebrow">What happens</p>
          <p className="mt-1 text-[16px] leading-relaxed">{choice.outcome(t.ctx, t.age)}</p>
          <p className="mt-3 text-sm">
            Savings at {t.age + 1}: <strong className={cx('tabular', delta < -1 ? 'text-magenta-700' : 'text-ink')}>{Math.abs(delta) < 1 ? 'no change' : `${money(delta, { sign: true })} vs if this hadn’t happened`}</strong>
          </p>
          <p className="mt-3 rounded-2xl bg-blush-100 p-3 text-sm leading-relaxed">{choice.reflection}</p>
        </Card>
      )}
    </>
  );
}

function StepResults({ input, set, result, onRestart }: StepProps & { result: LiteResult; onRestart: () => void }) {
  const p = result.profile;
  const lifestyleNow = result.plan.recurring.find((r) => r.id === 'lifestyle')?.monthly ?? p.lifestyle;
  const investNow = result.plan.investMonthly;
  const info = STATUS_INFO[p.status];
  const pay = paycheck(p.mainIncome, Math.max(p.age, p.mainIncomeAge), p.residency, info.mainKind, 2026);
  return (
    <>
      <Intro eyebrow="Your results" title="Here’s where you could land">
        After life’s twist, under today’s assumptions. An illustration — not a prediction or financial advice.
      </Intro>
      <Verdict result={result} title="Your outlook" />

      <ul className="mt-4 space-y-2.5">
        {result.goals.map((g) => (
          <Card as="li" key={g.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{aspirationById(g.id).title}</h3>
              <DistanceBadge status={g.status} />
            </div>
            <p className="mt-1.5 text-sm leading-snug text-ink-soft">{g.headline}</p>
            {g.gap && <p className="mt-2 text-sm leading-snug"><strong>Closing the gap: </strong>{g.gap}</p>}
          </Card>
        ))}
      </ul>

      <Card className="mt-5">
        <h2 className="display text-xl">Change one thing</h2>
        <p className="mb-3 text-sm text-ink-mute">Slide and watch your dreams move.</p>
        <Slider label="Lifestyle spending each month" value={input.overrides.lifestyle ?? lifestyleNow} min={0} max={1500} step={25} format={(v) => money(v)} onChange={(v) => set({ overrides: { ...input.overrides, lifestyle: v } })} help="Eating out, shopping, hobbies, subscriptions" />
        <div className="mt-3">
          <Slider label="Set aside to invest each month" value={input.overrides.investMonthly ?? investNow} min={0} max={1500} step={25} format={(v) => money(v)} onChange={(v) => set({ overrides: { ...input.overrides, investMonthly: v } })} help="Only from what’s left after costs. Returns are illustrative and can be negative." />
        </div>
        {(input.overrides.lifestyle !== undefined || input.overrides.investMonthly !== undefined) && (
          <button type="button" className="mt-2 text-sm font-semibold text-ink-mute underline underline-offset-4" onClick={() => set({ overrides: {} })}>
            Reset
          </button>
        )}
      </Card>

      {pay.cpfModelled && (
        <div className="mt-4">
          <Note tone="pink" icon="Wallet">
            On {money(p.mainIncome)} a month, about <strong>{money(pay.takeHomeBeforeTax)}</strong> reaches your bank. {money(pay.employeeCpf)} goes to your CPF — and your employer adds <strong>{money(pay.employerCpf)}</strong> on top.
          </Note>
        </div>
      )}

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-ink-soft">Where to go next</h2>
        <ul className="mt-2 space-y-2">
          {LINKS.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-2xl border border-mist-200 bg-white p-3.5 hover:border-ink-soft">
                <span>
                  <span className="block text-sm font-semibold">{l.title}</span>
                  <span className="block text-xs text-ink-mute">{l.why}</span>
                </span>
                <Icon name="ExternalLink" className="h-4 w-4 shrink-0 text-ink-mute" label="opens in a new tab" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-3xl bg-navy-800 p-5 text-white">
        <h2 className="display text-xl text-white">Want the full picture?</h2>
        <p className="mt-1 text-sm text-navy-100">The full version has 12 dreams, a 7-chapter life story, your own numbers and six money tools.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="../" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-magenta-600 px-5 text-[15px] font-semibold text-white hover:bg-magenta-700">
            Try the full version <Icon name="ArrowRight" className="h-4 w-4" />
          </a>
          <Button variant="secondary" icon="RotateCcw" onClick={onRestart}>
            Start again
          </Button>
        </div>
      </section>

      <p className="mt-5 text-center text-xs leading-relaxed text-ink-mute">Uses simplified 2026 Singapore rules (CPF, tax, ~2% inflation) and typical figures for your situation. Nothing you enter is saved.</p>
    </>
  );
}

function othersPhrase(near: number, others: number) {
  if (near === others) return others === 1 ? 'your other dream' : others === 2 ? 'both your other dreams' : `all ${others} of your other dreams`;
  return `${near} of your ${others} other dreams`;
}
