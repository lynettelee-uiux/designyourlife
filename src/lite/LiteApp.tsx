import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionBar, Button, Card, Icon, Segmented, Slider, cx } from '../components/ui';
import { DISTANCE, DistanceBadge, DistanceBar } from '../components/Distance';
import { LiteHero } from '../components/Hero';
import { GuessPanel, LessonReveal, LessonsRecap } from '../components/Learning';
import { FutureCard, ShareBar, SkillCard, dreamEmoji, verdictHeadline } from '../components/FutureCard';
import { dreamOptions } from './dreamOptions';
import { aspirationById } from '../data/aspirations';
import { money } from '../engine/format';
import { paycheck } from '../engine/paycheck';
import { STATUS_INFO, lifeStage, type AspirationId, type Dreams, type LifeStatus, type Living } from '../engine/profile';
import { monthlySnapshot } from '../engine/projection';
import type { GoalResult } from '../engine/goals';
import { LITE_DREAMS, MAX_DREAMS, dreamAlreadyMet, emptyInput, liteSimulate, momentImpact, type LiteInput, type LiteResult } from './liteSim';
import { GIVING_BANDS, HABIT_QS, INCOME_SOURCES, SAVINGS_BANDS, SOURCES_FOR, WORK_START, lifestyleFrom, type IncomeSource, type LiteHabits } from './inputs';
import { pickSkills } from './literacy';
import { futureQuote, strengths } from './story';
import type { CardData } from './shareCard';

const STEPS = ['You', 'Your money', 'Habits', 'Dreams', 'Life happens', 'Results'];

const SITUATIONS: { value: LifeStatus; label: string; icon: string }[] = [
  { value: 'uni_student', label: 'Studying at uni', icon: 'GraduationCap' },
  { value: 'poly_student', label: 'Studying at poly / ITE', icon: 'GraduationCap' },
  { value: 'nsf', label: 'Serving NS', icon: 'ShieldCheck' },
  { value: 'employed', label: 'Working full-time', icon: 'Briefcase' },
  { value: 'part_time_gig', label: 'Gig or part-time', icon: 'Zap' },
  { value: 'between_jobs', label: 'Between jobs', icon: 'Compass' },
];


export default function LiteApp() {
  const [step, setStep] = useState(0);
  const [sub, setSub] = useState(0); // question index within Habits, moment index within Life happens
  const [input, setInput] = useState<LiteInput>(emptyInput);
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
  }, [step, sub]);

  const go = (s: number, at = 0) => {
    setSub(at);
    setStep(s);
  };
  const moments = result.chapters.length;
  const chapter = result.chapters[Math.min(sub, moments - 1)];
  const picked = Object.keys(input.dreams).length;
  const incomeReady = Object.values(input.income).every((b) => b !== undefined);
  const canNext = step === 1 ? incomeReady : step === 3 ? result.goals.length > 0 : step === 4 ? !chapter || (!!input.decisions[chapter.scenario.id] && !!input.guesses?.[chapter.scenario.id]) : true;

  const next = () => {
    if (step === 2 && sub < HABIT_QS.length - 1) return setSub(sub + 1);
    if (step === 4 && sub < moments - 1) return setSub(sub + 1);
    go(step + 1);
  };
  const back = () => {
    if ((step === 2 || step === 4) && sub > 0) return setSub(sub - 1);
    if (step === 3) return go(2, HABIT_QS.length - 1);
    if (step === 5) return go(4, moments - 1);
    go(step - 1);
  };
  const label =
    step === 1 ? (incomeReady ? 'Next' : 'Pick a range for each') :
    step === 2 ? 'Skip' :
    step === 3 ? (picked ? 'Let life happen' : 'Pick a dream') :
    step === 4 ? (!canNext ? (chapter && input.decisions[chapter.scenario.id] ? 'Make a guess' : 'Make a choice') : sub < moments - 1 ? 'Got it — next moment' : 'See my results') : 'Next';

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
        {step === 1 && <StepMoney input={input} set={set} />}
        {step === 2 && <StepHabit input={input} set={set} index={sub} onAnswer={next} />}
        {step === 3 && <StepDreams input={input} set={set} result={result} picked={picked} />}
        {step === 4 && <StepMoment input={input} set={set} result={result} index={sub} />}
        {step === 5 && <StepResults input={input} set={set} result={result} onRestart={() => { setInput(emptyInput()); go(0); }} />}
      </main>

      {step < 5 && (
        <ActionBar>
          <Button variant="ghost" icon="ArrowLeft" disabled={step === 0} onClick={back}>
            Back
          </Button>
          <Button variant={step === 2 ? 'secondary' : 'primary'} iconRight={step === 2 ? undefined : 'ArrowRight'} disabled={!canNext} onClick={next}>
            {label}
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
      <LiteHero />
      <h2 className="mb-3 text-sm font-semibold text-ink-soft">First, a little about you</h2>
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
                onClick={() => set({ status: s.value, decisions: {}, income: Object.fromEntries(SOURCES_FOR[s.value].preset.map((src) => [src, undefined])), workStartYears: undefined })}
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
            onChange={(v) => set({ living: v, decisions: {} })}
            options={[
              { value: 'family', label: 'With family' },
              { value: 'room', label: 'Renting' },
              { value: 'own', label: 'Own home' },
            ]}
          />
        </div>
      </Card>
      {['uni_student', 'poly_student', 'nsf', 'between_jobs'].includes(input.status) && (
        <Card className="mt-3">
          <p className="mb-2 text-sm font-medium text-ink-soft">{input.status === 'between_jobs' ? 'I expect to start a full-time job in…' : input.status === 'nsf' ? 'I expect to start full-time work (after ORD and any studies) in…' : 'I expect to start full-time work in…'}</p>
          <Chips value={input.workStartYears ?? 2} options={WORK_START.map((w) => ({ value: w.years, label: w.label }))} onChange={(v) => set({ workStartYears: Number(v) })} label="When full-time work starts" />
        </Card>
      )}
      <p className="mt-4 text-center text-xs text-ink-mute">Next: a few one-tap ranges about your money — no exact numbers needed.</p>
    </>
  );
}

