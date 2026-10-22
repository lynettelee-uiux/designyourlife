export const money = (n: number, opts: { compact?: boolean; sign?: boolean } = {}) => {
  if (!Number.isFinite(n)) return '—';
  const sign = opts.sign && n > 0 ? '+' : n < 0 ? '−' : '';
  const v = Math.abs(n);
  if (opts.compact && v >= 1_000_000) return `${sign}$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}m`;
  if (opts.compact && v >= 10_000) return `${sign}$${Math.round(v / 1000)}k`;
  return `${sign}$${Math.round(v).toLocaleString('en-SG')}`;
};

export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;

export const months = (m: number) => {
  if (!Number.isFinite(m)) return 'indefinitely';
  const r = Math.floor(m * 10) / 10;
  return `${r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)} month${r === 1 ? '' : 's'}`;
};
