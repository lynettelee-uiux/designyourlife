# 2. Needs-based segments (20–24) and priority decisions

_These segments are **hypotheses** built from the sources in the research summary (graduate surveys, NYC surveys and dialogue notes) — not from interviews. Validate them in the testing plan (doc 07)._

## Needs-based segments

| Segment | Who | Money reality | Core need | What the prototype does for them |
|---|---|---|---|---|
| **The Pre-starter** | Uni / poly / ITE students | Part-time income (~$600 illustrative), family support, maybe a student loan | "What will my first salary actually feel like?" | Leaner pre-work lifestyle; first-offer chapter shows payslip, CPF and tax; laptop surprise |
| **The Serving** | NSFs | NS allowance (from $790), no CPF on allowance, choices after ORD | "What should I do with my allowance, and what comes after ORD?" | Allowance phase → main-work phase; no CPF until salaried; scam chapter |
| **The First-jobber** | Full-time employees, 0–3 years in | Regular salary, CPF, first big commitments (rent, travel, family allowance) | "Can I afford independence *and* my plans?" | Move-out, trip, insurance pitch, restructuring chapters; Change One Thing |
| **The Flexible earner** | Gig / part-time / self-employed / creative | Irregular income; no mandatory employee CPF | "How do I stay steady when income isn't?" | 12-month buffer target; "quiet months" chapter; CPF explicitly not modelled |
| **The In-between** | Between jobs, alternative pathways | Little or no income for a while | "How long can I last, and what's my next step?" | Shortfall shown honestly as "explore"; runway tool; SkillsFuture/MyCareersFuture links |
| **The Carer** | Any of the above with family obligations | Household contributions, parental support | "How do I help without losing my own footing?" | Family-help chapter with non-cash option; MediSave-for-parents note |

Cross-cutting needs (all segments): avoid judgement; skip sensitive questions; use made-up numbers; understand trade-offs in minutes.

## Secondary audiences (extensible)
- **25–29**: job changes, moving out, relationships, BTO timelines, investing, career breaks.
- **30–35**: housing commitments, dependants, caregiving, protection needs.
The scenario system is data-driven (`applies(ctx)` and `age(ctx)` per scenario), so new life-stage chapters can be added without UI changes (doc 06).

## Prioritised life decisions and milestones (20–24)

| Priority | Decision / milestone | Why it matters | In MVP |
|---|---|---|---|
| P1 | First salary: gross vs take-home, CPF, negotiation | Most common blind spot (H5); sets every later number | ✅ First-offer chapter + paycheck tool |
| P1 | Emergency buffer | Top stated aspiration in NYC survey (being prepared) | ✅ Goal, outlook stat, planner tool |
| P1 | Social & lifestyle spending (dinners, trips) | Most relatable trade-off (H6); budget-sticking is hard (NYC) | ✅ Habit Q1 + trip chapter |
| P1 | Moving out vs staying home | Large recurring cost that delays other goals | ✅ Move-out chapter, lever |
| P1 | Supporting family | Cultural expectation; caregiving anxiety (NYD) | ✅ Family chapter + aspiration |
| P1 | Unexpected events (job loss, device failure) | Shows value of buffers without punishment | ✅ One per story, with choices |
| P1 | Investing & downturns | 7 in 10 youths investing but low confidence | ✅ Downturn chapter, risk tool |
| P2 | Pets | Long recurring commitment; interacts with breaks | ✅ |
| P2 | Insurance basics | Pressure sales are common; protection gaps | ✅ (no products) |
| P2 | Career breaks / irregular income | Rising interest; runway thinking | ✅ |
| P2 | Scams | Investment scams costliest in 2025 | ✅ |
| P3 | Home ownership timeline | Big aspiration; eligibility from 35 for singles | Partial (upfront fund check only) |
| P3 | Student loan repayment | Relevant to graduates; scheme changed Jul 2026 | Illustrative placeholder |
| P3 | Early retirement | Popular aspiration; CPF payouts from 65 | ✅ bridge-years model |
| Later | Marriage/children, BTO with partner, caregiving at scale | 25–35 life stages | Placeholder ("start a family") |
