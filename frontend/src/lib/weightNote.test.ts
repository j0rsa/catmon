import { describe, expect, it } from 'vitest';
import { extractWeightTags, normalizeWeightNote, parseWeightNote, primaryWeightTag, tagsForWeightNote, weightNoteHasAnyTag } from './weightNote';

describe('normalizeWeightNote', () => {
  it('tags empty notes as #manual', () => {
    expect(normalizeWeightNote(null)).toBe('#manual');
    expect(normalizeWeightNote('')).toBe('#manual');
    expect(normalizeWeightNote('  ')).toBe('#manual');
  });

  it('prefixes untagged notes with #manual', () => {
    expect(normalizeWeightNote('Morning weigh-in')).toBe('#manual Morning weigh-in');
  });

  it('keeps existing hashtags', () => {
    expect(normalizeWeightNote('#vet after meal')).toBe('#vet after meal');
    expect(normalizeWeightNote('#manual')).toBe('#manual');
  });

  it('turns a Petkit word into #Petkit', () => {
    expect(normalizeWeightNote('Petkit toileting')).toBe('#Petkit toileting');
    expect(normalizeWeightNote('after petkit visit')).toBe('after #Petkit visit');
    expect(normalizeWeightNote('#Petkit toileting')).toBe('#Petkit toileting');
  });
});

describe('parseWeightNote', () => {
  it('splits tags from the remaining text', () => {
    expect(parseWeightNote('#Petkit toileting')).toEqual({
      tags: ['Petkit'],
      rest: 'toileting',
      raw: '#Petkit toileting',
    });
    expect(parseWeightNote('#manual')).toEqual({
      tags: ['manual'],
      rest: '',
      raw: '#manual',
    });
  });

  it('extracts the first tag as the chart series', () => {
    expect(extractWeightTags('#Petkit #home toileting')).toEqual(['Petkit', 'home']);
    expect(primaryWeightTag('#Petkit toileting')).toBe('Petkit');
    expect(primaryWeightTag('no tags')).toBe('manual');
  });

  it('matches exclude tags case-insensitively and treats untagged notes as manual', () => {
    expect(weightNoteHasAnyTag('#Petkit toileting', ['petkit'])).toBe(true);
    expect(weightNoteHasAnyTag('#Petkit toileting', ['manual'])).toBe(false);
    expect(weightNoteHasAnyTag(null, ['manual'])).toBe(true);
    expect(tagsForWeightNote('#Petkit #home')).toEqual(['Petkit', 'home']);
  });
});
