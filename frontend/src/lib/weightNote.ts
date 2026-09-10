const TAG_RE = /#([A-Za-z][A-Za-z0-9_-]*)/g;
export const MANUAL_TAG = 'manual';

export interface ParsedWeightNote {
  tags: string[];
  rest: string;
  raw: string;
}

export function extractWeightTags(note: string): string[] {
  return [...note.matchAll(TAG_RE)].map((match) => match[1]);
}

export function parseWeightNote(note: string | null | undefined): ParsedWeightNote {
  const raw = note ?? '';
  const tags = extractWeightTags(raw);
  const rest = raw.replace(TAG_RE, ' ').replace(/\s+/g, ' ').trim();
  return { tags, rest, raw };
}

export function primaryWeightTag(note: string | null | undefined): string {
  return extractWeightTags(note ?? '')[0] ?? MANUAL_TAG;
}

/** Tags on a note; untagged notes count as `manual`. */
export function tagsForWeightNote(note: string | null | undefined): string[] {
  const tags = extractWeightTags(note ?? '');
  return tags.length > 0 ? tags : [MANUAL_TAG];
}

/** True when the note carries any of `tags` (case-insensitive). */
export function weightNoteHasAnyTag(note: string | null | undefined, tags: string[]): boolean {
  if (tags.length === 0) return false;
  const want = new Set(tags.map((tag) => tag.toLowerCase()));
  return tagsForWeightNote(note).some((tag) => want.has(tag.toLowerCase()));
}

function hashUnhashedPetkit(input: string): string {
  return input.replace(/(^|[^#])(petkit)/gi, (_, prefix: string) => `${prefix}#Petkit`);
}

/** Mirror of backend `normalize_weight_note` for optimistic UI and tests. */
export function normalizeWeightNote(note: string | null | undefined): string {
  const trimmed = note?.trim() ?? '';
  const withPetkit = hashUnhashedPetkit(trimmed);
  if (extractWeightTags(withPetkit).length === 0) {
    return withPetkit.length === 0 ? `#${MANUAL_TAG}` : `#${MANUAL_TAG} ${withPetkit}`;
  }
  return withPetkit;
}
