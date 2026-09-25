# Merge notes: Apollo Front 4 (Vault) → main (Settings)

This branch (`merged-result`) is `main` with the Apollo Front 4 vault rebuild
merged in. Written up here so you can review the actual decisions instead of
just trusting a diff.

## How it was done

Both uploads turned out to still have usable git history:
- `apollo_front_4` had a local `.git` with one squashed commit ("The Vault
  Update"), but its `origin` remote (`github.com/beuclorpanacrap/apollo_front`)
  had the real history for `main`, `ux-fixes`, and `BigdansBranch`.
- Comparing the vault snapshot against every commit on `main` found the real
  fork point: **`3893355` — "Bug fixes after last merge"**. Apollo 4 branched
  off there, before the settings screen, theme engine, and date-picker work
  landed on `main`.
- The vault snapshot was re-parented onto that commit (`git commit-tree`) so
  git could run an actual 3-way merge against `main`'s tip (`611ffe4`)
  instead of a blind file-diff-and-copy.

That merge auto-resolved cleanly for the large majority of the codebase.
**6 files had real conflicts**, resolved as follows:

| File | Resolution |
|---|---|
| `src/constants/theme.ts` | Kept main's rebranded palette (`forestGreen`/`headerGreen`/`darkCharcoal`/dark mode) *and* added apollo4's new vault entry-type colors (`marigold`/`clay`/`plum`/`coral`/`honey`, light **and** dark variants). Extended the `AppTheme` interface with the new pill-color fields — apollo4 never declared an interface, so it was missing them. |
| `src/hooks/use-theme.ts` | Took main's real `useThemeContext()`-backed hook (needed for Settings' theme switching) over apollo4's older "pin everything to light" workaround. |
| `src/app/_layout.tsx` | Combined provider trees: `AppThemeProvider > AuthProvider > VaultProvider > (navigation)`. `VaultProvider` has to sit inside `AuthProvider` because `vault-context.tsx` calls `useAuth()` internally. |
| `src/app/(tabs)/index.tsx` | Kept apollo4's `useVault()`-driven recent-activity timeline (supersedes main's simpler placeholder) with main's dark-mode-aware styling. |
| `src/app/(tabs)/vault.tsx` | Same approach — apollo4's full rebuild (search, sort, pagination, grouped conditions) with main's reactive theme wired in. Main's own vault.tsx was a rough placeholder (literally had a "TODO: flesh out UI" chart stub) and is fully superseded. |
| `src/app/sign-in.tsx` | Purely cosmetic (logo margin: 24 vs 12). Kept apollo4's tighter value; it was a deliberate tweak, main's side only reformatted quotes. |

## Bugs caught in the process (fixed, not just merged around)

1. **Closure-scope breakage in `index.tsx` and `vault.tsx`.** Main's dark-mode
   work moved `theme`/`styles` from module-level constants into values
   created *inside* the screen component (so they can react to the theme
   context). But `EncounterTimelineCard` (in `index.tsx`) and
   `ConditionGroupSection` (in `vault.tsx`) are sibling functions declared
   outside those components — they were still referencing `theme`/`styles`
   as if those were module-level, which would have been a runtime crash
   (`ReferenceError`) the moment either component rendered. Fixed by passing
   `theme`/`styles` down as props. This wouldn't show up as a merge conflict
   since neither side's diff "looks wrong" in isolation — only caught by
   actually installing dependencies and running `tsc --noEmit`.
2. **Pre-existing bug in `condition-search.tsx`** (apollo4's own code, unrelated
   to the merge): `conditions.filter(...).map(conditionToDisplayEntry)` passes
   the function directly to `.map()`, which calls it with `(value, index)` —
   so the array index was silently landing in `conditionToDisplayEntry`'s
   optional `conditionStatus` parameter, corrupting the status on every
   result on that screen. Fixed to `.map((c) => conditionToDisplayEntry(c))`.

## Validation performed

- `npm install` — clean.
- `npx tsc --noEmit` — clean (both issues above were found and fixed this way).
- Full repo swept for leftover `<<<<<<`/`====`/`>>>>>>` markers — none.
- Regenerated Expo Router's typed-routes cache (`.expo/types/router.d.ts`),
  which had shipped from apollo4's pre-settings state and didn't know
  `/settings` existed — that's a gitignored local cache, not committed.

## Known follow-up (not fixed, worth knowing about)

Dark mode was wired into `vault.tsx`'s own chrome and `entry-card.tsx`, but
**not** into the standalone detail screens: `add-condition.tsx`,
`add-lab-result.tsx`, `add-prescription.tsx`, `condition-search.tsx`,
`view-condition.tsx`, `view-lab-result.tsx`, `view-prescription.tsx`. Those
still use a static light-only theme, exactly as apollo4 originally wrote
them. That's a self-consistent, intentional choice for this merge (not a
bug) — going further would mean restructuring how each of those seven files
gets its colors, which is real scope beyond reconciling the two branches.
They'll just stay light-themed even when the user picks Dark in Settings
until someone does that pass.

## Branches in this repo

- `merged-result` (checked out here) — the actual deliverable.
- `origin/main`, `origin/ux-fixes`, `origin/BigdansBranch`,
  `origin/beuclorpanacrap` — fetched remote history, kept for reference/diffing.
- The merge commit has two real parents (`611ffe4` on main, and the
  re-parented vault snapshot), so history stays intact if you want to push
  this up and inspect it later.
