import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetScrollOnPathnameChange } from './useScrollToTopOnNavigate';

describe('resetScrollOnPathnameChange', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('scrolls to the top on pathname change', () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('window', { scrollTo });

    resetScrollOnPathnameChange();

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