function Chips<T extends string | number>({ value, options, onChange, label }: { value: T | undefined; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('min-h-[40px] rounded-full border px-3.5 text-sm font-semibold transition-colors', value === o.value ? 'border-navy-800 bg-navy-800 text-white' : 'border-mist-300 bg-white hover:border-ink-soft')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StepMoney({ input, set }: StepProps) {
  const opts = SOURCES_FOR[input.status].options;
  const toggle = (src: IncomeSource) => {
    const next = { ...input.income };
    if (src in next) delete next[src];
    else next[src] = undefined;
    set({ income: next });
  };
  const selected = opts.filter((o) => o in input.income);
  return (
    <>
      <Intro eyebrow="Your money" title="Where does your money come from?">
        Pick all that apply, then a rough range for each. Ranges are enough — no exact numbers.
      </Intro>
      <Card className="rise-2 space-y-5">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Income sources">
          {opts.map((src) => {
            const on = src in input.income;
            return (
              <button key={src} type="button" aria-pressed={on} onClick={() => toggle(src)} className={cx('flex min-h-[52px] items-center gap-2 rounded-2xl border px-3 text-left text-sm font-semibold', on ? 'border-navy-800 bg-navy-50' : 'border-mist-300 bg-white')}>
                <Icon name={INCOME_SOURCES[src].icon} className="h-4 w-4 shrink-0 text-ink-soft" />
                {INCOME_SOURCES[src].label}
              </button>
            );
          })}
        </div>
        {selected.length === 0 && <p className="text-sm text-ink-mute">No income right now? That’s fine — just continue.</p>}
        {selected.map((src) => (
          <div key={src}>
            <p className="mb-2 text-sm font-medium text-ink-soft">{INCOME_SOURCES[src].label} — about how much a month?</p>
            <Chips value={input.income[src]} options={INCOME_SOURCES[src].bands.map((b, i) => ({ value: i, label: b.label }))} onChange={(v) => set({ income: { ...input.income, [src]: v } })} label={`${INCOME_SOURCES[src].label} per month`} />
          </div>
        ))}
      </Card>
      <Card className="mt-3 space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Savings you have right now (not CPF)</p>
          <Chips value={input.savings} options={SAVINGS_BANDS.map((b, i) => ({ value: i, label: b.label }))} onChange={(v) => set({ savings: v })} label="Savings" />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Money you give your family each month</p>
          <Chips value={input.giving} options={GIVING_BANDS.map((b, i) => ({ value: i, label: b.label }))} onChange={(v) => set({ giving: v })} label="Money given to family" />
        </div>
      </Card>
    </>
  );
}

function StepHabit({ input, set, index, onAnswer }: StepProps & { index: number; onAnswer: () => void }) {
  const q = HABIT_QS[index];
  const current = input.habits[q.id];
  return (
    <>
      <Intro eyebrow={`Money habits · ${index + 1} of ${HABIT_QS.length}`} title={q.prompt} />
      <div className="-mt-2 mb-4 flex gap-1" aria-hidden>
        {HABIT_QS.map((h, i) => (
          <span key={h.id} className={cx('h-1 flex-1 rounded-full', i <= index ? 'bg-magenta-500' : 'bg-mist-200')} />
        ))}
      </div>
      <div className="rise-2 space-y-2.5" role="group" aria-label="Your answer" key={q.id}>
        {q.options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={current === o.value}
            onClick={() => {
              set({ habits: { ...input.habits, [q.id]: o.value } as LiteHabits });
              setTimeout(onAnswer, 180);
            }}
            className={cx('flex min-h-[60px] w-full items-center justify-between gap-3 rounded-3xl border bg-white px-5 py-4 text-left text-[16px] font-semibold transition-colors', current === o.value ? 'border-navy-800 bg-navy-50' : 'border-mist-200 hover:border-ink-soft')}
          >
            {o.label}
            <Icon name="ArrowRight" className="h-4 w-4 shrink-0 text-ink-mute" />
          </button>
        ))}
      </div>
      <p className="mt-5 text-center text-sm text-ink-mute">No judgement — this just helps us show you what’s realistic.</p>
    </>
  );
}

