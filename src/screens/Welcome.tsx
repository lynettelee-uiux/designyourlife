import { Button, Icon } from '../components/ui';
import { FloatingDreams, HowItWorks, VersionStack } from '../components/Hero';
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-[10px] bg-navy-800">
            <span className="h-3 w-3 rounded-full bg-magenta-500" />
          </span>
          <span className="display text-lg">Design Your Life</span>
        </div>
      </div>
      <FloatingDreams className="mt-8 justify-end sm:mt-10" />

      <section className="rise relative mt-2">
        <h1 className="display text-[40px] leading-[1.05] sm:text-[56px]">
          Your future isn’t decided.
          <span className="block text-magenta-600">Try a few versions.</span>
        </h1>
        <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-soft">
          Pick the life you want, practise the money decisions that come with it, and learn what moves you closer — in about 8 minutes.
        </p>
      </section>

      <VersionStack />

      <HowItWorks
        steps={[
          { icon: 'Sparkles', title: 'Dream', text: 'Pick the life you want' },
          { icon: 'Zap', title: 'Practise', text: 'Guess, then decide' },
          { icon: 'Lightbulb', title: 'Learn', text: 'See why — and what helps' },
        ]}
      />

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

      <a href="./lite/" className="mt-3 self-center text-sm font-semibold text-ink-soft underline underline-offset-4 hover:text-ink">
        Short on time? Try the 4-minute Lite version
      </a>

      <ul className="mt-10 space-y-3 text-sm text-ink-soft">
        <li className="flex gap-3"><Icon name="Sparkles" className="mt-0.5 h-4 w-4 shrink-0" /> <span><strong className="text-ink">Not a calculator or budgeting app.</strong> A safe practice run for real Singapore money decisions — CPF, first pay, pay-later, scams — where you learn by deciding. Nothing to buy.</span></li>
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
