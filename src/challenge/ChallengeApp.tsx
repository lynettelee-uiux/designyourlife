import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon, cx } from '../components/ui';
import { QUESTIONS, type Question, type Tier } from './questions';
import { AREAS, GROUPS, SITUATIONS, STAGE_INFO, groupById, groupRelevance, relevance, stageOf, type Area, type GroupId, type Player, type Relevance } from './areas';
import {
  LEVELS, MAX_HEARTS, RETRY_GAP, SPRINT_SECONDS, UNLOCK_AT, addStats, catchUp, groupScores, levelOf, loadProgress, maxTier, nextQuestion, nextTier, pointsFor,
  questionsFor, saveProgress, shuffled, startTier, trackPosition, updateMistakes,
  type Answer, type Focus, type Progress,
} from './game';
import { SkillRadar } from './SkillRadar';
import { ageBand, leaderboard, peerAverage } from './peers';

type Mode = 'sprint' | 'practice';
type Phase = 'home' | 'play' | 'results';

interface Round {
  mode: Mode;
  focus: Focus;
  answers: Answer[];
  asked: Set<string>;
  areas: Partial<Record<Area, number>>;
  tier: Tier;
  streak: number;
  points: number;
  current?: Question;
  /** The current question is one you missed before. */
  retry: boolean;
  /** Missed in this round — asked again once due. */
  retries: { id: string; due: number }[];
  /** Missed in earlier rounds (snapshot at the start). */
  past: string[];
  /** Index chosen for the current question; undefined while answering. */
  chosen?: number;
  msLeft: number;
  endedBy?: 'time' | 'hearts' | 'questions' | 'stopped';
  before: { xp: number; best: number };
}

const TIER: Record<Tier, { label: string; cls: string }> = {
  1: { label: 'Easy', cls: 'bg-sp-mint/15 text-sp-mint' },
  2: { label: 'Medium', cls: 'bg-sp-amber/15 text-sp-amber' },
  3: { label: 'Hard', cls: 'bg-sp-pink/15 text-sp-pink' },
  4: { label: 'Expert', cls: 'bg-sp-blue/20 text-sp-blue' },
};

function beatTarget(): number | undefined {
  try {
    const n = Number(new URLSearchParams(window.location.search).get('beat'));
    return Number.isInteger(n) && n > 0 && n < 100 ? n : undefined;
  } catch {
    return undefined;
  }
}

function focusFor(player: Player, group: GroupId | null, xp: number): Focus {
  const cap = maxTier(levelOf(xp).index);
  return group ? { kind: 'topic', group, maxTier: cap } : { kind: 'mixed', stage: stageOf(player), weights: relevance(player), maxTier: cap };
}

export default function ChallengeApp() {
  const [progress, setProgressState] = useState<Progress>(() => loadProgress());
  const [phase, setPhase] = useState<Phase>('home');
  const [round, setRound] = useState<Round | null>(null);
  const beat = useMemo(beatTarget, []);

  const setProgress = useCallback((p: Progress) => {
    setProgressState(p);
    saveProgress(p);
  }, []);

  // Move focus to the new screen's heading for keyboard and screen-reader users.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const h = document.querySelector<HTMLElement>('main h1');
    h?.setAttribute('tabindex', '-1');
    h?.focus({ preventScroll: true });
  }, [phase]);

  const start = (mode: Mode, group: GroupId | null = null) => {
    if (!progress.player) return;
    const focus = focusFor(progress.player, group, progress.xp);
    const lv = levelOf(progress.xp).index;
    const tier = Math.min(group ? 1 : startTier(lv), focus.maxTier ?? 4) as Tier;
    const past = progress.mistakes ?? [];
    const r: Round = {
      mode, focus, answers: [], asked: new Set(), areas: {}, tier, streak: 0, points: 0, retry: false, retries: [], past,
      msLeft: SPRINT_SECONDS * 1000, before: { xp: progress.xp, best: progress.best },
    };
    const first = nextQuestion(QUESTIONS, { tier, asked: r.asked, roundAreas: r.areas, focus, answers: [], retries: [], past });
    r.current = first.question && shuffled(first.question);
    r.retry = first.retry;
    setRound(r);
    setPhase('play');
  };

  const finish = useCallback(
    (r: Round, endedBy: Round['endedBy']) => {
      setRound({ ...r, endedBy });
      const right = r.answers.filter((a) => a.right).length;
      const p: Progress = { ...progress, stats: addStats(progress.stats, r.answers), mistakes: updateMistakes(progress.mistakes, r.answers) };
      if (r.mode === 'sprint') {
        p.xp = progress.xp + r.points;
        p.best = Math.max(progress.best, right);
      }
      setProgress(p);
      setPhase('results');
    },
    [progress, setProgress],
  );

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sp-bg">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-sp-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-2.5">
          <span className="flex items-center gap-2">
            <span aria-hidden className="grid h-7 w-7 place-items-center rounded-[9px] bg-sp-blue-fill">
              <Icon name="Zap" className="h-4 w-4 text-white" />
            </span>
            <span className="sp-title text-[18px]">Money Sprint</span>
          </span>
          <nav aria-label="Other versions" className="flex gap-3 text-sm font-semibold text-sp-soft">
            <a href="../lite/" className="underline-offset-4 hover:underline">Lite</a>
            <a href="../" className="underline-offset-4 hover:underline">Full</a>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-xl px-4 pb-16 pt-5">
        {phase === 'home' && <Home progress={progress} setProgress={setProgress} beat={beat} onStart={start} />}
        {phase === 'play' && round && <Play round={round} setRound={setRound} progress={progress} setProgress={setProgress} onFinish={finish} />}
        {phase === 'results' && round && <Results round={round} progress={progress} beat={beat} onAgain={start} onHome={() => setPhase('home')} />}
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------------------------

