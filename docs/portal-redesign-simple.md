# Apollo Clinician Portal: what was built

## In one sentence

A redesigned website for doctors. A doctor signs in, types the 6-digit PIN a patient gives them, sees that patient's health record, adds notes, prescriptions and lab results, and signs out. It looks and feels like the Apollo patient app (same green and cream colours, same fonts), but it is laid out as a roomy desktop workspace.

## What a doctor sees, screen by screen

**1. Create account / Sign in.** Clinicians have their own entry. The sign-in page speaks to doctors ("Welcome back to your clinical workspace"). If a patient lands there by mistake, there is a link to the normal sign-in. If a signed-out doctor opens a link like `/doctor-profile`, they sign in and land back on that page.

**2. Dashboard, locked.** A green header greets the doctor by name and shows their role and specialty. Below it is the main task: a card with six PIN boxes and an "Unlock patient vault" button. Beside it, a three-step "How it works" guide (get a PIN, review the record, document care).

**3. Patient vault, unlocked.** This is a dashboard, not just a list:
- A header with the patient's name, age and sex, and a **countdown** showing how long access lasts ("23 h 41 min left, expires tomorrow at 10:42").
- **Overview tiles:** blood type, height, weight, date of birth.
- **Safety information:** allergies and chronic conditions, shown first and highlighted. If none are recorded, it says so and reminds the doctor to ask the patient.
- **Patient records in five tabs:** Encounters, Prescriptions, Test results, Conditions, and a Timeline that mixes everything by date.
- Long lists get a search box and page numbers.

**4. Adding a record.** Buttons open a form for a new encounter, prescription or lab result. The form shows the patient's name, flags missing or wrong fields right next to them, and asks "Discard this entry?" if the doctor tries to close it with unsaved text. After saving, a confirmation appears, the right tab opens, and the new card briefly glows.

**5. Profile page.** Account details, a specialty preference, clinical role switching (marked "Demo only"), light/dark/system appearance, Privacy and Terms, and Sign out (with a confirmation).

**6. Smaller pieces.** A branded 404 page, a friendly error page, loading placeholders instead of blank screens, and a notice for doctors who open the mobile app ("the clinical workspace is on the web").

## Careful choices that matter for a medical tool

- **Notes are never cut off.** Very long notes fold behind "Show more", but the full text is always there.
- **Lab trends only when they make sense.** A small trend line appears when a test has two or more results in the same unit. The portal never invents "normal range" or "high/low" flags, because the system doesn't provide them.
- **"Expired" prescriptions are flagged** automatically from the end date.
- **Where information came from is shown:** Patient-reported, Doctor-verified, or Clinician-entered.
- **Privacy:** no patient name in the browser tab title or address bar, nothing stored in the browser, and the vault closes automatically on sign-out, role change or expiry.
- **The PIN is never submitted automatically.** The doctor presses Unlock, so a single-use PIN isn't wasted by accident.
- **Slow server:** after 8 seconds the page says the server may be waking up, and offers Cancel.

## Look and feel

Apollo green and cream, Poppins for names, Inter for text. Light and dark modes. Layouts for phone, tablet and desktop. Everything works with the keyboard (skip link, menus, tabs, dialogs that trap focus), controls have proper names for screen readers, and animations switch off for people who prefer reduced motion.

## Under the hood (short version)

- **Shared building blocks:** buttons, badges, dialogs, form fields, toasts, tabs, stat tiles and trend lines are reusable pieces, so every page looks and behaves the same.
- **One place holds the open patient record**, so a doctor can go to Profile and back without losing it or records they just added.
- **Small changes to existing files:** theme colours (new colours added, none changed), the root layout, welcome and sign-in pages, and the patient Settings page (the privacy/terms text moved to a shared file, with no visual change).

## What was checked, and what wasn't

Checked, in a real browser (Chromium) with a pretend backend: 90 automatic behaviour checks, an accessibility and colour-contrast audit of 22 screens in light and dark with no failures, and layouts from 360px to 1920px wide with no sideways scrolling.

**Not checked:** a real Expo/React Native Web build, the real TypeScript compiler, real screen readers, real phones. Your own run of the project is the real test, and your screenshot already found one alignment bug (now fixed).

## Not built

Keyboard shortcuts, a print/PDF patient summary, a compact-density toggle, and illustrated empty states. The Google Fonts link is still in place (it sends visitors' addresses to Google, so it is a privacy question for a health product).

## Questions for you

1. Is the "no allergies recorded, ask the patient" wording what clinicians want?
2. What are the real length limits for notes and names on the server? I assumed 255 and 2,000 characters.
3. Should the portal lock itself after some idle time, even within the 24-hour session?
4. Can we self-host the fonts so visitors' addresses never go to Google?
