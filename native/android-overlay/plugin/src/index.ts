import { registerPlugin } from '@capacitor/core';

import type { OverlayCounterPlugin } from './definitions';

/**
 * The native id 'OverlayCounter' must match the `name` in the Kotlin
 * @CapacitorPlugin annotation (OverlayCounterPlugin.kt).
 *
 * The second argument lazy-loads the web implementation so that running in a
 * browser (or iOS) resolves to the safe no-op fallback instead of throwing.
 */
const OverlayCounter = registerPlugin<OverlayCounterPlugin>('OverlayCounter', {
  web: () => import('./web').then((m) => new m.OverlayCounterWeb()),
});

export * from './definitions';
export { OverlayCounter };
