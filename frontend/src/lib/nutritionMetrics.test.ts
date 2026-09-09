import { describe, expect, it } from 'vitest';
import { formatDayHint, formatDayHintCompact, totalKnownFluidMl } from './nutritionMetrics';
import type { DayNutritionHighlight } from '../types/pillars';

const packed: DayNutritionHighlight = {
  recordCount: 8,
  wetFood: 340,
  water: 425,
  liquids: 5,
  dryFood: 135,
};

describe('formatDayHint', () => {
  it('returns one labelled line per metric', () => {
    const lines = formatDayHint(packed);
    expect(lines.map((line) => line.text)).toEqual([
      `~${totalKnownFluidMl(packed)}ml fluid`,
      '340g wet',
      '5ml liq',
      '425ml water',
      '135g dry',
    ]);
  });

  it('returns nothing for an empty day', () => {
    expect(formatDayHint(undefined)).toEqual([]);
    expect(formatDayHint({ recordCount: 0, wetFood: 0, water: 0, liquids: 0, dryFood: 0 })).toEqual([]);
  });
});

describe('formatDayHintCompact', () => {
  it('stacks short number+unit lines instead of joining with middots', () => {
    const lines = formatDayHintCompact(packed);
    expect(lines.map((line) => line.text).join(' ')).not.toContain('·');
    expect(lines.map((line) => line.text)).toEqual([
      `~${totalKnownFluidMl(packed)}ml`,
      '340g',
      '5ml',
      '425ml',
      '135g',
    ]);
    expect(lines.map((line) => line.kind)).toEqual(['fluid', 'wet', 'liquids', 'water', 'dry']);
  });

  it('keeps a full title for truncated cells', () => {
    const wet = formatDayHintCompact(packed).find((line) => line.kind === 'wet');
    expect(wet?.title).toBe('340g wet');
  });
});
