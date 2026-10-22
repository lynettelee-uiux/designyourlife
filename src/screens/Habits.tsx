import { useState } from 'react';
import { ActionBar, Button, Card, Icon, Note, Screen, Segmented, Slider, StageIntro, cx } from '../components/ui';
import { HABIT_QUESTIONS } from '../data/habitQuestions';
import { DOWNTURN_DROP, type RiskLevel } from '../engine/assumptions';
import { money, pct } from '../engine/format';
import { habitDefaults } from '../engine/plan';
import { paycheck } from '../engine/paycheck';
import { STATUS_INFO, type Habits } from '../engine/profile';
import { useStore } from '../state/store';

export default function HabitsScreen() {
  const { state, dispatch } = useStore();
  const answered = HABIT_QUESTIONS.filter((q) => state.habits[q.id] !== undefined).length;
  const [i, setI] = useState(answered >= HABIT_QUESTIONS.length ? HABIT_QUESTIONS.length : answered);
  const done = i >= HABIT_QUESTIONS.length;

  return (
    <Screen>
      {!done ? (
        <Question index={i} onAnswer={() => setI(i + 1)} onBack={() => (i === 0 ? dispatch({ type: 'go', stage: 'reality' }) : setI(i - 1))} />
      ) : (
        <ProfileSummary onRedo={() => setI(0)} />
      )}
    </Screen>
  );
}

function Question({ index, onAnswer, onBack }: { index: number; onAnswer: () => void; onBack: () => void }) {
  const { state, dispatch } = useStore();
  const q = HABIT_QUESTIONS[index];
  const current = q.options.find((o) => Object.entries(o.set).every(([k, v]) => state.habits[k as keyof Habits] === v));

  return (
    <>
      <StageIntro eyebrow={`Stage 3 · Life choices · ${index + 1} of ${HABIT_QUESTIONS.length}`} title={q.prompt}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft">{q.topic}</span>
      </StageIntro>
      <div className="rise-2 space-y-2.5" role="group" aria-label="Your answer">
        {q.options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={current?.id === o.id}
            onClick={() => {
              dispatch({ type: 'habits', habits: { ...state.habits, ...o.set } });
              onAnswer();
            }}
            className={cx('flex min-h-[60px] w-full items-center justify-between gap-3 rounded-3xl border bg-white px-5 py-4 text-left text-[16px] font-semibold transition-colors', current?.id === o.id ? 'border-navy-800' : 'border-mist-200 hover:border-ink-soft')}
          >
            {o.label}
            <Icon name="ArrowRight" className="h-4 w-4 shrink-0 text-ink-mute" />
          </button>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-ink-mute">Go with your gut — there are no wrong answers.</p>
      <ActionBar>
        <Button variant="ghost" icon="ArrowLeft" onClick={onBack}>
          Back
        </Button>
        <Button variant="secondary" onClick={onAnswer}>
          Skip
        </Button>
      </ActionBar>
    </>
  );
}

function ProfileSummary({ onRedo }: { onRedo: () => void }) {
  const { state, dispatch } = useStore();
  const p = state.profile;
  const hd = { ...habitDefaults(state.habits), ...state.habitEdits };
  const info = STATUS_INFO[p.status];
  const pay = paycheck(p.mainIncome, Math.max(p.age, p.mainIncomeAge), p.residency, info.mainKind, 2026);
  const lifestyle = Math.round(p.lifestyle * hd.lifestyleFactor);
  const invest = Math.round((pay.spendable * hd.investShare) / 10) * 10;
  const signals = HABIT_QUESTIONS.flatMap((q) => q.options.filter((o) => Object.entries(o.set).every(([k, v]) => state.habits[k as keyof Habits] === v)).slice(0, 1).map((o) => ({ topic: q.topic, signal: o.signal })));

  return (
    <>
      <StageIntro eyebrow="Stage 3 · Life choices" title="Here’s what we picked up">
        These are starting assumptions from a few quick answers — not a verdict on who you are. Change anything that doesn’t sound like you.
      </StageIntro>

      {signals.length > 0 && (
        <Card className="rise-2">
          <h2 className="font-semibold">What you told us</h2>
          <ul className="mt-2 space-y-2">
            {signals.map((s) => (
              <li key={s.topic} className="flex gap-3 text-[15px]">
                <span className="mt-0.5 w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-mute">{s.topic}</span>
                <span>{s.signal}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-3 space-y-5">
        <h2 className="font-semibold">Assumptions we’ll use (editable)</h2>
        <Slider
          label="Lifestyle spending each month"
          value={lifestyle}
          min={0}
          max={Math.max(2000, p.lifestyle * 2)}
          step={10}
          format={(v) => money(v)}
          help="Eating out, shopping, hobbies, subscriptions. Based on your answers about social plans."
          onChange={(v) => dispatch({ type: 'habitEdits', edits: { lifestyleFactor: p.lifestyle > 0 ? v / p.lifestyle : 1 } })}
        />
        <Slider
          label="Set aside to invest each month (once working)"
          value={hd.investShare}
          min={0}
          max={0.3}
          step={0.01}
          format={(v) => `${pct(v)} · ${money(Math.round((pay.spendable * v) / 10) * 10)}`}
          help={`A share of expected take-home pay (${money(pay.spendable)}). Only invested from what’s left after costs — never borrowed.`}
          onChange={(v) => dispatch({ type: 'habitEdits', edits: { investShare: v } })}
        />
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">How much up-and-down you’re comfortable with</p>
          <Segmented<RiskLevel>
            label="Investment risk comfort"
            value={hd.riskLevel}
            onChange={(v) => dispatch({ type: 'habitEdits', edits: { riskLevel: v } })}
            options={[
              { value: 'cautious', label: 'Steady' },
              { value: 'balanced', label: 'Balanced' },
              { value: 'adventurous', label: 'Bold' },
            ]}
          />
          <p className="mt-2 text-xs text-ink-mute">In a bad year we’ll show a fall of about {pct(DOWNTURN_DROP[hd.riskLevel])} for this mix. Higher potential returns come with bigger swings.</p>
        </div>
        {invest === 0 && <Note>You’re not investing in this version. That’s a valid choice — your savings will sit in cash.</Note>}
      </Card>

      <div className="mt-4 flex justify-center">
        <Button variant="ghost" icon="RotateCcw" onClick={onRedo}>
          Answer the questions again
        </Button>
      </div>

      <ActionBar>
        <Button variant="ghost" icon="ArrowLeft" onClick={() => dispatch({ type: 'go', stage: 'reality' })}>
          Back
        </Button>
        <Button iconRight="ArrowRight" onClick={() => dispatch({ type: 'go', stage: 'life' })}>
          Let life happen
        </Button>
      </ActionBar>
    </>
  );
}
