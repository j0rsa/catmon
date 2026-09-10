const TAG_RE = /#([A-Za-z][A-Za-z0-9_-]*)/g;
const MANUAL_TAG = 'manual';

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
