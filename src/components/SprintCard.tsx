// End-of-journey invitation to the Sprint challenge (a separate page; Lite and the full version are unchanged).
import { Icon } from './ui';

export function SprintCard({ href }: { href: string }) {
  return (
    <a href={href} className="mt-4 flex items-center gap-4 rounded-3xl border-2 border-dashed border-magenta-300 bg-white p-4 hover:border-magenta-500">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-navy-800 to-magenta-600 text-white">
        <Icon name="Zap" className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold uppercase tracking-[0.12em] text-magenta-700">Test your skills</span>
        <span className="block font-semibold">60-second money sprint</span>
        <span className="block text-sm text-ink-mute">Climb the levels, keep your hearts, and find which money skills to work on.</span>
      </span>
      <Icon name="ArrowRight" className="h-5 w-5 shrink-0 text-ink-mute" />
    </a>
  );
}
