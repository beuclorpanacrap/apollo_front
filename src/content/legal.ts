/**
 * Legal copy shown in Settings (patient app) and in the clinician Profile page.
 *
 * Extracted verbatim from `settings.tsx` so both surfaces render the same text.
 * Do NOT edit or extend the wording here without legal sign-off: the existing copy is
 * patient-oriented and makes technical claims ("cryptographically append-only",
 * "non-repudiation") that have not been verified for clinicians. See the open questions
 * in the redesign report.
 */

export interface PolicyContent {
  title: string;
  subtitle: string;
  sections: { heading: string; body: string }[];
}

export const PRIVACY_POLICY: PolicyContent = {
  title: 'Privacy Policy',
  subtitle: 'Patient Data Sovereignty & Encryption Commitment',
  sections: [
    {
      heading: '1. Patient Sovereignty',
      body: 'Your medical health vault belongs exclusively to you. Apollo does not sell, monetize, or broker patient data to advertisers, insurance underwriters, or data aggregators.',
    },
    {
      heading: '2. Scoped Access Grants',
      body: 'Clinicians cannot access your records without an active consultation authorization. Single-use 6-digit access PINs expire automatically after 15 minutes, unlocking a strictly scoped 24-hour consultation session.',
    },
    {
      heading: '3. Immutable Record Integrity',
      body: 'Encounter notes, diagnostic observations, and issued prescriptions are cryptographically append-only to guarantee non-repudiation and medical record integrity.',
    },
  ],
};

export const TERMS_OF_SERVICE: PolicyContent = {
  title: 'Terms of Service',
  subtitle: 'Apollo Vault Usage & Telemedicine Guidelines',
  sections: [
    {
      heading: '1. Sovereign Record Storage',
      body: 'By utilizing Apollo, you maintain ownership over all patient-declared baseline biometrics, allergy notifications, and lifestyle factors recorded in your personal vault.',
    },
    {
      heading: '2. Clinical Authenticity',
      body: 'Only verified medical practitioners holding accredited licenses verified by state or regional licensing boards may issue certified clinical diagnoses and prescriptions.',
    },
    {
      heading: '3. Emergency Disclaimer',
      body: 'Apollo Medical Vault is an encrypted personal health record platform. In the event of a medical emergency, immediately contact emergency services (e.g. 911 / 112) or proceed to the nearest emergency room.',
    },
  ],
};
