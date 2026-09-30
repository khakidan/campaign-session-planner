import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteEditor } from './NoteEditor';
import type { PartialBlock } from '@blocknote/core';
import type { Block } from '../types';

/**
 * Phase 2 item 7 — a separate test file (rather than the shared
 * `mockBlockNoteFreeformField()` every other `NoteEditor.test.tsx`
 * assertion uses) because this specifically needs to inspect the
 * *incoming* `template` prop, which the shared mock ignores —
 * `TemplateSettingsPanel.test.tsx` keeps its own inline mock for the
 * same reason.
 */
vi.mock('./BlockNoteFreeformField', () => ({
  BlockNoteFreeformField: ({ template }: { template?: PartialBlock[] }) => (
    <div data-testid="template-heading-count">{template ? template.length : 'none'}</div>
  ),
}));

describe('NoteEditor starter-template wiring', () => {
  it('passes no template on a new Note until a type with starter content is chosen', async () => {
    const user = userEvent.setup();
    render(<NoteEditor note={null} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByTestId('template-heading-count')).toHaveTextContent('none');

    await user.type(screen.getByLabelText('Type'), 'Session Safety');

    expect(screen.getByTestId('template-heading-count')).not.toHaveTextContent('none');
  });

  it('passes no template for a type with no starter content', async () => {
    const user = userEvent.setup();
    render(<NoteEditor note={null} onSave={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Type'), 'General');

    expect(screen.getByTestId('template-heading-count')).toHaveTextContent('none');
  });

  it('never offers starter content when editing an existing Note', () => {
    render(
      <NoteEditor
        note={{
          id: 'note-1',
          campaignId: 'campaign-1',
          title: 'Existing',
          type: 'Session Safety',
          status: null,
          content: [] as Block[],
          tags: [],
          createdAt: 'x',
          updatedAt: 'x',
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('template-heading-count')).toHaveTextContent('none');
  });
});
