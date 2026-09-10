/** CSS variable written by {@link syncViewportChrome}. */
export const VIEWPORT_SHIFT_BOTTOM_VAR = '--viewport-shift-bottom';

const POST_AUTH_SYNC_KEY = 'pwa-post-auth-viewport-sync';
const RESIZE_DEBOUNCE_MS = 200;

/** Last shift written to the DOM — held steady during rubber-band pans. */
let lastStableShift = 0;

export interface ViewportShiftInput {
  visualViewport?: VisualViewport | null;
  innerHeight?: number;
  previousShift?: number;
}

/**
 * Distance fixed bottom chrome must shift down so the layout viewport bottom
 * meets the visual viewport bottom. Uses layout metrics only (never the nav's
 * transformed bounding rect) to avoid a feedback loop that flickers on scroll.
 */
export function computeViewportShiftBottom(input: ViewportShiftInput = {}): number {
  const vv = input.visualViewport ?? window.visualViewport;
  if (!vv) return input.previousShift ?? lastStableShift;

  const layoutBottom = input.innerHeight ?? window.innerHeight;
  const visualBottom = vv.offsetTop + vv.height;
  return Math.max(0, Math.round(visualBottom - layoutBottom));
}

/** Re-anchor fixed chrome against the visual viewport (iOS PWA after OIDC redirects). */
export function syncViewportChrome(): number {
  const shift = computeViewportShiftBottom();
  if (shift === lastStableShift) return shift;

  lastStableShift = shift;
  document.documentElement.style.setProperty(VIEWPORT_SHIFT_BOTTOM_VAR, `${shift}px`);
  return shift;
}

export function markPostAuthViewportSync(): void {
  sessionStorage.setItem(POST_AUTH_SYNC_KEY, '1');
}

export function consumePostAuthViewportSync(): boolean {
  if (sessionStorage.getItem(POST_AUTH_SYNC_KEY) !== '1') return false;
  sessionStorage.removeItem(POST_AUTH_SYNC_KEY);
  return true;
}

/** Aggressive re-sync after OIDC: reload alone is not enough on iOS PWAs. */
export function runViewportSyncBurst(sync: () => void = syncViewportChrome): void {
  window.scrollTo(0, 0);

  const tick = () => {
    sync();
    window.scrollTo(0, 0);
  };

  tick();

  let frames = 0;
  const onFrame = () => {
    tick();
    frames += 1;
    if (frames < 15) requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);

  const started = Date.now();
  const intervalId = window.setInterval(() => {
    tick();
    if (Date.now() - started >= 3000) window.clearInterval(intervalId);
  }, 100);
}

export function installViewportChromeSync(options?: { burst?: boolean }): () => void {
  let resizeTimer: number | undefined;
  const debouncedSync = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => syncViewportChrome(), RESIZE_DEBOUNCE_MS);
  };

  // Do not listen to visualViewport scroll — rubber-band overscroll fires it every
  // frame and toggled shift values made the bottom nav flicker.
  window.visualViewport?.addEventListener('resize', debouncedSync);
  window.addEventListener('resize', debouncedSync);
  window.addEventListener('orientationchange', syncViewportChrome);
  window.addEventListener('pageshow', syncViewportChrome);

  syncViewportChrome();
  if (options?.burst) runViewportSyncBurst();

  return () => {
    window.clearTimeout(resizeTimer);
    window.visualViewport?.removeEventListener('resize', debouncedSync);
    window.removeEventListener('resize', debouncedSync);
    window.removeEventListener('orientationchange', syncViewportChrome);
    window.removeEventListener('pageshow', syncViewportChrome);
    lastStableShift = 0;
    document.documentElement.style.removeProperty(VIEWPORT_SHIFT_BOTTOM_VAR);
  };
}

/** Test helper — reset module state between unit tests. */
export function resetViewportChromeStateForTests(): void {
  lastStableShift = 0;
}
