import { useState } from 'react';
import { DOWNTURN_DROP, EMERGENCY_FUND, SCENARIOS, type RiskLevel } from '../engine/assumptions';
import { deflate, inflate, monthlySavingNeeded, monthsToTarget, runwayMonths } from '../engine/finance';
import { money, months, pct } from '../engine/format';
import { paycheck } from '../engine/paycheck';
import { STATUS_INFO, type Profile } from '../engine/profile';
import { monthlySnapshot } from '../engine/projection';
import type { Plan } from '../engine/types';
import { Icon, Note, NumberField, Segmented, Slider, cx } from './ui';

export type ToolId = 'paycheck' | 'runway' | 'emergency' | 'goal' | 'inflation' | 'risk';

export const TOOLS: { id: ToolId; label: string; icon: string }[] = [
  { id: 'paycheck', label: 'First paycheck & CPF', icon: 'Wallet' },
  { id: 'runway', label: 'Career break runway', icon: 'PauseCircle' },
  { id: 'emergency', label: 'Emergency fund', icon: 'Umbrella' },
  { id: 'goal', label: 'Savings goal', icon: 'PiggyBank' },
  { id: 'inflation', label: 'Inflation', icon: 'Thermometer' },
  { id: 'risk', label: 'Investment ups & downs', icon: 'TrendingDown' },
];

export function ToolPanel({ tool, profile, plan }: { tool: ToolId; profile: Profile; plan: Plan }) {
  switch (tool) {
    case 'paycheck':
      return <PaycheckTool profile={profile} />;
    case 'runway':
      return <RunwayTool profile={profile} plan={plan} />;
    case 'emergency':
      return <EmergencyTool profile={profile} plan={plan} />;
    case 'goal':
      return <GoalTool profile={profile} />;
    case 'inflation':
      return <InflationTool />;
    case 'risk':
      return <RiskTool plan={plan} />;
  }
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'minus' | 'plus' }) {
  return (
    <div className={cx('flex items-baseline justify-between gap-3 py-1.5 text-sm', strong && 'border-t border-mist-200 pt-2 text-base')}>
      <dt className={strong ? 'font-semibold' : 'text-ink-soft'}>{label}</dt>
      <dd className={cx('tabular font-semibold', tone === 'minus' && 'text-magenta-700', tone === 'plus' && 'text-sage-700')}>{value}</dd>
    </div>
  );
}

function PaycheckTool({ profile }: { profile: Profile }) {
  const [gross, setGross] = useState(profile.mainIncome || 3000);
  const [age, setAge] = useState(Math.max(profile.age, profile.mainIncomeAge));
  const kind = STATUS_INFO[profile.status].mainKind === 'self' ? 'self' : 'salary';
  const p = paycheck(gross, age, profile.residency, kind, 2026);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Monthly gross pay" prefix="$" value={gross} onChange={setGross} max={50000} />
        <NumberField label="Age" value={age} onChange={(v) => setAge(Math.min(70, Math.max(16, v)))} min={16} max={70} />
      </div>
      <dl>
        <Row label="Gross pay" value={money(p.gross)} />
        <Row label="Your CPF contribution" value={money(-p.employeeCpf)} tone="minus" />
        <Row label="Set aside for income tax (est.)" value={money(-p.monthlyTaxSetAside)} tone="minus" />
        <Row label="Yours to spend or save" value={money(p.spendable)} strong />
      </dl>
      {p.cpfModelled && (
        <div className="rounded-2xl bg-mist-50 p-4">
          <p className="text-sm font-semibold">Into CPF each month: {money(p.totalCpf)}</p>
          <p className="text-xs text-ink-mute">Your {money(p.employeeCpf)} + your employer’s {money(p.employerCpf)}</p>
          <div className="mt-3 flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden>
            <div style={{ width: `${(p.allocation.oa / p.totalCpf) * 100}%` }} className="bg-[#1A56E5]" />
            <div style={{ width: `${(p.allocation.sa / p.totalCpf) * 100}%` }} className="bg-[#2E9A6B]" />
            <div style={{ width: `${(p.allocation.ma / p.totalCpf) * 100}%` }} className="bg-[#D8137A]" />
          </div>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div><dt className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#1A56E5]" />Ordinary</dt><dd className="tabular font-semibold">{money(p.allocation.oa)}</dd><dd className="text-ink-mute">housing, education</dd></div>
            <div><dt className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#2E9A6B]" />Special</dt><dd className="tabular font-semibold">{money(p.allocation.sa)}</dd><dd className="text-ink-mute">retirement</dd></div>
            <div><dt className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#D8137A]" />MediSave</dt><dd className="tabular font-semibold">{money(p.allocation.ma)}</dd><dd className="text-ink-mute">healthcare</dd></div>
          </dl>
        </div>
      )}
      {p.notes.map((n) => (
        <Note key={n}>{n}</Note>
      ))}
      <p className="text-xs text-ink-mute">2026 CPF rates and allocation for private-sector employees (allocation shown for ages up to 55). Tax uses resident rates with Earned Income and CPF relief only; it’s actually paid the following year. Annual tax: {money(p.annualTax)}.</p>
    </div>
  );
}

