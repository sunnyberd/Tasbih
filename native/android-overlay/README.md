# Native Android "Counter over everything" — Capacitor scaffold

This folder is an **isolated, optional** scaffold that adds a **true system-level
overlay** (a counter that floats over *other* apps) to Azkar when you wrap the PWA
into a native Android app with **Capacitor**.

It uses the Android `SYSTEM_ALERT_WINDOW` permission ("Display over other apps") and
a `WindowManager` overlay drawn from a foreground `Service`.

> ⚠️ **Nothing here touches the existing web app.**
> The in-app floating button (`#pipCounterBtn` in `index.html`) is **left exactly as
> it is**. This native overlay is a **separate** counter that only exists in the
> native Android build. The web PWA keeps working unchanged in the browser.

---

## Why a native plugin is required

A web page / WebView **cannot** draw on top of other applications — that is blocked
by the browser sandbox for security. Only native OS code can:

| Platform | "Over other apps" overlay | How |
| --- | --- | --- |
| **Android** | ✅ Possible | `SYSTEM_ALERT_WINDOW` + `WindowManager` overlay (this scaffold) |
| **iOS** | ❌ Not possible | No public API for arbitrary floating overlays (PiP is video-only) |
| **Desktop browser** | ⚠️ Partial | `documentPictureInPicture` (separate, not covered here) |

So this scaffold targets **Android only**.

---

## What you get

```
native/android-overlay/
├── README.md                         ← this guide
├── capacitor.config.example.ts       ← Capacitor config example
├── package.example.json              ← npm deps example
├── plugin/
│   └── src/
│       ├── definitions.ts            ← plugin TypeScript API
│       ├── index.ts                  ← registerPlugin() entry
│       └── web.ts                    ← web fallback (no-op, so PWA never breaks)
├── android/
│   ├── OverlayCounterPlugin.kt       ← Capacitor @CapacitorPlugin bridge
│   ├── OverlayCounterService.kt      ← foreground service + WindowManager overlay
│   ├── AndroidManifest.additions.xml ← permissions + service declaration
│   └── MainActivity.snippet.kt       ← how to register the local plugin
└── web-integration/
    └── overlay-bridge.js             ← OPTIONAL, non-invasive sync layer
```

---

## High-level architecture

```
┌───────────────────────────┐         increment event          ┌──────────────────────────┐
│  Web app (index.html)     │  ◄─────────────────────────────  │  OverlayCounterPlugin.kt  │
│  - existing counter logic │                                   │  (Capacitor bridge)       │
│  - overlay-bridge.js      │  ──── show/update/hide ────────►  │                           │
│    (optional, separate)   │                                   └────────────┬──────────────┘
└───────────────────────────┘                                                │ start/cmd
                                                                             ▼
                                                          ┌────────────────────────────────┐
                                                          │  OverlayCounterService.kt        │
                                                          │  - foreground service            │
                                                          │  - WindowManager overlay view    │
                                                          │  - draggable circular counter    │
                                                          │  - tap → emit "increment"        │
                                                          └────────────────────────────────┘
```

The **web counter stays the source of truth**. The native overlay shows the current
count and, when tapped while you're in another app, emits an `increment` event back
to the web layer (via `overlay-bridge.js`), which calls the *existing* counter logic.

---

## Step-by-step setup

> Requires Node 18+, Android Studio, and a device/emulator with Android 8+ (API 26+).

### 1. Add Capacitor to the project

From the repo root (where `index.html` lives):

```bash
npm init -y                       # if you don't have package.json yet
npm install @capacitor/core
npm install -D @capacitor/cli
npx cap init "Azkar" "dev.azkar.app" --web-dir="."
```

- `--web-dir="."` tells Capacitor the static site is the repo root.
  If you prefer, copy `index.html`, `sw.js`, `manifest.json`, `hadiths.js`, the icons
  into a `www/` folder and use `--web-dir="www"` (cleaner; avoids copying `node_modules`).
- Compare your generated `capacitor.config.ts` with `capacitor.config.example.ts` here.

### 2. Add the Android platform

```bash
npm install @capacitor/android
npx cap add android
npx cap sync android
```

### 3. Drop in the native plugin files

Copy the Kotlin files into your app package, e.g.
`android/app/src/main/java/dev/azkar/app/`:

- `android/OverlayCounterPlugin.kt`
- `android/OverlayCounterService.kt`

Set the `package` line at the top of each file to **your** application id
(e.g. `package dev.azkar.app`).

### 4. Merge the AndroidManifest additions

Open `android/app/src/main/AndroidManifest.xml` and merge in the permission and
`<service>` declaration from `android/AndroidManifest.additions.xml`.

### 5. Register the local plugin

Edit `android/app/src/main/java/.../MainActivity.kt` as shown in
`android/MainActivity.snippet.kt` (register `OverlayCounterPlugin` in `onCreate`).

### 6. Add the JS plugin wrapper

Copy `plugin/src/*` into your web sources (e.g. a `src/native/overlay/` folder) and
import it. If you are NOT using a bundler (this project is plain `index.html`), use the
simplest option instead: the runtime `Capacitor.registerPlugin('OverlayCounter')` call
shown inside `web-integration/overlay-bridge.js`.

### 7. (Optional) Wire it to the existing counter — without changing the button

Include `web-integration/overlay-bridge.js` **once** in your native build only.
It:
- reads the current count from `localStorage('azkar_count')`,
- keeps the native overlay in sync,
- on a native `increment` event, dispatches a normal tap on the existing counter ring
  (`#counterRingWrap` / `increment()`), so your current logic runs untouched.

You do **not** need to modify `#pipCounterBtn` or any existing code.

### 8. Build & run

```bash
npx cap sync android
npx cap open android      # opens Android Studio → Run
```

On first use the app asks for the "Display over other apps" permission
(`Settings.canDrawOverlays`). After granting it, calling `OverlayCounter.show(...)`
displays the floating native counter that stays on top of other apps.

---

## Android version notes

- **API 26+ (Android 8+):** overlay uses `TYPE_APPLICATION_OVERLAY` (required).
- **API 23–25:** falls back to `TYPE_PHONE`.
- **API 34 (Android 14):** foreground services must declare a type. This scaffold uses
  `foregroundServiceType="specialUse"` and requests
  `FOREGROUND_SERVICE_SPECIAL_USE`. When publishing to Google Play you must justify the
  special-use type in the Play Console, OR avoid the foreground service entirely (see the
  comment block in `OverlayCounterService.kt` for the no-FGS variant — the overlay still
  works while the app process is alive).

## Permission & Play Store

- `SYSTEM_ALERT_WINDOW` is a sensitive permission. Google Play allows it but reviews
  apps that use it. Make the overlay clearly user-initiated (a setting the user turns on),
  which this scaffold does.
- Always provide a visible way to dismiss the overlay (the scaffold adds a close affordance
  and a "hide" API).

---

## API quick reference

```ts
import { OverlayCounter } from './native/overlay';

await OverlayCounter.checkPermission();          // { granted }
await OverlayCounter.requestPermission();         // opens system settings, { granted }
await OverlayCounter.show({ count: 0, goal: 100, label: 'ЗИКР', accentColor: '#d4af37' });
await OverlayCounter.update({ count: 42 });
await OverlayCounter.hide();

OverlayCounter.addListener('increment', ({ count }) => { /* user tapped native overlay */ });
OverlayCounter.addListener('overlayClosed', () => { /* user closed native overlay */ });
```
