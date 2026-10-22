import { useState } from 'react';
import { ActionBar, Button, Card, Icon, Note, Screen, Slider, StageIntro, StatusDot, cx } from '../components/ui';
import { OutlookChart } from '../components/LazyOutlookChart';
import { TOOLS, ToolPanel, type ToolId } from '../components/Tools';
import { aspirationById } from '../data/aspirations';
import { RESOURCES } from '../data/resources';
import { money } from '../engine/format';
import { emergencyMonthsAt, emergencyTarget } from '../engine/goals';
import type { Overrides } from '../engine/profile';
import { balancesAtAge } from '../engine/projection';
import { useSimulation } from '../state/sim';
import { useStore } from '../state/store';

type LeverKey = keyof Overrides;
interface Lever {
  key: LeverKey;
  label: string;
  icon: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (v: number) => string;
}

export default function NextMove() {
  const { state, dispatch } = useStore();
  const sim = useSimulation();
  const { storyPlan, storyProjections, projections, plan, goals, storyGoals, dreams } = sim;
  const p = state.profile;
  const [tool, setTool] = useState<ToolId>(dreams.career_break ? 'runway' : 'paycheck');

  const lifestyleItem = storyPlan.recurring.find((r) => r.id === 'lifestyle');
  const moveOut = storyPlan.recurring.find((r) => r.id === 'move-out-rent');
  const levers: Lever[] = [
    state.dreams.retire_early && { key: 'retireAge', label: 'Retirement age', icon: 'Sunset', min: Math.max(p.age + 5, 35), max: 70, step: 1, value: storyPlan.retireAge, format: (v: number) => `${v}` },
    { key: 'investMonthly', label: 'Monthly investing', icon: 'TrendingUp', min: 0, max: 3000, step: 50, value: storyPlan.investMonthly, format: (v: number) => money(v) },
    lifestyleItem && { key: 'lifestyle', label: 'Lifestyle spending', icon: 'Coffee', min: 0, max: Math.max(2000, lifestyleItem.monthly * 2), step: 25, value: lifestyleItem.monthly, format: (v: number) => `${money(v)}/mo` },
    moveOut && { key: 'moveOutAge', label: 'Move-out age', icon: 'KeyRound', min: p.age, max: 40, step: 1, value: moveOut.fromAge, format: (v: number) => `${v}` },
    state.dreams.own_home && { key: 'homeAge', label: 'Home timeline', icon: 'Home', min: p.age + 1, max: 55, step: 1, value: state.dreams.own_home.age ?? storyPlan.recurring.find((r) => r.id === 'home-costs')?.fromAge ?? p.age + 6, format: (v: number) => `by ${v}` },
    state.dreams.career_break && { key: 'breakMonths', label: 'Career break length', icon: 'PauseCircle', min: 0, max: 24, step: 1, value: storyPlan.incomeGaps.find((g) => g.id === 'career-break')?.months ?? 6, format: (v: number) => `${v} months` },
    state.dreams.travel && { key: 'tripsPerYear', label: 'Trips per year', icon: 'Plane', min: 0, max: 6, step: 1, value: state.dreams.travel.count ?? 2, format: (v: number) => `${v}` },
  ].filter(Boolean) as Lever[];

  const activeKey = (Object.keys(state.overrides)[0] as LeverKey | undefined) ?? undefined;
  const active = levers.find((l) => l.key === activeKey);
  const pick = (l: Lever) => dispatch({ type: 'overrides', overrides: { [l.key]: l.value } });
  const checkAge = Math.max(35, p.age + 10);
  const before = balancesAtAge(storyPlan, storyProjections.baseline, checkAge).liquidReal;
  const after = balancesAtAge(plan, projections.baseline, checkAge).liquidReal;
  const changed = goals.map((g) => ({ g, from: storyGoals.find((x) => x.id === g.id)?.status })).filter((x) => x.from && x.from !== x.g.status);
  const shortBefore = storyProjections.baseline.firstShortfallAge;
  const shortAfter = projections.baseline.firstShortfallAge;

  const buffer = emergencyMonthsAt(storyPlan, storyProjections.baseline, p.age + 3);
  const target = emergencyTarget(storyPlan, dreams);
  const moves = suggestions({ buffer, target, goals: storyGoals.map((g) => ({ id: g.id, status: g.status })), setTool });
  const tags = new Set(['all', 'paycheck', 'cpf', ...Object.keys(state.dreams)]);
  const resources = RESOURCES.filter((r) => r.tags.some((t) => tags.has(t)));

  return (
    <Screen wide>
      <StageIntro eyebrow="Stage 6 · Your next move" title="Change one thing. See what moves.">
        Pick a single lever and slide it. Your outlook updates instantly — so you can see the effect, not just be told to “save more”.
      </StageIntro>

      <Card className="rise-2">
        <div role="group" aria-label="Choose one thing to change" className="flex flex-wrap gap-2">
          {levers.map((l) => (
            <button
              key={l.key}
              type="button"
              aria-pressed={activeKey === l.key}
              onClick={() => pick(l)}
              className={cx('flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 text-sm font-semibold', activeKey === l.key ? 'border-navy-800 bg-navy-800 text-white' : 'border-mist-300 bg-white hover:border-ink-soft')}
            >
              <Icon name={l.icon} className="h-4 w-4" />
              {l.label}
            </button>
          ))}
        </div>

        {active ? (
          <div className="mt-5">
            <Slider
              label={`${active.label} (was ${active.format(active.value)})`}
              value={Number(state.overrides[active.key] ?? active.value)}
              min={active.min}
              max={active.max}
              step={active.step}
              format={active.format}
              onChange={(v) => dispatch({ type: 'overrides', overrides: { [active.key]: v } })}
            />
            <div className="mt-4 grid gap-2.5 sm:grid-cols-3" aria-live="polite">
              <div className="rounded-2xl bg-mist-50 p-3.5">
                <p className="text-xs font-medium text-ink-mute">Net savings & investments at {checkAge} (today’s $)</p>
                <p className="tabular mt-0.5 text-xl font-semibold">{money(after)}</p>
                <p className={cx('tabular text-xs font-semibold', after - before < -1 ? 'text-magenta-700' : after - before > 1 ? 'text-sage-700' : 'text-ink-mute')}>{Math.abs(after - before) < 1 ? 'no change yet' : `${money(after - before, { sign: true })} vs your story`}</p>
              </div>
              <div className="rounded-2xl bg-mist-50 p-3.5">
                <p className="text-xs font-medium text-ink-mute">Savings run out?</p>
                <p className="mt-0.5 text-xl font-semibold">{shortAfter === undefined ? 'Not before 65' : `Around ${shortAfter}`}</p>
                <p className="text-xs text-ink-mute">was {shortBefore === undefined ? 'not before 65' : `around ${shortBefore}`}</p>
              </div>
              <div className="rounded-2xl bg-mist-50 p-3.5">
                <p className="text-xs font-medium text-ink-mute">Dreams that changed status</p>
                {changed.length === 0 ? (
                  <p className="mt-0.5 text-sm text-ink-soft">None yet — try a bigger move.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {changed.map(({ g, from }) => (
                      <li key={g.id} className="flex flex-wrap items-center gap-1 text-xs">
                        <span className="font-semibold">{aspirationById(g.id).title}</span>
                        <StatusDot status={from!} label="was" />
                        <Icon name="ArrowRight" className="h-3 w-3" />
                        <StatusDot status={g.status} label="now" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="mt-5">
              <OutlookChart projections={projections} retireAge={plan.retireAge} compare={storyProjections.baseline} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" icon="RotateCcw" onClick={() => dispatch({ type: 'overrides', overrides: {} })}>
                Back to my story
              </Button>
              <Button variant="ghost" iconRight="ArrowRight" onClick={() => dispatch({ type: 'go', stage: 'outlook' })}>
                See full outlook with this change
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-mute">Choose a lever above to begin.</p>
        )}
      </Card>

      <section className="mt-8" aria-labelledby="moves-h">
        <h2 id="moves-h" className="display text-2xl">
          Moves you could explore
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {moves.map((m) => (
            <Card as="li" key={m.title} className="flex flex-col">
              <Icon name={m.icon} className="h-6 w-6 text-magenta-600" />
              <h3 className="mt-2 font-semibold">{m.title}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-ink-soft">{m.body}</p>
              {m.action && (
                <Button variant="ghost" className="-ml-3 mt-2 self-start" iconRight="ArrowRight" onClick={m.action.run}>
                  {m.action.label}
                </Button>
              )}
            </Card>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="tools-h">
        <h2 id="tools-h" className="display text-2xl">
          Your toolkit
        </h2>
        <p className="text-sm text-ink-mute">Pre-filled from your story. Change any number.</p>
        <div id="toolkit" className="-mx-4 mt-3 overflow-x-auto px-4">
          <div role="tablist" aria-label="Financial tools" className="flex min-w-max gap-2">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tool === t.id}
                aria-controls="tool-panel"
                onClick={() => setTool(t.id)}
                className={cx('flex min-h-[44px] items-center gap-2 rounded-full px-3.5 text-sm font-semibold', tool === t.id ? 'bg-navy-800 text-white' : 'bg-white text-ink-soft hover:text-ink')}
              >
                <Icon name={t.icon} className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <Card className="mt-3">
          <div role="tabpanel" id="tool-panel" aria-labelledby={`tab-${tool}`}>
            <ToolPanel key={tool} tool={tool} profile={p} plan={storyPlan} />
          </div>
        </Card>
      </section>

      <section className="mt-8" aria-labelledby="res-h">
        <h2 id="res-h" className="display text-2xl">
          Official places to go next
        </h2>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {resources.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer" className="flex h-full gap-3 rounded-2xl border border-mist-200 bg-white p-4 hover:border-ink-soft">
                <div className="flex-1">
                  <p className="font-semibold">
                    {r.title} <span className="text-xs font-medium text-ink-mute">· {r.org}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-ink-soft">{r.why}</p>
                </div>
                <Icon name="ExternalLink" className="h-4 w-4 shrink-0 text-ink-mute" label="opens in a new tab" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-3xl bg-navy-800 p-6 text-white">
        <h2 className="display text-2xl text-white">Try another version?</h2>
        <p className="mt-1 text-navy-100">Your future isn’t decided. Swap a dream, replay a decision, or start fresh as someone new.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="accent" icon="Sparkles" onClick={() => dispatch({ type: 'go', stage: 'dream' })}>
            Change my dreams
          </Button>
          <Button variant="secondary" icon="RotateCcw" onClick={() => dispatch({ type: 'go', stage: 'life' })}>
            Replay decisions
          </Button>
        </div>
      </section>

      <div className="mt-6">
        <Note>This is an educational simulation, not financial advice. It doesn’t recommend any product. For decisions about your own money, use official calculators and consider speaking to a licensed adviser.</Note>
      </div>

      <ActionBar>
        <Button variant="ghost" icon="ArrowLeft" onClick={() => dispatch({ type: 'go', stage: 'outlook' })}>
          Back
        </Button>
        <Button variant="secondary" icon="BookOpen" onClick={() => dispatch({ type: 'openAbout' })}>
          How this works
        </Button>
      </ActionBar>
    </Screen>
  );
}

function suggestions({ buffer, target, goals, setTool }: { buffer: number; target: number; goals: { id: string; status: string }[]; setTool: (t: ToolId) => void }) {
  const open = (t: ToolId) => () => {
    setTool(t);
    document.getElementById('toolkit')?.scrollIntoView({ block: 'start' });
  };
  const out: { title: string; body: string; icon: string; action?: { label: string; run: () => void } }[] = [];
  if (buffer < target)
    out.push({ title: 'Build your buffer first', body: `Your cash covers about ${Math.floor(buffer * 10) / 10} months of costs in a few years; ${target} months gives you room for surprises like a job change.`, icon: 'Umbrella', action: { label: 'Plan an emergency fund', run: open('emergency') } });
  const g = (id: string) => goals.find((x) => x.id === id);
  if (g('career_break') && g('career_break')!.status !== 'on_track') out.push({ title: 'Stress-test your break', body: 'Every recurring commitment shortens your runway. See how long your savings would actually last.', icon: 'PauseCircle', action: { label: 'Open runway calculator', run: open('runway') } });
  if (g('retire_early') && g('retire_early')!.status !== 'on_track') out.push({ title: 'Find your retirement age', body: 'Moving retirement by a few years changes both how much you save and how long it must last. Try the retirement-age lever above.', icon: 'Sunset' });
  if (g('own_home')) out.push({ title: 'Check housing eligibility early', body: 'Get familiar with HDB eligibility rules and grants before you set a timeline — they shape what’s possible.', icon: 'Home' });
  out.push({ title: 'Understand your payslip', body: 'Know exactly where each dollar of salary goes — take-home, your CPF, your employer’s CPF and tax.', icon: 'Wallet', action: { label: 'Open paycheck explainer', run: open('paycheck') } });
  out.push({ title: 'Pause before you invest', body: 'Check any “guaranteed” offer with ScamShield. Only invest money you won’t need soon, and understand the ups and downs first.', icon: 'ShieldCheck', action: { label: 'Explore investment swings', run: open('risk') } });
  return out.slice(0, 3);
}
