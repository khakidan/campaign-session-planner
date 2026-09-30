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

/**
 * Full-content search (ROADMAP.md's "Full-content search") — flattens a
 * stored BlockNote document into one plain-text string to match a
 * search query against. Duck-typed against `unknown`, not BlockNote's
 * own `Block` type: this runs over whatever `toBlocksValue` above also
 * has to defend against (a real `Block[]`, legacy flat `details`
 * objects, `null`) via the caller passing the same raw stored value.
 *
 * Walks nested `children` (used pervasively by `entityTemplates.ts`'s
 * toggle-heading pattern) and each block's `content` array of inline
 * nodes. A plain text run has a `.text` string; the custom
 * `entityReference` inline node (`EntityReferenceInlineContent.tsx`)
 * has no `.text` at all — its `props.label` is included instead, so a
 * document that only *mentions* an NPC via a `[[`/`@` reference is
 * still searchable by that NPC's name.
 */
export function extractBlockText(raw: unknown): string {
  if (!Array.isArray(raw)) return '';
  const parts: string[] = [];
  const walkBlocks = (blocks: unknown[]) => {
    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue;
      const { content, children } = block as { content?: unknown; children?: unknown };
      if (Array.isArray(content)) walkInline(content);
      if (Array.isArray(children)) walkBlocks(children);
    }
  };
  const walkInline = (nodes: unknown[]) => {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const { text, props } = node as { text?: unknown; props?: { label?: unknown } };
      if (typeof text === 'string') parts.push(text);
      else if (props && typeof props.label === 'string') parts.push(props.label);
    }
  };
  walkBlocks(raw);
  return parts.join(' ').trim();
}

function labelFromKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}
