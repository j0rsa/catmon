import { afterEach, describe, expect, it } from 'vitest';
import { computeViewportShiftBottom, resetViewportChromeStateForTests } from './viewportChrome';

function mockVisualViewport(overrides: Partial<VisualViewport> & Pick<VisualViewport, 'height' | 'offsetTop'>) {
  const base = {
    width: 390,
    scale: 1,
    pageLeft: 0,
    pageTop: 0,
    offsetLeft: 0,
    onresize: null,
    onscroll: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
  return { ...base, ...overrides } as VisualViewport;
}

describe('computeViewportShiftBottom', () => {
  afterEach(() => {
    resetViewportChromeStateForTests();
  });

  it('returns zero when layout and visual bottoms align', () => {
    const vv = mockVisualViewport({ height: 800, offsetTop: 0 });
    expect(computeViewportShiftBottom({ visualViewport: vv, innerHeight: 800 })).toBe(0);
  });

  it('returns the gap when the layout viewport is shorter than the visual bottom', () => {
    const vv = mockVisualViewport({ height: 800, offsetTop: 0 });
    expect(computeViewportShiftBottom({ visualViewport: vv, innerHeight: 740 })).toBe(60);
  });

  it('accounts for a shifted visual viewport origin', () => {
    const vv = mockVisualViewport({ height: 700, offsetTop: 50 });
    expect(computeViewportShiftBottom({ visualViewport: vv, innerHeight: 720 })).toBe(30);
  });

});
