import { useState } from 'react';
import { ActionBar, AVATAR_IDS, Avatar, Button, Card, Note, NumberField, OptionGroup, Screen, Slider, StageIntro, TextField, cx } from '../components/ui';
import { COST_DEFAULTS } from '../engine/assumptions';
import { money } from '../engine/format';
import { paycheck } from '../engine/paycheck';
import { STATUS_INFO, applyStatusDefaults, surpriseCharacter, type LifeStatus, type Living } from '../engine/profile';
import { useStore } from '../state/store';

const STEPS = ['You', 'Right now', 'Rules', 'Home', 'Money', 'Review'];
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

export default function ProfileScreen() {
  const { state, dispatch } = useStore();
  const [step, setStep] = useState(Math.min(state.step ?? 0, STEPS.length - 1));
  const p = state.profile;
  const set = (patch: Partial<typeof p>) => dispatch({ type: 'profile', profile: patch });
  const last = step === STEPS.length - 1;
  const notWorkingYet = p.mainIncomeAge > p.age;
  const info = STATUS_INFO[p.status];

  const next = () => (last ? dispatch({ type: 'go', stage: 'dream' }) : setStep(step + 1));

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
          <StageIntro eyebrow="Before we begin" title="First, what should we call you?">
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
          <StageIntro eyebrow="Right now" title="Where are you in life at the moment?">
            Everyone’s path is different. Pick what fits best — you can change it later.
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
          <StageIntro eyebrow="The rules that apply" title="Which of these fits you?">
            This only changes which CPF rules we apply. Skip it if you’d rather not say.
          </StageIntro>
          <Card className="rise-2">
            <OptionGroup
              legend="Residency"
              value={p.residency}
              onChange={(v) => set({ residency: v })}
              options={[
                { value: 'citizen', label: 'Singapore Citizen', hint: 'Full CPF rules apply to salaried work' },
                { value: 'pr', label: 'Permanent Resident', hint: 'CPF applies; rates are lower in your first two years (we approximate)' },
                { value: 'other', label: 'Other', hint: 'No CPF — your own savings do more of the work' },
                { value: 'undisclosed', label: 'Prefer not to say', hint: 'We’ll use Singapore Citizen rules' },
              ]}
            />
          </Card>
        </>
      )}

      {step === 3 && (
        <>
          <StageIntro eyebrow="Home & family" title="Where do you live, and who do you support?">
            All optional. These shape your monthly costs.
          </StageIntro>
          <Card className="rise-2 space-y-5">
            <OptionGroup<Living>
              legend="Living arrangement"
              value={p.living}
              onChange={(v) => set({ living: v, essentials: v === 'family' ? COST_DEFAULTS.essentialsWithFamily : COST_DEFAULTS.essentialsIndependent })}
              options={[
                { value: 'family', label: 'With family', icon: 'Users' },
                { value: 'room', label: 'Renting a room', icon: 'KeyRound' },
                { value: 'whole_unit', label: 'Renting a whole place (shared)', icon: 'Home' },
                { value: 'other', label: 'Other (hostel, camp, etc.)', icon: 'Compass' },
              ]}
              columns={2}
            />
            <NumberField label="Monthly allowance you give your family (optional)" prefix="$" value={p.familyAllowance} onChange={(v) => set({ familyAllowance: v })} max={5000} help="Many young Singaporeans contribute at home. Put 0 if not." />
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-2xl border border-mist-300 bg-white px-4 py-3">
              <input type="checkbox" className="h-5 w-5 accent-navy-800" checked={p.studentLoan} onChange={(e) => set({ studentLoan: e.target.checked })} />
              <span className="text-[15px]">
                <span className="font-semibold">I have (or expect) a student loan</span>
                <span className="block text-xs text-ink-mute">We use an illustrative $250/month repayment for 10 years once you start main work.</span>
              </span>
            </label>
          </Card>
        </>
      )}

      {step === 4 && (
        <>
          <StageIntro eyebrow="Your money" title="Made-up numbers or your own rough ones?">
            Both work. Approximate is fine, and everything stays in this browser.
          </StageIntro>
          <div className="rise-2 mb-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Finance mode">
            {(['fictional', 'personal'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={p.financeMode === m}
                onClick={() => set({ financeMode: m })}
                className={cx('min-h-[64px] rounded-2xl border px-4 py-3 text-left', p.financeMode === m ? 'border-ink bg-navy-50' : 'border-mist-300 bg-white')}
              >
                <span className="block text-[15px] font-semibold">{m === 'fictional' ? 'Fictional' : 'My rough figures'}</span>
                <span className="block text-xs text-ink-mute">{m === 'fictional' ? 'Typical figures for your situation' : 'Ballpark numbers, all skippable'}</span>
              </button>
            ))}
          </div>
          <Card className="space-y-4">
            {p.financeMode === 'fictional' && <Note>These are typical starting figures for a {info.label.toLowerCase()} based on 2023–2025 graduate surveys and 2026 costs. Tweak anything that doesn’t feel right.</Note>}
            {p.status !== 'between_jobs' && <NumberField label={notWorkingYet ? `Current monthly income (${info.kind === 'allowance' ? 'NS allowance' : 'part-time'})` : 'Monthly income (gross)'} prefix="$" value={notWorkingYet ? p.currentIncome : p.mainIncome} onChange={(v) => set(notWorkingYet ? { currentIncome: v } : { mainIncome: v, currentIncome: v })} max={30000} />}
            {notWorkingYet && (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Main work starts at age" value={p.mainIncomeAge} min={p.age} max={40} onChange={(v) => set({ mainIncomeAge: v })} />
                <NumberField label="Expected monthly pay" prefix="$" value={p.mainIncome} onChange={(v) => set({ mainIncome: v })} max={30000} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Cash savings" prefix="$" value={p.cash} onChange={(v) => set({ cash: v })} max={2000000} />
              <NumberField label="Investments" prefix="$" value={p.investments} onChange={(v) => set({ investments: v })} max={2000000} />
            </div>
            <NumberField label="CPF balance, all accounts (optional)" prefix="$" value={p.cpfTotal} onChange={(v) => set({ cpfTotal: v })} max={2000000} help="Rough is fine. We split it across accounts using 2026 allocation ratios." />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Essentials / month" prefix="$" value={p.essentials} onChange={(v) => set({ essentials: v })} max={10000} help="Food, transport, phone" />
              <NumberField label="Lifestyle / month" prefix="$" value={p.lifestyle} onChange={(v) => set({ lifestyle: v })} max={10000} help="Social, shopping, hobbies" />
            </div>
            <label className="flex cursor-pointer items-start gap-3 pt-1 text-sm">
              <input type="checkbox" className="mt-0.5 h-5 w-5 accent-navy-800" checked={state.saveLocally} onChange={(e) => dispatch({ type: 'saveLocally', value: e.target.checked })} />
              <span>
                <span className="font-semibold">Remember my progress on this device</span>
                <span className="block text-xs text-ink-mute">Stored only in this browser’s local storage. Nothing is sent to a server. You can clear it any time from the menu.</span>
              </span>
            </label>
          </Card>
        </>
      )}

      {last && <Review onEdit={setStep} />}

      <ActionBar>
        <Button variant="ghost" icon="ArrowLeft" onClick={() => (step === 0 ? dispatch({ type: 'go', stage: 'welcome' }) : setStep(step - 1))}>
          Back
        </Button>
        <div className="flex gap-2">
          {!last && step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step + 1)}>
              Skip
            </Button>
          )}
          <Button iconRight="ArrowRight" onClick={next} disabled={step === 0 && !p.nickname.trim()}>
            {last ? 'Imagine my future' : 'Next'}
          </Button>
        </div>
      </ActionBar>
    </Screen>
  );
}

