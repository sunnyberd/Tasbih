/**
 * Example Capacitor configuration for wrapping the Azkar PWA.
 *
 * Copy the relevant parts into the `capacitor.config.ts` that
 * `npx cap init` generates at the repo root. Adjust `appId`,
 * `appName` and `webDir` to your needs.
 *
 * NOTE: This file is documentation/example only — it is NOT used by
 * the web PWA and does not affect it.
 */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Reverse-domain application id. Must match the Kotlin `package`
  // declared at the top of OverlayCounterPlugin.kt / OverlayCounterService.kt.
  appId: 'dev.azkar.app',
  appName: 'Azkar',

  // The static site lives at the repo root (index.html, sw.js, manifest.json,
  // hadiths.js, icons). Use '.' to ship the root as-is, OR move the static
  // files into a `www/` folder and set webDir: 'www' (recommended — avoids
  // copying node_modules / native folders into the APK assets).
  webDir: '.',

  // Keep the existing service worker working inside the WebView.
  server: {
    androidScheme: 'https',
  },

  android: {
    // Allow mixed content only if you actually need it; keep false otherwise.
    allowMixedContent: false,
  },
};

export default config;
