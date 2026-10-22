# 6. Reusable scenario data structure

Scenarios live in `src/data/lifeScenarios.ts`. They contain **no maths** — choices emit `PlanEffect`s and the engine computes every consequence, so story numbers always match the outlook.

```ts
interface LifeScenario {
  id: string;                    // unique, stable (decisions are stored by id)
  topic: string;                 // chip label, e.g. 'Housing'
  title: string;                 // chapter heading
  applies(ctx): boolean;         // who sees it (status, dreams, habits, plan)
  age(ctx): number;              // when it happens
  story(ctx, age): string;       // second person, uses ctx.name
  choices: ScenarioChoice[];     // 2–4
  learn: { title; body; sourceIds? };  // sourced concept card
  unexpected?: boolean;          // labelled "Unexpected — but plausible"; max one per story
  neutral?(ctx, age): PlanEffect[];    // counterfactual "if this hadn't happened" (needed when a dream already added the commitment)
}

interface ScenarioChoice {
  id: string;
  label: string; detail?: string;
  effects(ctx, age): PlanEffect[];
  outcome(ctx, age): string;     // immediate consequence in words
  reflection: string;            // non-judgemental learning reflection
}
```

## Plan effects
| Effect | Meaning |
|---|---|
| `recurring` | Add/replace a monthly item (`id`, category, today's $, from/to age, `nominal?`) |
| `oneOff` | Cost (positive) or windfall (negative) at an age |
| `incomeAdjust` | Multiply income from an age (e.g. 0.9 lower-paid role) |
| `incomeGap` | Months without pay at an age, optional `partialFactor` |
| `removeRecurring` | Remove an item (and its linked one-offs, matching `id-` prefix) |
| `shiftRecurring` | Move an item (and linked items/one-offs) to a new start age |
| `downturn` | Market fall at an age with response sell / hold / keep_investing |
| `investFactor`, `mainIncomeFactor` | Scale planned investing / main salary |

Items with the same `id` replace each other, so replaying a chapter never double-counts.

## Adding a chapter (example: 25–29 "Moving in together")
1. Add an object to `LIFE_SCENARIOS` with `applies: (c) => c.profile.age >= 25 && !!c.dreams.start_family`.
2. Express choices as effects, e.g. `{ kind: 'recurring', item: { id: 'move-out-rent', monthly: 900, … } }` to split rent.
3. Add a `learn` card with `sourceIds` from `src/data/sources.ts` (add the source there first).
4. Add the id to the `priority` list in `selectScenarios`.
5. `npm test` — the integrity tests check choice counts, reflections, sources, and that every choice builds a valid plan for 40 generated characters.

## Other data modules
- `src/data/aspirations.ts` — 12 aspirations with parameter specs (sliders/segmented) and vision phrases. Defaults live in `engine/plan.ts → resolveDream`.
- `src/data/habitQuestions.ts` — 6 questions; each option sets habit fields and a neutral "signal" phrase.
- `src/data/resources.ts` — official links tagged by aspiration.
- `src/data/sources.ts` — every source with URL, publisher, dates, official flag.
