# 5. Financial assumptions and calculation methods

All logic lives in `src/engine/` — pure TypeScript, no UI imports, covered by automated tests. Every assumption is declared once in `src/engine/assumptions.ts` with label, status (verified / estimated / illustrative), sources, effective date, scope, conditions and next-review date, and is rendered in the app ("How we calculated this", About page).

## Modules
| File | Responsibility |
|---|---|
| `assumptions.ts` | Rate tables keyed by effective year, ceilings, allocation, interest, retirement sums, tax bands, scenario parameters, cost & income defaults |
| `cpf.ts` | `monthlyCpf` (wage bands, ceiling, CPF rounding), `allocate`, `annualCpfInterest`, `cpfApplies` |
| `tax.ts` | Progressive resident tax; simplified reliefs |
| `paycheck.ts` | Gross → employee CPF → tax set-aside → spendable; employer CPF; allocation; explanatory notes |
| `finance.ts` | inflate/deflate, monthly saving needed, future value, months to target, runway |
| `profile.ts` | Profile/dream/habit types, status defaults, deterministic "Surprise me" |
| `plan.ts` | Builds a `Plan` from profile + dreams + habits + story effects + Change-One-Thing overrides |
| `projection.ts` | Year-by-year simulation; monthly snapshot |
| `reality.ts` | Stage-2 indicative costs per dream |
| `goals.ts` | Stage-5 goal statuses per scenario |

