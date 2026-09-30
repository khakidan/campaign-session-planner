import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlockNoteFreeformField } from './BlockNoteFreeformField';
import { createFakeHostAdapter } from '../test/fixtures';
import type { EntityEditorLinksProps } from './EntityLinksPanel';
import type { Block } from '../types';

/**
 * Runs under `vitest.browser.config.ts` (real Chromium via Playwright,
 * `npm run test:browser`) — NOT the default jsdom suite
 * (`vitest.config.ts`, `npm test`). This is the real `[[`/`@`
 * typed-trigger path `EntityReferenceInlineContent.test.tsx`'s own doc
 * comment says jsdom can't drive: typing the trigger character opens
 * BlockNote's real `SuggestionMenuController` via ProseMirror's live
 * cursor-position code (`coordsAtPos`/`scrollToSelection`), which calls
 * browser geometry APIs (`elementsFromPoint`, `Range.getClientRects`,
 * `DOMRect.toJSON`, `Element.getBoundingClientRect` on text-node
 * targets) that a real browser — unlike jsdom — actually implements.
 * ROADMAP.md flagged this as "worth a real browser, not jsdom" rather
 * than untestable outright; this is that real browser.
 */
function baseLinking(overrides: Partial<EntityEditorLinksProps> = {}): EntityEditorLinksProps {
  return {
    plannerItems: [{ type: 'npc', id: 'npc-1', label: 'Sister Mariel' }],
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

function Controlled({ linking }: { linking: EntityEditorLinksProps }) {
  const [value, setValue] = useState<Block[]>([]);
  return <BlockNoteFreeformField value={value} onChange={setValue} linking={linking} />;
}

describe('EntityReferenceInlineContent — real typed-trigger path', () => {
  it('typing "@" opens the suggestion menu, and selecting a result inserts a real, clickable entityReference', async () => {
    const user = userEvent.setup();
    const onAddLink = vi.fn();
    render(<Controlled linking={baseLinking({ onAddLink })} />);

    const editor = screen.getByRole('textbox');
    await user.click(editor);
    await user.type(editor, '@Sister');

    const option = await screen.findByRole('option', { name: /Sister Mariel/ });
    await user.click(option);

    // The suggestion menu itself closes once a result is chosen.
    await waitFor(() => expect(screen.queryByRole('option', { name: /Sister Mariel/ })).not.toBeInTheDocument());

    // A real entityReference node was inserted — the same render path
    // `EntityReferenceInlineContent.test.tsx` exercises via pre-seeded
    // content, this time produced by an actual keystroke-driven flow.
    const inserted = await screen.findByText('Sister Mariel');
    expect(inserted.tagName).toBe('SPAN');
    expect(inserted).toHaveAttribute('contenteditable', 'false');

    expect(onAddLink).toHaveBeenCalledWith({ type: 'npc', id: 'npc-1', source: 'planner' }, 'Sister Mariel');
  });

  it('typing "[[" also opens the suggestion menu (the second registered trigger character)', async () => {
    const user = userEvent.setup();
    render(<Controlled linking={baseLinking()} />);

    const editor = screen.getByRole('textbox');
    await user.click(editor);
    // `[` is userEvent's special-key delimiter — `[[[[` is its own
    // escape for two literal `[` characters (`[[` alone types one).
    await user.type(editor, '[[[[Sister');

    expect(await screen.findByRole('option', { name: /Sister Mariel/ })).toBeInTheDocument();
  });
});
