// Learning-by-predicting: after choosing, users answer a quick-guess question designed to make them
// think (yearly packages, interest, compounding, totals), then see the money lesson first.
// Used by Lite and the full version.

import type { Quiz } from '../data/lifeScenarios';
import { Icon, cx } from './ui';

export function GuessPanel({ quiz, onGuess }: { quiz: Quiz; onGuess: (id: string) => void }) {
  const long = quiz.options.some((o) => o.label.length > 14);
  return (
    <section className="pop mt-3 rounded-3xl border-2 border-dashed border-magenta-300 bg-white p-5" aria-labelledby="guess-h">
      <p className="eyebrow">Quick guess</p>
      <h2 id="guess-h" className="mt-1 text-[16px] font-semibold leading-snug">
        {quiz.question}
      </h2>
      <div className={cx('mt-3 grid gap-2', long ? 'grid-cols-1' : 'grid-cols-3')} role="group" aria-label="Your guess">
        {quiz.options.map((o) => (
          <button key={o.id} type="button" onClick={() => onGuess(o.id)} className={cx('min-h-[48px] rounded-2xl border border-mist-300 bg-white px-3 text-sm font-semibold hover:border-ink-soft', long ? 'text-left' : 'text-center')}>
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-mute">Guess first — the answer and the money lesson come next.</p>
    </section>
  );
}

/** Shown after the guess: right or not (with the working), then the lesson as the headline takeaway. */
export function LessonReveal({ quiz, guess, lesson, title }: { quiz: Quiz; guess: string; lesson: string; title: string }) {
  const right = guess === quiz.answer;
  const answer = quiz.options.find((o) => o.id === quiz.answer)?.label ?? '';
  return (
    <section className="pop mt-3 rounded-3xl bg-blush-100 p-5" aria-live="polite">
      <p className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', right ? 'bg-sage-100 text-sage-700' : 'bg-white text-magenta-700')}>
        <Icon name={right ? 'CircleCheck' : 'Lightbulb'} className="h-3.5 w-3.5" />
        {right ? 'You got it' : `Not quite — the answer: ${answer}`}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{quiz.explain}</p>
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-magenta-700">Money lesson · {title}</p>
      <p className="mt-1 text-[17px] font-semibold leading-snug">{lesson}</p>
    </section>
  );
}

export interface LearnedItem {
  title: string;
  lesson: string;
  right?: boolean;
}

/** End-of-journey recap: the lessons they unlocked and how their guesses went. */
export function LessonsRecap({ items }: { items: LearnedItem[] }) {
  if (items.length === 0) return null;
  const guessed = items.filter((i) => i.right !== undefined);
  const right = guessed.filter((i) => i.right).length;
  return (
    <section className="mt-8" aria-labelledby="learned-h">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="learned-h" className="display text-xl">
          What you learned
        </h2>
        {guessed.length > 0 && (
          <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-bold text-sage-700">
            Guesses right: {right} of {guessed.length}
          </span>
        )}
      </div>
      <ol className="mt-3 space-y-2">
        {items.map((i, k) => (
          <li key={i.title + k} className="flex gap-3 rounded-2xl bg-white p-3.5 shadow-card">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-magenta-50 text-xs font-bold text-magenta-700">{k + 1}</span>
            <span>
              <span className="block text-sm font-semibold">{i.title}</span>
              <span className="mt-0.5 block text-sm leading-snug text-ink-soft">{i.lesson}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
