/** Parse a typed duration (`mm:ss`, `m:ss`, `m.ss` / `m,ss`, or whole seconds) into seconds. */
export function parseDurationToSecs(input: string): number | null {
  const trimmed = input.trim().replace(/[：﹕]/g, ':');
  if (!trimmed) return null;

  const separator = trimmed.includes(':')
    ? ':'
    : trimmed.includes(',')
      ? ','
      : trimmed.includes('.')
        ? '.'
        : null;

  if (separator) {
    const parts = trimmed.split(separator);
    if (parts.length !== 2) return null;
    const [minPart, secPart] = parts;
    if (!/^\d{1,3}$/.test(minPart) || !/^\d{1,2}$/.test(secPart)) return null;
    const total = Number(minPart) * 60 + Number(secPart);
    return total > 0 ? total : null;
  }

  if (/^\d{1,4}$/.test(trimmed)) {
    const total = Number(trimmed);
    return total > 0 ? total : null;
  }

  return null;
}

/** Canonical `m:ss` (seconds always two digits). */
export function formatDurationMmss(secs: number): string {
  const total = Math.max(0, Math.round(secs));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Blur helper: empty/zero stays empty; valid values format to `m:ss`. */
export function normalizeDurationInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const secs = parseDurationToSecs(trimmed);
  if (secs != null) return formatDurationMmss(secs);
  if (/^0+$/.test(trimmed) || /^0+[:.,]0+$/.test(trimmed)) return '';
  return trimmed;
}
