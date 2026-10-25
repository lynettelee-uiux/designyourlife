# 3. Experience journey, scenario map and information architecture

## Journey (target 5–10 minutes)

| Stage | Screen | User does | System does | ~Time |
|---|---|---|---|---|
| 0 | Welcome | Start, or "Surprise me" | Privacy promise; no sign-up | 15s |
| 0 | About you (3 questions) | Nickname/avatar → age & what you're doing → where you live (incl. "I own a home", with optional loan & CPF figures) → "You're all set" | Everything else (residency, income & savings, family allowance, student loan) is pre-filled from status defaults and tucked under optional "Adjust details"; shows a first CPF "quick fact" | ~45s |
| 1 | **Dream** | Picks aspirations; each chosen dream collapses to a one-line summary with a dropdown to adjust; retirement explained in "today's dollars" with presets | Live near/far badge per dream (Within reach / A stretch / Further away) on the current path; "biggest pressure" tip; **Future Vision** card | 1–1.5 min |
| 2 | **Reality check** | Reads a verdict, then one card per dream | Verdict ("2 of 4 dreams look within reach") with a distance bar per dream; **biggest pressure** insight (which dream, if eased, brings the most others within reach); per-dream % of the way, "what could close the gap", and numbers in a "See the numbers" dropdown; "Still the future you want?" → revise freely | 1 min |
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

## Shared principles (Lite and full)
Both versions now apply the same principles; the full version stays more detailed.
- **Believable inputs:** money received (family allowance, freelance) counts as income without CPF; students and NSFs don't give family money by default; every verdict says *why* and how to close the gap.
- **Stage-matched moments:** scenarios are tagged by life stage (student, NS, early career, established). Dream-linked chapters follow the user's own timing.
- **Habits → skills:** money-habit questions (e.g. surprise bill, tracking) feed three personalised money skills, each collapsed to title + why, with a tip, quick check and official link on tap.
- **Shareable, no amounts:** the Future Card appears in Lite results and the full Outlook.

## Learning design: predict → reveal → recap
User feedback: people treated the experience like a quiz and skipped the "nuggets". The learning is now part of the quiz:
- **Quick guess:** after each choice, users predict whether savings end up higher, lower or about the same, before anything is revealed (prediction makes people attend to the answer).
- **Lesson first:** the reveal leads with right/not quite and the money lesson; numbers follow.
- **Recap:** "What you learned" lists the lessons unlocked and "guesses right: x of y"; the Future Card shows "N money lessons learned".

## Positioning
Not a calculator (which answers one question) or a budgeting app (which tracks the past): a safe practice run for real Singapore money decisions, where you guess, decide and learn why — personalised to life stage, with nothing sold and nothing saved.

### Quick-guess questions (revised)
"Higher or lower savings?" was too obvious — spending always lowers savings. Each moment now has its own question about something genuinely non-obvious, answered with the simulation's own numbers: yearly package vs monthly pay (bonus offers), the total cost of a "free" phone plan, card interest on a trip (~$377 on $2,500 over a year at ~27%), CPF making a $1,200 internship worth about the same as $1,400 freelance, what compounding at "5% a week" would imply, the 25% rise needed after a 20% fall, lifetime pet cost, runway in months, and what pauses during a career break.

### Dreams: two added to Lite (8 in total)
Gap review of the original six (travel, own place, pet, career break, home, retire early): all were about *spending on yourself*. Two very common goals for Singapore youths were missing: **giving back to parents** (a regular allowance at home is a strong norm, and often starts with the first pay) and **starting my own thing** (side hustles and small online shops). Both already existed in the full version; Lite now offers them with one-tap choices (when; how much), and both versions get a dream-linked life moment:
- **Giving back at home** — give the full amount, step up as pay grows, or build a 3-month cushion first. Quick guess: can giving cash to parents lower your own tax? (Yes — IRAS Parent Relief, conditions apply; CPF cash top-ups to loved ones can add up to $8,000 of relief.)
- **Launch day** — go all in, test small first, or save two more years. Quick guess: break-even units ($600 fixed ÷ $12 margin = 50; the trap is dividing by the price).

Considered but not added: wedding/BTO with a partner (strongly relevant from 25+, but needs couple-level modelling), a car (COE makes it a powerful lesson but prices are volatile), and further studies (fees vary widely by course).

## Sprint — a competitive "test your skills" mode (separate page)
Lite and the full version are unchanged apart from a "Test your skills" card at the end of each. The Sprint is for people who like games: it tells them which money skills they're weak in and points them to official readings and tools.
- **Rules:** 60-second rounds. Points = 10 / 20 / 30 for easy / medium / hard, +5 for a streak of 3 or more. Points carry across days and move you up five levels. Each wrong answer costs one of 5 daily hearts. When the hearts run out, timed play stops until midnight, but practice mode stays open, so learning never locks.
- **Adaptive:** a round starts at a tier set by your level. Two right in a row steps the questions up a tier, and a wrong answer steps them down. Questions are spread across skills so the diagnosis covers as many as possible.
- **Learning stays in:** the clock pauses while you read each explanation. Results list the skills to work on (lowest accuracy first), each with a fact, a "try this week" tip, official links and where to practise. Every answer can be reviewed, mistakes first.
- **Competitive without a server:** personal best, levels, and a friend-challenge link with only the score in it. No fake leaderboard. A real one would need accounts and a backend; consider it after youth testing.
- **Accessibility:** practice mode has no time limit (WCAG 2.2.1). Number keys 1–4 answer and Enter moves on. Hearts and the timer have text equivalents, and screen readers hear a time warning at 30 and 10 seconds.

