import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Reset window scroll on pathname changes. Hash-only updates are ignored so deep-link
 *  highlight cleanup does not jump back to the top after the flash animation. */
export function resetScrollOnPathnameChange(): void {
  window.scrollTo(0, 0);
}

export function useScrollToTopOnNavigate(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    resetScrollOnPathnameChange();
  }, [pathname]);
}
