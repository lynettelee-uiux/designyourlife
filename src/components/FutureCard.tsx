// Shared by Lite and the full version: the shareable Future Card, share actions and money-skill cards.
import { useEffect, useState } from 'react';
import type { GoalResult } from '../engine/goals';
import type { AspirationId } from '../engine/profile';
import type { SkillPick } from '../lite/literacy';
import { downloadCard, shareCard, shareText, type CardData } from '../lite/shareCard';
import { Button, Icon, cx } from './ui';

export function verdictHeadline(near: number, total: number) {
  if (total === 0) return 'My future, three ways';
  if (near === total) return total === 1 ? 'My dream looks within reach' : `All ${total} of my dreams look within reach`;
  if (near === 0) return 'My dreams are further away — for now';
  return `${near} of my ${total} dreams ${near === 1 ? 'looks' : 'look'} within reach`;
}

const RING: Record<GoalResult['status'], string> = { on_track: '#5BD19A', adjust: '#F2B54B', explore: '#FF8CC2' };

export function dreamEmoji(id: AspirationId, variant?: string): string {
  return (
    {
      travel: '✈️',
      live_independently: '🔑',
      pet: variant === 'cat' ? '🐱' : '🐶',
      career_break: '🌴',
      own_home: '🏠',
      retire_early: '🌅',
      support_parents: '💝',
      business: '🚀',
      creative_career: '🎨',
      start_family: '👶',
      free_time: '⏰',
      financial_security: '🛡️',
    } as Record<string, string>
  )[id] ?? '✨';
}

/** On-screen version of the share image. Rings fill once on reveal (instant with reduced motion). */
export function FutureCard({ data }: { data: CardData }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 150);
    return () => clearTimeout(t);
  }, []);
  return (
    <figure aria-label="Your Future Card" className="pop relative overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-800 via-[#2F1A6E] to-magenta-600 p-6 text-white shadow-[0_20px_50px_-20px_rgba(30,22,96,0.6)]">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-magenta-300/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-navy-600/40 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span aria-hidden className="grid h-6 w-6 place-items-center rounded-[7px] bg-white">
            <span className="h-2 w-2 rounded-full bg-magenta-500" />
          </span>
          <span className="text-sm font-bold">Design Your Life</span>
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-magenta-300">
          My Future Card{data.lessons ? ` · ${data.lessons} money lessons learned` : ''}
        </p>
        <p className="display mt-1 text-[26px] leading-tight text-white">{data.headline}</p>
        <ul className={cx('mt-5 grid gap-3', data.dreams.length === 1 ? 'grid-cols-1' : data.dreams.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
          {data.dreams.map((d, i) => (
            <li key={d.title} className="flex flex-col items-center text-center" style={{ animationDelay: `${i * 120}ms` }}>
              <span
                className="ring-fill grid h-[76px] w-[76px] place-items-center rounded-full"
                style={{ ['--p' as string]: shown ? Math.max(6, Math.min(1, d.progress) * 100) : 0, ['--c' as string]: RING[d.status], transitionDelay: `${i * 150}ms` }}
                role="meter"
                aria-label={d.title}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(d.progress * 100)}
                aria-valuetext={d.label}
              >
                <span className="grid h-[62px] w-[62px] place-items-center rounded-full bg-[#251a63] text-[30px]" aria-hidden>
                  {d.emoji}
                </span>
              </span>
              <span className="mt-2 text-[13px] font-semibold leading-tight">{d.title}</span>
              <span className="mt-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">{d.label}</span>
            </li>
          ))}
        </ul>
        <blockquote className="mt-5 text-[15px] italic leading-snug text-magenta-100">“{data.quote}”</blockquote>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-magenta-300">My strength</p>
            <p className="mt-1 text-[13px] font-semibold leading-snug">{data.strength}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-magenta-300">Working on</p>
            <p className="mt-1 text-[13px] font-semibold leading-snug">{data.skill}</p>
          </div>
        </div>
        <p className="mt-4 text-[12px] font-semibold text-white">What would yours look like? →</p>
        <p className="mt-0.5 text-[11px] text-white/70">Illustrative, not financial advice · no amounts shown</p>
      </div>
    </figure>
  );
}

