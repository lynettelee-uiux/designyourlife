import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionBar, Button, Card, Icon, Segmented, Slider, cx } from '../components/ui';
import { DISTANCE, DistanceBadge, DistanceBar } from '../components/Distance';
import { aspirationById } from '../data/aspirations';
import { money } from '../engine/format';
import { paycheck } from '../engine/paycheck';
import { STATUS_INFO, type AspirationId, type Dreams, type LifeStatus, type Living } from '../engine/profile';
import { monthlySnapshot } from '../engine/projection';
import type { GoalResult } from '../engine/goals';
import { LITE_DREAMS, MAX_DREAMS, dreamAlreadyMet, liteSimulate, momentImpact, type LiteInput, type LiteResult } from './liteSim';
import { pickSkills, type SkillPick } from './literacy';
import { futureQuote, strengths } from './story';
import { downloadCard, shareCard, shareText, type CardData } from './shareCard';

const STEPS = ['You', 'Dreams', 'Life happens', 'Results'];

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
  const [input, setInput] = useState<LiteInput>({ age: 22, status: 'employed', living: 'family', dreams: {}, decisions: {}, overrides: {} });
  const [moment, setMoment] = useState(0);
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
  }, [step, moment]);

  const picked = Object.keys(input.dreams).length;
  const chapter = result.chapters[Math.min(moment, result.chapters.length - 1)];
  const lastMoment = moment >= result.chapters.length - 1;
  const canNext = step === 1 ? result.goals.length > 0 : step === 2 ? !chapter || !!input.decisions[chapter.scenario.id] : true;
  const next = () => {
    if (step === 2 && !lastMoment) setMoment(moment + 1);
    else {
      if (step === 1) setMoment(0);
      setStep(step + 1);
    }
  };
  const back = () => (step === 2 && moment > 0 ? setMoment(moment - 1) : setStep(step - 1));

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
        {step === 2 && <StepMoment input={input} set={set} result={result} index={moment} />}
        {step === 3 && <StepResults input={input} set={set} result={result} onRestart={() => { setInput({ age: 22, status: 'employed', living: 'family', dreams: {}, decisions: {}, overrides: {} }); setMoment(0); setStep(0); }} />}
      </main>

      {step < 3 && (
        <ActionBar>
          <Button variant="ghost" icon="ArrowLeft" disabled={step === 0} onClick={back}>
            Back
          </Button>
          <Button iconRight="ArrowRight" disabled={!canNext} onClick={next}>
            {step === 0 ? 'Next' : step === 1 ? (canNext ? 'Let life happen' : 'Pick a dream') : !canNext ? 'Make a choice' : lastMoment ? 'See my results' : 'Next moment'}
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
      <Intro eyebrow="Your future in 3 minutes" title="How close are your dreams?">
        Pick a few dreams, make three real-life money decisions, and get a Future Card to share — plus the money skills that would bring you closer.
      </Intro>
      <ul className="rise-2 -mt-1 mb-4 flex flex-wrap gap-2 text-xs font-semibold text-ink-soft" aria-label="About this">
        {['3 minutes', 'No sign-up', 'Nothing saved', 'No amounts shared'].map((t) => (
          <li key={t} className="rounded-full bg-white px-3 py-1 shadow-card">{t}</li>
        ))}
      </ul>
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
                onClick={() => set({ status: s.value, decisions: {} })}
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
      <p className="mt-4 text-center text-xs text-ink-mute">We fill in typical income and costs for your situation. Want to use your own numbers? Try the full version.</p>
    </>
  );
}

function StepDreams({ input, set, result, picked }: StepProps & { result: LiteResult; picked: number }) {
  const toggle = (id: AspirationId) => {
    const d: Dreams = { ...input.dreams };
    if (d[id]) delete d[id];
    else if (picked < MAX_DREAMS) d[id] = { id };
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
        <span className="font-semibold text-white">{g.status === 'on_track' ? 'Good news: ' : 'Why: '}</span>
        {g.status === 'on_track' ? g.headline : g.why ?? g.headline}
      </p>
    </li>
  );
}

