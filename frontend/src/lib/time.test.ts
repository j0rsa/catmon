import { describe, expect, it } from 'vitest';
import { floorHhmmToStep } from './time';

describe('floorHhmmToStep', () => {
  it('floors to the previous 10 minutes', () => {
    expect(floorHhmmToStep('08:04')).toBe('08:00');
    expect(floorHhmmToStep('08:05')).toBe('08:00');
    expect(floorHhmmToStep('08:09')).toBe('08:00');
    expect(floorHhmmToStep('08:00')).toBe('08:00');
    expect(floorHhmmToStep('09:30')).toBe('09:30');
  });

  it('does not wrap past midnight', () => {
    expect(floorHhmmToStep('23:55')).toBe('23:50');
    expect(floorHhmmToStep('23:54')).toBe('23:50');
  });

  it('leaves unparseable values alone', () => {
    expect(floorHhmmToStep('')).toBe('');
    expect(floorHhmmToStep('nope')).toBe('nope');
  });
});
