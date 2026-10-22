import { Button, Icon } from '../components/ui';
import { surpriseCharacter } from '../engine/profile';
import { useStore } from '../state/store';

export default function Welcome() {
  const { state, dispatch } = useStore();
  const hasProgress = state.furthest >= 0 || !!state.profile.nickname;

  return (
    <div className="relative overflow-hidden">
    <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-magenta-100 blur-3xl" />
    <div aria-hidden className="pointer-events-none absolute -left-32 top-64 h-72 w-72 rounded-full bg-navy-100 blur-3xl" />
    <main id="main" className="relative mx-auto flex min-h-[100dvh] max-w-xl flex-col px-5 pb-10 pt-8 sm:pt-14">
      <div className="flex items-center gap-2">
        <span aria-hidden className="grid h-8 w-8 place-items-center rounded-[10px] bg-navy-800">
          <span className="h-3 w-3 rounded-full bg-magenta-500" />
        </span>
        <span className="display text-lg">Design Your Life</span>
      </div>

      <section className="rise mt-10 sm:mt-14">
        <h1 className="display text-[40px] leading-[1.05] sm:text-[56px]">
          Your future isn’t decided.
          <span className="block text-magenta-600">Try a few versions.</span>
        </h1>
        <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-soft">
          Pick the life you want, live through a few years of decisions, and see what it could take — in about 8 minutes.
        </p>
      </section>

      <Versions />

      <div className="rise-3 mt-8 flex flex-col gap-3 sm:flex-row">
        <Button className="sm:flex-1" iconRight="ArrowRight" onClick={() => dispatch({ type: 'go', stage: 'profile', step: 0 })}>
          {hasProgress ? 'Start a new version' : 'Start designing'}
        </Button>
        <Button variant="secondary" icon="Shuffle" className="sm:flex-1" onClick={() => { const c = surpriseCharacter(); dispatch({ type: 'surprise', profile: c.profile, dreams: c.dreams }); }}>
          Surprise me
        </Button>
      </div>
      {hasProgress && (
        <Button variant="ghost" className="mt-2" onClick={() => dispatch({ type: 'go', stage: state.furthest >= 0 ? (['dream', 'reality', 'habits', 'life', 'outlook', 'next'] as const)[state.furthest] : 'profile' })}>
          Continue where I left off
        </Button>
      )}

      <ul className="mt-10 space-y-3 text-sm text-ink-soft">
        <li className="flex gap-3"><Icon name="Lock" className="mt-0.5 h-4 w-4 shrink-0" /> No sign-up, no NRIC, no bank details. Use a nickname and made-up numbers if you like.</li>
        <li className="flex gap-3"><Icon name="Lightbulb" className="mt-0.5 h-4 w-4 shrink-0" /> An educational simulation using 2026 Singapore rules — not a prediction or financial advice.</li>
        <li className="flex gap-3"><Icon name="Compass" className="mt-0.5 h-4 w-4 shrink-0" /> No right or wrong life. Just trade-offs you can explore.</li>
      </ul>
      <button type="button" onClick={() => dispatch({ type: 'openAbout' })} className="mt-6 self-start text-sm font-semibold text-magenta-700 underline underline-offset-4">
        How this works & our sources
      </button>
    </main>
    </div>
  );
}

/** Three stacked "versions" of a future — a calm, abstract illustration. */
function Versions() {
  const cards = [
    { title: 'Version A', line: 'Own place at 25 · Dog · 2 trips a year', bar: 'bg-magenta-500', w: 'w-[72%]' },
    { title: 'Version B', line: 'Stay home · Career break at 28', bar: 'bg-navy-800', w: 'w-[86%]' },
    { title: 'Version C', line: 'Start a studio · Four-day week', bar: 'bg-navy-600', w: 'w-[58%]' },
  ];
  return (
    <div aria-hidden className="rise-2 relative mt-10 h-[150px]">
      {cards.map((c, i) => (
        <div
          key={c.title}
          className="card absolute left-0 right-0 mx-auto p-4"
          style={{ top: i * 30, transform: `scale(${1 - (2 - i) * 0.04})`, zIndex: i }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-mute">{c.title}</span>
            <span className="h-2 w-2 rounded-full bg-mist-300" />
          </div>
          <p className="mt-1 text-sm font-semibold">{c.line}</p>
          <div className="mt-3 h-1.5 rounded-full bg-mist-100">
            <div className={`h-1.5 rounded-full ${c.bar} ${c.w}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