function Review({ onEdit }: { onEdit: (s: number) => void }) {
  const { state } = useStore();
  const p = state.profile;
  const info = STATUS_INFO[p.status];
  const pay = paycheck(p.mainIncome, Math.max(p.age, p.mainIncomeAge), p.residency, info.mainKind, 2026);
  const rows: [string, string, number][] = [
    ['Right now', `${p.age} · ${info.label}`, 1],
    ['Residency', { citizen: 'Singapore Citizen', pr: 'Permanent Resident', other: 'Other', undisclosed: 'Prefer not to say' }[p.residency], 2],
    ['Home', { family: 'With family', room: 'Renting a room', whole_unit: 'Renting a place', other: 'Other' }[p.living] + (p.familyAllowance ? ` · gives ${money(p.familyAllowance)}/mo at home` : ''), 3],
    ['Main income', p.mainIncomeAge > p.age ? `${money(p.mainIncome)}/mo from age ${p.mainIncomeAge}` : `${money(p.mainIncome)}/mo`, 4],
    ['Savings', `${money(p.cash)} cash · ${money(p.investments)} invested`, 4],
  ];
  return (
    <>
      <StageIntro eyebrow="Your starting point" title={<>Nice to meet you, {p.nickname || 'friend'}.</>}>Here’s who we’ll be simulating. Tap any line to change it.</StageIntro>
      <Card className="rise-2">
        <div className="mb-4 flex items-center gap-3">
          <Avatar id={p.avatar} size="lg" />
          <div>
            <p className="display text-xl">{p.nickname || 'Friend'}</p>
            <p className="text-sm text-ink-mute">{p.financeMode === 'fictional' ? 'Fictional figures' : 'Your rough figures'}</p>
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
        </dl>
        {pay.cpfModelled && (
          <p className="mt-3 rounded-2xl bg-blush-50 p-3 text-[13px] leading-relaxed">
            Quick fact: on {money(p.mainIncome)} a month, about <strong>{money(pay.takeHomeBeforeTax)}</strong> reaches your bank account. {money(pay.employeeCpf)} goes to your CPF, and your employer adds another <strong>{money(pay.employerCpf)}</strong> on top.
          </p>
        )}
      </Card>
    </>
  );
}
