# 7. Known limitations and recommendations for validation

## What the experience can and cannot do
**Can:** illustrate possible consequences; compare hypothetical decisions; show trade-offs; explain CPF, take-home pay, inflation and risk basics; offer educational calculators; encourage reflection.

**Cannot:** predict anyone's future; guarantee returns or recovery; decide the "right" lifestyle; give regulated personalised advice; recommend products; confirm housing/scheme eligibility; diagnose personality; forecast salaries, inflation or policy; replace official CPF/IRAS/HDB calculators or professional advice.

These lists appear in the app (About page) and short disclaimers appear on the Outlook and Next Move screens.

## Safeguards implemented
No accounts, NRIC, exact income, credentials or bank links · nickname only · every sensitive question skippable · fictional mode by default · local-only storage with on/off toggle and reset · no sharing · no real money · no gambling mechanics (downturn is a choice about response, not a game of chance) · no shame language · no countdowns or urgency · no assumption of marriage/children/property/retirement · no product recommendations · all numbers labelled today's vs future dollars.

## Known limitations
**Financial model**
- CPF beyond 55 (RA, CPF LIFE payouts), CPF housing rules beyond a simple monthly OA deduction for an existing loan (accrued interest, valuation/withdrawal limits), PR graduated rates, bonuses/Additional Wages, Platform Workers Act CPF and self-employed MediSave are not modelled (labelled in UI).
- Tax: resident only, two reliefs, same-year timing; non-resident tax not modelled.
- Home ownership is a readiness check against a placeholder fund; mortgages, grants, loans and eligibility are not modelled.
- Student loans use an illustrative repayment; the Higher Education Student Loan (from 29 Jul 2026) was not researched.
- Insurance premiums in the story are illustrative; coverage adequacy isn't assessed.
- Returns are deterministic per scenario plus one downturn; no sequence-of-returns or Monte Carlo analysis.
- Unfunded shortfalls carry no interest (understates borrowing cost).
- Cost defaults (rent, pets, trips, children) are market estimates or placeholders.

**Research**
- No primary youth research; behavioural claims are from published surveys/dialogues or are hypotheses (doc 01).
- Some official PDFs couldn't be machine-read; several figures are via secondary reports quoting official sources — reconfirm before launch (marked "secondary").

**Product**
- English only; no dark mode; not yet audited with assistive technology.
- No analytics (by design for the prototype) — success can't yet be measured.
- No shareable summary (deliberately, pending a privacy review).

## Before production (must-do)
1. Re-verify every "secondary" figure against CPF/IRAS/MoneySense/HDB primary pages; have CPF Board and MoneySense review the copy.
2. Set a review calendar: CPF rates & ceilings (1 Jan), CPF interest (quarterly), tax (after Budget), inflation and cost defaults (6-monthly).
3. Legal/compliance review of disclaimers (MAS Financial Advisers Act boundaries).
4. Accessibility audit (WCAG 2.2 AA) with screen readers and real users.

## Youth research & usability testing plan (small, 4–6 weeks)

**Goals:** validate H1–H8 (doc 01), the 5–10 minute completion target, comprehension of one trade-off, and trust.

| Round | Method | Participants | What we learn |
|---|---|---|---|
| 1. Concept & copy (wk 1–2) | 45-min moderated sessions, think-aloud on the prototype | 8–10 youths aged 20–24: 2 uni, 2 poly, 2 ITE, 1–2 NSF, 1–2 gig/between jobs; mix of living arrangements; include those with family obligations | Relevance, tone, judgement-free feel, where people get stuck, which chapters resonate |
| 2. Comprehension (wk 3) | Unmoderated remote test (mobile), pre/post questions | 30–40 youths recruited via youth networks and community partners | Can they explain gross vs take-home? Name one trade-off? Completion time & drop-off by stage |
| 3. Accessibility (wk 3–4) | Assistive-tech sessions | 3–4 youths who use screen readers/magnification | Barriers; chart/table usefulness |
| 4. Return motivation (wk 4–6) | Diary or 2-week revisit prompt | 10 from round 2 | Would they return? What would bring them back? |

**Success measures:** ≥ 80% complete in ≤ 10 min; ≥ 70% correctly describe one trade-off from their story; ≥ 70% can state one next action; ≤ 10% report feeling judged; SUS ≥ 75.

**Ethics:** informed consent, no real financial data required, fictional mode encouraged, participants can skip any question, data stored anonymously and deleted after analysis.

## Recommended next iterations (Priority 3)
Broader 25–35 chapter library (BTO with partner, caregiving, parenthood) · CPF LIFE payout estimation via CPF's published method · HDB affordability with grants and loan limits · monthly (not annual) CPF interest · bonus/AW handling · Monte Carlo ranges · optional anonymous analytics with consent · localisation (Chinese, Malay, Tamil) · dark mode.
