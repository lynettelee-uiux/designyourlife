# 1. Research summary

_Research conducted 22 Oct 2026 using live web search and official-source fetches. Where a source could not be fetched directly, that is stated. Nothing here comes from interviews or usability sessions — **no primary youth research was conducted for this prototype.**_

Status key — **Verified**: confirmed against an official source for the stated period. **Secondary**: reported by a reputable secondary source; confirm before production. **Illustrative**: a design value, not a fact. **Hypothesis**: an untested belief about youth behaviour.

---

## A. Singapore financial context

| # | Topic | Figure / rule used | Source & date | Applies to | Status | Next review |
|---|---|---|---|---|---|---|
| 1 | CPF contribution rates (wages > $750) | ≤55: employer 17%, employee 20% (37%). 55–60: 16/18 (2026) → 16.5/19 (2027). 60–65: 12.5/12.5 → 13/13. 65–70: 9/7.5. >70: 7.5/5 | [CPF Board — contribution rate changes](https://www.cpf.gov.sg/conrate2023); secondary confirmation of 2026 table | SC & SPR (3rd yr+), private sector | Verified (2027 table fetched directly; 2026 table via multiple secondary sources quoting CPF) | 1 Jan 2027 |
| 1 | Wage bands $50–$750 | ≤$50 nil; $50–$500 employer only; $500–$750 employee = 3 × rate × (wage − 500) | CPF published method (implemented as CPF describes; exact PDF table not re-fetched) | As above | Secondary — reconfirm against CPF rate tables | 1 Jan 2027 |
| 1 | Ordinary Wage ceiling | $8,000/month from 1 Jan 2026; annual salary ceiling $102,000 | CPF Board; employer guides | All CPF employees | Verified | 1 Jan 2027 |
| 2 | Gross vs take-home | Take-home = gross − employee CPF. Employer CPF is on top of gross. | CPF Board | Employees | Verified | — |
| 3 | Allocation (age ≤35) | OA 0.6217 / SA 0.1621 / MA 0.2162 of total contribution (MA, then SA computed; OA = remainder). Bands to 55 implemented. | [CPF Allocation Rates from 1 Jan 2026 (PDF)](https://www.cpf.gov.sg/service/sfc/servlet.shepherd/document/download/069IW000005qFrJYAU) — text extracted from the PDF | Private-sector employees ≤55 | Verified | 1 Jan 2027 |
| 3 | CPF interest | OA 2.5%; SA/MA/RA 4%; +1% on first $60k combined (OA capped $20k) below 55; extra on OA goes to SA | [CPF interest rates, Q4 2026](https://www.cpf.gov.sg/interestrate); [4% floor extended to 31 Dec 2027](https://www.cpf.gov.sg/member/infohub/news/news-releases/government-extends-4-per-cent-interest-rate-floor-on-special-medisave-and-retirement-account-monies-until-31-december-2027) (22 Sep 2026) | Members <55 | Verified | Quarterly |
| 3 | Basic Healthcare Sum | $79,000 (below 65) for 2026; excess MA contributions flow to other accounts | [CPF/MOH release, 15 Dec 2025](https://www.cpf.gov.sg/member/infohub/news/news-releases/cpf-interest-rates-from-1-january-to-31-march-2026-and-basic-healthcare-sum-for-2026) | Members <65 | Verified | 1 Jan 2027 |
| 3 | Special Account closure at 55 | From 2025, SA closed at 55; contributions for 55+ go to RA | CPF allocation PDF footnote | 55+ | Verified — **not modelled** (projection stops CPF at 55) | — |
| 4 | CPF for housing | OA can be used for HDB down payment / loan subject to rules | CPF Board / HDB | SC/PR | Existing loans: user-entered monthly OA deduction is modelled; purchase rules, accrued interest and limits are not | — |
| 5 | Retirement sums & payouts | Cohort turning 55 in 2026: BRS $110,200 / FRS $220,400 / ERS $440,800; est. CPF LIFE payouts $950 / $1,780 / $3,440 from 65; payout eligibility age stays 65 | [CPF retirement sum](https://www.cpf.gov.sg/member/infohub/educational-resources/what-is-the-cpf-retirement-sum); [payout age FAQ](https://www.cpf.gov.sg/service/article/is-payout-eligibility-age-linked-to-retirement-or-reemployment-ages) | SC/PR | Verified | 1 Jan 2027 |
| 5 | Retirement-sum growth | +3.5%/yr — matches 2023→2026 steps (e.g. BRS $106,500 → $110,200) | Derived | — | Illustrative for future years | Annually |
| 6 | Resident income tax | 0% first $20k … 24% above $1m (13 bands, YA2024+) | IRAS individual tax rates (via multiple secondary sources quoting IRAS; IRAS page not fetched directly) | Tax residents | Secondary → reconfirm with IRAS | Budget 2027 |
| 6 | Reliefs | Earned Income Relief $1,000 (<55); CPF relief on compulsory employee contributions; $80k relief cap | IRAS | Tax residents | Secondary | Budget 2027 |
| 7 | MoneySense / MAS planning | Emergency fund 3–6 months of expenses; ~12 months if income irregular | MoneySense Basic Financial Planning Guide (as summarised in search results; the PDF link returned 404 when fetched) | General | Secondary | Annually |
| 8 | Save before investing / insurance | Panellists advised saving before investing or buying insurance; MediShield Life provides coverage in early working years; don't borrow to invest | [NYC National Youth Dialogue notes, 24 Apr 2026](https://isomer-user-content.by.gov.sg/139/bdcd81fa-41b2-4a6e-8cac-786bb758205c/Session%20Notes%20NYD%20FinLit%202026_without%20speaker%20attribution.pdf) (read in full) | Youth | Verified (as a record of panel views, not policy) | — |
| 9 | Inflation | 2025 core 0.7%, headline 0.9%; MAS 2026 forecast 1–2%; 20-yr headline average ≈2.14% (2005–2025) | [MTI Dec 2025 CPI](https://www.mti.gov.sg/newsroom/consumer-price-developments-in-december-2025); MAS Jan 2026 MPS (via media); SingStat series via secondary analysis | Economy | Verified / Secondary | 6-monthly |
| 10 | Student loans | MOE Tuition Fee Loan: interest-free while studying, then 3M SORA + 1.5pp; up to 20 yrs (uni). **Replaced by Higher Education Student Loan from 29 Jul 2026** | [MOE](https://www.moe.gov.sg/financial-matters/government-loan-schemes/tuition-fee-loan) and institution pages | SC/PR students | Secondary; the new scheme's terms were **not researched** — prototype uses an illustrative $250/month for 10 years | Before production |
| 11 | Public housing | BTO income ceiling $16,000 (families) / $8,000 (singles 35+) from 24 Aug 2026; singles eligible from 35 | NDR 2026 media reports | SC applicants | Secondary — confirm on HDB Flat Portal. Prototype describes eligibility; doesn't model it | Before production |
| 12 | Insurance | MediShield Life covers all SC/PR (basic). Premiums, exclusions & protection gaps **not quantified** | General knowledge + NYD notes | SC/PR | Described only | — |
| 13 | Career breaks / irregular income | No CPF without salary; self-employed must contribute MediSave if NTI > $6,000 | CPF | — | Secondary; MediSave rule not modelled | — |
| 14 | Scams | 2025: 37,308 scam cases, S$913.1m lost; investment & impersonation scams costliest; 85.2% of victims under 65 | [SPF Annual Scams & Cybercrime Brief 2025](https://www.police.gov.sg/-/media/SPF/Media-Room/Statistics/Annual-Scams-and-Cybercrime-Brief-2025-Infographic/Infographic-for-ASCB-2025.pdf) (via media summaries) | — | Secondary-of-official | Feb 2027 |
| 15 | Starting incomes | Uni median $4,500 (2025 JAUGES, FT perm); Poly $3,000 (2025); ITE ~$2,000–$2,490 (2023 cohort — older data); NSF REC/PTE $790 (from 1 Jul 2025) | MOE/universities; polytechnics; ITE; MINDEF | Graduates / NSFs | Secondary-of-official; ITE data dated | Q1 2027 |
| 15 | Cost of living | HDB common room ~$800–$1,600/mo (listings, mid-2026); dog basics ~$560–$2,600/yr | Cove, MoneyBees, DBS, TheSmartLocal | — | Estimated (market data) | 6-monthly |

### What we did **not** model (deliberately)
CPF after 55 (RA formation, CPF LIFE payout calculation), CPF housing withdrawals and accrued interest, PR graduated rates (years 1–2), Platform Workers Act CPF, self-employed MediSave, bonuses/Additional Wages, non-resident tax, HDB loans/grants/eligibility, insurance pricing, the new Higher Education Student Loan. Each is either labelled in the UI or replaced by an editable, illustrative placeholder.

---

## B. Youth behaviour and motivations

### Verified findings (from sources read)
- **Low confidence despite activity.** NYC survey of 500 youths (4Q2022): ~7 in 10 were investing, ~6 in 10 saved >20% of salary, yet only ~2 in 10 felt on track for long-term goals; nearly half found it hard to stick to a budget, citing essential costs and unplanned purchases. Lack of knowledge was the top reason for not investing; 3 in 5 wanted a one-stop source of information. ([NYC, 3 Mar 2023](https://www.nyc.gov.sg/-/media/images/nyc/newsroom/media-releases/2023/low-confidence-in-meeting-long-term-financial-goals-despite-high-investment-activity-amongst-youths.pdf))
- **Top financial aspirations** in that survey: meeting basic needs for self/family, and being prepared for emergencies. Youths with families and those 30–34 struggled most to maintain plans; women and non-graduates more often intended to start a plan but cited lack of income, skills and guidance.
- **Cost of living pressure.** NYC (Nov 2022 survey): ~70% of youths cutting back on non-essential spending; cost of daily essentials the main driver. (Media-release headline and search summary; PDF not machine-readable.)
- **2026 youth dialogue themes** (139 youths, NYC with MoneySense & CPF): anxiety about AI and job security, obsolete skills, regional competition; supporting ageing family members; influencer "get-rich" content and social-media wealth signalling; wanting planning tools for first job, first tax filing and becoming a caregiver. ([NYD notes](https://isomer-user-content.by.gov.sg/139/bdcd81fa-41b2-4a6e-8cac-786bb758205c/Session%20Notes%20NYD%20FinLit%202026_without%20speaker%20attribution.pdf))
- **Aspirational retirement.** OCBC Financial Wellness Index (industry survey, 2022 highlights): people in their 20s more often chose the most luxurious retirement lifestyle (~S$6,000/month) while worrying they can't afford housing and retirement; 2 in 5 young investors still planned crypto after the 2022 crash. _(Industry, not official.)_
- **Scams** disproportionately affect people under 65 (SPF 2025).

### Hypotheses (untested — to validate with youths)
- H1. Starting from aspirations ("what you want") is more motivating than starting from rules ("what you should know").
- H2. A choose-your-own-story format with computed consequences holds attention for 5–10 minutes better than a quiz or calculator alone.
- H3. Youths find moralising language ("bad spender", "irresponsible") off-putting; neutral trade-off language is preferred.
- H4. Seeing the *interaction* between decisions (pet → career-break runway; renting → delayed goals) produces the strongest "aha".
- H5. Gross-vs-take-home and employer CPF are common blind spots among first-jobbers.
- H6. Social and family obligations (dinners, group trips, household contributions) are the most relatable trade-offs at 20–24.
- H7. Shareable, non-financial "Future Vision" summaries could drive return visits — **deliberately not built** (no sharing of financial profiles by default).
- H8. Mixed-status groups (ITE, NSF, gig) feel excluded by university-to-corporate defaults — hence per-status defaults.

### What would make someone spend 5–10 minutes / return (hypotheses)
Personal relevance in the first 30 seconds; one decision per screen; immediate numeric feedback; replay without penalty; a concrete tool at the end; ability to "try another version".

---

## C. Digital experience benchmarking

_Note: this is a pattern review from general product knowledge; no proprietary analytics or design files were accessed, and no branding or assets were copied._

| Reference | What works | Applied as |
|---|---|---|
| Duolingo | Bite-sized steps, instant feedback, visible progress | One question per screen; 6-segment progress; immediate consequence panel |
| Spotify Wrapped | Personal storytelling, "your" framing | "Future Vision" card; personalised outlook headline |
| Pinterest | Aspirational browsing, visual selection | Aspiration card grid with multi-select |
| Airbnb | Calm, high-quality, trustworthy UI | Rounded cards, generous spacing, restrained colour |
| Choice-based games | Branching, replay, consequences | Life chapters with replay + timeline |
| Singapore government digital services | Clean, accessible, credible; plain language | Clean card layout, plain-language copy; a restrained blue + pink palette on cool neutrals |

Patterns adopted: clear hierarchy, mobile-first cards, progressive disclosure (`details` for methods/sources), subtle motion (disabled under reduced-motion), meaningful progress, conversational microcopy, 44px+ touch targets, personalised results, minimal cognitive load.

---

## Research limitations
- No primary research with youths; all behavioural statements above are from published surveys/dialogue notes or are hypotheses.
- Several official PDFs (IRAS tables, MoneySense guide, two NYC releases) could not be machine-read or returned errors; figures were taken from reputable secondary reports quoting them and are marked "secondary".
- Market-rate data (rent, pets, trips) is listing-based and volatile.