function RunwayTool({ profile, plan }: { profile: Profile; plan: Plan }) {
  const snapAge = Math.max(profile.age, profile.mainIncomeAge) + 1;
  const snap = monthlySnapshot(plan, snapAge);
  const [savings, setSavings] = useState(Math.round(profile.cash + profile.investments));
  const [costs, setCosts] = useState(Math.round(snap.spend));
  const [sideIncome, setSide] = useState(0);
  const [breakMonths, setBreak] = useState(6);
  const r = runwayMonths(savings, costs, sideIncome);
  const need = Math.max(0, (costs - sideIncome) * breakMonths);
  const enough = savings >= need;
  const cats = Object.entries(snap.byCategory).filter(([c]) => c !== 'essentials' && c !== 'lifestyle');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Savings you could use" prefix="$" value={savings} onChange={setSavings} max={5000000} />
        <NumberField label="Monthly costs during the break" prefix="$" value={costs} onChange={setCosts} max={50000} help={cats.length ? 'Pre-filled from your plan, including your ongoing commitments' : 'Pre-filled from your plan'} />
        <NumberField label="Side income during break" prefix="$" value={sideIncome} onChange={setSide} max={50000} />
        <NumberField label="Break length (months)" value={breakMonths} onChange={(v) => setBreak(Math.min(36, v))} max={36} />
      </div>
      <div className={cx('rounded-2xl p-4', enough ? 'bg-sage-100' : 'bg-amber-100')}>
        <p className="text-sm font-semibold">Your savings would last about {months(r)}.</p>
        <p className="mt-1 text-sm">
          A {breakMonths}-month break needs about {money(need)}. {enough ? `That leaves ${money(savings - need)} to restart with.` : `You’re about ${money(need - savings)} short — a shorter break, side income, or saving a little longer could close the gap.`}
        </p>
      </div>
      <p className="text-xs text-ink-mute">No salary means no CPF contributions during the break. Keep some buffer for when you return — job searches can take time.</p>
    </div>
  );
}

function EmergencyTool({ profile, plan }: { profile: Profile; plan: Plan }) {
  const irregular = STATUS_INFO[profile.status].mainKind === 'self';
  const snap = monthlySnapshot(plan, profile.age);
  const [essential, setEssential] = useState(Math.round(snap.spend - (snap.byCategory.lifestyle ?? 0) - (snap.byCategory.travel ?? 0)));
  const [monthsTarget, setMonths] = useState(irregular ? EMERGENCY_FUND.irregularMonths : EMERGENCY_FUND.maxMonths);
  const [have, setHave] = useState(profile.cash);
  const [monthly, setMonthly] = useState(200);
  const target = essential * monthsTarget;
  const m = monthsToTarget(target, have, monthly, SCENARIOS.baseline.cashReturn);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Essential monthly costs" prefix="$" value={essential} onChange={setEssential} max={50000} help="Housing, food, transport, bills, family commitments" />
        <NumberField label="Cash you already have" prefix="$" value={have} onChange={setHave} max={5000000} />
      </div>
      <Slider label="Months of cover" value={monthsTarget} min={1} max={12} onChange={setMonths} format={(v) => `${v} months`} help={`MoneySense suggests 3–6 months; around 12 if income is irregular${irregular ? ' (like yours)' : ''}.`} />
      <Slider label="You set aside each month" value={monthly} min={0} max={2000} step={25} onChange={setMonthly} format={(v) => money(v)} />
      <div className="rounded-2xl bg-mist-50 p-4">
        <p className="text-sm">
          Target: <strong>{money(target)}</strong>. {have >= target ? 'You’re already there — nice.' : Number.isFinite(m) ? <>At {money(monthly)}/month you’d get there in about <strong>{m} months</strong> ({(m / 12).toFixed(1)} years).</> : 'Set aside something each month to start.'}
        </p>
      </div>
      <p className="text-xs text-ink-mute">Keep emergency money somewhere easy to reach and low-risk, like a savings account. We assume ~{pct(SCENARIOS.baseline.cashReturn)} interest.</p>
    </div>
  );
}

