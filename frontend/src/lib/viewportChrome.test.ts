import { describe, expect, it } from 'vitest';
import { computeViewportShiftBottom } from './viewportChrome';

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
  it('returns zero when the nav already meets the visual viewport bottom', () => {
    const vv = mockVisualViewport({ height: 800, offsetTop: 0 });
    expect(computeViewportShiftBottom(800, vv)).toBe(0);
    expect(computeViewportShiftBottom(801, vv)).toBe(0);
  });

  it('returns the gap when the nav sits above the visual viewport bottom', () => {
    const vv = mockVisualViewport({ height: 800, offsetTop: 0 });
    expect(computeViewportShiftBottom(740, vv)).toBe(60);
  });

  it('accounts for a shifted visual viewport origin', () => {
    const vv = mockVisualViewport({ height: 700, offsetTop: 50 });
    expect(computeViewportShiftBottom(720, vv)).toBe(30);
  });

});