## Year-by-year projection (`project`)
For each age from today to 65, per scenario:
1. **Income.** Monthly gross for the active phase (e.g. NS allowance → main salary) × (1 + pay growth)^t × active adjustments (four-day week 0.8, lower-paid role 0.9, etc.). Gaps (career break, job search) remove months; optional partial income (freelancing) is added for those months. Zero after the chosen retirement age.
2. **CPF.** If salaried and SC/PR: `monthlyCpf(wage, age, year)` × working months. Rates come from the table effective for that year (2026, 2027; later years use the latest known table — flagged as illustrative). NS allowances, self-employment, gig income and foreigners: no CPF.
3. **Tax.** Resident tax on annual income less Earned Income Relief and CPF Relief (capped at employee rate × $102,000). Shown as a same-year set-aside (actually paid the following year).
4. **Take-home** = gross − employee CPF − tax. Employer CPF never enters take-home (no double counting).
5. **Spending.** Every recurring item (today's $) × (1 + inflation)^t unless marked nominal (loan repayments, insurance premiums, instalments). In retirement, a single all-in monthly lifestyle figure replaces itemised spending. One-off costs (or windfalls) at their age, inflated.
6. **Saving & investing.** Surplus funds planned investing first (never more than the surplus — no borrowing to invest), the rest to cash. Investments return the scenario rate for the chosen risk level (contributions get half a year's return). In the downturn year the return is −8% / −20% / −35% (steady / balanced / bold). "Sell" realises into cash and stops investing; "hold" pauses contributions that year.
7. **Deficits.** Drawn from cash, then investments. Any remainder is recorded as an **unfunded shortfall** that is carried forward and must be repaid from later surpluses before savings rebuild (no interest modelled — this understates the cost of borrowing). Charts show **net** position (savings − unfunded), so below $0 means borrowing would have been needed.
8. **Home loan from CPF (owners).** The CPF-paid part of the instalment is deducted from OA each year after contributions; anything OA can't cover is paid in cash and added to housing spending. The cash part and running costs (~$250/month, illustrative) are housing costs. Deductions stop when the loan ends.
9. **CPF balances (to 55 only). Annual interest on opening balances (OA 2.5%, SA/MA 4%, +1% on first $60k with OA capped at $20k, credited to SA) plus that year's allocated contributions. MediSave above the BHS ($79,000 in 2026, grown 3.5%/yr illustratively) overflows to SA. From 55 the Retirement Account rules apply and are **not modelled**.

Accounting identity tested every year: Δ(cash + investments) = take-home − spending − one-offs + investment return + cash interest.

## Scenarios (illustrative, not forecasts)
| | Inflation | Pay growth | Cash | Steady / Balanced / Bold returns |
|---|---|---|---|---|
| More favourable | 1.5% | 4.0% | 1.5% | 3.5 / 6 / 8% |
| Baseline | 2.0% | 3.0% | 1.0% | 2.5 / 4 / 5% |
| More challenging | 3.0% | 1.5% | 0.5% | 1 / 1 / 0% |

Baseline inflation sits near the 20-year headline average (~2.1%) and MAS's 2026 forecast range (1–2%). Return and pay-growth figures are teaching values with no claim to accuracy; the challenging case never assumes recovery.

## Goal checks (`goals.ts`)
Ratio-based: ≥ 100% → **On track under current assumptions**; ≥ 70% → **Some adjustments needed**; otherwise **Explore alternative pathways**. Shortfalls only count against a goal if they occur within five years of (or are still owed at) that goal's age.
- *Retire early (before 65):* years funded between retirement and 65 ÷ bridge years. CPF is never treated as spendable before 65.
- *Retire at 65+:* projected OA + SA at 55 vs the Full Retirement Sum grown 3.5%/yr (simplified: ignores housing withdrawals).
- *Home:* net savings + CPF OA at target age vs inflated upfront fund (placeholder).
- *Career break:* net savings at break age vs (monthly costs at that age × (months + 3)). Lists ongoing commitments — the pet/rent interconnection.
- *Business:* net savings vs inflated capital + 6 months' costs.
- *Security / creative career:* cash ÷ monthly spending at today + 3 vs 6 months (12 if income irregular).
- *Travel, living independently, pet, family support, start a family, four-day week:* monthly surplus at the relevant age (≥ 10% of take-home = on track).

## Distance to each dream (`goalDistance`, `biggestPressure`)
On the starting-point plan (no story decisions), each goal gets a 0–1 progress value — have ÷ need for savings goals; monthly margin vs 10% of take-home for budget goals — that always agrees with its status (tested), plus a one-line way to close the gap (extra monthly saving to the target age, or a cheaper/later version). `biggestPressure` re-runs the plan without each dream in turn and reports the one whose removal brings the most other dreams within reach; it's framed as a trade-off insight, never as advice to give a dream up.

## Reality check (`reality.ts`)
Each dream is costed on its own (from zero savings, so goals don't double-count the same money): inflated cost at target age, years to prepare, recurring cost, and level monthly saving needed at ~1% (cash) vs an illustrative 4% (invested, not guaranteed).

## Simplifications to be aware of
Annual (not monthly) CPF interest; no bonuses/AW; PR graduated rates approximated by full rates (flagged); tax paid in same year; CPF housing use only for an existing loan (no new purchases, accrued-interest refund rules or valuation limits); no CPF after 55; no mortgage; insurance and student-loan amounts are placeholders; no interest on unfunded shortfalls; investment returns are deterministic per scenario (no volatility sequence other than the one downturn).

## Tests (`npm test` — 64 tests)
- `cpf.test.ts`: rates, ceiling, $50/$500/$750 bands, CPF rounding, year-table fallback, allocation against CPF's worked example, interest caps, eligibility.
- `tax-paycheck-finance.test.ts`: tax bands, reliefs, paycheck split, NS allowance, PR note, TVM helpers.
- `projection.test.ts`: money conservation across scenarios, CPF separate from spendable money, no employer-CPF double count, CPF stops at 55, shortfall handling and repayment, career break months, interconnections (pet → runway; rent → surplus; downturn sell), scenario ordering, 200 generated characters with finite outputs.
- `scenarios.test.ts`: scenario library integrity, sources exist, 5–7 chapters with exactly one unexpected event for every status, every choice yields a valid plan, replay determinism, overrides beat decisions.