function GoalTool({ profile }: { profile: Profile }) {
  const [target, setTarget] = useState(5000);
  const [have, setHave] = useState(0);
  const [years, setYears] = useState(2);
  const [rate, setRate] = useState<'cash' | 'invest'>('cash');
  const r = rate === 'cash' ? SCENARIOS.baseline.cashReturn : SCENARIOS.baseline.investReturn.balanced;
  const need = monthlySavingNeeded(target, have, years * 12, r);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Goal amount" prefix="$" value={target} onChange={setTarget} max={5000000} />
        <NumberField label="Already saved" prefix="$" value={have} onChange={setHave} max={5000000} />
      </div>
      <Slider label="Reach it in" value={years} min={1} max={15} onChange={setYears} format={(v) => `${v} year${v === 1 ? '' : 's'} (age ${profile.age + v})`} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-soft">Where the money sits</span>
        <Segmented label="Savings or investing" value={rate} onChange={setRate} options={[{ value: 'cash', label: `Savings ~${pct(SCENARIOS.baseline.cashReturn)}` }, { value: 'invest', label: `Invested ~${pct(SCENARIOS.baseline.investReturn.balanced)}*` }]} />
      </div>
      <div className="rounded-2xl bg-mist-50 p-4 text-sm">
        Save about <strong className="text-base">{money(need)}</strong> a month. Total you put in: {money(need * years * 12)}; growth does the rest ({money(Math.max(0, target - have - need * years * 12))}).
      </div>
      {rate === 'invest' && <p className="text-xs text-ink-mute">*Illustrative only. Investments can lose value, especially over short periods. Money you need within a few years is usually safer in savings.</p>}
    </div>
  );
}

function InflationTool() {
  const [amount, setAmount] = useState(1000);
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(SCENARIOS.baseline.inflation);
  const future = inflate(amount, rate, years);
  const power = deflate(amount, rate, years);
  return (
    <div className="space-y-4">
      <NumberField label="Amount in today’s dollars" prefix="$" value={amount} onChange={setAmount} max={10000000} />
      <Slider label="Years from now" value={years} min={1} max={45} onChange={setYears} format={(v) => `${v} years`} />
      <Slider label="Inflation per year" value={rate} min={0} max={0.06} step={0.0025} onChange={setRate} format={(v) => pct(v, 2)} help="Singapore’s headline inflation averaged about 2.1% over 2005–2025; MAS expected 1–2% for 2026." />
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl bg-mist-50 p-4 text-sm">
          What costs {money(amount)} today could cost <strong className="text-base">{money(future)}</strong> in {years} years.
        </div>
        <div className="rounded-2xl bg-mist-50 p-4 text-sm">
          {money(amount)} kept as cash would buy only about <strong className="text-base">{money(power)}</strong> worth of today’s goods.
        </div>
      </div>
    </div>
  );
}

function RiskTool({ plan }: { plan: Plan }) {
  const [monthly, setMonthly] = useState(Math.max(100, plan.investMonthly));
  const [years, setYears] = useState(10);
  const [risk, setRisk] = useState<RiskLevel>(plan.riskLevel);
  const [crashYear, setCrash] = useState<'none' | 'early' | 'late'>('late');
  const paths = (['favourable', 'baseline', 'challenging'] as const).map((k) => {
    let bal = 0;
    for (let y = 1; y <= years; y++) {
      const crash = (crashYear === 'early' && y === 2) || (crashYear === 'late' && y === years);
      const r = crash ? -DOWNTURN_DROP[risk] : SCENARIOS[k].investReturn[risk];
      bal = bal * (1 + r) + monthly * 12 * (1 + r / 2);
    }
    return { k, label: SCENARIOS[k].label, bal };
  });
  const paidIn = monthly * 12 * years;
  return (
    <div className="space-y-4">
      <Slider label="Invest each month" value={monthly} min={50} max={3000} step={50} onChange={setMonthly} format={(v) => money(v)} />
      <Slider label="For" value={years} min={2} max={30} onChange={setYears} format={(v) => `${v} years`} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink-soft">Mix</span>
        <Segmented label="Risk level" value={risk} onChange={setRisk} options={[{ value: 'cautious', label: 'Steady' }, { value: 'balanced', label: 'Balanced' }, { value: 'adventurous', label: 'Bold' }]} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink-soft">A bad year ({pct(DOWNTURN_DROP[risk])} fall)</span>
        <Segmented label="When a downturn hits" value={crashYear} onChange={setCrash} options={[{ value: 'none', label: 'None' }, { value: 'early', label: 'Year 2' }, { value: 'late', label: 'Final year' }]} />
      </div>
      <dl className="rounded-2xl bg-mist-50 p-4">
        <Row label="You put in" value={money(paidIn)} />
        {paths.map((p) => (
          <Row key={p.k} label={`${p.label} path`} value={money(p.bal)} tone={p.bal < paidIn ? 'minus' : undefined} />
        ))}
      </dl>
      <p className="flex gap-2 text-xs text-ink-mute">
        <Icon name="Info" className="h-4 w-4 shrink-0" />A fall right before you need the money hurts most — that’s why money for near-term goals usually isn’t invested. Illustrative returns; nothing here is a forecast or a product recommendation.
      </p>
    </div>
  );
}

