# 3. Experience journey, scenario map and information architecture

## Journey (target 5–10 minutes)

| Stage | Screen | User does | System does | ~Time |
|---|---|---|---|---|
| 0 | Welcome | Start, or "Surprise me" | Privacy promise; no sign-up | 15s |
| 0 | About you (3 questions) | Nickname/avatar → age & what you're doing → where you live (incl. "I own a home", with optional loan & CPF figures) → "You're all set" | Everything else (residency, income & savings, family allowance, student loan) is pre-filled from status defaults and tucked under optional "Adjust details"; shows a first CPF "quick fact" | ~45s |
| 1 | **Dream** | Picks aspirations, tunes ages/amounts; retirement explained in "today's dollars" with presets | Live **Future Vision** card | 1–1.5 min |
| 2 | **Reality check** | Reads indicative costs | Inflation-adjusted costs, time to prepare, recurring commitments, monthly saving (cash vs illustrative invested), caveats; "Still the future you want?" → revise freely | 1 min |
| 3 | **Life choices** | 6 one-tap questions | Editable behavioural profile: lifestyle $, invest %, risk comfort. Explicitly "not a verdict" | 1 min |
| 4 | **Life happens** | 5–7 chapters, 2–4 choices each, replayable | Immediate (monthly left over, one-off) and long-term (net savings at 35+, goal status changes) consequences, computed by the same engine; reflection + sourced learning card | 2–3 min |
| 5 | **Your outlook** | Reads results | 3-scenario chart (today's/future $), goal statuses per scenario, buffer, CPF@55 (when modelled), spending split, decisions list, "How we calculated this" | 1 min |
| 6 | **Next move** | Change One Thing; uses tools | Instant re-projection with before/after; personalised next moves; 6 tools; official resources; "try another version" | 1–2 min |

## Scenario map

Chapters are chosen per person (max 7, sorted by age): aspiration-driven first, then exactly one unexpected event, the downturn, then fillers.

| Chapter | Appears when | Age | Interacts with |
|---|---|---|---|
| The offer letter | Main income is salaried | Main-work age | All later income, CPF, tax |
| The quiet months | Gig / self-employed | Now | Buffer; creative-career goal |
| A room comes up | Lives with family **and** (wants independence or answered "rent sooner") | Dream age / main+1 | Surplus → travel, buffer, career break |
| The group chat trip | Filler | Now+1 | Buffer |
| Adoption day | Pet aspiration | Dream age | **Career-break runway** (pet costs carried) |
| Coffee with an old classmate | Filler (20+) | Main+1 | 25-year premium commitment vs runway |
| Restructuring *(unexpected)* | Salaried | Main+2 | Buffer decides whether you can search properly |
| The laptop *(unexpected)* | Student / NSF / gig | Now | Buffer |
| Red everywhere | Investing > 0 | Main+3 | Risk level → size of fall; sell/hold/keep across 3 scenarios |
| Time to step away | Career-break aspiration | Dream age | Every recurring cost chosen earlier |
| A call from home | Family-support aspiration or family answer | Main+2 | Surplus |
| "Guaranteed 5% a week" | Filler | Now+1 | Scam awareness |

**Interconnection examples implemented and tested** (`projection.test.ts`):
- Adopting a dog lowers the runway at a later career break, and the break's goal card lists pet care among running costs.
- Renting a room cuts the monthly surplus by >$1,000 and can push travel/break goals to "explore".
- Selling in a downturn sets invested balance to zero for the rest of the projection.

## Personalisation rules
- **Status → defaults**: income phase(s), CPF applicability (salary vs allowance vs self), starting cash, main-work age.
- **Residency → CPF**: SC/undisclosed full rates; PR full rates with a visible approximation note; Other = no CPF.
- **Living → costs**: with family vs room vs whole unit vs own home; move-out dream adds rent + groceries. Owners enter (or accept) a monthly instalment and the CPF-paid part; "Own a home" and "Live on my own" dreams show as already met.
- **Habits → plan**: social → lifestyle factor (0.85/1/1.2); windfall → invest share (5/10/15%); risk → portfolio type and downturn size (8/20/35%). All editable.
- **Pre-work years**: lifestyle at 50% and travel starting at main work (illustrative).
- **Change One Thing**: one lever at a time (retirement age, monthly investing, lifestyle, move-out age, home timeline, break length, trips) overrides story decisions.

## Information architecture
```
Welcome ─┬─ About you (3 questions → You're all set + optional details)
         └─ Surprise me ─→ review
Journey: Dream → Reality check → Life choices → Life happens (chapters) → Outlook → Next move
Global: header (avatar → profile; menu → How this works & sources / Edit profile / Start over), progress bar (revisit completed stages)
About: can/can't, privacy & local-save toggle, assumptions (status, effective date, conditions, next review), sources
```
