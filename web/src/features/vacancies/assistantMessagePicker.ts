import type { DraftKey } from "./createModeModel";

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function pickVariant(variants: readonly string[], seed: string, turn: number): string {
  if (variants.length === 0) return "";
  const i = (hashSeed(seed) + turn) % variants.length;
  return variants[i]! ?? variants[0]!;
}

export function formatMissingList(
  keys: DraftKey[],
  labels: Record<DraftKey, string>,
): string {
  return keys
    .map((k) => labels[k] ?? k)
    .filter(Boolean)
    .join(", ");
}
