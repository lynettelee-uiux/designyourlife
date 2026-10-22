import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ICONS } from './icons';
import type { GoalStatus } from '../engine/goals';
import { STATUS_COPY } from '../engine/goals';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ---------- Icon ----------

export function Icon({ name, className = 'h-5 w-5', label }: { name: string; className?: string; label?: string }) {
  const C = ICONS[name] ?? ICONS.Circle;
  return <C className={className} aria-hidden={label ? undefined : true} aria-label={label} strokeWidth={1.75} />;
}

// ---------- Buttons ----------

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-navy-800 text-white hover:bg-navy-700 disabled:bg-navy-100 disabled:text-ink-mute',
  accent: 'bg-magenta-600 text-white hover:bg-magenta-700',
  secondary: 'bg-white text-ink border border-mist-300 hover:border-ink-soft',
  ghost: 'text-ink-soft hover:text-ink hover:bg-mist-100',
};

export function Button({ variant = 'primary', className, children, icon, iconRight, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: string; iconRight?: string }) {
  return (
    <button
      type="button"
      className={cx('inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed', VARIANTS[variant], className)}
      {...rest}
    >
      {icon && <Icon name={icon} className="h-4 w-4" />}
      {children}
      {iconRight && <Icon name={iconRight} className="h-4 w-4" />}
    </button>
  );
}

// ---------- Layout ----------

export function Screen({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return <main id="main" className={cx('mx-auto w-full px-4 pb-28 pt-4 sm:px-6', wide ? 'max-w-3xl' : 'max-w-xl')}>{children}</main>;
}

export function StageIntro({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="rise mb-6 mt-2">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-2 text-[28px] leading-[1.15] sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 text-[15px] leading-relaxed text-ink-soft">{children}</div>}
    </header>
  );
}

/** Sticky bottom action bar — keeps the main action reachable by thumb on mobile. */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-mist-200 bg-mist-50/95 px-4 py-3 backdrop-blur supports-[padding:max(0px)]:pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">{children}</div>
    </div>
  );
}