### Sprint layers (age, stage, topics, spider diagram)
- **Age and situation first** (asked once, editable). These map to a stage: Studying, Serving NS, Starting out (working, up to 27, matching MoneySense's 20s goals) or Setting up (28+, matching its 30s goals). Gig work makes irregular income core, and being between jobs makes the emergency fund core.
- **Relevance per stage:** each of the 12 skills is *core now*, *good to know* or *later*. For example, legacy planning is "later" while studying and core when setting up; insurance becomes core once working (CPF's Dependants' Protection Scheme starts with your first CPF contribution). Mixed rounds skip "later" skills and stage-specific questions meant for other stages (e.g. allowance budgeting for students, BTO downpayment for workers).
- **Pick a topic:** every question on one skill (6–7 each), still timed with hearts. You can also practise a topic from the skill map or from any weak spot on the results page.
- **Spider diagram ("What to know at <age>"):** 12 spokes. A dashed blue shape shows what matters at your stage (core = outer ring), and a solid pink shape shows your accuracy. Colours pass the colour-blindness checks, and the line style also tells them apart. A grouped list (Core now / Good to know / Coming up later) is the text equivalent, with a "Read" link (MoneySense first) and "Practise this topic".
- **Sources, MoneySense first:** Your Financial Basics (rules of thumb), Setting financial goals at every life stage, What is a will?, and Lasting Power of Attorney. Then CPF (DPS, nomination), MOH (MediShield Life) and MAS (credit card rules). 75 questions in total.

### Sprint simplified (one main action) + demo comparisons
- **One clear call to action:** "Start a 60-second sprint", with mixed questions for your age and stage. Secondary options are quieter: "practise without a timer" is a text link (kept for accessibility), and "Or dive into a key area" is collapsed by default.
- **12 skills → 6 key areas** for the map and topic rounds (12–14 questions each): Spending & saving, Safety nets, Credit & scams, Pay/CPF & gig income, Investing & home, Retirement & legacy. Readings and weak-spot advice stay at the specific-skill level, because that's more actionable.
- **Peer comparison and leaderboard are DEMO data.** No real player data exists, so "players your age" averages and the weekly leaderboard (9 sample handles, not real people) are generated deterministically per age band (17–20, 21–24, 25–29, 30–35) and week. Peers score a little higher on areas that are core at their stage. Every place they appear says "demo". Before any public launch, replace `peerAverage` and `leaderboard` in `src/challenge/peers.ts` with anonymous aggregates from real players (this needs a backend and consent), or remove them.

### Sprint v3: its own look, harder as you climb, mistakes come back
- **Look:** a dark "game mode" in the brand blue and pink (night navy, electric blue, hot pink, mint for correct, amber for streaks), Space Grotesk headings, and chunky tactile buttons and answer tiles. It's deliberately different from Lite's light cards. Text contrast is checked (soft text 10.5:1, muted 6.6:1), and the spider-diagram colours are re-validated for the dark surface.
- **Level bar fix:** the old bar showed progress *within* a level under a row of all five level names, so 230/250 looked like "past Strategist". It's now one track with five level dots; the fill stops between your level and the next.
- **Difficulty ladder (Duolingo-like):** 4 tiers (Easy 10, Medium 20, Hard 30, Expert 40 pts). Hard unlocks at Saver and Expert at Strategist; locked tiers show "at <level>". Rounds start at Easy (Rookie/Saver), Medium (Planner/Strategist) or Hard (Money Pro), and two right in a row step up, capped at your unlocked tier. 12 Expert questions (one or more per key area) are multi-step and computed by the engine or taken from sources: e.g. bonus CPF under the $102k annual ceiling, fund fees compounding, card payoff time at 27%, downpayment after keeping $20k in your OA, the cover gap against MoneySense's 9× guide, and marriage revoking both a will and a CPF nomination (CPF Board).
- **Mistakes come back:** a missed question returns 3 questions later ("Second try"). Missed questions are also saved and mixed into later rounds (every other question) until answered right ("Fixed 2 past mistakes").
- **Minimal results:** the score, then level and hearts, then one main button (Next sprint), then "You vs players your age" (rank, spider diagram, top-2 catch-up areas with one tip, Practise and one reading). Answers, leaderboard and challenge-a-friend are each collapsed. 87 questions in total.
- **"You may want to check out…"** (collapsed, under the comparison on the start and results pages): official readings and tools for the top catch-up areas, or for your stage's core areas if you're ahead. Up to 3 per area, MoneySense first, each link listed once, plus where to practise it in Lite or the full version.
- **Shuffled answers:** options are shuffled every time a question is shown, so the right answer isn't usually B (the bank was authored with most answers in the middle).
- **Readings only after a round:** the start page shows no reading links. "You may want to check out…" and the reading link on each focus card appear on the results page, where they point at what that round showed you need.
- **Clear priorities:** straight after the score, "Your top 2 focus areas" is numbered, with "Start here" on #1 and a reason for each (e.g. "Core at your stage · 39 points below players aged 21–24 (demo)"). Each has a You-vs-peers bar, one "Try this week" tip, Practise, and one reading. If you're not behind anywhere, it falls back to untried core areas, then your lowest score. The readings dropdown follows the same order ("Focus 1 · …", "Focus 2 · …").
