// Spider diagram: one spoke per key money area. Solid pink = your share right; dashed blue = the
// average for players your age (demo data until real scores exist — labelled as such). Colours are
// validated for colour-vision deficiency, and the two series also differ by line style. The list
// under the chart is the text equivalent.

import { useState } from 'react';
import { GROUPS, type GroupId, type Relevance } from './areas';

// Validated together on the Sprint card surface (#1E1766): lightness band, CVD and contrast all pass.
const YOU = '#F2449A';
const PEERS = '#5B85FF';
const SURFACE = '#1E1766';
const GRID = 'rgba(255,255,255,0.14)';
const W = 420;
const H = 320;
const CX = W / 2;
const CY = H / 2 + 4;
const R = 100;

function point(i: number, v: number) {
  const a = -Math.PI / 2 + (i / GROUPS.length) * Math.PI * 2;
  return [CX + Math.cos(a) * R * v, CY + Math.sin(a) * R * v] as const;
}
const path = (vals: number[]) => vals.map((v, i) => point(i, v).join(',')).join(' ');
const pct = (v?: number) => (v === undefined ? '—' : `${Math.round(v * 100)}%`);

export function SkillRadar({
  you, peers, rel, bandLabel,
}: {
  you: Record<GroupId, { right: number; seen: number; share?: number }>;
  peers: Record<GroupId, number>;
  rel: Record<GroupId, Relevance>;
  bandLabel: string;
}) {
  const [hover, setHover] = useState<GroupId | null>(null);
  const tried = GROUPS.some((g) => you[g.id].seen > 0);
  const hg = hover ? GROUPS.find((g) => g.id === hover)! : null;
  const hi = hg ? GROUPS.indexOf(hg) : -1;

  return (
    <figure className="m-0">
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-sp-soft">
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden><line x1="1" y1="5" x2="21" y2="5" stroke={YOU} strokeWidth="2" /><circle cx="11" cy="5" r="3.5" fill={YOU} stroke={SURFACE} strokeWidth="1.5" /></svg>
          You {!tried && <span className="font-normal text-sp-mute">(play a sprint to fill this in)</span>}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden><line x1="1" y1="5" x2="21" y2="5" stroke={PEERS} strokeWidth="2" strokeDasharray="4 3" /></svg>
          Players aged {bandLabel}
          <span className="rounded bg-white/10 px-1 py-px text-[10px] font-bold uppercase tracking-wide text-sp-mute">demo</span>
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" onMouseLeave={() => setHover(null)} role="img" aria-label={`Spider diagram of ${GROUPS.length} key money areas comparing your scores with demo averages for players aged ${bandLabel}. Details are listed below.`}>
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon key={r} points={path(GROUPS.map(() => r))} fill="none" stroke={GRID} strokeWidth={1} />
        ))}
        {GROUPS.map((g, i) => {
          const [x, y] = point(i, 1);
          return <line key={g.id} x1={CX} y1={CY} x2={x} y2={y} stroke={GRID} strokeWidth={1} />;
        })}
        <polygon points={path(GROUPS.map((g) => peers[g.id]))} fill={PEERS} fillOpacity={0.1} stroke={PEERS} strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" />
        {tried && <polygon points={path(GROUPS.map((g) => you[g.id].share ?? 0))} fill={YOU} fillOpacity={0.22} stroke={YOU} strokeWidth={2} strokeLinejoin="round" />}
        {GROUPS.map((g, i) => {
          if (!you[g.id].seen) return null;
          const [x, y] = point(i, you[g.id].share ?? 0);
          return <circle key={g.id} cx={x} cy={y} r={4.5} fill={YOU} stroke={SURFACE} strokeWidth={2} />;
        })}
        {GROUPS.map((g, i) => {
          const [x, y] = point(i, 1.16);
          const anchor = Math.abs(x - CX) < 8 ? 'middle' : x > CX ? 'start' : 'end';
          // Two lines for long names ("Retirement &" / "legacy") so side labels never clip.
          const parts = g.axis.includes(' & ') ? [g.axis.split(' & ')[0] + ' &', g.axis.split(' & ')[1]] : [g.axis];
          const top = y < CY - 10 ? -(parts.length - 1) * 1.1 : y > CY + 10 ? 0 : -(parts.length - 1) * 0.55;
          return (
            <text key={g.id} x={x} y={y} textAnchor={anchor} fontSize="12" fontWeight={rel[g.id] === 2 ? 700 : 500} fill={rel[g.id] === 2 ? '#FFFFFF' : '#D4D2F5'}>
              {parts.map((t, k) => (
                <tspan key={t} x={x} dy={k === 0 ? `${top + 0.35}em` : '1.1em'}>
                  {t}
                </tspan>
              ))}
            </text>
          );
        })}
        {GROUPS.map((g, i) => {
          const p1 = point(i - 0.5, 1.35);
          const p2 = point(i + 0.5, 1.35);
          return <polygon key={g.id} points={`${CX},${CY} ${p1.join(',')} ${p2.join(',')}`} fill="transparent" onMouseEnter={() => setHover(g.id)} onClick={() => setHover(g.id)} />;
        })}
        {hi >= 0 && <line x1={CX} y1={CY} x2={point(hi, 1)[0]} y2={point(hi, 1)[1]} stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={1} pointerEvents="none" />}
      </svg>
      <p className="mt-1 min-h-[2.5rem] text-center text-xs leading-snug text-sp-soft" aria-hidden>
        {hg ? (
          <>
            <strong className="text-white">{hg.title}</strong>
            <br />
            You: {you[hg.id].seen ? `${you[hg.id].right} of ${you[hg.id].seen} right (${pct(you[hg.id].share)})` : 'not tried yet'} · Players {bandLabel}: {pct(peers[hg.id])} (demo)
          </>
        ) : (
          <>
            Tap or hover a spoke for details. <strong>Bold</strong> areas are core at your stage.
          </>
        )}
      </p>
    </figure>
  );
}
