# Design Your Life

**Your future isn't decided. Try a few versions.**

A mobile-first, personalised financial life simulator prototype for Singapore youths (20–24). Users imagine the future they want, see what it might take, make life decisions in a branching story, and explore how changing one thing reshapes their outlook — using simplified 2026 Singapore rules (CPF, tax, inflation).

**Two versions, one engine**
- **Full** (`/`): ~8–10 minutes — 12 dreams, reality check, habit questions, a 5–7 chapter life story, outlook, Change One Thing and six tools.
- **Lite** (`/lite/`): ~3 minutes, 4 screens — age/situation/living → pick up to 3 of 6 dreams with a live near/far verdict → one unexpected life moment → results with the biggest-pressure insight and two "change one thing" sliders. No saving; typical figures only. Code in `src/lite/`.

> Educational illustration only — not a prediction and not financial advice. No accounts, no real data required, nothing leaves the browser.

## Quick start

Requires Node.js 18+ (built with Node 21).

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173 (full) or http://localhost:5173/lite/ (Lite).

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Run 64 automated tests (CPF, tax, projections, scenarios) |
| `npm run typecheck` | TypeScript strict check |
| `npm run build` | Type-check and build static files to `dist/` |
| `npm run preview` | Serve the production build locally |

## Deployment
The app is fully static (no backend). `npm run build` produces `dist/` with relative asset paths (`base: './'`), so it can be hosted from any path:
- **Netlify / Vercel / Cloudflare Pages:** build command `npm run build`, output directory `dist`.
- **GitHub Pages / S3 / any web server:** upload the contents of `dist/`.
- **Embedding in another site:** serve `dist/` from a sub-path or iframe; no server configuration or routing rewrites needed (single page, state-based navigation).

Fonts load from Google Fonts; everything else is bundled. Recharts is code-split and loads when the first chart appears.

## Privacy & storage
Progress is saved only in the browser's `localStorage` (key `design-your-life:v1`) when "Remember my progress" is on (default). Users can turn it off or clear everything from the menu or About page. No analytics, cookies or network calls carry user data.

## Project structure
```
src/
  engine/            Pure, tested financial model (no UI)
    assumptions.ts   Every rate/figure with source, status, effective date, review date
    cpf.ts tax.ts paycheck.ts finance.ts
    profile.ts plan.ts projection.ts reality.ts goals.ts format.ts
    __tests__/
  data/              Content: aspirations, habit questions, life scenarios, sources, resources
  state/             App store (useReducer + localStorage) and engine glue (sim.ts)
  components/        UI kit, chart, tools
  screens/           Welcome, Profile, Dream, Reality, Habits, LifeHappens, Outlook, NextMove, About
  lite/              Design Your Life (Lite): LiteApp, liteSim (+ tests), entry point
lite/index.html      Lite page entry
docs/                Research, personas, journey, design system, model, scenario schema, limitations
```

## Documentation (deliverables)
1. [Research summary](docs/01-research-summary.md) — Singapore sources, youth insights (verified vs hypotheses), benchmarking
2. [Personas & priority decisions](docs/02-personas-and-decisions.md)
3. [Experience journey & scenario map](docs/03-experience-journey.md)
4. [Design system](docs/04-design-system.md)
5. [Financial assumptions & calculation methods](docs/05-financial-model.md)
6. [Scenario data structure](docs/06-scenario-data-structure.md)
7. [Limitations, safeguards & validation plan](docs/07-limitations-and-validation.md)

## Keeping figures current
All rules live in `src/engine/assumptions.ts`. CPF tables are keyed by effective year (`CPF_RATE_TABLES[2027] = …`); add a new year rather than editing an old one. Each assumption has a `nextReview` date shown in the app. Review CPF rates/ceilings every 1 Jan, CPF interest quarterly, tax after each Budget, and cost defaults every 6 months.
