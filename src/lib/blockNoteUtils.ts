import type { PartialBlock } from '@blocknote/core';

/**
 * Slice 4.2e — every BlockNote-backed field reads its stored value
 * through this before handing it to `useCreateBlockNote`'s
 * `initialContent`. Three shapes can show up at runtime even though
 * the TS contract says `Block[] | null`:
 *  - already a real `Block[]` document → used as-is.
 *  - a legacy flat `details` object from 4.2c/4.2d's one-textarea-per-
 *    field era (e.g. `{ beliefs: "...", culture: "..." }`) → synthesized
 *    into a document (one heading + paragraph per non-empty field) so
 *    nothing already written is silently lost.
 *  - `null`/`undefined`/anything else → an empty document.
 * A defensive read-path, not a designed migration — this data is
 * understood to be disposable test/development content at this stage.
 */
export function toBlocksValue(raw: unknown): PartialBlock[] {
  if (Array.isArray(raw)) {
    return raw as PartialBlock[];
  }
  if (raw && typeof raw === 'object') {
    const entries = Object.entries(raw as Record<string, unknown>).filter(
      ([, v]) => typeof v === 'string' && v.trim().length > 0
    ) as [string, string][];
    if (entries.length === 0) return [];
    return entries.flatMap(([key, value]): PartialBlock[] => [
      { type: 'heading', props: { level: 3 }, content: [{ type: 'text', text: labelFromKey(key), styles: {} }] },
      { type: 'paragraph', content: [{ type: 'text', text: value, styles: {} }] },
    ]);
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return [{ type: 'paragraph', content: [{ type: 'text', text: raw, styles: {} }] }];
  }
  return [];
}

function labelFromKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}