function StepDreams({ input, set, result, picked }: StepProps & { result: LiteResult; picked: number }) {
  const toggle = (id: AspirationId) => {
    const d: Dreams = { ...input.dreams };
    if (d[id]) delete d[id];
    else if (picked < MAX_DREAMS) d[id] = { id, ...dreamOptions(id, input.age, lifeStage(input)).defaults };
    set({ dreams: d, decisions: {} });
  };
  return (
    <>
      <Intro eyebrow="Dream" title="Pick up to 3 dreams">
        We’ll show how near each one is — and why — if you carry on as you are today.
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
        {picked}/{MAX_DREAMS} picked{picked > 0 ? ' · set when and how big below' : ''}
      </p>
      {picked > 0 && (
        <section className="mt-4 space-y-2.5" aria-label="Make your dreams yours">
          {LITE_DREAMS.filter((id) => input.dreams[id] && !dreamAlreadyMet(id, input.living)).map((id) => {
            const opts = dreamOptions(id, input.age, lifeStage(input));
            const d = input.dreams[id]!;
            const g = result.goals.find((x) => x.id === id);
            return (
              <Card key={id} className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <span aria-hidden className="text-lg">{dreamEmoji(id, d.variant)}</span>
                    {aspirationById(id).title}
                  </h3>
                  {g && <DistanceBadge status={g.status} />}
                </div>
                <div className="space-y-3">
                  {opts.rows.map((row) => (
                    <div key={row.key} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="w-full text-xs font-semibold text-ink-mute">{row.label}</span>
                      <Chips value={d[row.key] as number | string | undefined} options={row.options} onChange={(v) => set({ dreams: { ...input.dreams, [id]: { ...d, [row.key]: v } }, decisions: {} })} label={`${aspirationById(id).title}: ${row.label}`} />
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </section>
      )}
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
      <ul className="mt-4 space-y-4">
        {goals.map((g) => (
          <GoalRow key={g.id} g={g} />
        ))}
      </ul>
      <BasedOn result={result} />
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
      <p className="mt-1.5 text-[13px] leading-snug text-navy-100">
        <span className="font-semibold text-white">{g.status === 'on_track' ? 'Why it’s within reach: ' : 'Why: '}</span>
        {g.why ?? g.headline}
      </p>
    </li>
  );
}

/** The typical figures behind the verdict, so it's never unexplained. */
function BasedOn({ result }: { result: LiteResult }) {
  const p = result.profile;
  const now = monthlySnapshot(result.plan, p.age);
  const later = monthlySnapshot(result.plan, Math.max(p.age, p.mainIncomeAge));
  const working = p.mainIncomeAge <= p.age;
  return (
    <p className="mt-4 rounded-2xl bg-white/10 p-3 text-xs leading-relaxed text-navy-100">
      <span className="font-semibold text-white">Based on what you told us: </span>
      about {money(now.takeHome)} coming in a month and {money(now.spend)} going out (including {money(p.lifestyle)} on food, fun and shopping), leaving {money(now.surplus)}.
      {!working && <> From {p.mainIncomeAge}, we assume a typical starting salary of about {money(p.mainIncome)} (take-home ~{money(later.takeHome)}).</>} Want to use exact numbers? Try the full version.
    </p>
  );
}

function StepMoment({ input, set, result, index }: StepProps & { result: LiteResult; index: number }) {
  const ch = result.chapters[Math.min(index, result.chapters.length - 1)];
  const decided = ch ? input.decisions[ch.scenario.id] : undefined;
  const impact = useMemo(() => (ch && decided ? momentImpact(input, ch.scenario.id) : 0), [input, ch, decided]);
  if (!ch) return <Intro eyebrow="Life happens" title="No surprises this time" />;
  const s = ch.scenario;
  const choice = s.choices.find((c) => c.id === decided);
  const guess = input.guesses?.[s.id];
  const quiz = s.quiz?.(result.ctx, ch.age);
  return (
    <>
      <Intro eyebrow={`Life happens · moment ${index + 1} of ${result.chapters.length}`} title={s.title} />
      <div className="-mt-2 mb-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft shadow-card">Age {ch.age}</span>
        {!s.unexpected && <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft shadow-card">{s.topic}</span>}
        {s.unexpected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            <Icon name="Zap" className="h-3 w-3" />
            Unexpected — but plausible
          </span>
        )}
      </div>
      <Card className="rise-2" key={s.id}>
        <p className="text-[17px] leading-relaxed">{s.story(result.ctx, ch.age)}</p>
        <p className="mt-4 text-sm font-semibold text-ink-soft">What would you do?</p>
        <div className="mt-2 space-y-2.5" role="group" aria-label="What would you do?">
          {s.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === decided}
              onClick={() => {
                if (c.id === decided) return;
                const guesses = { ...(input.guesses ?? {}) };
                delete guesses[s.id];
                set({ decisions: { ...input.decisions, [s.id]: c.id }, guesses });
              }}
              className={cx('w-full rounded-2xl border px-4 py-3.5 text-left text-[15px] font-semibold transition-colors', c.id === decided ? 'border-navy-800 bg-navy-50' : 'border-mist-300 bg-white hover:border-ink-soft')}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Card>
      {choice && !guess && quiz && <GuessPanel quiz={quiz} onGuess={(g) => set({ guesses: { ...(input.guesses ?? {}), [s.id]: g } })} />}
      {choice && guess && quiz && <LessonReveal quiz={quiz} guess={guess} lesson={choice.reflection} title={s.learn.title} />}
      {choice && guess && (
        <Card className="pop mt-3" as="div" key={`${s.id}-${choice.id}`}>
          <p className="eyebrow">What happens</p>
          <p className="mt-1 text-[16px] leading-relaxed">{choice.outcome(result.ctx, ch.age)}</p>
          <p className="mt-3 text-sm">
            Savings at {ch.age + 1}:{' '}
            <strong className={cx('tabular', impact < -1 ? 'text-magenta-700' : impact > 1 ? 'text-sage-700' : 'text-ink')}>{Math.abs(impact) < 1 ? 'about the same' : `${money(impact, { sign: true })} vs if this hadn’t happened`}</strong>
          </p>
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
  const title = (id: AspirationId) => aspirationById(id).title;

  const moments = useMemo(
    () => result.chapters.map((c) => ({ scenario: c.scenario.id, choice: input.decisions[c.scenario.id], impact: momentImpact(input, c.scenario.id) })),
    [input, result],
  );

  const nowSnap = monthlySnapshot(result.plan, p.age);
  const takeHome = nowSnap.takeHome;
  const skills = pickSkills({ goals: result.goals, status: p.status, moments, habits: input.habits, monthlyLeftover: nowSnap.surplus, lifestyleShare: takeHome > 0 ? lifestyleFrom(input.habits) / takeHome : undefined, invested: investNow > 0, dreamTitle: title });
  const strong = strengths({ goals: result.goals, status: p.status, living: input.living, moments, habits: input.habits, investMonthly: investNow, dreamTitle: title });
  const near = result.goals.filter((g) => g.status === 'on_track').length;
  const learned = result.chapters
    .filter((c) => input.decisions[c.scenario.id])
    .map((c) => {
      const choice = c.scenario.choices.find((x) => x.id === input.decisions[c.scenario.id])!;
      const g = input.guesses?.[c.scenario.id];
      return { title: c.scenario.learn.title, lesson: choice.reflection, right: g ? g === c.scenario.quiz?.(result.ctx, c.age).answer : undefined };
    });
  const card: CardData = {
    lessons: learned.length,
    headline: verdictHeadline(near, result.goals.length),
    quote: futureQuote(result.goals),
    strength: strong.find((t) => !t.includes('within reach')) ?? strong[0],
    skill: skills[0].skill.short,
    dreams: result.goals.map((g) => ({ title: title(g.id), emoji: dreamEmoji(g.id, result.ctx.dreams.pet?.variant), label: DISTANCE[g.status].label, status: g.status, progress: g.progress })),
    url: new URL('./', window.location.href).href,
  };

  return (
    <>
      <header className="mb-4 mt-1 text-center">
        <p className="eyebrow">Your results</p>
        <h1 className="display mt-1 text-[26px] leading-tight">Your Future Card is ready</h1>
      </header>

      <FutureCard data={card} />
      <ShareBar data={card} />
      <LessonsRecap items={learned} />

      <section className="mt-8" aria-labelledby="strengths-h">
        <h2 id="strengths-h" className="display text-xl">Your strengths in this version</h2>
        <ul className="mt-3 space-y-2">
          {strong.map((t) => (
            <li key={t} className="flex items-start gap-2.5 rounded-2xl bg-white p-3.5 text-[15px] shadow-card">
              <Icon name="CircleCheck" className="mt-0.5 h-5 w-5 shrink-0 text-sage-700" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="skills-h">
        <h2 id="skills-h" className="display text-xl">What to work on</h2>
        <p className="mt-1 text-sm text-ink-mute">Based on your money habits and choices — three skills that would bring your dreams closer.</p>
        <ol className="mt-3 space-y-3">
          {skills.map((s, i) => (
            <SkillCard key={s.skill.id} pick={s} n={i + 1} />
          ))}
        </ol>
      </section>

      <Card className="mt-8">
        <h2 className="display text-xl">Change one thing</h2>
        <p className="mb-3 text-sm text-ink-mute">Slide and watch your card update.</p>
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

      <details className="group card mt-3 overflow-hidden p-0">
        <summary className="flex min-h-[52px] items-center justify-between gap-3 px-5 py-3 font-semibold">
          Dream by dream
          <Icon name="ChevronDown" className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="space-y-3 border-t border-mist-200 px-5 pb-5 pt-4">
          {result.goals.map((g) => (
            <li key={g.id}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{title(g.id)}</h3>
                <DistanceBadge status={g.status} />
              </div>
              <p className="mt-1 text-sm leading-snug text-ink-soft">{g.headline}</p>
              {g.gap && <p className="mt-1.5 text-sm leading-snug"><strong>Closing the gap: </strong>{g.gap}</p>}
            </li>
          ))}
          {pay.cpfModelled && (
            <li className="rounded-2xl bg-blush-50 p-3 text-[13px] leading-relaxed">
              On {money(p.mainIncome)} a month, about <strong>{money(pay.takeHomeBeforeTax)}</strong> reaches your bank. {money(pay.employeeCpf)} goes to your CPF — and your employer adds <strong>{money(pay.employerCpf)}</strong> on top.
            </li>
          )}
        </ul>
      </details>

      <section className="mt-8 overflow-hidden rounded-3xl bg-navy-800 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-magenta-300">Curious for more?</p>
        <h2 className="display mt-1 text-2xl text-white">Get your comprehensive plan</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-navy-100">
          <li className="flex gap-2"><Icon name="Check" className="mt-0.5 h-4 w-4 shrink-0 text-magenta-300" />Use your own numbers — income, savings, CPF, home loan</li>
          <li className="flex gap-2"><Icon name="Check" className="mt-0.5 h-4 w-4 shrink-0 text-magenta-300" />12 dreams and a 7-chapter life story</li>
          <li className="flex gap-2"><Icon name="Check" className="mt-0.5 h-4 w-4 shrink-0 text-magenta-300" />Three futures side by side, plus six money tools</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="../" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-magenta-600 px-5 text-[15px] font-semibold text-white hover:bg-magenta-700">
            Try the full version · 10 min <Icon name="ArrowRight" className="h-4 w-4" />
          </a>
          <Button variant="secondary" icon="RotateCcw" onClick={onRestart}>
            Try another version
          </Button>
        </div>
      </section>

      <p className="mt-5 text-center text-xs leading-relaxed text-ink-mute">Uses simplified 2026 Singapore rules (CPF, tax, ~2% inflation) and typical figures for your situation. An illustration, not financial advice. Nothing you enter is saved.</p>
    </>
  );
}

function othersPhrase(near: number, others: number) {
  if (near === others) return others === 1 ? 'your other dream' : others === 2 ? 'both your other dreams' : `all ${others} of your other dreams`;
  return `${near} of your ${others} other dreams`;
}
