import type { PluginListenerHandle } from '@capacitor/core';

/**
 * Options for showing / updating the native floating counter overlay.
 */
export interface OverlayShowOptions {
  /** Current dhikr count to display. */
  count: number;
  /** Optional goal (e.g. 33/66/100). When > 0 the overlay shows "count / goal". */
  goal?: number;
  /** Short uppercase label under the number (e.g. "ЗИКР" / "DHIKR"). */
  label?: string;
  /** Accent color (hex), e.g. the current theme's --gold. */
  accentColor?: string;
  /** Background color (hex) of the bubble. */
  bgColor?: string;
}

export interface OverlayUpdateOptions {
  count: number;
  goal?: number;
}

export interface PermissionResult {
  /** Whether the "Display over other apps" permission is granted. */
  granted: boolean;
}

/**
 * Native Android "counter over everything" overlay.
 *
 * Android-only. On the web (and iOS) every method is a safe no-op so the PWA
 * never breaks — see web.ts.
 */
export interface OverlayCounterPlugin {
  /** Returns whether SYSTEM_ALERT_WINDOW ("Display over other apps") is granted. */
  checkPermission(): Promise<PermissionResult>;

  /**
   * Opens the system settings screen so the user can grant the overlay
   * permission. Resolves with the latest known state (the actual grant happens
   * in system settings; re-check with checkPermission() when the app resumes).
   */
  requestPermission(): Promise<PermissionResult>;

  /** Shows the floating overlay counter on top of other apps. */
  show(options: OverlayShowOptions): Promise<void>;

  /** Updates the number/goal shown in an already-visible overlay. */
  update(options: OverlayUpdateOptions): Promise<void>;

  /** Hides/removes the overlay. */
  hide(): Promise<void>;

  /** Whether the overlay is currently shown. */
  isShowing(): Promise<{ showing: boolean }>;

  /**
   * Fired when the user taps the native overlay button (i.e. counts +1 while
   * outside the app). `count` is the overlay's optimistic local value; the web
   * layer should treat the tap as the source event and run its own increment.
   */
  addListener(
    eventName: 'increment',
    listenerFunc: (data: { count: number }) => void,
  ): Promise<PluginListenerHandle>;

  /** Fired when the user dismisses the overlay via its close affordance. */
  addListener(
    eventName: 'overlayClosed',
    listenerFunc: () => void,
  ): Promise<PluginListenerHandle>;

  /** Removes all listeners registered for this plugin. */
  removeAllListeners(): Promise<void>;
}
