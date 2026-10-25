import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { defaultProfile, type Dreams, type Habits, type Overrides, type Profile } from '../engine/profile';
import type { HabitDefaults } from '../engine/plan';

export type StageId = 'welcome' | 'profile' | 'dream' | 'reality' | 'habits' | 'life' | 'outlook' | 'next' | 'about';

export const JOURNEY: { id: StageId; label: string }[] = [
  { id: 'dream', label: 'Dream' },
  { id: 'reality', label: 'Reality check' },
  { id: 'habits', label: 'Life choices' },
  { id: 'life', label: 'Life happens' },
  { id: 'outlook', label: 'Your outlook' },
  { id: 'next', label: 'Next move' },
];

export interface AppState {
  version: 1;
  stage: StageId;
  returnTo?: StageId;
  profile: Profile;
  dreams: Dreams;
  habits: Habits;
  habitEdits: Partial<HabitDefaults>;
  decisions: Record<string, string>;
  /** Quick guesses (higher / lower / same savings) made before each outcome is revealed. */
  guesses: Record<string, 'up' | 'down' | 'same'>;
  overrides: Overrides;
  saveLocally: boolean;
  furthest: number;
  /** Optional sub-step to open a screen at (e.g. profile review after "Surprise me"). */
  step?: number;
}

export const initialState = (): AppState => ({
  version: 1,
  stage: 'welcome',
  profile: defaultProfile(),
  dreams: {},
  habits: {},
  habitEdits: {},
  decisions: {},
  guesses: {},
  overrides: {},
  saveLocally: true,
  furthest: -1,
});

type Action =
  | { type: 'go'; stage: StageId; step?: number }
  | { type: 'surprise'; profile: Profile; dreams: Dreams }
  | { type: 'openAbout' }
  | { type: 'closeAbout' }
  | { type: 'profile'; profile: Partial<Profile> }
  | { type: 'setProfile'; profile: Profile }
  | { type: 'dreams'; dreams: Dreams }
  | { type: 'habits'; habits: Habits }
  | { type: 'habitEdits'; edits: Partial<HabitDefaults> }
  | { type: 'decide'; scenarioId: string; choiceId: string }
  | { type: 'undecide'; scenarioId: string }
  | { type: 'guess'; scenarioId: string; guess: 'up' | 'down' | 'same' }
  | { type: 'overrides'; overrides: Overrides }
  | { type: 'saveLocally'; value: boolean }
  | { type: 'reset' };

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'go': {
      const idx = JOURNEY.findIndex((j) => j.id === a.stage);
      return { ...s, stage: a.stage, step: a.step, furthest: Math.max(s.furthest, idx) };
    }
    case 'surprise':
      return { ...initialState(), saveLocally: s.saveLocally, profile: a.profile, dreams: a.dreams, stage: 'profile', step: 99 };
    case 'openAbout':
      return s.stage === 'about' ? s : { ...s, stage: 'about', returnTo: s.stage };
    case 'closeAbout':
      return { ...s, stage: s.returnTo ?? 'welcome', returnTo: undefined };
    case 'profile':
      return { ...s, profile: { ...s.profile, ...a.profile } };
    case 'setProfile':
      return { ...s, profile: a.profile };
    case 'dreams':
      return { ...s, dreams: a.dreams };
    case 'habits':
      return { ...s, habits: a.habits };
    case 'habitEdits':
      return { ...s, habitEdits: { ...s.habitEdits, ...a.edits } };
    case 'decide': {
      if (s.decisions[a.scenarioId] === a.choiceId) return s;
      const guesses = { ...s.guesses };
      delete guesses[a.scenarioId];
      return { ...s, decisions: { ...s.decisions, [a.scenarioId]: a.choiceId }, guesses };
    }
    case 'guess':
      return { ...s, guesses: { ...s.guesses, [a.scenarioId]: a.guess } };
    case 'undecide': {
      const d = { ...s.decisions };
      delete d[a.scenarioId];
      const guesses = { ...s.guesses };
      delete guesses[a.scenarioId];
      return { ...s, decisions: d, guesses };
    }
    case 'overrides':
      return { ...s, overrides: a.overrides };
    case 'saveLocally':
      return { ...s, saveLocally: a.value };
    case 'reset':
      return { ...initialState(), saveLocally: s.saveLocally };
  }
}

const KEY = 'design-your-life:v1';

function load(): AppState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== 1) return initialState();
    return { ...initialState(), ...parsed, profile: { ...defaultProfile(), ...parsed.profile }, stage: parsed.stage === 'about' ? parsed.returnTo ?? 'welcome' : parsed.stage };
  } catch {
    return initialState();
  }
}

function persist(s: AppState) {
  try {
    if (s.saveLocally) window.localStorage.setItem(KEY, JSON.stringify(s));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable (private mode etc.) — the app works without it */
  }
}

const Ctx = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => persist(state), [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore outside provider');
  return c;
}