export function Card({ children, className, as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' | 'li' }) {
  return <As className={cx('card p-5', className)}>{children}</As>;
}

// ---------- Inputs ----------

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  help?: string;
}) {
  const id = useId();
  const fill = ((value - min) / (max - min || 1)) * 100;
  return (
    <div className="py-1">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink-soft">
          {label}
        </label>
        <output htmlFor={id} className="tabular text-base font-semibold text-ink">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        aria-describedby={help ? `${id}-help` : undefined}
        style={{ ['--fill' as string]: `${fill}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {help && (
        <p id={`${id}-help`} className="text-xs leading-snug text-ink-mute">
          {help}
        </p>
      )}
    </div>
  );
}

export function NumberField({ label, value, onChange, prefix, suffix, min = 0, max, help, step = 1 }: { label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string; min?: number; max?: number; help?: string; step?: number }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      <div className="flex items-center rounded-2xl border border-mist-300 bg-white px-3 focus-within:border-ink">
        {prefix && <span className="text-ink-mute">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="numeric"
          className="tabular min-h-[44px] w-full bg-transparent px-1 text-base outline-none"
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={step}
          aria-describedby={help ? `${id}-help` : undefined}
          onChange={(e) => {
            const v = e.target.value === '' ? 0 : Number(e.target.value);
            if (Number.isFinite(v)) onChange(Math.max(min, max !== undefined ? Math.min(max, v) : v));
          }}
        />
        {suffix && <span className="text-ink-mute">{suffix}</span>}
      </div>
      {help && (
        <p id={`${id}-help`} className="mt-1 text-xs text-ink-mute">
          {help}
        </p>
      )}
    </div>
  );
}

export function TextField({ label, value, onChange, placeholder, help, maxLength = 24 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; help?: string; maxLength?: number }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      <input
        id={id}
        className="min-h-[48px] w-full rounded-2xl border border-mist-300 bg-white px-4 text-base outline-none focus:border-ink"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        aria-describedby={help ? `${id}-help` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {help && (
        <p id={`${id}-help`} className="mt-1 text-xs text-ink-mute">
          {help}
        </p>
      )}
    </div>
  );
}

/** Single-select as a radio group of large tappable options. */
export function OptionGroup<T extends string>({
  legend,
  value,
  onChange,
  options,
  columns = 1,
  hideLegend,
}: {
  legend: string;
  value: T | undefined;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string; icon?: string }[];
  columns?: 1 | 2;
  hideLegend?: boolean;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className={cx('mb-2 text-sm font-medium text-ink-soft', hideLegend && 'sr-only')}>{legend}</legend>
      <div className={cx('grid gap-2', columns === 2 && 'sm:grid-cols-2')}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cx(
                'flex min-h-[52px] cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors',
                checked ? 'border-navy-800 bg-navy-50' : 'border-mist-300 bg-white hover:border-ink-soft',
              )}
            >
              <input type="radio" name={name} className="sr-only" checked={checked} onChange={() => onChange(o.value)} />
              {o.icon && <Icon name={o.icon} className="h-5 w-5 shrink-0 text-ink-soft" />}
              <span className="flex-1">
                <span className="block text-[15px] font-semibold leading-snug">{o.label}</span>
                {o.hint && <span className="block text-xs leading-snug text-ink-mute">{o.hint}</span>}
              </span>
              <span aria-hidden className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', checked ? 'border-navy-800 bg-navy-800' : 'border-mist-300')}>
                {checked && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-mist-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('min-h-[36px] rounded-full px-3.5 text-sm font-semibold transition-colors', value === o.value ? 'bg-white text-ink shadow-sm' : 'text-ink-mute hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Display ----------

const STATUS_STYLE: Record<GoalStatus, { cls: string; icon: string; short: string }> = {
  on_track: { cls: 'bg-sage-100 text-sage-700', icon: 'CircleCheck', short: 'On track' },
  adjust: { cls: 'bg-amber-100 text-amber-700', icon: 'SlidersHorizontal', short: 'Adjust' },
  explore: { cls: 'bg-navy-50 text-navy-700', icon: 'Compass', short: 'Explore options' },
};

export function StatusBadge({ status, short }: { status: GoalStatus; short?: boolean }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', s.cls)}>
      <Icon name={s.icon} className="h-3.5 w-3.5" />
      {short ? s.short : STATUS_COPY[status]}
    </span>
  );
}

export function StatusDot({ status, label }: { status: GoalStatus; label: string }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', s.cls)} title={`${label}: ${STATUS_COPY[status]}`}>
      <Icon name={s.icon} className="h-3 w-3" />
      <span>{label}</span>
      <span className="sr-only">: {STATUS_COPY[status]}</span>
    </span>
  );
}

export function Stat({ label, value, sub, tone = 'default' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'default' | 'good' | 'warn' }) {
  return (
    <div className="rounded-2xl bg-mist-50 p-3.5">
      <p className="text-xs font-medium text-ink-mute">{label}</p>
      <p className={cx('tabular mt-0.5 text-xl font-semibold', tone === 'good' && 'text-sage-700', tone === 'warn' && 'text-magenta-700')}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-mute">{sub}</p>}
    </div>
  );
}

export function Disclosure({ summary, children, className, defaultOpen }: { summary: ReactNode; children: ReactNode; className?: string; defaultOpen?: boolean }) {
  return (
    <details className={cx('group rounded-2xl border border-mist-200 bg-white', className)} open={defaultOpen}>
      <summary className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3 text-[15px] font-semibold">
        <span>{summary}</span>
        <Icon name="ChevronDown" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-mist-200 px-4 pb-4 pt-3 text-sm leading-relaxed text-ink-soft">{children}</div>
    </details>
  );
}

export function Note({ children, icon = 'Info', tone = 'neutral' }: { children: ReactNode; icon?: string; tone?: 'neutral' | 'pink' }) {
  return (
    <div className={cx('flex gap-2.5 rounded-2xl p-3.5 text-[13px] leading-relaxed', tone === 'pink' ? 'bg-blush-100 text-ink' : 'bg-mist-100 text-ink-soft')}>
      <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

const AVATAR_STYLE: Record<string, { bg: string; icon: string }> = {
  sunrise: { bg: 'from-magenta-300 to-blush-200', icon: 'Sunrise' },
  wave: { bg: 'from-sky-200 to-navy-100', icon: 'Waves' },
  leaf: { bg: 'from-emerald-200 to-sage-100', icon: 'Leaf' },
  spark: { bg: 'from-amber-200 to-magenta-100', icon: 'Sparkles' },
  moon: { bg: 'from-indigo-200 to-violet-100', icon: 'Moon' },
  mountain: { bg: 'from-slate-200 to-mist-200', icon: 'Mountain' },
};
export const AVATAR_IDS = Object.keys(AVATAR_STYLE);

export function Avatar({ id, size = 'md' }: { id: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = AVATAR_STYLE[id] ?? AVATAR_STYLE.sunrise;
  const dim = size === 'lg' ? 'h-16 w-16' : size === 'sm' ? 'h-8 w-8' : 'h-11 w-11';
  const icon = size === 'lg' ? 'h-7 w-7' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <span className={cx('inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br text-ink', s.bg, dim)}>
      <Icon name={s.icon} className={icon} />
    </span>
  );
}
