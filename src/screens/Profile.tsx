import { useState } from 'react';
import { ActionBar, AVATAR_IDS, Avatar, Button, Card, Disclosure, Note, NumberField, OptionGroup, Screen, Slider, StageIntro, TextField, cx } from '../components/ui';
import { COST_DEFAULTS } from '../engine/assumptions';
import { money } from '../engine/format';
import { paycheck } from '../engine/paycheck';
import { STATUS_INFO, applyStatusDefaults, surpriseCharacter, type LifeStatus, type Living, type Profile } from '../engine/profile';
import { useStore } from '../state/store';

// Only three questions are asked up front. Everything else has a sensible default
// and lives under "Adjust details" on the Ready step (and is reachable later from the header).
const STEPS = ['You', 'Right now', 'Home', 'Ready'];

const STATUS_ICON: Record<LifeStatus, string> = {
  uni_student: 'GraduationCap',
  poly_student: 'GraduationCap',
  ite_student: 'GraduationCap',
  nsf: 'ShieldCheck',
  employed: 'Briefcase',
  part_time_gig: 'Zap',
  between_jobs: 'Compass',
  self_employed: 'Rocket',
  alt_path: 'Sparkles',
};

const LIVING_LABEL: Record<Living, string> = {
  family: 'With family',
  room: 'Renting a room',
  whole_unit: 'Renting a place (shared)',
  own: 'Own home, paying a loan',
  other: 'Other',
};

const RESIDENCY_LABEL = { citizen: 'Singapore Citizen', pr: 'Permanent Resident', other: 'Other', undisclosed: 'Prefer not to say' } as const;