/** The typical figures behind the verdict, so it's never unexplained. */
function BasedOn({ result }: { result: LiteResult }) {
  const p = result.profile;
  const age = Math.max(p.age, p.mainIncomeAge);
  const snap = monthlySnapshot(result.plan, age);
  const living = { family: 'living with family', room: 'renting a room', whole_unit: 'renting', own: 'paying a home loan', other: 'your living costs' }[p.living];
  return (
    <p className="mt-4 rounded-2xl bg-white/10 p-3 text-xs leading-relaxed text-navy-100">
      <span className="font-semibold text-white">Based on typical figures for you{age > p.age ? ` from age ${age}` : ''}: </span>
      about {money(snap.takeHome)} take-home a month (on {money(p.mainIncome)} pay, after CPF and tax), {living}, and about {money(snap.spend)} of monthly costs including your dreams — leaving {money(snap.surplus)}. Want to use your own numbers? Try the full version.
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
              onClick={() => set({ decisions: { ...input.decisions, [s.id]: c.id } })}
              className={cx('w-full rounded-2xl border px-4 py-3.5 text-left text-[15px] font-semibold transition-colors', c.id === decided ? 'border-navy-800 bg-navy-50' : 'border-mist-300 bg-white hover:border-ink-soft')}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Card>
      {choice && (
        <Card className="pop mt-3" as="div" key={`${s.id}-${choice.id}`}>
          <p className="eyebrow">What happens</p>
          <p className="mt-1 text-[16px] leading-relaxed">{choice.outcome(result.ctx, ch.age)}</p>
          <p className="mt-3 text-sm">
            Savings at {ch.age + 1}:{' '}
            <strong className={cx('tabular', impact < -1 ? 'text-magenta-700' : impact > 1 ? 'text-sage-700' : 'text-ink')}>{Math.abs(impact) < 1 ? 'about the same' : `${money(impact, { sign: true })} vs if this hadn’t happened`}</strong>
          </p>
          <p className="mt-3 rounded-2xl bg-blush-100 p-3 text-sm leading-relaxed">
            <strong>Money lesson: </strong>
            {choice.reflection}
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

  const skills = pickSkills({ goals: result.goals, status: p.status, moments, invested: investNow > 0, dreamTitle: title });
  const strong = strengths({ goals: result.goals, status: p.status, living: input.living, moments, investMonthly: investNow, dreamTitle: title });
  const near = result.goals.filter((g) => g.status === 'on_track').length;
  const card: CardData = {
    headline: verdictHeadline(near, result.goals.length),
    quote: futureQuote(result.goals),
    strength: strong[0],
    skill: skills[0].skill.short,
    dreams: result.goals.map((g) => ({ title: title(g.id), label: DISTANCE[g.status].label, status: g.status, progress: g.progress })),
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
        <p className="mt-1 text-sm text-ink-mute">Your gaps point to three money skills. Each takes a minute to start.</p>
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

function verdictHeadline(near: number, total: number) {
  if (total === 0) return 'My future, three ways';
  if (near === total) return total === 1 ? 'My dream looks within reach' : `All ${total} of my dreams look within reach`;
  if (near === 0) return 'My dreams are further away — for now';
  return `${near} of my ${total} dreams ${near === 1 ? 'looks' : 'look'} within reach`;
}

const CARD_BAR: Record<GoalResult['status'], string> = { on_track: 'bg-[#5BD19A]', adjust: 'bg-[#F2B54B]', explore: 'bg-[#FF8CC2]' };

/** On-screen version of the share image. Bars grow in once on reveal (instant with reduced motion). */
function FutureCard({ data }: { data: CardData }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 150);
    return () => clearTimeout(t);
  }, []);
  return (
    <figure aria-label="Your Future Card" className="pop relative overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-800 via-[#2F1A6E] to-magenta-600 p-6 text-white shadow-[0_20px_50px_-20px_rgba(30,22,96,0.6)]">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-magenta-300/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-navy-600/40 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span aria-hidden className="grid h-6 w-6 place-items-center rounded-[7px] bg-white">
            <span className="h-2 w-2 rounded-full bg-magenta-500" />
          </span>
          <span className="text-sm font-bold">Design Your Life</span>
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-magenta-300">My Future Card</p>
        <p className="display mt-1 text-[26px] leading-tight text-white">{data.headline}</p>
        <blockquote className="mt-2 text-[15px] italic leading-snug text-magenta-100">“{data.quote}”</blockquote>
        <ul className="mt-5 space-y-3">
          {data.dreams.map((d, i) => (
            <li key={d.title}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold">{d.title}</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">{d.label}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15" role="meter" aria-label={`${d.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(d.progress * 100)} aria-valuetext={d.label}>
                <div className={cx('h-full rounded-full transition-[width] duration-1000 ease-out', CARD_BAR[d.status])} style={{ width: shown ? `${Math.max(4, Math.min(1, d.progress) * 100)}%` : '0%', transitionDelay: `${i * 150}ms` }} />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-magenta-300">My strength</p>
            <p className="mt-1 text-[13px] font-semibold leading-snug">{data.strength}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-magenta-300">Working on</p>
            <p className="mt-1 text-[13px] font-semibold leading-snug">{data.skill}</p>
          </div>
        </div>
        <p className="mt-4 text-[11px] text-white/70">Illustrative, not financial advice · no amounts shown</p>
      </div>
    </figure>
  );
}

function ShareBar({ data }: { data: CardData }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      setMsg(await fn());
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-4">
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <Button variant="accent" icon="Sparkles" disabled={busy} onClick={() => run(async () => ({ shared: 'Shared — thanks for spreading the word!', copied: 'Link copied — paste it anywhere.', downloaded: 'Saved.', cancelled: '' })[await shareCard(data)])}>
          Share my card
        </Button>
        <Button variant="secondary" disabled={busy} aria-label="Save card as image" onClick={() => run(async () => { await downloadCard(data); return 'Image saved — post it to your story.'; })}>
          Save
        </Button>
        <Button variant="secondary" disabled={busy} aria-label="Copy link" onClick={() => run(async () => { try { await navigator.clipboard.writeText(`${shareText(data)} ${data.url}`); return 'Link copied — paste it anywhere.'; } catch { return 'Couldn’t copy — try Share instead.'; } })}>
          Copy
        </Button>
      </div>
      <p className="mt-2 min-h-[1.25rem] text-center text-xs text-ink-mute" aria-live="polite">
        {msg || 'Your card shows your dreams and skills — never your numbers.'}
      </p>
    </div>
  );
}

function SkillCard({ pick, n }: { pick: SkillPick; n: number }) {
  const [answer, setAnswer] = useState<boolean | undefined>();
  const s = pick.skill;
  const right = answer !== undefined && answer === s.check.answer;
  return (
    <li className="card p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-magenta-50 text-magenta-700">
          <Icon name={s.icon} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink-mute">Skill {n}</p>
          <h3 className="font-semibold leading-snug">{s.title}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">{pick.why}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink-soft">
        {s.facts.map((f) => (
          <li key={f} className="flex gap-2">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-magenta-500" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-2xl bg-mist-50 p-3.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Quick check · true or false?</p>
        <p className="mt-1 text-[15px] font-semibold leading-snug">{s.check.statement}</p>
        <div className="mt-2.5 flex gap-2" role="group" aria-label="Your answer">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={answer === v}
              onClick={() => setAnswer(v)}
              className={cx('min-h-[40px] flex-1 rounded-full border text-sm font-semibold', answer === v ? (v === s.check.answer ? 'border-sage-600 bg-sage-100 text-sage-700' : 'border-magenta-600 bg-magenta-50 text-magenta-700') : 'border-mist-300 bg-white')}
            >
              {v ? 'True' : 'False'}
            </button>
          ))}
        </div>
        {answer !== undefined && (
          <p className="pop mt-2.5 text-sm leading-relaxed" aria-live="polite">
            <strong>{right ? 'Nice — that’s right.' : `Not quite — it’s ${s.check.answer ? 'true' : 'false'}.`}</strong> {s.check.explain}
          </p>
        )}
      </div>
      <a href={s.learnMore.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-magenta-700 underline underline-offset-4">
        Learn more: {s.learnMore.label} <Icon name="ExternalLink" className="h-3.5 w-3.5" label="opens in a new tab" />
      </a>
    </li>
  );
}

function othersPhrase(near: number, others: number) {
  if (near === others) return others === 1 ? 'your other dream' : others === 2 ? 'both your other dreams' : `all ${others} of your other dreams`;
  return `${near} of your ${others} other dreams`;
}
