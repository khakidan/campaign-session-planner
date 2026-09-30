import React from 'react';
import type { Block } from '../../types';

/**
 * The fixed `Block[]` payload the shared `BlockNoteFreeformField` mock
 * (below) reports via `onChange` when its "Simulate typing content"
 * button is clicked. One shared constant instead of every editor's
 * seam test inventing its own flavor text — the seam being tested is
 * "whatever content BlockNote reports reaches `onSave` intact," not
 * the exact wording, so there was never a reason for it to vary.
 */
export const MOCK_TYPED_CONTENT: Block[] = [
  { type: 'paragraph', content: [{ type: 'text', text: 'Simulated typed content.', styles: {} }] },
] as unknown as Block[];

/**
 * Test-only stand-in for the real `BlockNoteFreeformField` — a heavy
 * third-party rich-text engine (BlockNote/ProseMirror) that isn't the
 * thing under test in an editor's own seam test (whether typed content
 * reaches `onSave` correctly is; BlockNote's own editing behavior is
 * covered directly, unmocked, in `BlockNoteFreeformField.test.tsx` and
 * `EntityReferenceInlineContent.test.tsx`). Every editor's seam test
 * uses this the same way:
 *
 * ```ts
 * vi.mock('./BlockNoteFreeformField', () => mockBlockNoteFreeformField());
 * ```
 *
 * `TemplateSettingsPanel.test.tsx` is the one exception — it needs to
 * assert on the *incoming* `value` prop (which shipped template loaded
 * for which kind), not just the outgoing `onChange`, so it keeps its
 * own inline mock rather than using this one.
 */
export function mockBlockNoteFreeformField() {
  return {
    BlockNoteFreeformField: ({ onChange }: { onChange: (blocks: Block[]) => void }) => (
      <button type="button" onClick={() => onChange(MOCK_TYPED_CONTENT)}>
        Simulate typing content
      </button>
    ),
  };
}

/**
 * Test-only stand-in for the real `ReadOnlyBlockNoteView` — same
 * rationale as `mockBlockNoteFreeformField` above, but for the Quick
 * Reference Drawer's read-only renderer, which only ever receives
 * `blocks` (no `onChange`). Extracts each block's first plain-text run
 * so a test can assert on the visible text without depending on
 * BlockNote's own DOM structure.
 */
export function mockReadOnlyBlockNoteView() {
  return {
    ReadOnlyBlockNoteView: ({ blocks }: { blocks: Array<{ content?: Array<{ text: string }> }> }) => (
      <div data-testid="readonly-content">{blocks.flatMap((b) => b.content?.map((c) => c.text) ?? []).join(' ')}</div>
    ),
  };
}
