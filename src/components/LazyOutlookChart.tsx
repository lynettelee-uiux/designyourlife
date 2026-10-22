import { lazy, Suspense, type ComponentProps } from 'react';

// Recharts is the heaviest dependency; load it only when a chart is first shown.
const Chart = lazy(() => import('./OutlookChart').then((m) => ({ default: m.OutlookChart })));

export function OutlookChart(props: ComponentProps<typeof Chart>) {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-mist-100" aria-label="Loading chart" />}>
      <Chart {...props} />
    </Suspense>
  );
}
