import { describe, expect, it } from 'vitest';
import type { WeightSummaryBucket } from '../api/weight';
import { buildWeightChart, collectWeightTags, weightSeriesKey } from './weightChart';

const buckets: WeightSummaryBucket[] = [
  { bucket: '2026-06-01', tag: 'Petkit', avg_kg: 4.7, min_kg: 4.6, max_kg: 4.8, count: 6 },
  { bucket: '2026-06-01', tag: 'manual', avg_kg: 4.65, min_kg: 4.65, max_kg: 4.65, count: 1 },
  { bucket: '2026-06-02', tag: 'Petkit', avg_kg: 4.72, min_kg: 4.7, max_kg: 4.74, count: 5 },
];

describe('collectWeightTags', () => {
  it('orders tags by record count so the dominant series gets the accent colour', () => {
    const tags = collectWeightTags(buckets);
    expect(tags.map((item) => item.tag)).toEqual(['Petkit', 'manual']);
    expect(tags[0].count).toBe(11);
  });
});

describe('buildWeightChart', () => {
  it('pivots tag series onto shared daily buckets', () => {
    const { points, tags } = buildWeightChart(buckets, 'daily', null);
    expect(tags).toHaveLength(2);
    expect(points).toHaveLength(2);
    expect(points[0][weightSeriesKey('Petkit')]).toBe(4.7);
    expect(points[0][weightSeriesKey('manual')]).toBe(4.65);
    expect(points[1][weightSeriesKey('manual')]).toBeNull();
    expect(points[0].minKg).toBe(4.6);
    expect(points[0].maxKg).toBe(4.8);
  });

  it('isolates a single tag when a legend is selected', () => {
    const { points, visibleTags, medianKg } = buildWeightChart(buckets, 'daily', 'manual');
    expect(visibleTags.map((item) => item.tag)).toEqual(['manual']);
    expect(points[0].minKg).toBe(4.65);
    expect(points[0].maxKg).toBe(4.65);
    expect(medianKg).toBe(4.65);
  });
});