function Hearts({ n, size = 'md' }: { n: number; size?: 'sm' | 'md' }) {
  return (
    <span className="flex items-center gap-0.5" role="img" aria-label={`${n} of ${MAX_HEARTS} hearts left`}>
      {Array.from({ length: MAX_HEARTS }, (_, i) => (
        <Icon key={i} name="Heart" className={cx(size === 'sm' ? 'h-4 w-4' : 'h-5 w-5', i < n ? 'fill-sp-pink text-sp-pink' : 'text-white/25')} />
      ))}
    </span>
  );
}

/** All five levels on one track; the fill sits between the level you're in and the next. */
function LevelTrack({ xp }: { xp: number }) {
  const lv = levelOf(xp);
  const pos = trackPosition(xp);
  const last = LEVELS.length - 1;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold">
          <Icon name="Medal" className="h-4 w-4 text-sp-amber" />
          {lv.name}
        </span>
        <span className="text-xs text-sp-mute">
          {lv.next ? (
            <>
              {lv.next.xp - xp} pts to <span className="font-semibold text-sp-soft">{lv.next.name}</span> · level {lv.index + 1} of {LEVELS.length}
            </>
          ) : (
            `${xp} pts · top level`
          )}
        </span>
      </div>
      <div className="px-2">
        <div className="relative mt-3 h-2 rounded-full bg-white/10" role="progressbar" aria-label={`Level progress: ${lv.name}, ${xp} points`} aria-valuemin={0} aria-valuemax={LEVELS[last].xp} aria-valuenow={Math.min(xp, LEVELS[last].xp)}>
          <div className="h-2 rounded-full bg-gradient-to-r from-sp-blue-fill to-sp-pink transition-[width] duration-700" style={{ width: `${pos * 100}%` }} />
          {LEVELS.map((l, i) => (
            <span
              key={l.name}
              title={`${l.name} · ${l.xp} pts`}
              className={cx('absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2', i <= lv.index ? 'border-sp-card bg-sp-pink' : 'border-white/25 bg-sp-card')}
              style={{ left: `${(i / last) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Which difficulties are open, and what unlocks the next one. */
function Unlocks({ xp }: { xp: number }) {
  const lv = levelOf(xp).index;
  return (
    <ul className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-bold" aria-label="Question difficulty">
      {([1, 2, 3, 4] as Tier[]).map((t) => {
        const open = lv >= UNLOCK_AT[t];
        return (
          <li key={t} className={cx('inline-flex items-center gap-1 rounded-full px-2 py-1', open ? TIER[t].cls : 'bg-white/5 text-sp-mute')}>
            {!open && <Icon name="Lock" className="h-3 w-3" />}
            {TIER[t].label}
            {!open && <span className="font-semibold"> · at {LEVELS[UNLOCK_AT[t]].name}</span>}
          </li>
        );
      })}
    </ul>
  );
}

function untilTomorrow() {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const m = Math.ceil((t.getTime() - now.getTime()) / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

// ---------------------------------------------------------------------------------------------

/** Who you are, so questions and comparisons fit your stage. Asked once, editable. */
function PlayerSetup({ initial, onSave, onCancel }: { initial?: Player; onSave: (p: Player) => void; onCancel?: () => void }) {
  const [age, setAge] = useState(initial?.age ?? 22);
  const [situation, setSituation] = useState(initial?.situation);
  return (
    <section className="sp-card pop p-5" aria-labelledby="setup-h">
      <h2 id="setup-h" className="sp-title text-xl">First, a little about you</h2>
      <p className="mt-1 text-sm text-sp-mute">We’ll pick questions for your life stage, using MoneySense’s life-stage guidance.</p>
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <label htmlFor="age" className="text-sm font-medium text-sp-soft">Your age</label>
          <output htmlFor="age" className="sp-title text-lg">{age}</output>
        </div>
        <input id="age" type="range" min={17} max={35} value={age} onChange={(e) => setAge(Number(e.target.value))} style={{ ['--fill' as string]: `${((age - 17) / 18) * 100}%` }} />
      </div>
      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-sp-soft">Right now I’m…</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {SITUATIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={situation === s.value}
              onClick={() => setSituation(s.value)}
              className={cx('sp-tile flex min-h-[50px] items-center gap-2 px-3 text-left text-sm font-semibold', situation === s.value && '!border-sp-blue bg-sp-blue/15')}
            >
              <Icon name={s.icon} className="h-4 w-4 shrink-0" />
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" className="sp-btn disabled:opacity-40" disabled={!situation} onClick={() => situation && onSave({ age, situation })}>
          {initial ? 'Save' : 'Let’s go'} <Icon name="ArrowRight" className="h-4 w-4" />
        </button>
        {onCancel && (
          <button type="button" className="sp-link text-sm" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}

function Home({
  progress, setProgress, beat, onStart,
}: {
  progress: Progress;
  setProgress: (p: Progress) => void;
  beat?: number;
  onStart: (m: Mode, group?: GroupId | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const out = progress.hearts <= 0;
  const player = progress.player;
  const missed = progress.mistakes?.length ?? 0;

  return (
    <>
      <header className="rise mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sp-blue">Test your skills · 60 seconds</p>
        <h1 className="sp-title mt-1 text-[34px] leading-[1.05]">How sharp are your money skills?</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-sp-soft">Right answers move you up the levels and unlock harder questions. Wrong ones cost a heart — you get 5 a day.</p>
      </header>

      {beat && (
        <p className="pop mb-4 flex items-center gap-2 rounded-2xl border border-sp-amber/40 bg-sp-amber/10 px-4 py-3 text-sm font-semibold text-sp-amber">
          <Icon name="Trophy" className="h-5 w-5" />A friend got {beat} right in 60 seconds. Can you beat it?
        </p>
      )}

      {!player || editing ? (
        <PlayerSetup
          initial={player}
          onSave={(p) => {
            setProgress({ ...progress, player: p });
            setEditing(false);
          }}
          onCancel={player ? () => setEditing(false) : undefined}
        />
      ) : (
        <>
          <section className="sp-card rise-2 p-5" aria-label="Your progress">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm">
                <span className="font-semibold">
                  {player.age} · {SITUATIONS.find((s) => s.value === player.situation)?.label}
                </span>
                <span className="text-sp-mute"> · {STAGE_INFO[stageOf(player)].label} </span>
                <button type="button" onClick={() => setEditing(true)} className="sp-link ml-1 text-sm">
                  Edit
                </button>
              </p>
              <Hearts n={progress.hearts} />
            </div>
            <div className="mt-5">
              <LevelTrack xp={progress.xp} />
            </div>
            <Unlocks xp={progress.xp} />
          </section>

          <div className="rise-3 mt-5">
            {out ? (
              <p className="sp-card flex items-center gap-3 p-4 text-sm">
                <Icon name="HeartCrack" className="h-5 w-5 shrink-0 text-sp-pink" />
                <span>
                  <strong>Out of hearts for today.</strong> <span className="text-sp-soft">5 new hearts in {untilTomorrow()}.</span>
                </span>
              </p>
            ) : (
              <button type="button" onClick={() => onStart('sprint', null)} className="sp-btn w-full justify-start gap-3 px-4 py-3 text-left">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
                  <Icon name="Zap" className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="sp-title block text-[19px]">Start a 60-second sprint</span>
                  <span className="block text-xs font-medium text-white/80">Mixed questions for age {player.age} · {STAGE_INFO[stageOf(player)].label.toLowerCase()}</span>
                </span>
                <Icon name="ArrowRight" className="h-5 w-5 shrink-0" />
              </button>
            )}
            {missed > 0 && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-sp-amber">
                <Icon name="RotateCcw" className="h-3.5 w-3.5" />
                {missed} question{missed === 1 ? '' : 's'} you missed will come back for a second try
              </p>
            )}
            <p className="mt-3 text-center text-xs text-sp-mute">
              {out ? 'Meanwhile, you can ' : 'Rather not race? '}
              <button type="button" onClick={() => onStart('practice', null)} className="sp-link">
                practise without a timer
              </button>
            </p>
          </div>

          <TopicDive player={player} out={out} onStart={onStart} />
          {Object.values(progress.stats).some((x) => x && x.seen > 0) && <FocusAreas player={player} progress={progress} onPractise={(g) => onStart('practice', g)} />}
          <Compare player={player} progress={progress} />
        </>
      )}

      <p className="mt-8 text-center text-xs leading-relaxed text-sp-mute">
        Progress stays in this browser — nothing is sent anywhere. Questions use public Singapore sources, MoneySense first (with CPF, IRAS, HDB, MOH, MAS and SPF); illustrative figures say so. Leaderboard and peer averages are demo data.
      </p>
    </>
  );
}

/** Secondary option: a sprint on one key area. Collapsed to keep one clear main action. */
function TopicDive({ player, out, onStart }: { player: Player; out: boolean; onStart: (m: Mode, group?: GroupId | null) => void }) {
  return (
    <details className="sp-card group mt-6">
      <summary className="flex min-h-[56px] cursor-pointer items-center gap-3 px-5 py-3">
        <Icon name="Target" className="h-5 w-5 text-sp-blue" />
        <span className="flex-1">
          <span className="block text-sm font-semibold">Or dive into a key area</span>
          <span className="block text-xs text-sp-mute">Every question on one topic</span>
        </span>
        <Icon name="ChevronDown" className="h-4 w-4 text-sp-mute transition-transform group-open:rotate-180" />
      </summary>
      <ul className="grid grid-cols-2 gap-2 px-4 pb-4">
        {GROUPS.map((g) => (
          <li key={g.id}>
            <button type="button" onClick={() => onStart(out ? 'practice' : 'sprint', g.id)} className="sp-tile flex h-full w-full flex-col items-start p-3 text-left">
              <span className="flex w-full items-center justify-between">
                <Icon name={g.icon} className="h-5 w-5 text-sp-blue" />
                {groupRelevance(player, g) === 2 && <span className="rounded-full bg-sp-pink/15 px-1.5 py-0.5 text-[10px] font-bold text-sp-pink">Core for you</span>}
              </span>
              <span className="mt-1.5 text-sm font-semibold leading-tight">{g.title}</span>
              <span className="text-xs text-sp-mute">{g.blurb}</span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

interface Priority {
  id: GroupId;
  reason: string;
}

/**
 * The two areas to work on first: furthest below players your age (core at your stage first),
 * topped up with untried core areas, then your lowest score so far.
 */
function priorities(player: Player, progress: Progress): Priority[] {
  const you = groupScores(progress.stats);
  const peers = peerAverage(player);
  const rel = Object.fromEntries(GROUPS.map((g) => [g.id, groupRelevance(player, g)])) as Record<GroupId, Relevance>;
  const band = ageBand(player.age).label;
  const out: Priority[] = catchUp(you, peers, rel).map((id) => {
    const gap = Math.round((peers[id] - (you[id].share ?? 0)) * 100);
    return { id, reason: `${rel[id] === 2 ? 'Core at your stage · ' : ''}${gap} points below players aged ${band} (demo)` };
  });
  for (const g of GROUPS) {
    if (out.length >= 2) break;
    if (!you[g.id].seen && rel[g.id] === 2 && !out.some((p) => p.id === g.id)) out.push({ id: g.id, reason: 'Core at your stage · not tried yet' });
  }
  const played = GROUPS.filter((g) => you[g.id].seen && !out.some((p) => p.id === g.id)).sort((a, b) => (you[a.id].share ?? 0) - (you[b.id].share ?? 0));
  for (const g of played) {
    if (out.length >= 2) break;
    out.push({ id: g.id, reason: `Your lowest score so far (${Math.round((you[g.id].share ?? 0) * 100)}%)` });
  }
  return out.slice(0, 2);
}

/** Numbered, so it's obvious what to work on first. */
function FocusAreas({ player, progress, onPractise, showReading }: { player: Player; progress: Progress; onPractise: (g: GroupId) => void; showReading?: boolean }) {
  const list = priorities(player, progress);
  if (!list.length) return null;
  const you = groupScores(progress.stats);
  const peers = peerAverage(player);
  return (
    <section className="mt-8" aria-labelledby="focus-h">
      <h2 id="focus-h" className="sp-title text-2xl">Your top {list.length === 1 ? 'focus area' : `${list.length} focus areas`}</h2>
      <p className="mt-1 text-sm text-sp-soft">Strengthen these first — they’ll lift your score the most.</p>
      <ol className="mt-3 space-y-3">
        {list.map((p, i) => (
          <FocusCard key={p.id} rank={i + 1} p={p} you={you[p.id]} peer={peers[p.id]} stats={progress.stats} onPractise={() => onPractise(p.id)} showReading={showReading} />
        ))}
      </ol>
    </section>
  );
}

/** How you compare with players your age (demo data) and where you'd rank. */
function Compare({ player, progress }: { player: Player; progress: Progress }) {
  const you = groupScores(progress.stats);
  const peers = peerAverage(player);
  const band = ageBand(player.age).label;
  const rel = Object.fromEntries(GROUPS.map((g) => [g.id, groupRelevance(player, g)])) as Record<GroupId, Relevance>;
  const board = leaderboard(player, progress.best);
  const me = board.find((r) => r.you);

  return (
    <section className="mt-8" aria-labelledby="cmp-h">
      <h2 id="cmp-h" className="sp-title text-2xl">You vs players aged {band}</h2>
      <p className="mt-1 text-sm text-sp-soft">
        {me ? (
          <>
            You’d rank <strong className="text-white">#{me.rank} of {board.length}</strong> this week
          </>
        ) : (
          'Play a sprint to see where you rank'
        )}
        <span className="ml-1.5 rounded bg-white/10 px-1 py-px text-[10px] font-bold uppercase tracking-wide text-sp-mute">demo</span>
      </p>
      <div className="sp-card mt-3 p-4">
        <SkillRadar you={you} peers={peers} rel={rel} bandLabel={band} />
      </div>
      <details className="group mt-4">
        <summary className="sp-link inline-flex cursor-pointer items-center gap-1 text-sm">
          This week’s leaderboard <Icon name="ChevronDown" className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <Leaderboard rows={board} />
      </details>
    </section>
  );
}

/** "You may want to check out…": readings and tools for the areas to work on, MoneySense first, one tap away. */
function CheckOut({ list }: { list: Priority[] }) {
  const seen = new Set<string>(); // each reading appears once, under the first area that needs it
  const items = list.flatMap(({ id }) => {
    const g = groupById(id);
    const links = g.areas
      .flatMap((a) => AREAS[a].readings)
      .sort((a, b) => Number(b.org.includes('MoneySense')) - Number(a.org.includes('MoneySense')))
      .filter((r) => !seen.has(r.url) && seen.add(r.url))
      .slice(0, 3);
    return [{ g, links, practise: AREAS[g.areas[0]].practise }];
  });
  if (!items.length) return null;
  return (
    <details className="sp-card group mt-5">
      <summary className="flex min-h-[56px] cursor-pointer items-center gap-3 px-5 py-3">
        <Icon name="BookOpen" className="h-5 w-5 text-sp-blue" />
        <span className="flex-1">
          <span className="block text-sm font-semibold">You may want to check out…</span>
          <span className="block text-xs text-sp-mute">Articles and tools for your focus areas, in order</span>
        </span>
        <Icon name="ChevronDown" className="h-4 w-4 text-sp-mute transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 px-5 pb-5">
        {items.map(({ g, links, practise }, i) => (
          <div key={g.id}>
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-sp-mute">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-sp-pink text-[10px] text-white">{i + 1}</span>
              Focus {i + 1} · {g.title}
            </h4>
            <ul className="mt-2 space-y-1.5">
              {links.map((r) => (
                <li key={r.url + r.label}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="group/link flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm hover:bg-white/10">
                    <span className="flex-1">
                      <span className="font-semibold text-white">{r.label}</span>
                      <span className="block text-xs text-sp-mute">{r.org}</span>
                    </span>
                    <Icon name="ExternalLink" className="mt-0.5 h-4 w-4 shrink-0 text-sp-blue" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
              <li>
                <a href={practise.href} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-sp-pink hover:bg-white/5">
                  <Icon name="Sparkles" className="h-4 w-4" />
                  <span className="flex-1">{practise.label}</span>
                  <Icon name="ArrowRight" className="h-4 w-4" />
                </a>
              </li>
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

function FocusCard({ rank, p, you, peer, stats, onPractise, showReading }: { rank: number; p: Priority; you: { right: number; seen: number; share?: number }; peer: number; stats: Progress['stats']; onPractise: () => void; showReading?: boolean }) {
  const g = groupById(p.id);
  // Advice comes from the weaker of the area's two skills.
  const share = (a: Area) => (stats[a]?.seen ? stats[a]!.right / stats[a]!.seen : 0);
  const weakest = [...g.areas].sort((a, b) => share(a) - share(b))[0];
  const info = AREAS[weakest];
  const reading = info.readings[0];
  return (
    <li className={cx('sp-card p-4', rank === 1 && '!border-sp-pink/60 border-2')}>
      <div className="flex items-start gap-3">
        <span className={cx('sp-title grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg', rank === 1 ? 'bg-sp-pink-fill text-white' : 'bg-white/10 text-sp-soft')}>{rank}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{g.title}</h3>
            {rank === 1 && <span className="rounded-full bg-sp-pink/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sp-pink">Start here</span>}
          </div>
          <p className="mt-0.5 text-xs text-sp-mute">{p.reason}</p>
        </div>
      </div>
      {you.seen > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-[11px] font-semibold text-sp-mute">
            <span>You {Math.round((you.share ?? 0) * 100)}%</span>
            <span>Peers {Math.round(peer * 100)}%</span>
          </div>
          <div className="relative mt-1 h-2 rounded-full bg-white/10" aria-hidden>
            <div className="h-2 rounded-full bg-sp-pink" style={{ width: `${Math.max(4, (you.share ?? 0) * 100)}%` }} />
            <span className="absolute -top-1 h-4 w-0.5 rounded bg-sp-blue" style={{ left: `${peer * 100}%` }} />
          </div>
        </div>
      )}
      <p className="mt-3 text-sm leading-relaxed text-sp-soft">
        <strong className="text-white">Try this week:</strong> {info.tip}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <button type="button" className="sp-link" onClick={onPractise}>
          Practise {g.title.toLowerCase()} →
        </button>
        {showReading && (
          <a href={reading.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sp-soft underline-offset-4 hover:underline">
            Read: {reading.label} · {reading.org}
            <Icon name="ExternalLink" className="h-3.5 w-3.5" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>
    </li>
  );
}

function Leaderboard({ rows }: { rows: ReturnType<typeof leaderboard> }) {
  const shown = rows.filter((r) => r.rank <= 5 || r.you);
  return (
    <div className="mt-3">
      <p className="text-xs text-sp-mute">Sample players to show how a leaderboard would work — not real people. Ranked by most right in one sprint.</p>
      <ol className="sp-card mt-2 overflow-hidden">
        {shown.map((r, i) => (
          <li key={r.name} className={cx('flex items-center gap-3 px-4 py-2.5 text-sm', i > 0 && 'border-t border-white/10', r.you && 'bg-sp-pink/15 font-semibold')}>
            <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold', r.rank === 1 ? 'bg-sp-amber text-sp-bg' : 'bg-white/10 text-sp-soft')}>{r.rank}</span>
            <span className="flex-1 truncate">{r.you ? 'You' : r.name}</span>
            <span className="tabular-nums text-sp-soft">{r.best} right</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function Play({
  round, setRound, progress, setProgress, onFinish,
}: {
  round: Round;
  setRound: (r: Round) => void;
  progress: Progress;
  setProgress: (p: Progress) => void;
  onFinish: (r: Round, by: Round['endedBy']) => void;
}) {
  const timed = round.mode === 'sprint';
  const answering = round.chosen === undefined;
  const ref = useRef(round);
  ref.current = round;
  const [announce, setAnnounce] = useState('');

  // The clock only runs while a question is open; reading the explanation is free.
  useEffect(() => {
    if (!timed || !answering) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const r = ref.current;
      const msLeft = r.msLeft - (now - last);
      last = now;
      if (msLeft <= 0) {
        window.clearInterval(id);
        onFinish({ ...r, msLeft: 0 }, 'time');
        return;
      }
      const s = Math.ceil(msLeft / 1000);
      if (s !== Math.ceil(r.msLeft / 1000) && (s === 30 || s === 10)) setAnnounce(`${s} seconds left`);
      setRound({ ...r, msLeft });
    }, 200);
    return () => window.clearInterval(id);
  }, [timed, answering, onFinish, setRound]);

  const q = round.current!;
  const right = round.answers.filter((a) => a.right).length;

  const choose = (i: number) => {
    if (!answering) return;
    const ok = i === q.answer;
    const streak = ok ? round.streak + 1 : 0;
    const points = round.points + (ok ? pointsFor(q.tier, streak) : 0);
    const areas = { ...round.areas, [q.area]: (round.areas[q.area] ?? 0) + 1 };
    const answers = [...round.answers, { question: q, chosen: i, right: ok }];
    // Duolingo-style: a miss comes back a few questions later.
    const retries = ok ? round.retries : [...round.retries.filter((r) => r.id !== q.id), { id: q.id, due: answers.length + RETRY_GAP }];
    setRound({ ...round, chosen: i, streak, points, areas, answers, retries, asked: new Set(round.asked).add(q.id) });
    if (!ok && timed) setProgress({ ...progress, hearts: Math.max(0, progress.hearts - 1) });
  };

  const outOfHearts = timed && progress.hearts <= 0;
  const next = () => {
    if (outOfHearts) return onFinish(round, 'hearts');
    const tier = nextTier(round.tier, round.answers[round.answers.length - 1].right, round.streak, round.focus.maxTier);
    const n = nextQuestion(QUESTIONS, { tier, asked: round.asked, roundAreas: round.areas, focus: round.focus, answers: round.answers, retries: round.retries, past: round.past });
    if (!n.question) return onFinish(round, 'questions');
    const retries = round.retries.filter((r) => r.id !== n.question!.id);
    setRound({ ...round, tier, current: shuffled(n.question), retry: n.retry, retries, chosen: undefined });
  };

  // Number keys 1–4 pick an answer; Enter moves on.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return;
      const n = Number(e.key);
      if (answering && n >= 1 && n <= q.options.length) choose(n - 1);
      // Enter moves on — unless a button has focus, which handles Enter itself.
      else if (!answering && e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const secs = Math.ceil(round.msLeft / 1000);
  const last = round.answers[round.answers.length - 1];
  const total = questionsFor(QUESTIONS, round.focus).length;

  return (
    <>
      <div className="sticky top-[53px] z-20 -mx-4 mb-5 border-b border-white/10 bg-sp-bg/90 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center justify-between gap-3 text-sm font-semibold">
          {timed ? (
            <span className={cx('sp-title flex items-center gap-1.5 text-base tabular-nums', secs <= 10 && 'text-sp-pink')}>
              <Icon name="Timer" className="h-4 w-4" />
              {secs}s{!answering && <span className="font-sans text-xs font-normal text-sp-mute"> · paused</span>}
            </span>
          ) : (
            <span className="text-sp-soft">Practice</span>
          )}
          <span className="flex items-center gap-1.5">
            <Icon name="CircleCheck" className="h-4 w-4 text-sp-mint" />
            {right} right
          </span>
          {timed ? <Hearts n={progress.hearts} size="sm" /> : <span className="text-sp-mute">{round.points} pts</span>}
        </div>
        {timed && (
          <div className="mt-2 h-2 rounded-full bg-white/10" aria-hidden>
            <div className={cx('h-2 rounded-full transition-[width] duration-200 ease-linear', secs <= 10 ? 'bg-sp-pink' : 'bg-sp-blue')} style={{ width: `${(round.msLeft / (SPRINT_SECONDS * 1000)) * 100}%` }} />
          </div>
        )}
        {round.focus.kind === 'topic' && (
          <p className="mt-1.5 text-xs text-sp-mute">
            Topic: <strong className="text-sp-soft">{groupById(round.focus.group).title}</strong> · {Math.min(round.asked.size + (answering ? 1 : 0), total)} of {total}
          </p>
        )}
        <p className="sr-only" aria-live="assertive">{announce}</p>
      </div>

      <section key={`${q.id}-${round.answers.length}`} className="pop" aria-labelledby="q-h">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-sp-soft">
            <Icon name={AREAS[q.area].icon} className="h-3.5 w-3.5" />
            {AREAS[q.area].axis}
          </span>
          <span className={cx('rounded-full px-2.5 py-1', TIER[q.tier].cls)}>
            {TIER[q.tier].label} · {pointsFor(q.tier, 0)} pts
          </span>
          {round.retry && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sp-amber/15 px-2.5 py-1 text-sp-amber">
              <Icon name="RotateCcw" className="h-3.5 w-3.5" /> Second try
            </span>
          )}
          {round.streak >= 2 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sp-amber/15 px-2.5 py-1 text-sp-amber">
              <Icon name="Flame" className="h-3.5 w-3.5" />
              {round.streak} in a row
            </span>
          )}
        </div>
        <h1 id="q-h" className="mt-3 text-[20px] font-bold leading-snug">
          {q.question}
        </h1>
        <div className="mt-4 grid gap-2.5" role="group" aria-label="Answers">
          {q.options.map((o, i) => {
            const isAnswer = i === q.answer;
            const picked = round.chosen === i;
            return (
              <button
                key={o}
                type="button"
                disabled={!answering}
                onClick={() => choose(i)}
                aria-pressed={picked}
                className={cx(
                  'sp-tile flex min-h-[56px] items-center gap-3 px-4 py-3 text-left text-[15px] font-semibold',
                  !answering && isAnswer && '!border-sp-mint bg-sp-mint/15',
                  !answering && picked && !isAnswer && '!border-sp-pink bg-sp-pink/15',
                  !answering && !picked && !isAnswer && 'opacity-50',
                )}
              >
                <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-bold text-sp-soft">
                  {i + 1}
                </span>
                <span className="flex-1">{o}</span>
                {!answering && isAnswer && <Icon name="CircleCheck" className="h-5 w-5 text-sp-mint" label="Correct answer" />}
                {!answering && picked && !isAnswer && <Icon name="X" className="h-5 w-5 text-sp-pink" label="Your answer" />}
              </button>
            );
          })}
        </div>
      </section>

      {!answering && last && (
        <section className={cx('sp-card pop mt-4 border-2 p-5', last.right ? '!border-sp-mint/50' : '!border-sp-pink/50')} aria-live="polite">
          <p className={cx('inline-flex items-center gap-1.5 text-sm font-bold', last.right ? 'text-sp-mint' : 'text-sp-pink')}>
            <Icon name={last.right ? 'CircleCheck' : timed ? 'HeartCrack' : 'Lightbulb'} className="h-4 w-4" />
            {last.right ? `${round.retry ? 'Fixed it!' : 'Right!'} +${pointsFor(q.tier, round.streak)} pts` : timed ? 'Not quite — you lost a heart' : 'Not quite'}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-sp-soft">{q.explain}</p>
          {!last.right && <p className="mt-2 text-xs font-semibold text-sp-amber">This one will come back for a second try.</p>}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button type="button" className="sp-btn-blue" onClick={next} autoFocus>
              {outOfHearts ? 'See results' : 'Continue'} <Icon name="ArrowRight" className="h-4 w-4" />
            </button>
            {!timed && (
              <button type="button" className="sp-link text-sm" onClick={() => onFinish(round, 'stopped')}>
                Finish
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------------------------

function Results({ round, progress, beat, onAgain, onHome }: { round: Round; progress: Progress; beat?: number; onAgain: (m: Mode, group?: GroupId | null) => void; onHome: () => void }) {
  const sprint = round.mode === 'sprint';
  const right = round.answers.filter((a) => a.right).length;
  const missed = round.answers.filter((a) => !a.right).length;
  const before = levelOf(round.before.xp);
  const after = levelOf(progress.xp);
  const levelledUp = sprint && after.index > before.index;
  const unlocked = ([3, 4] as Tier[]).filter((t) => before.index < UNLOCK_AT[t] && after.index >= UNLOCK_AT[t]);
  const newBest = sprint && right > round.before.best && right > 0;
  const fixed = round.answers.filter((a) => a.right && round.past.includes(a.question.id)).length;
  const topicGroup = round.focus.kind === 'topic' ? round.focus.group : null;
  const secs = Math.max(1, Math.round(SPRINT_SECONDS - round.msLeft / 1000));
  const stillMissed = (progress.mistakes ?? []).length;

  const headline =
    round.endedBy === 'hearts' ? 'Out of hearts' : round.endedBy === 'time' ? 'Time’s up' : round.endedBy === 'questions' ? (topicGroup ? `All ${groupById(topicGroup).title.toLowerCase()} questions done` : 'All questions done') : 'Practice done';

  return (
    <>
      <section className="pop text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sp-blue">{headline}</p>
        <h1 className="mt-1">
          <span className="sp-title block text-[72px] leading-none">{right}</span>
          <span className="mt-1 block text-base font-semibold text-sp-soft">
            right {sprint ? `in ${secs} second${secs === 1 ? '' : 's'}` : `of ${round.answers.length}`}
            {topicGroup && ` · ${groupById(topicGroup).title}`}
          </span>
        </h1>
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-bold">
          {sprint && <span className="rounded-full bg-white/10 px-3 py-1">+{round.points} pts</span>}
          {levelledUp && <span className="rounded-full bg-sp-amber px-3 py-1 text-sp-bg">Level up! You’re a {after.name}</span>}
          {unlocked.map((t) => (
            <span key={t} className={cx('rounded-full px-3 py-1', TIER[t].cls)}>
              {TIER[t].label} questions unlocked
            </span>
          ))}
          {newBest && <span className="rounded-full bg-sp-pink/15 px-3 py-1 text-sp-pink">New personal best</span>}
          {fixed > 0 && <span className="rounded-full bg-sp-mint/15 px-3 py-1 text-sp-mint">Fixed {fixed} past mistake{fixed === 1 ? '' : 's'}</span>}
          {sprint && beat && <span className="rounded-full bg-white/10 px-3 py-1">{right > beat ? `You beat your friend’s ${beat}!` : right === beat ? `Tied with your friend’s ${beat}` : `Your friend got ${beat}`}</span>}
        </div>
      </section>

      {progress.player && <FocusAreas player={progress.player} progress={progress} onPractise={(g) => onAgain('practice', g)} showReading />}

      {sprint && (
        <section className="sp-card mt-8 p-5" aria-label="Your progress">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="font-semibold text-sp-soft">Hearts left today</span>
            <Hearts n={progress.hearts} />
          </div>
          <LevelTrack xp={progress.xp} />
        </section>
      )}

      <div className="mt-5 grid gap-3">
        {progress.hearts > 0 ? (
          <button type="button" className="sp-btn w-full" onClick={() => onAgain('sprint', topicGroup)}>
            <Icon name="Zap" className="h-5 w-5" /> {topicGroup ? 'Another round on this topic' : 'Next sprint'}
          </button>
        ) : (
          <button type="button" className="sp-btn-blue w-full" onClick={() => onAgain('practice', topicGroup)}>
            <Icon name="BookOpen" className="h-5 w-5" /> Keep practising — no timer
          </button>
        )}
        {stillMissed > 0 && (
          <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-sp-amber">
            <Icon name="RotateCcw" className="h-3.5 w-3.5" /> {stillMissed} missed question{stillMissed === 1 ? '' : 's'} will come back for a second try
          </p>
        )}
      </div>

      {progress.player && <Compare player={progress.player} progress={progress} />}
      {/* Readings come after a round: they point at what this round showed you need. */}
      {progress.player && <CheckOut list={priorities(progress.player, progress)} />}

      {round.answers.length > 0 && (
        <details className="sp-card group mt-6">
          <summary className="flex min-h-[52px] cursor-pointer items-center gap-2 px-5 py-3 text-sm font-semibold">
            <span className="flex-1">
              See your answers <span className="font-normal text-sp-mute">· {right} right, {missed} to review</span>
            </span>
            <Icon name="ChevronDown" className="h-4 w-4 text-sp-mute transition-transform group-open:rotate-180" />
          </summary>
          <ol className="space-y-2 px-4 pb-4">
            {round.answers
              .map((a, i) => ({ a, i }))
              .sort((x, y) => Number(x.a.right) - Number(y.a.right))
              .map(({ a, i }) => (
                <li key={`${a.question.id}-${i}`} className="rounded-2xl bg-white/5 p-3.5">
                  <p className="flex items-start gap-2 text-sm font-semibold">
                    <Icon name={a.right ? 'CircleCheck' : 'X'} className={cx('mt-0.5 h-4 w-4 shrink-0', a.right ? 'text-sp-mint' : 'text-sp-pink')} label={a.right ? 'Right' : 'Wrong'} />
                    {a.question.question}
                  </p>
                  {!a.right && (
                    <p className="mt-1.5 pl-6 text-sm text-sp-soft">
                      Answer: <strong className="text-white">{a.question.options[a.question.answer]}</strong>. {a.question.explain}
                    </p>
                  )}
                </li>
              ))}
          </ol>
        </details>
      )}

      {sprint && right > 0 && <ChallengeFriend right={right} />}

      <p className="mt-6 text-center">
        <button type="button" className="sp-link text-sm" onClick={onHome}>
          Back to start
        </button>
      </p>
    </>
  );
}

function ChallengeFriend({ right }: { right: number }) {
  const [shared, setShared] = useState('');
  const link = `${window.location.origin}${window.location.pathname}?beat=${right}`;
  const message = `I got ${right} right in a 60-second Design Your Life money sprint. Can you beat it?`;

  const copy = async () => {
    setShared((await copyText(`${message} ${link}`)) ? 'Link copied — paste it in a chat to challenge a friend.' : 'Couldn’t copy automatically — select the link below and copy it.');
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Design Your Life — Money Sprint', text: message, url: link });
        setShared('Shared — may the best saver win!');
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return; // they closed the share sheet
      }
    }
    await copy(); // no share sheet here (or it failed): copy instead
  };

  return (
    <details className="sp-card group mt-3">
      <summary className="flex min-h-[52px] cursor-pointer items-center gap-2 px-5 py-3 text-sm font-semibold">
        <Icon name="Trophy" className="h-4 w-4 text-sp-amber" />
        <span className="flex-1">Challenge a friend to beat {right}</span>
        <Icon name="ChevronDown" className="h-4 w-4 text-sp-mute transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5">
        <div className="flex flex-wrap gap-3">
          <button type="button" className="sp-btn" onClick={share}>
            <Icon name="Share2" className="h-4 w-4" /> Share
          </button>
          <button type="button" className="sp-btn-blue" onClick={copy}>
            Copy link
          </button>
        </div>
        <label className="mt-4 block text-xs font-semibold text-sp-mute">
          Or copy this link
          <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-normal text-white" />
        </label>
        <p className="mt-2 min-h-[1.25rem] text-sm font-semibold text-sp-mint" aria-live="polite">{shared}</p>
      </div>
    </details>
  );
}

/** Copies text, falling back to a hidden textarea where the Clipboard API isn't allowed. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const t = document.createElement('textarea');
      t.value = text;
      t.setAttribute('readonly', '');
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      const ok = document.execCommand('copy');
      t.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