export default function ProfileScreen() {
  const { state, dispatch } = useStore();
  const [step, setStep] = useState(Math.min(state.step ?? 0, STEPS.length - 1));
  const p = state.profile;
  const set = (patch: Partial<Profile>) => dispatch({ type: 'profile', profile: patch });
  const last = step === STEPS.length - 1;

  const setLiving = (v: Living) => {
    const patch: Partial<Profile> = { living: v, essentials: v === 'family' ? COST_DEFAULTS.essentialsWithFamily : COST_DEFAULTS.essentialsIndependent };
    if (v === 'own' && !p.homeLoanMonthly) Object.assign(patch, { homeLoanMonthly: COST_DEFAULTS.homeLoanMonthly, homeLoanCpf: COST_DEFAULTS.homeLoanFromCpf, homeLoanYears: COST_DEFAULTS.homeLoanYears });
    set(patch);
    // An existing home makes the "own a home" and "live on my own" dreams redundant.
    if (v === 'own' && (state.dreams.own_home || state.dreams.live_independently)) {
      const d = { ...state.dreams };
      delete d.own_home;
      delete d.live_independently;
      dispatch({ type: 'dreams', dreams: d });
    }
  };

  return (
    <Screen>
      <nav aria-label="Profile steps" className="mb-2 flex gap-1">
        {STEPS.map((s, i) => (
          <span key={s} className={cx('h-1 flex-1 rounded-full', i <= step ? 'bg-ink' : 'bg-mist-200')} aria-hidden />
        ))}
      </nav>
      <p className="sr-only" aria-live="polite">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>

      {step === 0 && (
        <>
          <StageIntro eyebrow="Three quick questions" title="First, what should we call you?">
            A nickname is perfect. We never ask for your real name, NRIC or bank details.
          </StageIntro>
          <Card className="rise-2 space-y-5">
            <TextField label="Nickname" value={p.nickname} placeholder="e.g. Jo" onChange={(v) => set({ nickname: v })} />
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink-soft">Pick an avatar (optional)</legend>
              <div className="flex flex-wrap gap-2">
                {AVATAR_IDS.map((id) => (
                  <label key={id} className={cx('cursor-pointer rounded-full p-1 ring-2', p.avatar === id ? 'ring-ink' : 'ring-transparent hover:ring-mist-300')}>
                    <input type="radio" name="avatar" className="sr-only" checked={p.avatar === id} onChange={() => set({ avatar: id })} aria-label={`Avatar: ${id}`} />
                    <Avatar id={id} />
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>
          <button
            type="button"
            className="mt-4 text-sm font-semibold text-magenta-700 underline underline-offset-4"
            onClick={() => {
              const c = surpriseCharacter();
              dispatch({ type: 'surprise', profile: c.profile, dreams: c.dreams });
              setStep(STEPS.length - 1);
            }}
          >
            Or let us make up a character for you
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <StageIntro eyebrow="2 of 3" title="Where are you in life right now?">
            Everyone’s path is different. Pick what fits best.
          </StageIntro>
          <Card className="rise-2 space-y-5">
            <Slider label="Your age" value={p.age} min={18} max={35} onChange={(v) => set({ age: v, mainIncomeAge: Math.max(v, v + (p.mainIncomeAge - p.age)) })} format={(v) => `${v}`} />
            <OptionGroup<LifeStatus>
              legend="What are you mainly doing?"
              value={p.status}
              onChange={(v) => dispatch({ type: 'setProfile', profile: applyStatusDefaults(p, v) })}
              options={(Object.keys(STATUS_INFO) as LifeStatus[]).map((k) => ({ value: k, label: STATUS_INFO[k].label, hint: STATUS_INFO[k].hint, icon: STATUS_ICON[k] }))}
            />
          </Card>
        </>
      )}

      {step === 2 && (
        <>
          <StageIntro eyebrow="3 of 3" title="Where do you live?">
            This shapes your monthly costs more than anything else.
          </StageIntro>
          <Card className="rise-2 space-y-5">
            <OptionGroup<Living>
              legend="Living arrangement"
              hideLegend
              value={p.living}
              onChange={setLiving}
              options={[
                { value: 'family', label: LIVING_LABEL.family, icon: 'Users' },
                { value: 'room', label: LIVING_LABEL.room, icon: 'KeyRound' },
                { value: 'whole_unit', label: LIVING_LABEL.whole_unit, icon: 'Home' },
                { value: 'own', label: 'I own a home (paying a loan)', hint: 'Alone or with a partner', icon: 'Home' },
                { value: 'other', label: 'Other (hostel, camp, etc.)', icon: 'Compass' },
              ]}
            />
            {p.living === 'own' && <HomeLoanFields />}
          </Card>
        </>
      )}

      {last && <Ready onEdit={setStep} />}

      <ActionBar>
        <Button variant="ghost" icon="ArrowLeft" onClick={() => (step === 0 ? dispatch({ type: 'go', stage: 'welcome' }) : setStep(step - 1))}>
          Back
        </Button>
        <Button iconRight="ArrowRight" onClick={() => (last ? dispatch({ type: 'go', stage: 'dream' }) : setStep(step + 1))} disabled={step === 0 && !p.nickname.trim()}>
          {last ? 'Imagine my future' : 'Next'}
        </Button>
      </ActionBar>
    </Screen>
  );
}

function HomeLoanFields() {
  const { state, dispatch } = useStore();
  const p = state.profile;
  const set = (patch: Partial<Profile>) => dispatch({ type: 'profile', profile: patch });
  const cash = Math.max(0, p.homeLoanMonthly - p.homeLoanCpf);
  return (
    <div className="space-y-3 rounded-2xl bg-mist-50 p-4">
      <p className="text-sm font-semibold">Your home loan (rough is fine)</p>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Monthly instalment" prefix="$" value={p.homeLoanMonthly} max={20000} onChange={(v) => set({ homeLoanMonthly: v, homeLoanCpf: Math.min(p.homeLoanCpf, v) })} />
        <NumberField label="Paid from your CPF" prefix="$" value={p.homeLoanCpf} max={p.homeLoanMonthly} onChange={(v) => set({ homeLoanCpf: v })} />
      </div>
      <NumberField label="Years left on the loan" value={p.homeLoanYears} max={35} onChange={(v) => set({ homeLoanYears: v })} />
      <p className="text-xs leading-relaxed text-ink-mute">
        {cash > 0 ? `${money(cash)} a month comes from your take-home pay. ` : 'All of it comes from CPF. '}
        Your share only, if you bought with someone. The CPF part comes out of your Ordinary Account, so it won’t build up there. Not sure? Your loan statement or the housing section in my cpf will show it. The starting figures are illustrative.
      </p>
    </div>
  );
}

/** Summary + optional details. Nothing here is required to continue. */
function Ready({ onEdit }: { onEdit: (s: number) => void }) {
  const { state, dispatch } = useStore();
  const p = state.profile;
  const set = (patch: Partial<Profile>) => dispatch({ type: 'profile', profile: patch });
  const info = STATUS_INFO[p.status];
  const notWorkingYet = p.mainIncomeAge > p.age;
  const pay = paycheck(p.mainIncome, Math.max(p.age, p.mainIncomeAge), p.residency, info.mainKind, 2026);

  const rows: [string, string, number][] = [
    ['Right now', `${p.age} · ${info.label}`, 1],
    ['Home', LIVING_LABEL[p.living] + (p.living === 'own' && p.homeLoanCpf ? ` · ${money(p.homeLoanCpf)}/mo from CPF` : ''), 2],
  ];

  return (
    <>
      <StageIntro eyebrow="You’re all set" title={<>Nice to meet you, {p.nickname || 'friend'}.</>}>
        We’ve filled in the rest with typical figures for someone like you. Change anything now, or later from your avatar at the top.
      </StageIntro>
      <Card className="rise-2">
        <div className="mb-3 flex items-center gap-3">
          <Avatar id={p.avatar} size="lg" />
          <div>
            <p className="display text-xl">{p.nickname || 'Friend'}</p>
            <p className="text-sm text-ink-mute">{p.financeMode === 'fictional' ? 'Using typical figures' : 'Using your rough figures'}</p>
          </div>
        </div>
        <dl className="divide-y divide-mist-200">
          {rows.map(([k, v, s]) => (
            <div key={k} className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-ink-mute">{k}</dt>
              <dd>
                <button type="button" onClick={() => onEdit(s)} className="text-right text-sm font-semibold underline-offset-4 hover:underline">
                  {v}
                </button>
              </dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-sm text-ink-mute">Income</dt>
            <dd className="text-right text-sm font-semibold">{notWorkingYet ? `${money(p.mainIncome)}/mo from age ${p.mainIncomeAge}` : `${money(p.mainIncome)}/mo`}</dd>
          </div>
        </dl>
        {pay.cpfModelled && (
          <p className="mt-3 rounded-2xl bg-blush-50 p-3 text-[13px] leading-relaxed">
            Quick fact: on {money(p.mainIncome)} a month, about <strong>{money(pay.takeHomeBeforeTax)}</strong> reaches your bank account. {money(pay.employeeCpf)} goes to your CPF, and your employer adds another <strong>{money(pay.employerCpf)}</strong> on top.
          </p>
        )}
      </Card>

      <div className="mt-4 space-y-2">
        <p className="text-sm font-semibold text-ink-soft">Adjust details (optional)</p>
        <Disclosure summary={<span>Income & savings <span className="font-normal text-ink-mute">· {p.financeMode === 'fictional' ? 'typical figures' : 'your figures'}</span></span>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Finance mode">
              {(['fictional', 'personal'] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={p.financeMode === m} onClick={() => set({ financeMode: m })} className={cx('min-h-[52px] rounded-2xl border px-3 py-2 text-left', p.financeMode === m ? 'border-ink bg-navy-50' : 'border-mist-300 bg-white')}>
                  <span className="block text-sm font-semibold text-ink">{m === 'fictional' ? 'Typical figures' : 'My rough figures'}</span>
                </button>
              ))}
            </div>
            {p.status !== 'between_jobs' && (
              <NumberField
                label={notWorkingYet ? `Current monthly income (${info.kind === 'allowance' ? 'NS allowance' : 'part-time'})` : 'Monthly income (gross)'}
                prefix="$"
                value={notWorkingYet ? p.currentIncome : p.mainIncome}
                onChange={(v) => set(notWorkingYet ? { currentIncome: v } : { mainIncome: v, currentIncome: v })}
                max={30000}
              />
            )}
            {notWorkingYet && (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Main work starts at age" value={p.mainIncomeAge} min={p.age} max={40} onChange={(v) => set({ mainIncomeAge: v })} />
                <NumberField label="Expected monthly pay" prefix="$" value={p.mainIncome} onChange={(v) => set({ mainIncome: v })} max={30000} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Allowance from family / month" prefix="$" value={otherMonthly(p, 'allowance')} onChange={(v) => set({ otherIncome: withOther(p, 'allowance', v) })} max={5000} help="Not taxed, no CPF" />
              <NumberField label="Freelance or gigs / month" prefix="$" value={otherMonthly(p, 'freelance')} onChange={(v) => set({ otherIncome: withOther(p, 'freelance', v) })} max={20000} help="Taxed, no CPF" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Cash savings" prefix="$" value={p.cash} onChange={(v) => set({ cash: v })} max={2000000} />
              <NumberField label="Investments" prefix="$" value={p.investments} onChange={(v) => set({ investments: v })} max={2000000} />
            </div>
            <NumberField label="CPF balance, all accounts" prefix="$" value={p.cpfTotal} onChange={(v) => set({ cpfTotal: v })} max={2000000} help="Rough is fine. We split it across accounts using 2026 allocation ratios." />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Essentials / month" prefix="$" value={p.essentials} onChange={(v) => set({ essentials: v })} max={10000} help="Food, transport, phone" />
              <NumberField label="Lifestyle / month" prefix="$" value={p.lifestyle} onChange={(v) => set({ lifestyle: v })} max={10000} help="Social, shopping, hobbies" />
            </div>
          </div>
        </Disclosure>
        <Disclosure summary={<span>Family & loans <span className="font-normal text-ink-mute">· gives {money(p.familyAllowance)}/mo at home{p.studentLoan ? ' · student loan' : ''}</span></span>}>
          <div className="space-y-4">
            <NumberField label="Monthly allowance you give your family" prefix="$" value={p.familyAllowance} onChange={(v) => set({ familyAllowance: v })} max={5000} help="Put 0 if you don’t." />
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
              <input type="checkbox" className="h-5 w-5 accent-navy-800" checked={p.studentLoan} onChange={(e) => set({ studentLoan: e.target.checked })} />
              <span className="text-sm text-ink">
                <span className="font-semibold">I have (or expect) a student loan</span>
                <span className="block text-xs text-ink-mute">Illustrative $250/month for 10 years once main work starts.</span>
              </span>
            </label>
            {p.living === 'own' && <HomeLoanFields />}
          </div>
        </Disclosure>
        <Disclosure summary={<span>Residency <span className="font-normal text-ink-mute">· {RESIDENCY_LABEL[p.residency]}</span></span>}>
          <OptionGroup
            legend="Residency (changes which CPF rules apply)"
            value={p.residency}
            onChange={(v) => set({ residency: v })}
            options={[
              { value: 'citizen', label: 'Singapore Citizen', hint: 'Full CPF rules for salaried work' },
              { value: 'pr', label: 'Permanent Resident', hint: 'Lower CPF rates in your first two years (we approximate)' },
              { value: 'other', label: 'Other', hint: 'No CPF — your own savings do more of the work' },
              { value: 'undisclosed', label: 'Prefer not to say', hint: 'We’ll use Singapore Citizen rules' },
            ]}
          />
        </Disclosure>
        <Note icon="Lock">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-navy-800" checked={state.saveLocally} onChange={(e) => dispatch({ type: 'saveLocally', value: e.target.checked })} />
            <span>Remember my progress on this device. Stored only in this browser — nothing is sent anywhere.</span>
          </label>
        </Note>
      </div>
    </>
  );
}

const otherMonthly = (p: Profile, id: 'allowance' | 'freelance') => p.otherIncome?.find((o) => o.id === id)?.monthly ?? 0;

/** Family allowance and freelance income stop when main work starts (for those not working yet), like in Lite. */
function withOther(p: Profile, id: 'allowance' | 'freelance', monthly: number): Profile['otherIncome'] {
  const rest = (p.otherIncome ?? []).filter((o) => o.id !== id);
  if (monthly <= 0) return rest;
  const toAge = p.mainIncomeAge > p.age ? p.mainIncomeAge : undefined;
  return [...rest, id === 'allowance' ? { id, label: 'Allowance from family', monthly, taxable: false, grows: false, toAge } : { id, label: 'Freelance or gigs', monthly, taxable: true, grows: true, toAge }];
}
