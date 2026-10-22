# 4. Design system and interface direction

**Feeling:** youthful not childish · aspirational but grounded · playful but credible · personal not intrusive.
**Direction:** deep indigo, vivid royal blue and magenta-pink on cool, clean neutrals, with a bold sans-serif for headings. Original palette and plain-text wordmark; no third-party logos, illustrations or assets.

## Tokens (`tailwind.config.js`, `src/index.css`)

| Token | Value | Use |
|---|---|---|
| `ink` / `ink-soft` / `ink-mute` | #17123D / #3D3A63 / #5E5C7A | Text (all ≥ 4.5:1 on white and `mist-50`) |
| `navy-800` | #1E1660 deep indigo | Primary buttons, Future Vision card, selected states |
| `navy-600` | #1A56E5 royal blue | Slider fill, focus accents, chart baseline |
| `navy-50/100` | #EEF2FF / #DCE4FD | Tints, "explore" status |
| `magenta-500/600/700` | #E6187F / #C8106C / #A00C57 | Accent, current progress step, eyebrows (600+ for text) |
| `blush-50/100` | #FFF5FA / #FDE7F1 | Reflection & highlight panels |
| `mist-50…300` | #F6F7FC → #CDD3E3 | Page background, borders, stat tiles |
| `sage-100/700`, `amber-100/700` | — | Reserved status colours (on track / adjust), always paired with icon + text |

Focus ring: 3px `#C8106C` outline, 2px offset (`:focus-visible`).

**Type:** Plus Jakarta Sans (400–800). Headings are `.display` = extra-bold, −0.02em tracking. Body 15–17px; tabular numerals for money.

**Shape & depth:** cards `rounded-3xl`, 1px `mist-200` border, soft indigo-tinted shadow. Pills for chips and status.

**Motion:** 350ms `rise` entrance on screen headers only; all motion disabled under `prefers-reduced-motion`.

## Components (`src/components/ui.tsx`)
`Button` (primary/accent/secondary/ghost, ≥44px), `Card`, `Screen` (mobile `max-w-xl`, results `max-w-3xl`), `StageIntro`, sticky `ActionBar` (thumb-reachable), `Slider` (native range + `<output>`, `aria-valuetext`), `NumberField`, `TextField`, `OptionGroup` (radio group as large cards), `Segmented` (radiogroup), `StatusBadge`/`StatusDot` (icon + text, never colour alone), `Stat`, `Disclosure` (`<details>`), `Note`, `Avatar` (abstract gradient + icon; no mascots).

## Charts
- One chart type: lines over age for three scenarios. Palette validated with the dataviz validator (light surface): `#2E9A6B` favourable, `#1A56E5` baseline, `#D8137A` challenging — all checks pass (lightness band, chroma, CVD ΔE ≥ 9.5, contrast ≥ 3:1). Lines also differ by dash pattern; legend always shown.
- Today's $ / Future $ toggle; zero line; tooltip; "View as a table" alternative for screen readers.
- Recharts is lazy-loaded so first paint stays light.

## Accessibility (WCAG 2.2 AA intent)
- Skip link; focus moves to each new screen's `h1`; `aria-current` on progress and chapter timeline.
- All controls keyboard-operable; native inputs; radio/checkbox semantics; `aria-pressed` on toggles.
- Target size ≥ 44×44 for primary controls.
- Status conveyed by text + icon; chart has a data table; decorative icons `aria-hidden`.
- Reduced-motion respected. No time limits. Language `en-SG`.
- **Not yet done:** formal audit with assistive tech (VoiceOver/TalkBack/NVDA), dark mode, high-contrast/forced-colours testing, translation.

## Copy principles
Conversational, second person, no shame words ("bad", "irresponsible"); statuses are constructive ("Explore alternative pathways"); every number labelled as today's or future dollars; uncertainty stated plainly.
