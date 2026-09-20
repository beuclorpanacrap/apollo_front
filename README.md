# Apollo Frontend

Mobile & web client for Apollo - sovereign, patient-owned electronic health records. Built with React Native, Expo Router, and TypeScript.

## Key Features
- **Patient Onboarding** - Self-declared baseline survey for biometrics, allergies, chronic conditions, and lifestyle habits.
- **Medical Vault** - Real-time synchronization of conditions, clinical notes, and lab records.
- **Data Sovereignty** - Immutable clinician records paired with patient-managed baseline synchronization.
- **Clean Responsive UI** - Shared codebase running natively on iOS, Android, and Desktop Web.

## Tech Stack
- **Framework** - React Native with Expo (SDK 52+ / Expo Router)
- **Language** - TypeScript
- **State & Auth** - Context API + SecureStore / LocalStorage
- **API Client** - Fetch with auto-generated OpenAPI types (`openapi-typescript`)

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
```bash
npm install
```

### Running Locally
```bash
# Start the development server
npx expo start

# Run on web directly
npx expo start --web
```

### Type Checking & Build Verification
```bash
# Type check
npx tsc --noEmit

# Static export check
npx expo export --platform web
```

## Related Repositories
- [Apollo Backend](https://github.com/whelve13/apollo) - Spring Boot, PostgreSQL / Neon, OpenAPI.
