---
target: discover
total_score: 22
p0_count: 1
p1_count: 3
timestamp: 2026-06-15T10-22-17Z
slug: web-src-pages-discover-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Shimmer skeletons are good; no Spotify connection nudge when score is flat |
| 2 | Match System / Real World | 3 | "Where next?" lands; "matched / other / total" is internal system language |
| 3 | User Control and Freedom | 3 | No nav traps; but no filtering, no way to dismiss or re-order cities |
| 4 | Consistency and Standards | 3 | Internally consistent; density bars in CSS but never rendered — dead code drift |
| 5 | Error Prevention | 3 | No user inputs to validate; error state shown; zero-score state silently confuses |
| 6 | Recognition Rather Than Recall | 2 | Score "6.2" has no legend; no reference for what constitutes a good score |
| 7 | Flexibility and Efficiency | 1 | No keyboard shortcuts; no filter; single rigid click path only |
| 8 | Aesthetic and Minimalist Design | 2 | Meta row: 4 data points where 2 suffice; invisible --text-dim elements add noise without information |
| 9 | Help Recognize / Diagnose / Recover | 2 | "Failed to load clusters" with no retry; zero-score state gives no guidance |
| 10 | Help and Documentation | 0 | Nothing. Score, affinity, matched count — none of it explained anywhere |
| **Total** | | **22/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment:** Partially. The rank numbers (01, 02…) are the numbered-section-marker anti-pattern applied to list items — they look deliberate but carry zero interaction affordance. The dot-separated meta row (matched · other · total) is the 2023-era data-card scaffold applied without interrogating which pieces serve the user. Dead CSS: density bars (`.density`, `.densityBar`) exist but nothing in Discover.tsx renders them.

What works against type: the 32px Syne 800 city name is bold and personality-forward — cities feel like destinations, not table cells. The h1 "Where next?" is brand-accurate.

**Deterministic scan:** Returned `[]` — no flagged patterns. Tells are structural/semantic, not syntactic.

**Visual overlays:** Not attempted (no browser automation available).

## Overall Impression

The bones are right. The question-as-heading, ranked city list, gold score — correct instincts. But the design speaks in two registers: "cultured insider recommendation" in the h1 and city name, then "system output dump" in the meta row. The invisible rank numbers and near-invisible event counts are noise without signal. Biggest opportunity: trust the score. Let it dominate. Kill redundant counts. Let city + score carry the card; reveal detail inside.

## What's Working

1. **"Where next?" heading** — frames the product as a decision tool, not a listing. Brand-accurate, immediately clear.
2. **32px Syne 800 city name** — creates the hierarchy anchor the rest of the card needs. Cities feel like real options to evaluate.
3. **Skeleton loading with shimmer** — mirrors actual card structure, no layout jump on load.

## Priority Issues

**[P0] `--text-dim: #2e2e2e` on `--bg: #0a0a0a` — ~1.4:1 contrast. Effectively invisible.**
- Affects: rank numbers (.rank), section date ranges (.sectionDates), country code badges (.countryCode), separator dots (.dot), "X other · Y total" counts (.eventCount), timing label (.timing).
- WCAG AA requires 4.5:1. 1.4:1 is a disability access failure on elements carrying real information.
- Fix: Replace --text-dim with a value hitting ≥4.5:1 (minimum: #767676 on #0a0a0a). Increase font sizes to ≥12px — 9px and 10px are below accessible minimums even at passing contrast.
- Suggested command: /impeccable audit

**[P1] Meta row is a four-column data dump where two columns would do.**
- "Wed 17 Jun – Tue 23 Jun · 3 matched · 43 other · 45 total" — matched + other = total is pure arithmetic. Three of four data points are redundant.
- Creates cognitive noise that fights the city name for attention.
- Fix: Show only date range + matched count. Drop "other" and "total" — they're derivable and add no signal.
- Suggested command: /impeccable distill

**[P1] Score "6.2" is decontextualised with no calibration.**
- Most prominent data point on the card. No indication of max value, no explanation of what constitutes a "good" score.
- A user who hasn't connected Spotify sees 0.1 everywhere and doesn't understand why.
- Fix: Replace the raw score with a qualitative signal ("3 artists you follow are playing") that communicates meaning without requiring float calibration.
- Suggested command: /impeccable clarify

**[P1] Rank numbers do nothing interactive but claim visual real estate.**
- 01, 02… padded mono at 10px in --text-dim. Zero function: no jump action, no sort affordance. Already ranked by position.
- Takes up a 44px grid column for invisible scaffolding.
- Fix: Remove them. Reclaim the 44px column for a density indicator, save action, or nothing.
- Suggested command: /impeccable distill

**[P2] Empty and error states are incomplete.**
- Error state has no retry button. Empty state gives no guidance. Zero-score state (Spotify not connected) gives no nudge.
- Fix: Add retry on error. Add "Connect Spotify" nudge when scores are flat baseline. Empty state should tell users what cities are covered.
- Suggested command: /impeccable onboard

## Persona Red Flags

**Jordan (First-Timer)**: Sees "Berlin 6.2 · 3 matched · 43 other · 45 total" — no context for any number. Clicks Berlin → BundleDetail with gold/grey day pills, no legend. What does grey mean? Likely bounces.

**Sam (Accessibility-Dependent)**: Focus ring visibility unknown (not set explicitly in CSS). Screen reader reads rank number "01" aloud even though sighted users literally cannot see it — inverse of the usual accessibility failure. Mono error/empty text is read as data, not prose.

**The Culturally Omnivorous Traveller (target user)**: "3 matched" for Berlin — are those a Berghain resident, a gallery opening, and a jazz set, or three jazz nights at the same venue? The card doesn't say. The format shows *that* something matched; never *what*. Experience is a data dashboard, not a trusted recommendation.

## Minor Observations

- `.density` / `.densityBar` CSS rules: non-trivial (7-bar sparkline) but nothing in Discover.tsx renders them. Delete or ship.
- `.card::before` accent stripe at `left: -28px` — only renders correctly if page has ≥28px left padding. Test at mobile.
- Subheading "Wed–Tue windows · ranked by your taste · 8 options" — "Wed–Tue windows" is system architecture, not user language. More personality possible: "8 weekends worth travelling for."
- `.error` and `.empty` use `var(--font-mono)` — category mistake. Error messages are prose, not data. Use body font.
- `timingLabel` returns "This week" in sentence case; CSS applies `text-transform: uppercase` → "THIS WEEK". Considers dropping uppercase on a contextual time reference.

## Questions to Consider

- What if the card said "3 artists you follow are playing" instead of "3 matched · 43 other · 45 total"?
- If Berlin scores 6.2, does that mean a weekend you'd regret missing, or just that 3 Spotify events showed up? The answer changes how prominently the score should dominate.
- What does this page look like if you've never connected Spotify — refuse to show scores, grey out cards with an onboarding CTA, or rank by density with a soft nudge?
