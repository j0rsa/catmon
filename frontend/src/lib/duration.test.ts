import { describe, expect, it } from 'vitest';
import { formatDurationMmss, normalizeDurationInput, parseDurationToSecs } from './duration';

describe('parseDurationToSecs', () => {
  it('empty is optional', () => {
    expect(parseDurationToSecs('')).toBeNull();
    expect(parseDurationToSecs('   ')).toBeNull();
  });

  it('parses mm:ss and m:ss', () => {
    expect(parseDurationToSecs('1:23')).toBe(83);
    expect(parseDurationToSecs('01:23')).toBe(83);
    expect(parseDurationToSecs('0:45')).toBe(45);
    expect(parseDurationToSecs('12:34')).toBe(754);
  });

  it('accepts decimal or comma as a seconds separator', () => {
    expect(parseDurationToSecs('1.23')).toBe(83);
    expect(parseDurationToSecs('1,23')).toBe(83);
  });

  it('treats a bare number as seconds', () => {
    expect(parseDurationToSecs('45')).toBe(45);
    expect(parseDurationToSecs('83')).toBe(83);
    expect(parseDurationToSecs('90')).toBe(90);
  });

  it('zero duration is omitted', () => {
    expect(parseDurationToSecs('0')).toBeNull();
    expect(parseDurationToSecs('0:00')).toBeNull();
  });

  it('treats a 4-digit string as seconds, not ATM mmss', () => {
    expect(parseDurationToSecs('0123')).toBe(123);
  });
});

describe('formatDurationMmss', () => {
  it('formats seconds as m:ss', () => {
    expect(formatDurationMmss(5)).toBe('0:05');
    expect(formatDurationMmss(45)).toBe('0:45');
    expect(formatDurationMmss(60)).toBe('1:00');
    expect(formatDurationMmss(83)).toBe('1:23');
    expect(formatDurationMmss(754)).toBe('12:34');
  });
});

describe('normalizeDurationInput', () => {
  it('keeps optional empty', () => {
    expect(normalizeDurationInput('')).toBe('');
    expect(normalizeDurationInput('  ')).toBe('');
    expect(normalizeDurationInput('0:00')).toBe('');
  });

  it('canonicalises valid input and carries overflow seconds', () => {
    expect(normalizeDurationInput('1:23')).toBe('1:23');
    expect(normalizeDurationInput('1.23')).toBe('1:23');
    expect(normalizeDurationInput('83')).toBe('1:23');
    expect(normalizeDurationInput('1:75')).toBe('2:15');
  });

  it('leaves unparseable text so the user can fix it', () => {
    expect(normalizeDurationInput('nope')).toBe('nope');
  });
});
