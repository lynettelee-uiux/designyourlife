// Decorative touches for the start pages. Everything here is aria-hidden or plain text;
// motion is gentle and turned off for people who prefer reduced motion (see index.css).

import { Icon, cx } from './ui';

const BUBBLES = [
  { e: '✈️', y: 'translate-y-1', d: '0s', r: '-6deg' },
  { e: '🐶', y: '-translate-y-2', d: '1.2s', r: '5deg' },
  { e: '🏠', y: 'translate-y-2', d: '2.1s', r: '-4deg' },
  { e: '🌴', y: '-translate-y-1', d: '0.6s', r: '7deg' },
];

/** A small cluster of floating dream emoji (sits in its own row, never over text). */
export function FloatingDreams({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cx('pointer-events-none flex items-center gap-2', className)}>
      {BUBBLES.map((b) => (
        <span key={b.e} className={b.y}>
          <span className="float grid h-10 w-10 place-items-center rounded-2xl bg-white text-xl shadow-card ring-1 ring-mist-200 sm:h-12 sm:w-12 sm:text-2xl" style={{ animationDelay: b.d, ['--r' as string]: b.r }}>
            {b.e}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Three "versions" of a future, stacked like cards, each with its dreams and how near they are. */
export function VersionStack() {
  const cards = [
    { title: 'Version A', dreams: ['🔑', '🐶', '✈️'], line: 'Own place at 25 · Dog · 2 trips a year', near: [1, 0.7, 0.4] },
    { title: 'Version B', dreams: ['🌴', '✈️', '🏠'], line: 'Stay home · Career break at 28', near: [1, 1, 0.75] },
    { title: 'Version C', dreams: ['🎨', '⏰', '🌅'], line: 'Start a studio · Four-day week', near: [0.9, 1, 0.5] },
  ];
  const ring = (p: number) => (p >= 1 ? '#2E9A6B' : p >= 0.7 ? '#C98A2B' : '#D8137A');
  return (
    <div aria-hidden className="rise-2 relative mt-10 h-[176px]">
      {cards.map((c, i) => (
        <div
          key={c.title}
          className={cx('card absolute left-0 right-0 mx-auto p-4', i === 2 && 'float-slow')}
          style={{ top: i * 34, transform: `scale(${1 - (2 - i) * 0.04})`, zIndex: i }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-mute">{c.title}</span>
            <span className={cx('flex -space-x-1.5', i < 2 && 'invisible')}>
              {c.dreams.map((e, k) => (
                <span key={e} className="ring-fill grid h-8 w-8 place-items-center rounded-full" style={{ ['--p' as string]: c.near[k] * 100, ['--c' as string]: ring(c.near[k]) }}>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-sm">{e}</span>
                </span>
              ))}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold">{c.line}</p>
          <div className="mt-3 h-1.5 rounded-full bg-mist-100">
            <div className={cx('h-1.5 rounded-full', ['w-[72%] bg-magenta-500', 'w-[86%] bg-navy-800', 'w-[64%] bg-navy-600'][i])} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Dream → Live → See, so people know what they're signing up for. */
export function HowItWorks({ steps }: { steps: { icon: string; title: string; text: string }[] }) {
  return (
    <ol className="mt-8 grid grid-cols-3 gap-2" aria-label="How it works">
      {steps.map((s, i) => (
        <li key={s.title} className="rounded-2xl bg-white/80 p-3 text-center shadow-card ring-1 ring-mist-200">
          <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-navy-50 to-magenta-50 text-navy-800">
            <Icon name={s.icon} className="h-4 w-4" />
          </span>
          <p className="mt-2 text-[13px] font-bold leading-tight">
            <span className="sr-only">Step {i + 1}: </span>
            {s.title}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-ink-mute">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

/** Lite's opening banner: what you'll get, with a peek at the Future Card. */
export function LiteHero() {
  return (
    <section className="rise relative mb-5 overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-800 via-[#2F1A6E] to-magenta-600 p-5 text-white">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-magenta-300/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-navy-600/50 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-magenta-300">Your future in 4 minutes</p>
          <h1 className="display mt-1 text-[26px] leading-[1.1] text-white">How close are your dreams?</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-navy-100">A few taps about your money, three real-life decisions — then your Future Card.</p>
        </div>
        <MiniCard />
      </div>
      <ul className="relative mt-4 flex flex-wrap gap-1.5 text-[11px] font-semibold" aria-label="About this">
        {['Ranges, not exact numbers', 'No sign-up', 'Nothing saved'].map((t) => (
          <li key={t} className="rounded-full bg-white/15 px-2.5 py-1">{t}</li>
        ))}
      </ul>
    </section>
  );
}

/** A small, tilted preview of the Future Card. */
function MiniCard() {
  const tiles = [
    { e: '✈️', p: 100, c: '#5BD19A' },
    { e: '🐶', p: 78, c: '#F2B54B' },
    { e: '🌴', p: 35, c: '#FF8CC2' },
  ];
  return (
    <div aria-hidden style={{ ['--r' as string]: '6deg', transform: 'rotate(6deg)' }} className="float-slow w-[108px] shrink-0 rounded-2xl bg-white/10 p-2.5 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] ring-1 ring-white/25 backdrop-blur-sm">
      <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-magenta-300">My Future Card</p>
      <p className="mt-0.5 text-[10px] font-bold leading-tight">2 of 3 dreams within reach</p>
      <div className="mt-2 flex justify-between">
        {tiles.map((t) => (
          <span key={t.e} className="ring-fill grid h-7 w-7 place-items-center rounded-full" style={{ ['--p' as string]: t.p, ['--c' as string]: t.c }}>
            <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#251a63] text-[11px]">{t.e}</span>
          </span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1">
        <span className="h-4 rounded bg-white/15" />
        <span className="h-4 rounded bg-white/15" />
      </div>
    </div>
  );
}
