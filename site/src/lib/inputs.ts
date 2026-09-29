export type AngleDraft = { ok: true; value: number } | { ok: false; error: string };

const NUMBER = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

/** Parse an angle typed into a "try it" field. Only complete, in-range numbers are accepted. */
export function parseAngleDraft(text: string, range: { min: number; max: number }): AngleDraft {
  const t = text.trim();
  const message = `Enter a number from ${range.min} to ${range.max}`;
  if (!NUMBER.test(t)) return { ok: false, error: message };
  const value = Number(t);
  if (!Number.isFinite(value) || value < range.min || value > range.max) return { ok: false, error: message };
  return { ok: true, value };
}
