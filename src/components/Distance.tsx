import type { GoalStatus } from '../engine/goals';
import { Icon, cx } from './ui';

// Plain-language distance labels for the starting point (before life's twists).
export const DISTANCE: Record<GoalStatus, { label: string; icon: string; badge: string; bar: string }> = {
  on_track: { label: 'Within reach', icon: 'CircleCheck', badge: 'bg-sage-100 text-sage-700', bar: 'bg-sage-600' },
  adjust: { label: 'A stretch', icon: 'SlidersHorizontal', badge: 'bg-amber-100 text-amber-700', bar: 'bg-[#C98A2B]' },
  explore: { label: 'Further away', icon: 'Compass', badge: 'bg-magenta-50 text-magenta-700', bar: 'bg-magenta-500' },
};

export function DistanceBadge({ status, className }: { status: GoalStatus; className?: string }) {
  const d = DISTANCE[status];
  return (
    <span className={cx('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', d.badge, className)}>
      <Icon name={d.icon} className="h-3.5 w-3.5" />
      {d.label}
    </span>
  );
}

/** A labelled progress bar. Text carries the meaning; the bar is a visual aid. */
export function DistanceBar({ status, progress, onDark, label }: { status: GoalStatus; progress: number; onDark?: boolean; label: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={`${pct}% of the way — ${DISTANCE[status].label}`}
      className={cx('h-2 w-full overflow-hidden rounded-full', onDark ? 'bg-white/15' : 'bg-mist-100')}
    >
      <div className={cx('h-full rounded-full transition-[width] duration-500', onDark && status === 'explore' ? 'bg-magenta-300' : DISTANCE[status].bar)} style={{ width: `${Math.max(pct, 4)}%` }} />
    </div>
  );
}
