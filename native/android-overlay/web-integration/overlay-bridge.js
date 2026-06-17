/*
 * OPTIONAL, NON-INVASIVE bridge between the existing web counter and the
 * native Android overlay (OverlayCounter plugin).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IMPORTANT — what this file does NOT do:
 *   • It does NOT modify the existing in-app floating button (#pipCounterBtn).
 *   • It does NOT modify index.html, increment(), or any existing logic.
 *   • Including it in the WEB (browser) build is harmless: the plugin's web
 *     implementation is a no-op, and the guard below exits early on non-native
 *     platforms, so the PWA behaves exactly as before.
 *
 * It is meant to be loaded ONLY in the native Capacitor build, e.g. add this
 * once at the end of <body> in your native bundle:
 *     <script src="native/android-overlay/web-integration/overlay-bridge.js"></script>
 *
 * How it stays in sync without touching existing code:
 *   • Reads the live count from the #countDisplay element (updated immediately
 *     by the app's own updateDisplay()).
 *   • When the user taps the NATIVE overlay, it calls the existing global
 *     increment() — so your current counting logic runs unchanged.
 *   • A lightweight poll mirrors in-app taps to the overlay.
 *
 * Public API (call these from your own UI / setting toggle — not wired here so
 * nothing existing is changed):
 *     window.AzkarNativeOverlay.start();
 *     window.AzkarNativeOverlay.stop();
 *     window.AzkarNativeOverlay.isSupported();   // boolean
 */
(function () {
  'use strict';

  const Capacitor = window.Capacitor;
  const isNative =
    !!Capacitor &&
    typeof Capacitor.isNativePlatform === 'function' &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform &&
    Capacitor.getPlatform() === 'android';

  // Resolve the plugin (registered natively as "OverlayCounter").
  const OverlayCounter =
    isNative && Capacitor.Plugins ? Capacitor.Plugins.OverlayCounter : null;

  let pollTimer = null;
  let lastSent = null;
  let incrementHandle = null;
  let closedHandle = null;

  function readCount() {
    // #countDisplay reflects the main counter immediately after each tap.
    const el = document.getElementById('countDisplay');
    if (el) {
      const n = parseInt(el.textContent, 10);
      if (!isNaN(n)) return n;
    }
    // Fallback to persisted value.
    const stored = parseInt(localStorage.getItem('azkar_count') || '0', 10);
    return isNaN(stored) ? 0 : stored;
  }

  function readAccent() {
    try {
      return (
        getComputedStyle(document.documentElement)
          .getPropertyValue('--gold')
          .trim() || '#d4af37'
      );
    } catch (e) {
      return '#d4af37';
    }
  }

  function readBg() {
    try {
      return (
        getComputedStyle(document.documentElement)
          .getPropertyValue('--surface')
          .trim() || '#111111'
      );
    } catch (e) {
      return '#111111';
    }
  }

  function pushUpdate() {
    if (!OverlayCounter) return;
    const count = readCount();
    if (count === lastSent) return;
    lastSent = count;
    OverlayCounter.update({ count }).catch(function () {});
  }

  function startPoll() {
    stopPoll();
    pollTimer = setInterval(pushUpdate, 350);
  }

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  async function start() {
    if (!OverlayCounter) {
      console.info('[AzkarNativeOverlay] not on native Android — skipped.');
      return false;
    }
    // Ensure the overlay permission is granted (opens system settings if not).
    const perm = await OverlayCounter.checkPermission();
    if (!perm.granted) {
      await OverlayCounter.requestPermission();
      const recheck = await OverlayCounter.checkPermission();
      if (!recheck.granted) return false;
    }

    // Native tap → run the existing counting logic untouched.
    incrementHandle = await OverlayCounter.addListener('increment', function () {
      if (typeof window.increment === 'function') {
        window.increment();
      }
      // Reflect the new value back to the overlay ASAP.
      setTimeout(pushUpdate, 0);
    });

    closedHandle = await OverlayCounter.addListener('overlayClosed', function () {
      stopPoll();
    });

    await OverlayCounter.show({
      count: readCount(),
      label: 'ЗИКР',
      accentColor: readAccent(),
      bgColor: readBg(),
    });
    lastSent = readCount();
    startPoll();
    return true;
  }

  async function stop() {
    stopPoll();
    if (incrementHandle && incrementHandle.remove) incrementHandle.remove();
    if (closedHandle && closedHandle.remove) closedHandle.remove();
    incrementHandle = null;
    closedHandle = null;
    if (OverlayCounter) {
      try {
        await OverlayCounter.hide();
      } catch (e) {}
    }
  }

  // Pause polling when the app itself is foreground (overlay is mainly useful
  // when the user leaves the app); resume when backgrounded. Optional nicety.
  document.addEventListener('visibilitychange', function () {
    if (!OverlayCounter) return;
    if (document.visibilityState === 'visible') {
      pushUpdate();
    }
  });

  window.AzkarNativeOverlay = {
    start: start,
    stop: stop,
    isSupported: function () {
      return !!OverlayCounter;
    },
  };
})();
