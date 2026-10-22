import { Button, Card, Disclosure, Icon, Screen, StageIntro, cx } from '../components/ui';
import { SOURCES } from '../data/sources';
import { ALL_ASSUMPTIONS } from '../engine/assumptions';
import { useStore } from '../state/store';

const CAN = [
  'Illustrate possible financial consequences of choices',
  'Compare hypothetical decisions side by side',
  'Help you understand trade-offs between goals',
  'Explain basics like CPF, take-home pay, inflation and risk',
  'Offer educational calculators you can play with',
];
const CANNOT = [
  'Predict your actual financial future',
  'Guarantee investment returns or any recovery after a fall',
  'Tell you which lifestyle is “right”',
  'Give regulated, personalised financial advice',
  'Recommend specific insurance or investment products',
  'Confirm housing or government-scheme eligibility',
  'Diagnose your financial personality',
  'Replace official CPF, IRAS or HDB calculations',
];

export default function About() {
  const { state, dispatch } = useStore();
  return (
    <Screen wide>
      <StageIntro eyebrow="How this works" title="An honest look under the hood">
        Design Your Life is a prototype learning experience for Singapore youths. It uses simplified 2026 rules to show how choices could play out.
      </StageIntro>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-semibold">
            <Icon name="CircleCheck" className="h-5 w-5 text-sage-700" /> What it can do
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            {CAN.map((c) => (
              <li key={c}>· {c}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 font-semibold">
            <Icon name="X" className="h-5 w-5 text-magenta-700" /> What it can’t do
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            {CANNOT.map((c) => (
              <li key={c}>· {c}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon name="Lock" className="h-5 w-5" /> Your privacy
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          No accounts, no NRIC, no bank connections, no real-money transactions. Everything runs in your browser. {state.saveLocally ? 'Your progress is saved in this browser’s local storage only — it never leaves this device.' : 'Progress saving is off, so nothing is stored.'} Nothing is shared by default.
        </p>
        <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-navy-800" checked={state.saveLocally} onChange={(e) => dispatch({ type: 'saveLocally', value: e.target.checked })} />
          Remember my progress on this device
        </label>
        <Button
          variant="secondary"
          icon="RotateCcw"
          className="mt-3"
          onClick={() => {
            if (window.confirm('Clear everything and start again?')) dispatch({ type: 'reset' });
          }}
        >
          Clear my data & start over
        </Button>
      </Card>

      <section className="mt-6 space-y-3">
        <h2 className="display text-2xl">Assumptions</h2>
        <p className="text-sm text-ink-mute">
          <span className="font-semibold text-sage-700">Verified</span> = from an official source for the period stated. <span className="font-semibold text-amber-700">Estimated</span> = from market or survey data, treat as a range. <span className="font-semibold text-navy-700">Illustrative</span> = a teaching value, not a forecast.
        </p>
        {ALL_ASSUMPTIONS.map((a) => (
          <Disclosure
            key={a.label}
            summary={
              <span>
                {a.label} <span className={cx('ml-1 rounded-full px-2 py-0.5 text-[11px]', a.status === 'verified' ? 'bg-sage-100 text-sage-700' : a.status === 'estimated' ? 'bg-amber-100 text-amber-700' : 'bg-navy-50 text-navy-700')}>{a.status}</span>
              </span>
            }
          >
            <dl className="grid gap-1.5">
              <div><dt className="inline font-semibold text-ink">Effective: </dt><dd className="inline">{a.effective}</dd></div>
              <div><dt className="inline font-semibold text-ink">Applies to: </dt><dd className="inline">{a.appliesTo}</dd></div>
              {a.conditions && <div><dt className="inline font-semibold text-ink">Conditions & limits: </dt><dd className="inline">{a.conditions}</dd></div>}
              <div><dt className="inline font-semibold text-ink">Next review: </dt><dd className="inline">{a.nextReview}</dd></div>
            </dl>
          </Disclosure>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="display text-2xl">Sources</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {Object.values(SOURCES).map((s) => (
            <li key={s.id} className="rounded-2xl border border-mist-200 bg-white p-3">
              <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold underline-offset-4 hover:underline">
                {s.title}
              </a>
              <p className="text-xs text-ink-mute">
                {s.publisher}
                {s.published && ` · published ${s.published}`} · checked {s.accessed} · {s.official ? 'official' : 'secondary'}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 flex justify-center">
        <Button icon="ArrowLeft" onClick={() => dispatch({ type: 'closeAbout' })}>
          Back
        </Button>
      </div>
    </Screen>
  );
}
