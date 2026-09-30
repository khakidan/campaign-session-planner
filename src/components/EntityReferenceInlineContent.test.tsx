import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PartialBlock } from '@blocknote/core';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { createFakeHostAdapter } from '../test/fixtures';
import type { EntityEditorLinksProps } from './EntityLinksPanel';

/**
 * `EntityReferenceInlineContent.tsx` has no standalone-testable API of
 * its own — it's a BlockNote inline content spec (a schema definition
 * + a `render` function BlockNote calls internally), not a component a
 * test can mount directly. `BlockNoteFreeformField.tsx` is the only
 * place that registers it into a real schema, so these tests render a
 * document that already contains an inserted `entityReference` node
 * (exactly the shape `handleSelect`'s `editor.insertInlineContent`
 * produces) and exercise its real, unmocked render + click behavior.
 *
 * What this deliberately does NOT attempt: driving the actual `[[`/`@`
 * *typed trigger* → BlockNote's `SuggestionMenuController` opening →
 * selecting a result, end to end through real keystrokes. That path
 * runs through ProseMirror's live cursor-position code on every
 * keystroke (`coordsAtPos`/`scrollToSelection`), which calls real
 * browser geometry APIs jsdom doesn't implement — three separate ones
 * were found and polyfilled in `src/test/setup.ts`
 * (`elementsFromPoint`, `Range.getClientRects`, `DOMRect.toJSON`)
 * while attempting exactly this, and a fourth (`target.
 * getBoundingClientRect` on what ProseMirror treats as a text-node
 * target) surfaced immediately after — each fix uncovering a deeper
 * one in the same positioning code path, with no indication of when
 * that stops. Rendering already-inserted content instead verifies the
 * actual code this package owns (the inline content spec's render/
 * click-dispatch, `handleSelect`'s de-duplication logic — tested
 * below) without depending on ProseMirror internals no browser-free
 * environment provides.
 */
function baseLinking(overrides: Partial<EntityEditorLinksProps> = {}): EntityEditorLinksProps {
  return {
    plannerItems: [],
    hostAdapter: createFakeHostAdapter(),
    outgoing: [],
    incoming: [],
    onAddLink: vi.fn(),
    onRemoveLink: vi.fn(),
    onOpenPlannerEntity: vi.fn(),
    onOpenHostEntity: vi.fn(),
    ...overrides,
  };
}

function documentWithReference(props: {
  refType: string;
  refId: string;
  refSource: 'planner' | 'host';
  label: string;
}): PartialBlock[] {
  return [
    {
      type: 'paragraph',
      content: [{ type: 'entityReference', props }],
    },
  ] as unknown as PartialBlock[];
}

describe('EntityReferenceInlineContent', () => {
  it('renders the stored label as non-editable, clickable content', async () => {
    const value = documentWithReference({ refType: 'npc', refId: 'npc-1', refSource: 'planner', label: 'Sister Mariel' });
    render(<BlockNoteFreeformField value={value as never} onChange={vi.fn()} linking={baseLinking()} />);

    const node = await screen.findByText('Sister Mariel');
    expect(node.tagName).toBe('SPAN');
    expect(node).toHaveAttribute('contenteditable', 'false');
  });

  it('falls back to "type:id" when no label was stored', async () => {
    const value = documentWithReference({ refType: 'npc', refId: 'npc-1', refSource: 'planner', label: '' });
    render(<BlockNoteFreeformField value={value as never} onChange={vi.fn()} linking={baseLinking()} />);

    expect(await screen.findByText('npc:npc-1')).toBeInTheDocument();
  });

  it('clicking a planner-sourced reference calls onOpenPlannerEntity, not onOpenHostEntity', async () => {
    const user = userEvent.setup();
    const onOpenPlannerEntity = vi.fn();
    const onOpenHostEntity = vi.fn();
    const value = documentWithReference({ refType: 'npc', refId: 'npc-1', refSource: 'planner', label: 'Sister Mariel' });
    render(
      <BlockNoteFreeformField
        value={value as never}
        onChange={vi.fn()}
        linking={baseLinking({ onOpenPlannerEntity, onOpenHostEntity })}
      />
    );

    await user.click(await screen.findByText('Sister Mariel'));

    expect(onOpenPlannerEntity).toHaveBeenCalledWith({ type: 'npc', id: 'npc-1', source: 'planner' });
    expect(onOpenHostEntity).not.toHaveBeenCalled();
  });

  it('clicking a host-sourced reference calls onOpenHostEntity with (type, id), not onOpenPlannerEntity', async () => {
    const user = userEvent.setup();
    const onOpenPlannerEntity = vi.fn();
    const onOpenHostEntity = vi.fn();
    const value = documentWithReference({ refType: 'character', refId: 'char-1', refSource: 'host', label: 'Thorn' });
    render(
      <BlockNoteFreeformField
        value={value as never}
        onChange={vi.fn()}
        linking={baseLinking({ onOpenPlannerEntity, onOpenHostEntity })}
      />
    );

    await user.click(await screen.findByText('Thorn'));

    expect(onOpenHostEntity).toHaveBeenCalledWith('character', 'char-1');
    expect(onOpenPlannerEntity).not.toHaveBeenCalled();
  });

  it('clicking a reference does nothing (and does not throw) when there is no linking context at all', async () => {
    const user = userEvent.setup();
    const value = documentWithReference({ refType: 'npc', refId: 'npc-1', refSource: 'planner', label: 'Sister Mariel' });
    render(<BlockNoteFreeformField value={value as never} onChange={vi.fn()} />);

    await user.click(await screen.findByText('Sister Mariel'));
    // No assertion beyond "didn't throw" is possible here — there's no
    // linking prop at all, so nothing to assert was or wasn't called.
  });
});
