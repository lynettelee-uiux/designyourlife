import { useEffect, useRef, useState } from 'react';
import { Avatar, Icon, cx } from './components/ui';
import { JOURNEY, useStore, type StageId } from './state/store';
import Welcome from './screens/Welcome';
import ProfileScreen from './screens/Profile';
import Dream from './screens/Dream';
import Reality from './screens/Reality';
import HabitsScreen from './screens/Habits';
import LifeHappens from './screens/LifeHappens';
import Outlook from './screens/Outlook';
import NextMove from './screens/NextMove';
import About from './screens/About';

const SCREENS: Record<StageId, () => JSX.Element | null> = {
  welcome: Welcome,
  profile: ProfileScreen,
  dream: Dream,
  reality: Reality,
  habits: HabitsScreen,
  life: LifeHappens,
  outlook: Outlook,
  next: NextMove,
  about: About,
};

export default function App() {
  const { state } = useStore();
  const Screen = SCREENS[state.stage];
  const first = useRef(true);

  // Move focus to the new screen's heading for keyboard & screen-reader users.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    const h = document.querySelector<HTMLElement>('main h1');
    if (h) {
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    }
  }, [state.stage]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow-card">
        Skip to content
      </a>
      {state.stage !== 'welcome' && <Header />}
      <Screen />
    </>
  );
}

function Header() {
  const { state, dispatch } = useStore();
  const [menu, setMenu] = useState(false);
  const idx = JOURNEY.findIndex((j) => j.id === state.stage);
  const inJourney = idx >= 0;

  return (
    <header className="sticky top-0 z-30 border-b border-mist-200/80 bg-mist-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <button type="button" onClick={() => dispatch({ type: 'go', stage: 'welcome' })} className="flex items-center gap-2 rounded-full py-1 pr-2 text-left">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-[9px] bg-navy-800">
            <span className="h-2.5 w-2.5 rounded-full bg-magenta-500" />
          </span>
          <span className="display text-[17px]">Design Your Life</span>
        </button>
        <div className="flex items-center gap-1">
          {state.profile.nickname && (
            <button type="button" onClick={() => dispatch({ type: 'go', stage: 'profile', step: 3 })} className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-mist-100" aria-label={`Edit profile for ${state.profile.nickname}`}>
              <Avatar id={state.profile.avatar} size="sm" />
              <span className="hidden text-sm font-semibold sm:inline">{state.profile.nickname}</span>
            </button>
          )}
          <div className="relative">
            <button type="button" aria-expanded={menu} aria-haspopup="true" onClick={() => setMenu((m) => !m)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-mist-100" aria-label="Menu">
              <Icon name={menu ? 'X' : 'SlidersHorizontal'} />
            </button>
            {menu && (
              <div className="absolute right-0 top-12 w-64 rounded-2xl border border-mist-200 bg-white p-2 shadow-card" role="menu">
                <MenuItem icon="BookOpen" label="How this works & sources" onClick={() => { setMenu(false); dispatch({ type: 'openAbout' }); }} />
                <MenuItem icon="Pencil" label="Edit my profile" onClick={() => { setMenu(false); dispatch({ type: 'go', stage: 'profile', step: 3 }); }} />
                <MenuItem
                  icon="RotateCcw"
                  label="Start over (clear my data)"
                  onClick={() => {
                    setMenu(false);
                    if (window.confirm('Clear everything and start again? This removes your saved progress on this device.')) dispatch({ type: 'reset' });
                  }}
                />
                <p className="px-3 pb-1 pt-2 text-xs leading-snug text-ink-mute">
                  {state.saveLocally ? 'Progress is saved only in this browser on this device. Nothing is sent anywhere.' : 'Progress is not being saved. Closing this tab clears it.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {inJourney && (
        <nav aria-label="Journey progress" className="mx-auto max-w-3xl px-4 pb-2.5 sm:px-6">
          <ol className="flex gap-1.5">
            {JOURNEY.map((j, i) => {
              const reachable = i <= Math.max(state.furthest, idx);
              return (
                <li key={j.id} className="flex-1">
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => dispatch({ type: 'go', stage: j.id })}
                    aria-current={i === idx ? 'step' : undefined}
                    aria-label={`${i + 1}. ${j.label}${i < idx ? ' (done)' : ''}`}
                    className="group block w-full py-1 disabled:cursor-default"
                  >
                    <span className={cx('block h-1.5 rounded-full transition-colors', i < idx ? 'bg-navy-800' : i === idx ? 'bg-magenta-500' : 'bg-mist-200')} />
                    <span className={cx('mt-1 hidden text-left text-[11px] font-semibold sm:block', i === idx ? 'text-ink' : 'text-ink-mute')}>{j.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-0.5 text-[11px] font-semibold text-ink-mute sm:hidden">
            Step {idx + 1} of {JOURNEY.length} · {JOURNEY[idx].label}
          </p>
        </nav>
      )}
    </header>
  );
}

function MenuItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold hover:bg-mist-100">
      <Icon name={icon} className="h-4 w-4" />
      {label}
    </button>
  );
}
