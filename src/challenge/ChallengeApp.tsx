import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Icon, cx } from '../components/ui';
import { SKILLS, type SkillId } from '../lite/literacy';
import { QUESTIONS, type Question, type Tier } from './questions';
import {
  LEVELS, MAX_HEARTS, SPRINT_SECONDS, addStats, diagnose, levelOf, loadProgress, nextTier, pickQuestion, pointsFor, saveProgress, startTier,
  type Answer, type Progress,
} from './game';

type Mode = 'sprint' | 'practice';
type Phase = 'home' | 'play' | 'results';

interface Round {
  mode: Mode;
  answers: Answer[];
  asked: Set<string>;
  areas: Partial<Record<SkillId, number>>;
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

/** Further reading for each skill: the skill's own official link plus related official tools. */
const READINGS: Record<SkillId, { label: string; org: string; url: string }[]> = {
  payslip: [
    { label: 'CPF contribution rates', org: 'CPF Board', url: 'https://www.cpf.gov.sg/conrate2023' },
    { label: 'Individual income tax basics', org: 'IRAS', url: 'https://www.iras.gov.sg/taxes/individual-income-tax' },
  ],
  budgeting: [{ label: 'Budgeting guides', org: 'MoneySense (MAS)', url: 'https://www.moneysense.gov.sg/' }],
  emergency: [{ label: 'Emergency funds & financial planning', org: 'MoneySense (MAS)', url: 'https://www.moneysense.gov.sg/' }],
  retirement: [
    { label: 'What is the CPF retirement sum?', org: 'CPF Board', url: 'https://www.cpf.gov.sg/member/infohub/educational-resources/what-is-the-cpf-retirement-sum' },
    { label: 'CPF payout estimator', org: 'CPF Board', url: 'https://www.cpf.gov.sg/payoutestimator' },
  ],
  investing: [{ label: 'Investing basics and risk', org: 'MoneySense (MAS)', url: 'https://www.moneysense.gov.sg/' }],
  housing: [{ label: 'HDB Flat Portal — eligibility and grants', org: 'HDB', url: 'https://homes.hdb.gov.sg/' }],
  irregular: [{ label: 'Planning with irregular income', org: 'MoneySense (MAS)', url: 'https://www.moneysense.gov.sg/' }],
  scams: [{ label: 'ScamShield — check before you act', org: 'NCPC / SPF', url: 'https://www.scamshield.gov.sg/' }],
  credit: [{ label: 'Credit cards and borrowing', org: 'MoneySense (MAS)', url: 'https://www.moneysense.gov.sg/' }],
  saving: [{ label: 'Saving and budgeting', org: 'MoneySense (MAS)', url: 'https://www.moneysense.gov.sg/' }],
};

/** Where to practise each skill in the simulators. */
const PRACTISE: Record<SkillId, { label: string; href: string }> = {
  payslip: { label: 'See your take-home and CPF in the full version', href: '../' },
  retirement: { label: 'Try “retire early” in the full version', href: '../' },
  housing: { label: 'Try “own a home” in the full version', href: '../' },
  budgeting: { label: 'Play a few life moments in Lite', href: '../lite/' },
  emergency: { label: 'Play a few life moments in Lite', href: '../lite/' },
  investing: { label: 'Play a few life moments in Lite', href: '../lite/' },
  irregular: { label: 'Play Lite as a freelancer', href: '../lite/' },
  scams: { label: 'Play a few life moments in Lite', href: '../lite/' },
  credit: { label: 'Play a few life moments in Lite', href: '../lite/' },
  saving: { label: 'Play a few life moments in Lite', href: '../lite/' },
};

function beatTarget(): number | undefined {
  try {
    const n = Number(new URLSearchParams(window.location.search).get('beat'));
    return Number.isInteger(n) && n > 0 && n < 100 ? n : undefined;
  } catch {
    return undefined;
  }
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

  const start = (mode: Mode) => {
    const tier = startTier(levelOf(progress.xp).index);
    const r: Round = { mode, answers: [], asked: new Set(), areas: {}, tier, streak: 0, points: 0, msLeft: SPRINT_SECONDS * 1000, before: { xp: progress.xp, best: progress.best } };
    r.current = pickQuestion(QUESTIONS, tier, r.asked, r.areas);
    setRound(r);
    setPhase('play');
  };

  const finish = useCallback(
    (r: Round, endedBy: Round['endedBy']) => {
      const ended = { ...r, endedBy };
      setRound(ended);
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
        {phase === 'home' && <Home progress={progress} beat={beat} onStart={start} />}
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

function Home({ progress, beat, onStart }: { progress: Progress; beat?: number; onStart: (m: Mode) => void }) {
  const out = progress.hearts <= 0;
  const d = diagnose(progress.stats);
  return (
    <>
      <section className="rise relative mb-5 overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-800 via-[#2F1A6E] to-magenta-600 p-5 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-magenta-300/40 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-magenta-300">Test your skills · 60 seconds</p>
          <h1 className="display mt-1 text-[28px] leading-[1.1] text-white">How sharp are your money skills?</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-navy-100">Answer as many as you can before time runs out. Right answers move you up the levels. Wrong ones cost a heart — you get 5 a day.</p>
          <ul className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold" aria-label="How it works">
            {[
              { i: 'Timer', t: '60-second rounds' },
              { i: 'Heart', t: '5 hearts a day' },
              { i: 'Target', t: 'Find your weak spots' },
            ].map((x) => (
              <li key={x.t} className="rounded-2xl bg-white/15 px-2 py-2.5">
                <Icon name={x.i} className="mx-auto mb-1 h-5 w-5 text-magenta-300" />
                {x.t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {beat && (
        <p className="pop mb-4 flex items-center gap-2 rounded-2xl bg-magenta-50 px-4 py-3 text-sm font-semibold text-magenta-700">
          <Icon name="Trophy" className="h-5 w-5" />A friend got {beat} right in 60 seconds. Can you beat it?
        </p>
      )}

      <Card className="rise-2 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-soft">Today</span>
          <Hearts n={progress.hearts} />
        </div>
        <div className="mt-4">
          <LevelBar xp={progress.xp} />
        </div>
        {progress.best > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-soft">
            <Icon name="Trophy" className="h-4 w-4 text-[#C98A2B]" /> Personal best: <strong className="text-ink">{progress.best} right</strong> in one sprint
          </p>
        )}
        {out ? (
          <div className="mt-4 rounded-2xl bg-mist-100 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <Icon name="HeartCrack" className="h-4 w-4 text-magenta-600" /> Out of hearts for today
            </p>
            <p className="mt-1 text-ink-soft">5 new hearts in {untilTomorrow()}. Meanwhile, practise without a timer or hearts — or read up on your weak spots below.</p>
          </div>
        ) : null}
        <div className="mt-5 grid gap-2">
          <Button variant="accent" icon={out ? 'Clock' : 'Zap'} disabled={out} className="disabled:bg-mist-200 disabled:text-ink-mute" onClick={() => onStart('sprint')}>
            {out ? 'Come back tomorrow' : 'Start a 60-second sprint'}
          </Button>
          <Button variant="secondary" icon="BookOpen" onClick={() => onStart('practice')}>
            Practice — no timer, no hearts
          </Button>
        </div>
      </Card>

      {d.rows.length > 0 && (
        <section className="rise-3 mt-6" aria-labelledby="map-h">
          <h2 id="map-h" className="display text-xl">Your skill map</h2>
          <p className="mt-1 text-sm text-ink-mute">From every round you’ve played on this device.</p>
          <SkillMap rows={d.rows} />
        </section>
      )}

      <p className="mt-6 text-center text-xs leading-relaxed text-ink-mute">
        Progress is kept only in this browser — nothing is sent or saved anywhere else. Questions use public Singapore sources (CPF, IRAS, HDB, MAS MoneySense, SPF); some prices are illustrative and say so.
      </p>
    </>
  );
}

function SkillMap({ rows }: { rows: { area: SkillId; right: number; seen: number; share: number }[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {rows.map((r) => (
        <li key={r.area} className="rounded-2xl bg-white p-3 shadow-card">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 font-semibold">
              <Icon name={SKILLS[r.area].icon} className="h-4 w-4 text-navy-700" />
              {SKILLS[r.area].title}
            </span>
            <span className="shrink-0 text-xs font-semibold text-ink-mute">
              {r.right} of {r.seen}
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-mist-100" aria-hidden>
            <div className={cx('h-1.5 rounded-full', r.share >= 0.8 ? 'bg-sage-600' : r.share >= 0.5 ? 'bg-[#C98A2B]' : 'bg-magenta-500')} style={{ width: `${Math.max(6, r.share * 100)}%` }} />
          </div>
          {r.share < 0.8 && (
            <a href={READINGS[r.area][0].url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-navy-700 underline-offset-4 hover:underline">
              Read up: {READINGS[r.area][0].label} · {READINGS[r.area][0].org}
              <Icon name="ExternalLink" className="h-3 w-3" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </li>
      ))}
    </ul>
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
    const current = pickQuestion(QUESTIONS, tier, round.asked, round.areas);
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
        <p className="sr-only" aria-live="assertive">{announce}</p>
      </div>

      <section key={q.id} className="pop" aria-labelledby="q-h">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-1 text-navy-800">
            <Icon name={SKILLS[q.area].icon} className="h-3.5 w-3.5" />
            {SKILLS[q.area].short}
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

function Results({ round, progress, beat, onAgain, onHome }: { round: Round; progress: Progress; beat?: number; onAgain: (m: Mode) => void; onHome: () => void }) {
  const sprint = round.mode === 'sprint';
  const right = round.answers.filter((a) => a.right).length;
  const before = levelOf(round.before.xp);
  const after = levelOf(progress.xp);
  const levelledUp = sprint && after.index > before.index;
  const newBest = sprint && right > round.before.best && right > 0;
  const thisRound = diagnose(addStats({}, round.answers));
  const allTime = diagnose(progress.stats);
  // Recommendations: this round's weak spots first, then all-time ones.
  const weak = [...thisRound.weak, ...allTime.weak.filter((w) => !thisRound.weak.some((t) => t.area === w.area))].slice(0, 3);
  const strong = (thisRound.strong.length ? thisRound.strong : allTime.strong).slice(0, 3);
  const [shared, setShared] = useState('');

  const headline =
    round.endedBy === 'hearts' ? 'Out of hearts!' : round.endedBy === 'time' ? 'Time’s up!' : round.endedBy === 'questions' ? 'You answered every question!' : 'Practice done';

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?beat=${right}`;
    const text = `I got ${right} right in a 60-second Design Your Life money sprint. Can you beat it?`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Design Your Life — Sprint', text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShared('Link copied — send it to a friend.');
    } catch {
      setShared('');
    }
  };

  return (
    <>
      <section className="pop relative overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-800 via-[#2F1A6E] to-magenta-600 p-6 text-center text-white">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-magenta-300">{headline}</p>
        <h1 className="display mt-2 text-[34px] leading-tight text-white">
          {right} right{sprint ? ` in ${Math.max(1, Math.round(SPRINT_SECONDS - round.msLeft / 1000))} seconds` : ` of ${round.answers.length}`}
        </h1>
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
              const s = SKILLS[w.area];
              const readings = [...READINGS[w.area], { label: s.learnMore.label, org: '', url: s.learnMore.url }].filter((x, i, a) => a.findIndex((y) => y.url === x.url) === i);
              return (
                <li key={w.area}>
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="flex items-center gap-2 font-semibold">
                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-magenta-50 text-magenta-700">
                          <Icon name={s.icon} className="h-4 w-4" />
                        </span>
                        {s.title}
                      </h3>
                      <span className="shrink-0 rounded-full bg-mist-100 px-2 py-0.5 text-xs font-semibold text-ink-soft">
                        {w.right} of {w.seen} right
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.facts[0]}</p>
                    <p className="mt-2 rounded-2xl bg-mist-50 p-3 text-sm">
                      <strong>Try this week:</strong> {s.tip}
                    </p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-mute">Read & use</p>
                    <ul className="mt-1 space-y-1">
                      {readings.map((r) => (
                        <li key={r.url + r.label}>
                          <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-navy-700 underline-offset-4 hover:underline">
                            {r.label}
                            {r.org && <span className="font-normal text-ink-mute"> · {r.org}</span>}
                            <Icon name="ExternalLink" className="h-3.5 w-3.5" />
                            <span className="sr-only">(opens in a new tab)</span>
                          </a>
                        </li>
                      ))}
                      <li>
                        <a href={PRACTISE[w.area].href} className="inline-flex items-center gap-1 text-sm font-semibold text-magenta-700 underline-offset-4 hover:underline">
                          {PRACTISE[w.area].label}
                          <Icon name="ArrowRight" className="h-3.5 w-3.5" />
                        </a>
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
                <Icon name={SKILLS[s.area].icon} className="h-4 w-4" />
                {SKILLS[s.area].short}
              </li>
            ))}
          </ul>
        </section>
      )}

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
          <Button variant="accent" icon="Zap" onClick={() => onAgain('sprint')}>
            Another sprint
          </Button>
        ) : (
          <Button variant="secondary" icon="BookOpen" onClick={() => onAgain('practice')}>
            Keep practising — no timer, no hearts
          </Button>
        )}
        {sprint && right > 0 && (
          <Button variant="secondary" icon="Share2" onClick={share}>
            Challenge a friend to beat {right}
          </Button>
        )}
        <Button variant="ghost" onClick={onHome}>
          Back to start
        </Button>
        <p className="text-center text-sm text-ink-mute" aria-live="polite">{shared}</p>
      </div>
    </>
  );
}
