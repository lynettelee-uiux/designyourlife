import { ActionBar, Button, Card, Icon, Note, Screen, Segmented, Slider, StageIntro, cx } from '../components/ui';
import { ASPIRATIONS, aspirationById, type ParamSpec } from '../data/aspirations';
import { money } from '../engine/format';
import { resolveDream } from '../engine/plan';
import type { AspirationId, DreamSelection } from '../engine/profile';
import { useStore } from '../state/store';

const RETIRE_PRESETS = [
  { label: 'Simple', amount: 1800 },
  { label: 'Comfortable', amount: 3000 },
  { label: 'Lavish', amount: 6000 },
];

export default function Dream() {
  const { state, dispatch } = useStore();
  const { dreams, profile } = state;
  const name = profile.nickname || 'there';
  const selected = ASPIRATIONS.filter((a) => dreams[a.id]);

  const toggle = (id: AspirationId) => {
    const next = { ...dreams };
    if (next[id]) delete next[id];
    else next[id] = { id };
    dispatch({ type: 'dreams', dreams: next });
  };
  const update = (id: AspirationId, patch: Partial<DreamSelection>) => dispatch({ type: 'dreams', dreams: { ...dreams, [id]: { ...dreams[id]!, ...patch } } });

  return (
    <Screen>
      <StageIntro eyebrow="Stage 1 · Dream" title={<>Hey {name}, what does your ideal future look like?</>}>
        Pick anything that excites you. There’s no right answer — and nothing here is compulsory, retirement included.
      </StageIntro>

      <div className="rise-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="group" aria-label="Aspirations">
        {ASPIRATIONS.map((a) => {
          const on = !!dreams[a.id];
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(a.id)}
              className={cx('relative flex min-h-[104px] flex-col items-start rounded-3xl border p-3.5 text-left transition-colors', on ? 'border-navy-800 bg-white shadow-card' : 'border-mist-200 bg-white/60 hover:border-mist-300')}
            >
              <span className={cx('grid h-9 w-9 place-items-center rounded-2xl', a.tint)}>
                <Icon name={a.icon} className="h-5 w-5 text-ink" />
              </span>
              <span className="mt-2 text-[15px] font-semibold leading-tight">{a.title}</span>
              <span className="text-xs text-ink-mute">{a.blurb}</span>
              {on && (
                <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-navy-800 text-white">
                  <Icon name="Check" className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <section className="mt-8" aria-labelledby="make-it-yours">
          <h2 id="make-it-yours" className="display text-xl">
            Make it yours
          </h2>
          <p className="mb-3 text-sm text-ink-mute">Adjust the details. Amounts are in today’s dollars.</p>
          <div className="space-y-3">
            {selected.map((a) => {
              const d = resolveDream(dreams[a.id]!, profile);
              return (
                <Card key={a.id} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className={cx('grid h-9 w-9 place-items-center rounded-2xl', a.tint)}>
                      <Icon name={a.icon} />
                    </span>
                    <h3 className="font-semibold">{a.title}</h3>
                    <button type="button" onClick={() => toggle(a.id)} className="ml-auto grid h-10 w-10 place-items-center rounded-full text-ink-mute hover:bg-mist-100" aria-label={`Remove ${a.title}`}>
                      <Icon name="X" className="h-4 w-4" />
                    </button>
                  </div>
                  {a.id === 'retire_early' && (
                    <>
                      <Note>
                        <strong>Today’s dollars</strong> means “what this would buy now”. If prices rise about 2% a year, $3,000 of today’s lifestyle costs roughly {money(3000 * Math.pow(1.02, 30))} a month in 30 years.
                      </Note>
                      <div className="flex flex-wrap gap-2" role="group" aria-label="Retirement lifestyle presets">
                        {RETIRE_PRESETS.map((pr) => (
                          <button key={pr.label} type="button" aria-pressed={d.amount === pr.amount} onClick={() => update(a.id, { amount: pr.amount })} className={cx('min-h-[40px] rounded-full border px-3.5 text-sm font-semibold', d.amount === pr.amount ? 'border-ink bg-navy-50' : 'border-mist-300 bg-white')}>
                            {pr.label} · {money(pr.amount)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {a.params.map((ps) => (
                    <Param key={ps.key} spec={ps} value={d[ps.key] as number | string | undefined} onChange={(v) => update(a.id, { [ps.key]: v })} minAge={profile.age} />
                  ))}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {selected.length > 0 && (
        <section className="mt-8 overflow-hidden rounded-3xl bg-navy-800 p-6 text-white" aria-labelledby="vision">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-magenta-300">Future Vision</p>
          <h2 id="vision" className="display mt-1 text-2xl text-white">
            {profile.nickname || 'Your'}’s version
          </h2>
          <ul className="mt-4 space-y-2">
            {selected.map((a) => (
              <li key={a.id} className="flex items-start gap-3 text-[15px]">
                <Icon name={a.icon} className="mt-0.5 h-4 w-4 shrink-0 text-magenta-300" />
                <span>{aspirationById(a.id).vision(resolveDream(dreams[a.id]!, profile))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ActionBar>
        <Button variant="ghost" icon="ArrowLeft" onClick={() => dispatch({ type: 'go', stage: 'profile', step: 5 })}>
          Back
        </Button>
        <Button iconRight="ArrowRight" disabled={selected.length === 0} onClick={() => dispatch({ type: 'go', stage: 'reality' })}>
          {selected.length === 0 ? 'Pick at least one' : 'What would it take?'}
        </Button>
      </ActionBar>
    </Screen>
  );
}

function Param({ spec, value, onChange, minAge }: { spec: ParamSpec; value: number | string | undefined; onChange: (v: number | string) => void; minAge: number }) {
  if (spec.options) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-soft">{spec.label}</span>
        <Segmented label={spec.label} value={(value as string) ?? spec.options[0].value} onChange={onChange} options={spec.options} />
      </div>
    );
  }
  const min = spec.key === 'age' ? Math.max(spec.min ?? 0, minAge) : spec.min ?? 0;
  const v = Math.max(min, Number(value ?? min));
  return (
    <Slider
      label={spec.label}
      value={v}
      min={min}
      max={Math.max(min + 1, spec.max ?? 100)}
      step={spec.step}
      onChange={onChange}
      help={spec.help}
      format={(n) => (spec.prefix === '$' ? money(n) : `${n}${spec.suffix ?? ''}`)}
    />
  );
}
