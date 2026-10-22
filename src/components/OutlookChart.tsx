import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money } from '../engine/format';
import type { Projection, ScenarioKey } from '../engine/types';
import { Disclosure, Segmented } from './ui';

// Validated (scripts/validate_palette.js, light surface): all checks pass. Blue↔green tritan ΔE is 7.4,
// so lines also differ by dash pattern and every series is named in the legend.
export const SERIES: { key: ScenarioKey; label: string; color: string; dash?: string; width: number }[] = [
  { key: 'favourable', label: 'More favourable', color: '#2E9A6B', dash: '6 4', width: 2 },
  { key: 'baseline', label: 'Baseline', color: '#1A56E5', width: 2.5 },
  { key: 'challenging', label: 'More challenging', color: '#D8137A', dash: '2 3', width: 2 },
];

export function OutlookChart({ projections, retireAge, compare }: { projections: Record<ScenarioKey, Projection>; retireAge: number; compare?: Projection }) {
  const [mode, setMode] = useState<'real' | 'nominal'>('real');
  const field = mode === 'real' ? 'netReal' : 'net';
  const data = projections.baseline.rows.map((r, i) => ({
    age: r.age + 1,
    favourable: projections.favourable.rows[i][field],
    baseline: r[field],
    challenging: projections.challenging.rows[i][field],
    compare: compare?.rows[i]?.[field],
  }));

  return (
    <figure>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-sm font-semibold">Net savings & investments (not CPF), by age</figcaption>
        <Segmented
          label="Value type"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'real', label: 'Today’s $' },
            { value: 'nominal', label: 'Future $' },
          ]}
        />
      </div>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft" aria-label="Legend">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden>
              <line x1="0" y1="4" x2="22" y2="4" stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash} />
            </svg>
            {s.label}
          </li>
        ))}
        {compare && (
          <li className="flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden>
              <line x1="0" y1="4" x2="22" y2="4" stroke="#A3A8BD" strokeWidth={2} />
            </svg>
            Before your change (baseline)
          </li>
        )}
      </ul>
      <div className="h-64 w-full sm:h-72" aria-hidden>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#E2E6F0" vertical={false} />
            <ReferenceLine y={0} stroke="#A3A8BD" />
            <XAxis dataKey="age" tick={{ fontSize: 12, fill: '#5E5C7A' }} tickLine={false} axisLine={{ stroke: '#CDD3E3' }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tickFormatter={(v: number) => money(v, { compact: true })} tick={{ fontSize: 12, fill: '#5E5C7A' }} tickLine={false} axisLine={false} width={56} />
            {retireAge < 65 && <ReferenceLine x={retireAge} stroke="#A3A8BD" strokeDasharray="3 3" label={{ value: 'Stop work', fontSize: 11, fill: '#5E5C7A', position: 'insideTopRight' }} />}
            <Tooltip
              formatter={(v: number, name: string) => [money(v), SERIES.find((s) => s.key === name)?.label ?? 'Before your change']}
              labelFormatter={(a) => `Age ${a}`}
              contentStyle={{ borderRadius: 14, border: '1px solid #E2E6F0', fontSize: 13 }}
            />
            {compare && <Line type="monotone" dataKey="compare" stroke="#A3A8BD" strokeWidth={2} dot={false} isAnimationActive={false} />}
            {SERIES.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-ink-mute">
        {mode === 'real' ? 'Shown in today’s dollars — adjusted for each scenario’s inflation.' : 'Shown in future dollars — the numbers you’d see on a statement then.'} Below $0 means savings ran out and you’d need to borrow or cut back (no interest modelled).
      </p>
      <Disclosure summary="View as a table" className="mt-3">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Savings and investments by age under three scenarios, {mode === 'real' ? "today's dollars" : 'future dollars'}</caption>
            <thead>
              <tr className="text-xs text-ink-mute">
                <th scope="col" className="py-1 pr-2 font-medium">Age</th>
                {SERIES.map((s) => (
                  <th key={s.key} scope="col" className="px-2 py-1 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular">
              {data
                .filter((d) => d.age % 5 === 0 || d.age === data[data.length - 1].age)
                .map((d) => (
                  <tr key={d.age} className="border-t border-mist-200">
                    <th scope="row" className="py-1.5 pr-2 font-semibold">
                      {d.age}
                    </th>
                    <td className="px-2 py-1.5 text-right">{money(d.favourable)}</td>
                    <td className="px-2 py-1.5 text-right">{money(d.baseline)}</td>
                    <td className="px-2 py-1.5 text-right">{money(d.challenging)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Disclosure>
    </figure>
  );
}
