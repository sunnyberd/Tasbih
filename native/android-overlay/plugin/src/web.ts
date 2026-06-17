import { WebPlugin } from '@capacitor/core';

import type {
  OverlayCounterPlugin,
  OverlayShowOptions,
  OverlayUpdateOptions,
  PermissionResult,
} from './definitions';

/**
 * Web (and iOS) fallback.
 *
 * Browsers cannot draw over other apps, so every method is a safe no-op. This
 * guarantees the existing PWA keeps working unchanged: the web build simply
 * never shows a system overlay, and the existing in-app `#pipCounterBtn`
 * remains the only floating counter there.
 */
export class OverlayCounterWeb extends WebPlugin implements OverlayCounterPlugin {
  async checkPermission(): Promise<PermissionResult> {
    return { granted: false };
  }

  async requestPermission(): Promise<PermissionResult> {
    return { granted: false };
  }

  async show(_options: OverlayShowOptions): Promise<void> {
    // no-op on web
  }

  async update(_options: OverlayUpdateOptions): Promise<void> {
    // no-op on web
  }

  async hide(): Promise<void> {
    // no-op on web
  }

  async isShowing(): Promise<{ showing: boolean }> {
    return { showing: false };
  }
}
