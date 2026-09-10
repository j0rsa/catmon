/** CSS variable written by {@link syncViewportChrome}. */
export const VIEWPORT_SHIFT_BOTTOM_VAR = '--viewport-shift-bottom';

const POST_AUTH_SYNC_KEY = 'pwa-post-auth-viewport-sync';

/** Distance the fixed bottom nav must shift down to meet the visual viewport bottom. */
export function computeViewportShiftBottom(navBottom: number | null, visualViewport = window.visualViewport): number {
  if (!visualViewport) return 0;
  const visualBottom = visualViewport.offsetTop + visualViewport.height;
  const referenceBottom = navBottom ?? window.innerHeight;
  return Math.max(0, Math.round(visualBottom - referenceBottom));
}

/** Re-anchor fixed chrome against the visual viewport (iOS PWA after OIDC redirects). */
export function syncViewportChrome(nav: HTMLElement | null = document.querySelector<HTMLElement>('.bottom-nav')): number {
  const visible = nav && getComputedStyle(nav).display !== 'none';
  const navBottom = visible ? nav.getBoundingClientRect().bottom : null;
  const shift = computeViewportShiftBottom(navBottom);
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
  const sync = () => syncViewportChrome();

  window.visualViewport?.addEventListener('resize', sync);
  window.visualViewport?.addEventListener('scroll', sync);
  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);
  window.addEventListener('pageshow', sync);

  sync();
  if (options?.burst) runViewportSyncBurst(sync);

  return () => {
    window.visualViewport?.removeEventListener('resize', sync);
    window.visualViewport?.removeEventListener('scroll', sync);
    window.removeEventListener('resize', sync);
    window.removeEventListener('orientationchange', sync);
    window.removeEventListener('pageshow', sync);
    document.documentElement.style.removeProperty(VIEWPORT_SHIFT_BOTTOM_VAR);
  };
}
