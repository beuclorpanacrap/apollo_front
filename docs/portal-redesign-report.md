# Apollo clinician portal — redesign report

## 0. Read this first

1. **The first prompt (#1–#25) was not attached** — only the addendum (#26–#44, Parts A–D) and the "real goal" PS. I rebuilt #1–#25 from the addendum's cross-references and from auditing the code: dedicated vault view after unlock (#13), record cards/tabs/pagination (#14–15), header/nav/avatar menu/sign-out confirm (#16–17), clinician entry + native notice (#19–20), profile page with legal/role/appearance (#21–22), add-record dialog (#23), session timer/expiry (#24), responsiveness and the 1120px column (#11, #25). **If #1–#10, #12 or #18 contained something I could not infer, it is not done.** Please diff against your copy of that prompt.
2. **No network in my sandbox**, so I could not `npm install`, run `expo export`, or run the real `tsc`. Verification was done in Chromium against a purpose-built react-native-web *look-alike* (see §6). Treat the results as strong evidence, not as a replacement for a real build.

## 1. Status, #26–#44

| # | Status | Note |
|---|---|---|
| 26 | Fixed | `Button` (focus ring, hover, loading keeps label + min-width, `portal` 14px/44px, `dangerText`/`accentText`), `Badge size="md"`, `DetailRow labelColor`, `EmptyState` props, `Pagination variant="portal"` (windowing, ≥36px, nav role, `aria-current`), `Card` role + focus/hover. New: `TabPills`, `Dialog`, `FormField/TextField/TextArea/SelectField/DateField/RadioCards`, `Toast`/`InlineAlert`, `StatTile`, `Skeleton`, `Sparkline`, `Enter`. Defaults for patient screens unchanged except the changes the item itself asks for (loading label, role/focus/hover on web). |
| 27 | Fixed | `context/clinician-vault-context.tsx`: immutable `addRecord`, `close()`, `recentIds`, expiry timer + `visibilitychange`. One additive export `setActiveVault` in `doctor.api.ts`. |
| 28 | Fixed | Own `Dialog`. RNW's `Modal` evaluated and not used: it traps focus and handles Escape, but has no scroll lock, no labelled/described wiring, no caller-chosen initial focus, no exit transition/reduced-motion handling, no bottom-sheet layout — I would have re-implemented those on top of it. |
| 29 | Fixed | Registration and Profile migrated. (`sign-in.tsx` is a patient-app screen with its own styling; only copy/labels changed there.) |
| 30 | Fixed | `InlineAlert` + `Toast` (5s, pausable, dismissible). |
| 31 | Partially | `+html.tsx`, `+not-found.tsx`, `ErrorBoundary` exports on the three portal routes. Not exercised in a real Expo static export. RouteGuard lets `+not-found` through (assumes that is the segment name Expo Router reports). |
| 32 | **Not done (risk reported)** | `@import` of Google Fonts is **kept**: I cannot verify that bundled TTFs resolve under `--font-body`/`--font-display` without a real export. Branded first paint is done (`+html.tsx` + root layout). Privacy/GDPR note stands: every clinician's IP goes to Google. |
| 33 | Fixed | Skeleton while auth loads; "Still working…" after 8s; Cancel; late response ignored (`requestId` guard + `clearActiveVault`). |
| 34 | Fixed | Both focus bugs, group semantics, `one-time-code`, Enter submits, `readOnly` not `disabled`, `borderStrong`, fits 360px. Decision: **no auto-submit** on the 6th digit. |
| 35 | Fixed | Focus → patient `<h1>` after unlock, → first PIN box after close; no PHI in title/URL/storage/console. |
| 36 | Fixed | No truncation (+ "Show more" only when it overflows), attribution, source badges, Active/Fulfilled/Cancelled + derived Expired, lab groups + sparkline + text alternative + mixed-unit guard, encounter link, search > 8, deterministic sort, date-only age parsing, readable enums. |
| 37 | Fixed | Inline errors, dirty-form guard, double-submit guard, comma decimals, ISO guard, patient name in header, no `chiefComplaint`/`conditionsToAdd`/`encounterId`. **`maxLength` 255 / 2000 are my assumptions** (backend limits unknown). |
| 38 | Fixed | Countdown from `Date.parse(...) - Date.now()`, minute/second cadence, threshold-only live region, wake re-check, expiry dialog. Screen-reader output itself not tested. |
| 39 | Fixed | Skip link, landmarks, `aria-current`, keyboard menu, role badge, collapse < 900px. Browser Back tested (Dashboard → Profile → Back returns once). |
| 40 | Fixed | Counter near 160, Saved state, visible reasons, "Demo only" card with per-role capabilities, vault expiry in Session card. |
| 41 | Fixed | Clinician sign-in variant + "Patient? Sign in from the main page."; allow-listed `?next=` return path (touches RouteGuard and sign-in — see §3); native notice rewritten (untested on a device). |
| 42 | Fixed | Motion spec in `theme.ts` (120/200/280, one easing); everything instant under reduced motion (verified via computed styles). |
| 43 | Fixed | 7 widths × 5 pages: no horizontal overflow; PIN fits 360px; stats 2-col; dialogs become sheets; 200% zoom approximated by a 640px viewport. |
| 44 | Fixed | `clinician-icon.tsx` deleted; no `<style>` strings, no `any`, no `console.*`, no raw hex in portal files. |

## 2. Part A corrections

A1 → #26. A2 → one additive export (`setActiveVault`). A3 → `content/legal.ts` + `ui/policy-modal.tsx`; `settings.tsx` imports them (markup and styles copied 1:1; **not rendered by me**); wording untouched. A4 → `borderStrong` on every control boundary. A5 → hero text is solid `heroText` (4.91–6.29:1), not the 0.8-alpha greeting. A6 → new `EncounterCard`/`PrescriptionCard`/`LabGroupCard`/`ConditionCard`; `TabPills` shared. A7 → route modules differ from the original by `+not-found.tsx` only (`+html.tsx` is not a route): expect **28**. A8 → timeout/scrollIntoView choreography removed. A9 → dirty guard. A10 → styled `alertdialog`, `confirmAsync` untouched.

## 3. Files touched outside the portal

`constants/theme.ts` (tokens + helpers; no existing value changed) · `global.css` (portal layer appended) · `components/ui/{button,badge,card,detail-row,empty-state,pagination}.tsx` (additive) · `hooks/use-theme.ts` (+`useIsDark`) · `components/app-mark.tsx` (unique clipPath id — duplicate DOM ids when two marks share a page; rendering identical) · `app/settings.tsx` (legal extraction) · `app/_layout.tsx` (provider; frameless portal routes; boot shell; **RouteGuard: `+not-found` pass-through and validated `?next=` after clinician sign-in**) · `app/welcome.tsx` (clinician link → clinician sign-in on web; link colour `textTertiary` 2.56:1 → `textMuted`) · `app/sign-in.tsx` (clinician variant, accessible names, `autoComplete`, Enter-to-submit, `next` honored) · `api/doctor.api.ts` (+`setActiveVault`) · `utils/doctor-registration-link.ts` (+`getClinicianWorkspaceUrl`; shared base-URL helper, same behavior) · `declarations.d.ts` (`react-dom` `createPortal` typing — `@types/react-dom` is not a dependency) · new: `+html.tsx`, `+not-found.tsx`, `content/`, `components/portal/*`.

## 4. Verified (Chromium harness, real app code, mocked API)

* 90 behavioral checks pass (PIN paste/Backspace/arrows/Enter/no-auto-submit; wrong-PIN refocus; focus trap + restore; Escape; scroll lock; validation; request bodies; toast; highlight; Back/forward with vault open; dirty guard; sign-out dialog; 8s hint, Cancel, late response; 401/403; expiry dialog; pharmacist; role update; legal dialog; deep-link return path).
* Audit over 22 page-states (light + dark): 0 text-contrast failures (gradient worst-case included), 0 unnamed controls, 0 unlabeled fields, 0 broken ARIA references, 0 duplicate ids, one `<h1>` + `<main>` per page, `lang`/title present. Note: this is a **custom** check, not axe-core.
* Formatting helpers: 21 unit tests × 3 time zones (UTC, Los Angeles, Auckland).
* Syntax of all 107 `.ts/.tsx` files parsed. Stubbed `tsc` (real generated API types and project types; React/RN/Expo typed `any`) found 3 minor issues in my code, now fixed.

Contrast of the new tokens (✓ = passes; the three ✗ are surfaces the Appendix does not claim and the UI never uses: `placeholder` on `pillGreenBg` 4.34 / on dark selected 3.70, dark `dangerText` on dark selected 3.90):
`textMuted` 5.92 / 5.48 / 5.02 light, 6.01 / 7.41 / 4.72 dark · `accentText` 6.29 / 5.83 / 5.33 light, 6.51 / 8.02 / 5.11 dark · `dangerText` 6.43 / 5.95 light, 4.96 / 6.12 dark · `borderStrong` 3.60 / 3.33 light, 3.52 / 4.33 dark · `focusRing` 5.13 / 4.75 light, 6.51 / 8.02 dark · hero text 4.91–6.29 light, 6.09–7.28 dark · hero chips 6.91 / 8.83.

## 5. Optional backlog (Part D) — mostly NOT done

Done: **timeline as a fifth tab**; **illustrated locked state** (Ionicons + token colors). **Not done:** keyboard shortcuts popover, print/"Save as PDF" summary, density toggle, illustrated empty states beyond the generic icon bubble. I ran out of time, not because they conflict with anything.

## 6. Could NOT verify

1. **A real Expo / react-native-web build.** The harness' `react-native` shim is mine, written from memory of RNW (flex-column Views, `role` → element mapping, nested-`Text` inheritance, `Pressable` hovered/focused state). If RNW differs, some visuals or semantics could differ. Highest-risk assumptions: `Pressable` style callback gets `{hovered, focused}`; `role="navigation|banner|main|heading"` renders landmarks/headings; `id` and `aria-*` forwarding; `outline*`/`boxShadow`/`gridTemplateColumns` style pass-through; `ScrollView scrollEnabled`.
2. **The real `tsc`.** Web-only props go through `webProps()`/`webStyle()`; any prop RN 0.86's types do not declare would still surface as an error on your machine.
3. axe-core, NVDA/VoiceOver, real devices, native screens (`DoctorWebOnly`, `welcome`, `sign-in` on native), `settings.tsx` rendering, Slow-3G throttling (I injected latency in the page instead).
4. Fonts: Inter is not installed in my sandbox; screenshots use a *wider* fallback (conservative for overflow). Poppins ExtraBold rendered as Bold.

## 7. Open questions

From Part D: (1) clinician-specific legal text and who owns it · (2) idle auto-lock · (3) auth token in `localStorage` · (4) `chiefComplaint`, `conditionsToAdd`, `encounterId`, cancel-prescription PATCH · (5) production hosting vs free-tier cold starts · (6) "Valid until" default and lab-unit list · (7) committed `.env`.
New: (8) please send the first prompt (#1–#25) · (9) real backend length limits (I used 255/2000) · (10) is "No allergies recorded. Absence of a record isn't confirmation. Ask the patient before prescribing." the wording clinicians want · (11) should "Expired" also show for non-ACTIVE prescriptions (I show it only for ACTIVE) · (12) OK to keep Google Fonts until the self-hosting path is verified?
