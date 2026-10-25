import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Icon, Slider, cx } from '../components/ui';
import { QUESTIONS, type Question, type Tier } from './questions';
import { AREAS, GROUPS, SITUATIONS, STAGE_INFO, groupById, groupOf, groupRelevance, relevance, stageOf, type Area, type GroupId, type Player, type Relevance } from './areas';
import {
  LEVELS, MAX_HEARTS, SPRINT_SECONDS, addStats, diagnose, groupScores, levelOf, loadProgress, nextTier, pickQuestion, pointsFor, questionsFor, saveProgress, startTier,
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
  /** Index chosen for the current question; undefined while answering. */
  chosen?: number;
  msLeft: number;
  endedBy?: 'time' | 'hearts' | 'questions' | 'stopped';
  before: { xp: number; best: number };
}

const TIER_LABEL: Record<Tier, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

function beatTarget(): number | undefined {
  try {
    const n = Number(new URLSearchParams(window.location.search).get('beat'));
    return Number.isInteger(n) && n > 0 && n < 100 ? n : undefined;
  } catch {
    return undefined;
  }
}

const focusFor = (player: Player, group: GroupId | null): Focus => (group ? { kind: 'topic', group } : { kind: 'mixed', stage: stageOf(player), weights: relevance(player) });

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
    const focus = focusFor(progress.player, group);
    const tier = focus.kind === 'topic' ? 1 : startTier(levelOf(progress.xp).index);
    const r: Round = { mode, focus, answers: [], asked: new Set(), areas: {}, tier, streak: 0, points: 0, msLeft: SPRINT_SECONDS * 1000, before: { xp: progress.xp, best: progress.best } };
    r.current = pickQuestion(QUESTIONS, tier, r.asked, r.areas, focus);
    setRound(r);
    setPhase('play');
  };

  const finish = useCallback(
    (r: Round, endedBy: Round['endedBy']) => {
      setRound({ ...r, endedBy });
      const right = r.answers.filter((a) => a.right).length;
      const p = { ...progress, stats: addStats(progress.stats, r.answers) };
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
            <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-navy-800">Sprint</span>
          </span>
          <nav aria-label="Other versions" className="flex gap-3 text-sm font-semibold text-ink-soft">
            <a href="../lite/" className="underline-offset-4 hover:underline">Lite</a>
            <a href="../" className="underline-offset-4 hover:underline">Full</a>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-xl px-4 pb-16 pt-4">
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
        <Icon key={i} name="Heart" className={cx(size === 'sm' ? 'h-4 w-4' : 'h-5 w-5', i < n ? 'fill-magenta-500 text-magenta-500' : 'text-mist-300')} />
      ))}
    </span>
  );
}

function LevelBar({ xp }: { xp: number }) {
  const lv = levelOf(xp);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold">
          <Icon name="Medal" className="h-4 w-4 text-magenta-600" />
          {lv.name}
        </span>
        <span className="text-xs text-ink-mute">{lv.next ? `${xp} / ${lv.next.xp} pts to ${lv.next.name}` : `${xp} pts · top level`}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-mist-100" role="progressbar" aria-label="Progress to next level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(lv.progress * 100)}>
        <div className="h-2 rounded-full bg-gradient-to-r from-navy-800 to-magenta-500 transition-[width] duration-700" style={{ width: `${Math.max(4, lv.progress * 100)}%` }} />
      </div>
      <ol className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-ink-mute" aria-label="Levels">
        {LEVELS.map((l, i) => (
          <li key={l.name} className={cx(i === lv.index && 'text-navy-800')}>
            {l.name}
          </li>
        ))}
      </ol>
    </div>
  );
}

