import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Root HTML for the static web export (runs in Node, once per page — it cannot import theme.ts because
 * that pulls in react-native and global CSS). The two colors below mirror `Colors.light.background` and
 * `Colors.dark.background` in src/constants/theme.ts; keep them in sync.
 *
 * What this fixes: a missing `lang`, no viewport meta, and the white flash dark-mode users got before JS
 * loaded — background and `color-scheme` are set in CSS here, so the very first paint is already themed
 * and shows the Apollo mark instead of a blank page while fonts load.
 */
const LIGHT_BG = '#FAF4E3';
const DARK_BG = '#1E3C2A';

const earlyCss = `
html,body{background:${LIGHT_BG};color-scheme:light dark}
@media (prefers-color-scheme: dark){html,body{background:${DARK_BG}}}
#apollo-boot{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
#root:not(:empty) ~ #apollo-boot{display:none}
#apollo-boot svg{width:72px;height:72px}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="description" content="Apollo — your health vault. Patients keep their records; clinicians open them with a consultation PIN." />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content={LIGHT_BG} media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content={DARK_BG} media="(prefers-color-scheme: dark)" />
        {/* Resets body scrolling so react-native-web's ScrollViews own the page scroll. */}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: earlyCss }} />
      </head>
      <body>
        {children}
        <div id="apollo-boot" aria-hidden="true">
          {/* The Apollo mark (see components/app-mark.tsx), inlined so it paints before any JS. */}
          <svg viewBox="0 0 100 100" role="presentation">
            <defs>
              <clipPath id="boot-squircle">
                <rect width="100" height="100" rx="26" />
              </clipPath>
            </defs>
            <rect width="100" height="100" rx="26" fill="#4FAE72" />
            <rect y="91" width="100" height="9" fill="#327A4C" clipPath="url(#boot-squircle)" />
            <path
              d="M50,73 C50,73 25,54.5 25,37.5 C25,25 35,19 44.5,23.5 C47.5,25 49.3,27.8 50,31 C50.7,27.8 52.5,25 55.5,23.5 C65,19 75,25 75,37.5 C75,54.5 50,73 50,73 Z"
              fill="#FFFDF7"
            />
          </svg>
        </div>
      </body>
    </html>
  );
}