export function ShareBar({ data }: { data: CardData }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      setMsg(await fn());
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-4">
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <Button variant="accent" icon="Sparkles" disabled={busy} onClick={() => run(async () => ({ shared: 'Shared — thanks for spreading the word!', copied: 'Link copied — paste it anywhere.', downloaded: 'Saved.', cancelled: '' })[await shareCard(data)])}>
          Share my card
        </Button>
        <Button variant="secondary" disabled={busy} aria-label="Save card as image" onClick={() => run(async () => { await downloadCard(data); return 'Image saved — post it to your story.'; })}>
          Save
        </Button>
        <Button variant="secondary" disabled={busy} aria-label="Copy link" onClick={() => run(async () => { try { await navigator.clipboard.writeText(`${shareText(data)} ${data.url}`); return 'Link copied — paste it anywhere.'; } catch { return 'Couldn’t copy — try Share instead.'; } })}>
          Copy
        </Button>
      </div>
      <p className="mt-2 min-h-[1.25rem] text-center text-xs text-ink-mute" aria-live="polite">
        {msg || 'Your card shows your dreams and skills — never your numbers.'}
      </p>
    </div>
  );
}

/** A money skill: title and why always visible; details open on tap to keep the page light. */
export function SkillCard({ pick, n }: { pick: SkillPick; n: number }) {
  const [answer, setAnswer] = useState<boolean | undefined>();
  const s = pick.skill;
  const right = answer !== undefined && answer === s.check.answer;
  return (
    <li className="card overflow-hidden p-0">
      <details className="group">
        <summary className="flex min-h-[64px] items-start gap-3 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-magenta-50 text-magenta-700">
            <Icon name={s.icon} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-ink-mute">Skill {n}</span>
            <span className="block font-semibold leading-snug">{s.title}</span>
            <span className="mt-0.5 block text-sm text-ink-soft">{pick.why}</span>
            <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-magenta-700">
              <span className="group-open:hidden">Tip, quick check & more</span>
              <span className="hidden group-open:inline">Show less</span>
            </span>
          </span>
          <Icon name="ChevronDown" className="mt-1 h-4 w-4 shrink-0 text-ink-mute transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-mist-200 px-4 pb-4 pt-3">
          <p className="flex gap-2 rounded-2xl bg-blush-100 p-3 text-sm leading-relaxed">
            <Icon name="Lightbulb" className="mt-0.5 h-4 w-4 shrink-0 text-magenta-700" />
            <span>
              <strong>Try this week: </strong>
              {s.tip}
            </span>
          </p>
          <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink-soft">
            {s.facts.map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-magenta-500" />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded-2xl bg-mist-50 p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Quick check · true or false?</p>
            <p className="mt-1 text-[15px] font-semibold leading-snug">{s.check.statement}</p>
            <div className="mt-2.5 flex gap-2" role="group" aria-label="Your answer">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={answer === v}
                  onClick={() => setAnswer(v)}
                  className={cx('min-h-[40px] flex-1 rounded-full border text-sm font-semibold', answer === v ? (v === s.check.answer ? 'border-sage-600 bg-sage-100 text-sage-700' : 'border-magenta-600 bg-magenta-50 text-magenta-700') : 'border-mist-300 bg-white')}
                >
                  {v ? 'True' : 'False'}
                </button>
              ))}
            </div>
            {answer !== undefined && (
              <p className="pop mt-2.5 text-sm leading-relaxed" aria-live="polite">
                <strong>{right ? 'Nice — that’s right.' : `Not quite — it’s ${s.check.answer ? 'true' : 'false'}.`}</strong> {s.check.explain}
              </p>
            )}
          </div>
          <a href={s.learnMore.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-magenta-700 underline underline-offset-4">
            Learn more: {s.learnMore.label} <Icon name="ExternalLink" className="h-3.5 w-3.5" label="opens in a new tab" />
          </a>
        </div>
      </details>
    </li>
  );
}