function untilTomorrow() {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const m = Math.ceil((t.getTime() - now.getTime()) / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

// ---------------------------------------------------------------------------------------------

/** Step 1: who you are, so questions and the skill map fit your stage. Asked once, editable. */
function PlayerSetup({ initial, onSave, onCancel }: { initial?: Player; onSave: (p: Player) => void; onCancel?: () => void }) {
  const [age, setAge] = useState(initial?.age ?? 22);
  const [situation, setSituation] = useState(initial?.situation);
  return (
    <Card className="pop p-5">
      <h2 className="display text-xl">First, a little about you</h2>
      <p className="mt-1 text-sm text-ink-mute">We’ll match questions to your life stage, using MoneySense’s life-stage guidance.</p>
      <div className="mt-4">
        <Slider label="Your age" value={age} min={17} max={35} onChange={setAge} />
      </div>
      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-ink-soft">Right now I’m…</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {SITUATIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={situation === s.value}
              onClick={() => setSituation(s.value)}
              className={cx('flex min-h-[48px] items-center gap-2 rounded-2xl border px-3 text-left text-sm font-semibold', situation === s.value ? 'border-navy-800 bg-navy-50' : 'border-mist-300 bg-white hover:border-ink-soft')}
            >
              <Icon name={s.icon} className="h-4 w-4 shrink-0" />
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button iconRight="ArrowRight" disabled={!situation} onClick={() => situation && onSave({ age, situation })}>
          {initial ? 'Save' : 'Show my challenge'}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </Card>
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

  return (
    <>
      <section className="rise relative mb-5 overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-800 via-[#2F1A6E] to-magenta-600 p-5 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-magenta-300/40 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-magenta-300">Test your skills · 60 seconds</p>
          <h1 className="display mt-1 text-[28px] leading-[1.1] text-white">How sharp are your money skills?</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-navy-100">Answer as many as you can before time runs out. Right answers move you up the levels. Wrong ones cost a heart — you get 5 a day.</p>
        </div>
      </section>

      {beat && (
        <p className="pop mb-4 flex items-center gap-2 rounded-2xl bg-magenta-50 px-4 py-3 text-sm font-semibold text-magenta-700">
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
          <Card className="rise-2 p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm">
                <span className="font-semibold">
                  {player.age} · {SITUATIONS.find((s) => s.value === player.situation)?.label}
                </span>
                <span className="text-ink-mute"> · {STAGE_INFO[stageOf(player)].label}</span>
              </p>
              <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-navy-700 underline-offset-4 hover:underline">
                Edit
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-mist-200 pt-4">
              <span className="text-sm font-semibold text-ink-soft">Today</span>
              <Hearts n={progress.hearts} />
            </div>
            <div className="mt-4">
              <LevelBar xp={progress.xp} />
            </div>

            {out ? (
              <div className="mt-5 rounded-2xl bg-mist-100 p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <Icon name="HeartCrack" className="h-4 w-4 text-magenta-600" /> Out of hearts for today
                </p>
                <p className="mt-1 text-ink-soft">5 new hearts in {untilTomorrow()}.</p>
              </div>
            ) : (
              <button type="button" onClick={() => onStart('sprint', null)} className="mt-5 flex w-full items-center gap-3 rounded-2xl bg-magenta-600 p-4 text-left text-white hover:bg-magenta-700">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
                  <Icon name="Zap" className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-bold">Start a 60-second sprint</span>
                  <span className="block text-xs text-magenta-100">Mixed questions picked for age {player.age} · {STAGE_INFO[stageOf(player)].label.toLowerCase()}</span>
                </span>
                <Icon name="ArrowRight" className="h-5 w-5 shrink-0" />
              </button>
            )}
            <p className="mt-2 text-center text-xs text-ink-mute">
              {out ? 'Meanwhile, you can ' : 'Rather not race? '}
              <button type="button" onClick={() => onStart('practice', null)} className="font-semibold text-navy-700 underline underline-offset-2">
                practise without a timer
              </button>
            </p>
          </Card>

          <TopicDive player={player} out={out} onStart={onStart} />
          <Leaderboard player={player} best={progress.best} />
          <SkillMapSection player={player} stats={progress.stats} />
        </>
      )}

      <p className="mt-6 text-center text-xs leading-relaxed text-ink-mute">
        Progress is kept only in this browser — nothing is sent or saved anywhere else. Questions use public Singapore sources, MoneySense first (with CPF, IRAS, HDB, MOH, MAS and SPF); some prices are illustrative and say so. Leaderboard and peer averages are demo data.
      </p>
    </>
  );
}

/** Secondary option: a sprint on one key area. Collapsed by default to keep one clear main action. */
function TopicDive({ player, out, onStart }: { player: Player; out: boolean; onStart: (m: Mode, group?: GroupId | null) => void }) {
  return (
    <details className="group mt-4 rounded-3xl bg-white shadow-card">
      <summary className="flex min-h-[56px] cursor-pointer items-center gap-3 px-5 py-3">
        <Icon name="Target" className="h-5 w-5 text-navy-700" />
        <span className="flex-1">
          <span className="block text-sm font-semibold">Or dive into a key area</span>
          <span className="block text-xs text-ink-mute">Every question on one topic</span>
        </span>
        <Icon name="ChevronDown" className="h-4 w-4 text-ink-mute transition-transform group-open:rotate-180" />
      </summary>
      <ul className="grid grid-cols-2 gap-2 px-4 pb-4">
        {GROUPS.map((g) => {
          const core = groupRelevance(player, g) === 2;
          return (
            <li key={g.id}>
              <button type="button" onClick={() => onStart(out ? 'practice' : 'sprint', g.id)} className="flex h-full w-full flex-col items-start rounded-2xl border border-mist-200 p-3 text-left hover:border-ink-soft">
                <span className="flex w-full items-center justify-between">
                  <Icon name={g.icon} className="h-5 w-5 text-navy-700" />
                  {core && <span className="rounded-full bg-magenta-50 px-1.5 py-0.5 text-[10px] font-bold text-magenta-700">Core for you</span>}
                </span>
                <span className="mt-1.5 text-sm font-semibold leading-tight">{g.title}</span>
                <span className="text-xs text-ink-mute">{g.blurb}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

/** Demo leaderboard for the player's age band — clearly labelled; replace with real scores later. */
function Leaderboard({ player, best }: { player: Player; best: number }) {
  const band = ageBand(player.age).label;
  const rows = leaderboard(player, best);
  const me = rows.find((r) => r.you);
  const shown = rows.filter((r) => r.rank <= 5 || r.you);
  return (
    <section className="mt-8" aria-labelledby="board-h">
      <div className="flex items-end justify-between gap-2">
        <h2 id="board-h" className="display text-xl">This week · ages {band}</h2>
        <span className="rounded bg-mist-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-mute">Demo</span>
      </div>
      <p className="mt-1 text-xs text-ink-mute">Sample players to show how a leaderboard would work — not real people. Ranked by most right in one sprint.</p>
      <ol className="mt-3 overflow-hidden rounded-3xl bg-white shadow-card">
        {shown.map((r, i) => (
          <li key={r.name} className={cx('flex items-center gap-3 px-4 py-2.5 text-sm', i > 0 && 'border-t border-mist-100', r.you && 'bg-magenta-50 font-semibold', r.you && r.rank > 6 && 'border-t-2 border-dashed border-mist-200')}>
            <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold', r.rank === 1 ? 'bg-[#FBEFD9] text-[#8A5A12]' : 'bg-mist-100 text-ink-soft')}>{r.rank}</span>
            <span className="flex-1 truncate">{r.you ? 'You' : r.name}</span>
            <span className="tabular-nums text-ink-soft">{r.best} right</span>
          </li>
        ))}
      </ol>
      {!me && <p className="mt-2 text-xs text-ink-mute">Play a sprint to get on the board.</p>}
    </section>
  );
}

/** How you compare: the spider diagram plus the same information as a list. */
function SkillMapSection({ player, stats }: { player: Player; stats: Progress['stats'] }) {
  const you = groupScores(stats);
  const peers = peerAverage(player);
  const band = ageBand(player.age).label;
  const rel = Object.fromEntries(GROUPS.map((g) => [g.id, groupRelevance(player, g)])) as Record<GroupId, Relevance>;
  return (
    <section className="mt-8" aria-labelledby="map-h">
      <h2 id="map-h" className="display text-xl">How you compare</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{STAGE_INFO[stageOf(player)].focus}</p>
      <Card className="mt-3 p-4">
        <SkillRadar you={you} peers={peers} rel={rel} bandLabel={band} />
      </Card>
      <ul className="mt-3 space-y-2">
        {GROUPS.map((g) => {
          const y = you[g.id];
          const weak = y.share !== undefined && y.share < peers[g.id];
          return (
            <li key={g.id} className="rounded-2xl bg-white p-3 shadow-card">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-semibold">
                  <Icon name={g.icon} className="h-4 w-4 shrink-0 text-navy-700" />
                  <span className="truncate">{g.title}</span>
                  {rel[g.id] === 2 && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-magenta-500" aria-label="core for your stage" />}
                </span>
                <span className="shrink-0 text-xs font-semibold text-ink-mute">
                  {y.seen ? `You ${Math.round((y.share ?? 0) * 100)}%` : 'Not tried'} · Peers {Math.round(peers[g.id] * 100)}%
                </span>
              </div>
              <div className="relative mt-2 h-1.5 rounded-full bg-mist-100" aria-hidden>
                {y.share !== undefined && <div className={cx('h-1.5 rounded-full', y.share >= peers[g.id] ? 'bg-sage-600' : 'bg-magenta-500')} style={{ width: `${Math.max(6, y.share * 100)}%` }} />}
                <span className="absolute -top-1 h-3.5 w-0.5 rounded bg-[#1A56E5]" style={{ left: `${peers[g.id] * 100}%` }} />
              </div>
              {weak && (
                <a href={AREAS[g.areas[0]].readings[0].url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-navy-700 underline-offset-4 hover:underline">
                  Read: {AREAS[g.areas[0]].readings[0].label} · {AREAS[g.areas[0]].readings[0].org}
                  <Icon name="ExternalLink" className="h-3 w-3" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-ink-mute">
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-magenta-500 align-middle" aria-hidden />Core for your stage · blue mark = players aged {band} (demo)
      </p>
    </section>
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
    setRound({ ...round, chosen: i, streak, points, areas, answers: [...round.answers, { question: q, chosen: i, right: ok }], asked: new Set(round.asked).add(q.id) });
    if (!ok && timed) setProgress({ ...progress, hearts: Math.max(0, progress.hearts - 1) });
  };

  const outOfHearts = timed && progress.hearts <= 0;
  const next = () => {
    if (outOfHearts) return onFinish(round, 'hearts');
    const tier = nextTier(round.tier, round.answers[round.answers.length - 1].right, round.streak);
    const current = pickQuestion(QUESTIONS, tier, round.asked, round.areas, round.focus);
    if (!current) return onFinish(round, 'questions');
    setRound({ ...round, tier, current, chosen: undefined });
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
      <div className="sticky top-[53px] z-20 -mx-4 mb-4 border-b border-mist-200/80 bg-mist-50/95 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center justify-between gap-3 text-sm font-semibold">
          {timed ? (
            <span className={cx('flex items-center gap-1.5 tabular-nums', secs <= 10 && 'text-magenta-700')}>
              <Icon name="Timer" className="h-4 w-4" />
              {secs}s{!answering && <span className="text-xs font-normal text-ink-mute"> · paused</span>}
            </span>
          ) : (
            <span className="text-ink-soft">Practice</span>
          )}
          <span className="flex items-center gap-1.5">
            <Icon name="CircleCheck" className="h-4 w-4 text-sage-700" />
            {right} right
          </span>
          {timed ? <Hearts n={progress.hearts} size="sm" /> : <span className="text-ink-mute">{round.points} pts</span>}
        </div>
        {timed && (
          <div className="mt-2 h-1.5 rounded-full bg-mist-200" aria-hidden>
            <div className={cx('h-1.5 rounded-full transition-[width] duration-200 ease-linear', secs <= 10 ? 'bg-magenta-500' : 'bg-navy-800')} style={{ width: `${(round.msLeft / (SPRINT_SECONDS * 1000)) * 100}%` }} />
          </div>
        )}
        {round.focus.kind === 'topic' && (
          <p className="mt-1.5 text-xs text-ink-mute">
            Topic: <strong className="text-ink-soft">{groupById(round.focus.group).title}</strong> · question {round.answers.length + (answering ? 1 : 0)} of {total}
          </p>
        )}
        <p className="sr-only" aria-live="assertive">{announce}</p>
      </div>

      <section key={q.id} className="pop" aria-labelledby="q-h">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-1 text-navy-800">
            <Icon name={AREAS[q.area].icon} className="h-3.5 w-3.5" />
            {AREAS[q.area].axis}
          </span>
          <span className={cx('rounded-full px-2.5 py-1', q.tier === 3 ? 'bg-magenta-100 text-magenta-700' : q.tier === 2 ? 'bg-[#FBEFD9] text-[#8A5A12]' : 'bg-sage-100 text-sage-700')}>
            {TIER_LABEL[q.tier]} · {pointsFor(q.tier, 0)} pts
          </span>
          {round.streak >= 2 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF1E6] px-2.5 py-1 text-[#B4530F]">
              <Icon name="Flame" className="h-3.5 w-3.5" />
              {round.streak} in a row
            </span>
          )}
        </div>
        <h1 id="q-h" className="mt-3 text-[20px] font-bold leading-snug">
          {q.question}
        </h1>
        <div className="mt-4 grid gap-2" role="group" aria-label="Answers">
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
                  'flex min-h-[52px] items-center gap-3 rounded-2xl border px-4 py-3 text-left text-[15px] font-semibold transition-colors',
                  answering && 'border-mist-300 bg-white hover:border-ink-soft',
                  !answering && isAnswer && 'border-sage-600 bg-sage-100 text-sage-700',
                  !answering && picked && !isAnswer && 'border-magenta-500 bg-magenta-50 text-magenta-700',
                  !answering && !picked && !isAnswer && 'border-mist-200 bg-white/60 text-ink-mute',
                )}
              >
                <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mist-100 text-xs font-bold text-ink-soft">
                  {i + 1}
                </span>
                <span className="flex-1">{o}</span>
                {!answering && isAnswer && <Icon name="CircleCheck" className="h-5 w-5" label="Correct answer" />}
                {!answering && picked && !isAnswer && <Icon name="X" className="h-5 w-5" label="Your answer" />}
              </button>
            );
          })}
        </div>
      </section>

      {!answering && last && (
        <section className="pop mt-4 rounded-3xl bg-blush-100 p-5" aria-live="polite">
          <p className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', last.right ? 'bg-sage-100 text-sage-700' : 'bg-white text-magenta-700')}>
            <Icon name={last.right ? 'CircleCheck' : timed ? 'HeartCrack' : 'Lightbulb'} className="h-3.5 w-3.5" />
            {last.right ? `Right! +${pointsFor(q.tier, round.streak)} pts` : timed ? 'Not quite — you lost a heart' : 'Not quite'}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{q.explain}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button iconRight="ArrowRight" onClick={next} autoFocus>
              {outOfHearts ? 'Out of hearts — see results' : 'Next question'}
            </Button>
            {!timed && (
              <Button variant="ghost" onClick={() => onFinish(round, 'stopped')}>
                Finish
              </Button>
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
  const before = levelOf(round.before.xp);
  const after = levelOf(progress.xp);
  const levelledUp = sprint && after.index > before.index;
  const newBest = sprint && right > round.before.best && right > 0;
  const thisRound = diagnose(addStats({}, round.answers));
  const allTime = diagnose(progress.stats);
  const rel = progress.player ? relevance(progress.player) : undefined;
  // Recommendations: this round's weak spots first, then all-time ones; core skills for your stage break ties.
  const weak = [...thisRound.weak, ...allTime.weak.filter((w) => !thisRound.weak.some((t) => t.area === w.area))]
    .slice(0, 3)
    .sort((a, b) => a.share - b.share || (rel ? rel[b.area] - rel[a.area] : 0));
  const strong = (thisRound.strong.length ? thisRound.strong : allTime.strong).slice(0, 3);
  const topicGroup = round.focus.kind === 'topic' ? round.focus.group : null;
  const [shared, setShared] = useState('');

  const headline =
    round.endedBy === 'hearts' ? 'Out of hearts!' : round.endedBy === 'time' ? 'Time’s up!' : round.endedBy === 'questions' ? (topicGroup ? `You answered every ${groupById(topicGroup).title.toLowerCase()} question!` : 'You answered every question!') : 'Practice done';

  const link = `${window.location.origin}${window.location.pathname}?beat=${right}`;
  const message = `I got ${right} right in a 60-second Design Your Life money sprint. Can you beat it?`;

  const copy = async () => {
    setShared((await copyText(`${message} ${link}`)) ? 'Link copied — paste it in a chat to challenge a friend.' : 'Couldn’t copy automatically — select the link below and copy it.');
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Design Your Life — Sprint', text: message, url: link });
        setShared('Shared — may the best saver win!');
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return; // they closed the share sheet
      }
    }
    await copy(); // no share sheet here (or it failed): copy instead
  };

  return (
    <>
      <section className="pop relative overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-800 via-[#2F1A6E] to-magenta-600 p-6 text-center text-white">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-magenta-300">{headline}</p>
        <h1 className="display mt-2 text-[34px] leading-tight text-white">
          {right} right{sprint ? ` in ${secondsLabel(SPRINT_SECONDS - round.msLeft / 1000)}` : ` of ${round.answers.length}`}
        </h1>
        {topicGroup && <p className="mt-1 text-sm text-navy-100">Topic: {groupById(topicGroup).title}</p>}
        {sprint && <p className="mt-1 text-navy-100">+{round.points} points</p>}
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-bold">
          {levelledUp && <span className="rounded-full bg-white px-3 py-1 text-magenta-700">Level up! You’re now a {after.name}</span>}
          {newBest && <span className="rounded-full bg-white/15 px-3 py-1">New personal best</span>}
          {sprint && beat && <span className="rounded-full bg-white/15 px-3 py-1">{right > beat ? `You beat your friend’s ${beat}!` : right === beat ? `You tied your friend’s ${beat}` : `Your friend got ${beat} — so close`}</span>}
        </div>
      </section>

      {sprint && (
        <Card className="mt-4 p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-soft">Hearts left today</span>
            <Hearts n={progress.hearts} />
          </div>
          <LevelBar xp={progress.xp} />
        </Card>
      )}

      <section className="mt-6" aria-labelledby="work-h">
        <h2 id="work-h" className="display text-xl">{weak.length ? 'Skills to work on' : 'No weak spots this time'}</h2>
        {weak.length === 0 ? (
          <p className="mt-1 text-sm text-ink-soft">Everything you answered was right. Keep going — streaks unlock harder questions worth more points.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {weak.map((w) => {
              const s = AREAS[w.area];
              return (
                <li key={w.area}>
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="flex items-center gap-2 font-semibold">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-magenta-50 text-magenta-700">
                          <Icon name={s.icon} className="h-4 w-4" />
                        </span>
                        {s.title}
                      </h3>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded-full bg-mist-100 px-2 py-0.5 text-xs font-semibold text-ink-soft">
                          {w.right} of {w.seen} right
                        </span>
                        {rel && rel[w.area] === 2 && <span className="rounded-full bg-magenta-50 px-2 py-0.5 text-[11px] font-bold text-magenta-700">Core for you</span>}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.fact}</p>
                    <p className="mt-2 rounded-2xl bg-mist-50 p-3 text-sm">
                      <strong>Try this week:</strong> {s.tip}
                    </p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-mute">Read & use</p>
                    <ul className="mt-1 space-y-1">
                      {s.readings.map((r) => (
                        <li key={r.url + r.label}>
                          <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-navy-700 underline-offset-4 hover:underline">
                            {r.label}
                            <span className="font-normal text-ink-mute"> · {r.org}</span>
                            <Icon name="ExternalLink" className="h-3.5 w-3.5" />
                            <span className="sr-only">(opens in a new tab)</span>
                          </a>
                        </li>
                      ))}
                      <li className="pt-1">
                        <button type="button" onClick={() => onAgain('practice', groupOf(w.area).id)} className="inline-flex items-center gap-1 text-sm font-semibold text-magenta-700 underline-offset-4 hover:underline">
                          Practise {groupOf(w.area).title.toLowerCase()} <Icon name="ArrowRight" className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    </ul>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {strong.length > 0 && (
        <section className="mt-6" aria-labelledby="strong-h">
          <h2 id="strong-h" className="display text-xl">You’re strong at</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {strong.map((s) => (
              <li key={s.area} className="inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-3 py-1.5 text-sm font-semibold text-sage-700">
                <Icon name={AREAS[s.area].icon} className="h-4 w-4" />
                {AREAS[s.area].title}
              </li>
            ))}
          </ul>
        </section>
      )}

      {progress.player && sprint && <Leaderboard player={progress.player} best={progress.best} />}
      {progress.player && <SkillMapSection player={progress.player} stats={progress.stats} />}

      {round.answers.length > 0 && (
        <section className="mt-6" aria-labelledby="review-h">
          <h2 id="review-h" className="display text-xl">Review your answers</h2>
          <ol className="mt-3 space-y-2">
            {[...round.answers].sort((a, b) => Number(a.right) - Number(b.right)).map((a) => (
              <li key={a.question.id} className="rounded-2xl bg-white p-3.5 shadow-card">
                <p className="flex items-start gap-2 text-sm font-semibold">
                  <Icon name={a.right ? 'CircleCheck' : 'X'} className={cx('mt-0.5 h-4 w-4 shrink-0', a.right ? 'text-sage-700' : 'text-magenta-600')} label={a.right ? 'Right' : 'Wrong'} />
                  {a.question.question}
                </p>
                {!a.right && (
                  <p className="mt-1.5 pl-6 text-sm text-ink-soft">
                    Answer: <strong className="text-ink">{a.question.options[a.question.answer]}</strong>. {a.question.explain}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mt-8 grid gap-2">
        {progress.hearts > 0 ? (
          <Button variant="accent" icon="Zap" onClick={() => onAgain('sprint', topicGroup)}>
            {topicGroup ? `Another ${groupById(topicGroup).title.toLowerCase()} sprint` : 'Another sprint'}
          </Button>
        ) : (
          <Button variant="secondary" icon="BookOpen" onClick={() => onAgain('practice', topicGroup)}>
            Keep practising — no timer, no hearts
          </Button>
        )}
        {sprint && right > 0 && (
          <section className="rounded-3xl border-2 border-dashed border-magenta-300 bg-white p-4" aria-labelledby="dare-h">
            <h2 id="dare-h" className="flex items-center gap-2 font-semibold">
              <Icon name="Trophy" className="h-5 w-5 text-magenta-600" />
              Challenge a friend to beat {right}
            </h2>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <Button variant="accent" icon="Share2" onClick={share}>
                Share
              </Button>
              <Button variant="secondary" onClick={copy}>
                Copy link
              </Button>
            </div>
            <label className="mt-3 block text-xs font-semibold text-ink-mute">
              Or copy this link
              <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="mt-1 w-full rounded-xl border border-mist-300 bg-mist-50 px-3 py-2 text-sm font-normal text-ink" />
            </label>
            <p className="mt-2 min-h-[1.25rem] text-sm font-semibold text-sage-700" aria-live="polite">{shared}</p>
          </section>
        )}
        <Button variant="ghost" onClick={onHome}>
          Back to start
        </Button>
      </div>
    </>
  );
}

const secondsLabel = (s: number) => {
  const n = Math.max(1, Math.round(s));
  return `${n} second${n === 1 ? '' : 's'}`;
};

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
