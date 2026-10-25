// Spider diagram: one spoke per money skill. The dashed blue shape is what's worth knowing at your
// life stage; the solid pink shape is how you've scored. Colours are validated for colour-vision
// deficiency, and the two series also differ by line style. The list under the chart is the
// text equivalent.

import { useState } from 'react';
import { cx } from '../components/ui';
import { AREAS, AREA_ORDER, TARGET, type Area, type Relevance } from './areas';
import type { Progress } from './game';

const YOU = '#E6187F';
const STAGE = '#1A56E5';
const W = 420;
const H = 330;
const CX = W / 2;
const CY = H / 2;
const R = 108;

const REL_WORD: Record<Relevance, string> = { 2: 'core for your stage', 1: 'good to know', 0: 'for later' };

function point(i: number, v: number) {
  const a = -Math.PI / 2 + (i / AREA_ORDER.length) * Math.PI * 2;
  return [CX + Math.cos(a) * R * v, CY + Math.sin(a) * R * v] as const;
}
const path = (vals: number[]) => vals.map((v, i) => point(i, v).join(',')).join(' ');

export function SkillRadar({ rel, stats }: { rel: Record<Area, Relevance>; stats: Progress['stats'] }) {
  const [hover, setHover] = useState<Area | null>(null);
  const target = AREA_ORDER.map((a) => TARGET[rel[a]]);
  const you = AREA_ORDER.map((a) => {
    const s = stats[a];
    return s && s.seen > 0 ? s.right / s.seen : 0;
  });
  const tried = AREA_ORDER.filter((a) => (stats[a]?.seen ?? 0) > 0).length;
  const h = hover ? AREA_ORDER.indexOf(hover) : -1;
  const hs = hover ? stats[hover] : undefined;

  return (
    <figure className="m-0">
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden><line x1="1" y1="5" x2="21" y2="5" stroke={YOU} strokeWidth="2" /><circle cx="11" cy="5" r="3.5" fill={YOU} stroke="#fff" strokeWidth="1.5" /></svg>
          You {tried === 0 && <span className="font-normal text-ink-mute">(play a round to fill this in)</span>}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden><line x1="1" y1="5" x2="21" y2="5" stroke={STAGE} strokeWidth="2" strokeDasharray="4 3" /></svg>
          What to know at your stage
        </span>
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" onMouseLeave={() => setHover(null)} role="img" aria-label={`Spider diagram of ${AREA_ORDER.length} money skills comparing your scores with what matters at your life stage. Details are listed below.`}>
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <polygon key={r} points={path(AREA_ORDER.map(() => r))} fill="none" stroke="#E2E6F0" strokeWidth={1} />
          ))}
          {AREA_ORDER.map((a, i) => {
            const [x, y] = point(i, 1);
            return <line key={a} x1={CX} y1={CY} x2={x} y2={y} stroke="#E2E6F0" strokeWidth={1} />;
          })}
          <polygon points={path(target)} fill={STAGE} fillOpacity={0.07} stroke={STAGE} strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" />
          {tried > 0 && <polygon points={path(you)} fill={YOU} fillOpacity={0.18} stroke={YOU} strokeWidth={2} strokeLinejoin="round" />}
          {tried > 0 &&
            AREA_ORDER.map((a, i) => {
              if (!(stats[a]?.seen ?? 0)) return null;
              const [x, y] = point(i, you[i]);
              return <circle key={a} cx={x} cy={y} r={4.5} fill={YOU} stroke="#fff" strokeWidth={2} />;
            })}
          {AREA_ORDER.map((a, i) => {
            const [x, y] = point(i, 1.17);
            const anchor = Math.abs(x - CX) < 8 ? 'middle' : x > CX ? 'start' : 'end';
            const seen = (stats[a]?.seen ?? 0) > 0;
            return (
              <text key={a} x={x} y={y} dy="0.35em" textAnchor={anchor} fontSize="11" fontWeight={rel[a] === 2 ? 700 : 500} fill={seen || rel[a] > 0 ? '#17123D' : '#5E5C7A'} fontStyle={rel[a] === 0 ? 'italic' : undefined}>
                {AREAS[a].axis}
              </text>
            );
          })}
          {/* Generous invisible hit areas for hover, one wedge per spoke */}
          {AREA_ORDER.map((a, i) => {
            const p1 = point(i - 0.5, 1.3);
            const p2 = point(i + 0.5, 1.3);
            return (
              <polygon key={a} points={`${CX},${CY} ${p1.join(',')} ${p2.join(',')}`} fill="transparent" onMouseEnter={() => setHover(a)} onClick={() => setHover(a)} />
            );
          })}
          {h >= 0 && (
            <line x1={CX} y1={CY} x2={point(h, 1)[0]} y2={point(h, 1)[1]} stroke="#17123D" strokeOpacity={0.35} strokeWidth={1} pointerEvents="none" />
          )}
        </svg>
      </div>
      <p className="mt-1 min-h-[2.5rem] text-center text-xs leading-snug text-ink-soft" aria-hidden>
        {hover ? (
          <>
            <strong className="text-ink">{AREAS[hover].title}</strong>
            <br />
            {hs?.seen ? `You: ${hs.right} of ${hs.seen} right` : 'Not tried yet'} · {REL_WORD[rel[hover]]}
          </>
        ) : (
          'Tap or hover a spoke for details'
        )}
      </p>
    </figure>
  );
}

export function relChip(r: Relevance) {
  return (
    <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-bold', r === 2 ? 'bg-navy-50 text-navy-700' : r === 1 ? 'bg-mist-100 text-ink-soft' : 'bg-white text-ink-mute ring-1 ring-mist-200')}>
      {r === 2 ? 'Core now' : r === 1 ? 'Good to know' : 'Later'}
    </span>
  );
}
