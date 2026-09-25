# Local bridge notes

What's local-only right now, and the mapping to use when the real endpoints
land. (Rewritten after the visit-bundling flow was replaced with independent
add-prescription / add-lab-result / add-condition flows.)

## What's local-only right now

| Feature | Where | Backend status |
|---|---|---|
| Prescriptions added via "Add prescription" | `LocalPrescription` | No patient-write endpoint yet |
| Lab results added via "Add test result" | `LocalLabResult` | No patient-write endpoint yet |

**Conditions are NOT local** — "Add condition" calls the real
`POST /api/v1/patient/vault/conditions` endpoint directly (`vaultApi.addCondition`).
That's the only patient-write endpoint that exists today, so conditions have
always gone straight to the backend.

Storage: `src/utils/local-records-store.ts`, using `expo-file-system`'s File
API (native) with a `storage.ts`-backed localStorage fallback on web. Two
independent JSON files (`apollo-local-prescriptions.json`,
`apollo-local-lab-results.json`) — no shared "visit" record anymore; each
prescription and each lab result is its own top-level thing, matching the
Vault's per-tab "Add X" buttons.

Not encrypted at rest — `storage.ts`/SecureStore is for the auth token
specifically; these are larger, growing lists that would risk SecureStore's
per-item size behavior, so they intentionally live elsewhere. Worth
encrypting before real users depend on this (a key in SecureStore used to
encrypt the JSON blobs, say) — flagging it since this whole layer is a
temporary bridge.

## No new dependencies

`expo-image-picker` was added in an earlier pass for photo attachments on a
"log a visit" flow that no longer exists (visits/diagnosis-notes/photos were
dropped when prescriptions/labs/conditions became independent, per-tab
things — see "What changed" below). It's been removed from `app.json` again;
nothing in this app depends on it now. `expo-file-system` and
`@expo/vector-icons` are the only things the local store needs, and both
were already dependencies.

## What changed from the original "visit" design, and why

The first pass bundled prescriptions, lab results, diagnosis notes, photos,
and a follow-up date into one "visit" you'd log from a single form, shown in
a dedicated Visits tab. That's gone:

- **Visits tab removed.** Prescriptions, Test Results, and Conditions are
  the three tabs again, each with its own "Add" button and its own simple
  form — no shared wrapper object.
- **Diagnosis notes, photos, and follow-up date were dropped**, since they
  had no independent home once "visit" stopped being a thing patients add
  as a single unit, and weren't asked for as their own separate feature. If
  you want a way to jot a note or attach a photo independently of a
  prescription or lab result, say where it should live and it's a
  straightforward add.
- **Doctor-authored encounters** (diagnosis + clinical notes from a
  consultation session, via `getTimeline()`'s `encounters` field) are still
  fetched into `VaultContext` but aren't shown anywhere in the UI right now
  — they lost their display slot along with the Visits tab. Their
  prescriptions and test results still show up fine in those tabs
  independently (those were always separate calls). If you want encounter
  notes visible again, they need a new home — Home, their own small
  section, wherever makes sense — since Visits isn't coming back as a
  bundle.

## Field mapping, for when the backend catches up

- **`LocalPrescription.frequency`** — `PrescriptionResponse` has
  `medicationName` / `dosage` / `instructions`, no separate `frequency`
  field. Carried as an extra local-only field for now; fold it into
  `instructions` at submit time, or ask for a real `frequency` column.
- **`LocalLabResult.referenceRange`** — `LabTestResultResponse` has no
  reference-range concept today. Same story.
- **`LocalLabResult` freeform mode** — the backend's `numericValue` is a
  plain number; freeform text results have nowhere to go in the current
  schema.

## One correction, still relevant

`GET /api/v1/patient/vault/timeline`'s `encounters` field is typed as
`ClinicalEncounterSummaryDto` (`id`, `doctorId`, `doctorName`,
`doctorSpecialty`, `encounterDate`, `diagnosis`, `clinicalNotes`,
`createdAt`) — not `ClinicalEncounterResponse` (a separate, fuller schema
with `chiefComplaint` / `conditionsAdded` that isn't what this endpoint
returns). Both live in `src/api/types.ts`.
