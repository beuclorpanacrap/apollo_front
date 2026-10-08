/**
 * Legal copy shown in Settings (patient app) and in the clinician Profile page.
 *
 * Privacy Policy: extracted verbatim from `settings.tsx`. It makes technical claims
 * ("cryptographically append-only", "non-repudiation") that have not been verified for clinicians.
 *
 * Terms of Service: a realistic MOCK written to match how Apollo actually behaves today (patient-generated
 * PINs, 15-minute PIN / 24-hour session, read-only clinician records, demo role switching). It is not legal
 * advice — have counsel review and adapt it before this ships to real users.
 */

export interface PolicyContent {
  title: string;
  subtitle: string;
  /** Shown as a small "Last updated" line at the top of the dialog. */
  updated?: string;
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
  updated: 'Last updated: October 2026',
  sections: [
    {
      heading: '1. About Apollo',
      body: 'Apollo is a personal health record platform. Patients keep their own medical vault, and licensed clinicians can open it, with the patient’s permission, to review it and add clinical records. By creating an account or using Apollo you agree to these Terms and to our Privacy Policy.',
    },
    {
      heading: '2. Accounts & Eligibility',
      body: 'Give accurate information when you register and keep your sign-in details private. Clinician accounts require a valid professional license number; Apollo may ask you to confirm it and may suspend accounts whose credentials cannot be confirmed. You are responsible for everything done through your account.',
    },
    {
      heading: '3. Patient Ownership of Records',
      body: 'Patients own the information in their vault, including self-reported details such as biometrics, allergies, conditions and lifestyle factors. Apollo stores and displays this information on the patient’s behalf and does not sell it.',
    },
    {
      heading: '4. Consent-Based Access',
      body: 'A clinician can open a vault only with a single-use 6-digit PIN that the patient generates. The PIN expires after 15 minutes, and the consultation session it unlocks ends after 24 hours, or sooner when the clinician closes the vault, signs out or changes role. Use that access only for the consultation the patient agreed to.',
    },
    {
      heading: '5. Clinician Responsibilities',
      body: 'Clinicians must hold a valid license to practise, act within their role and exercise their own professional judgment. Records you add must be accurate, complete and made in good faith. Never copy, share or keep patient information outside the consultation it was opened for.',
    },
    {
      heading: '6. Record Integrity',
      body: 'Encounters, prescriptions and lab results added by clinicians cannot be edited or deleted from the clinician portal. If something is wrong, add a new, dated entry that corrects it. Every entry shows who recorded it and when.',
    },
    {
      heading: '7. Acceptable Use',
      body: 'Do not impersonate anyone, open a vault without the patient’s consent, upload unlawful or harmful content, or try to disrupt, probe or bypass the security of the service.',
    },
    {
      heading: '8. Not Medical Advice',
      body: 'Apollo is a record-keeping tool. It does not provide medical advice, diagnosis or treatment, and a vault may be incomplete or out of date. In a medical emergency, contact your local emergency number (e.g. 112 or 911) or go to the nearest emergency room.',
    },
    {
      heading: '9. Demonstration Features',
      body: 'Some features, including role switching under Demo permissions, exist for demonstration and testing. They may change or be removed, and must not be relied on for real patient care.',
    },
    {
      heading: '10. Availability, Liability & Changes',
      body: 'Apollo is provided “as is”. We work to keep it available and secure but cannot promise uninterrupted service or that no breach will ever occur. To the extent the law allows, Apollo is not liable for indirect or consequential loss, and nothing here limits liability that cannot be limited by law. We may suspend access that breaches these Terms or puts patients at risk, and may update these Terms; continued use after a change means you accept it.',
    },
  ],
};
