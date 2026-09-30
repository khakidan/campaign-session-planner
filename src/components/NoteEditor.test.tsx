import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteEditor } from './NoteEditor';

// `BlockNoteFreeformField` wraps a real ProseMirror-based rich-text
// engine (BlockNote) — per ROADMAP.md's Testing Plan, that's exactly
// the kind of heavy third-party dependency this project's testing
// philosophy says is fine to stub, since it is not the thing under
// test here (NoteEditor's own field-wiring/validation/save behavior
// is). The stub still exercises the real `value`/`onChange` contract.
vi.mock('./BlockNoteFreeformField', () => ({
  BlockNoteFreeformField: ({ onChange }: { onChange: (blocks: unknown[]) => void }) => (
    <button
      type="button"
      onClick={() => onChange([{ type: 'paragraph', content: [{ type: 'text', text: 'Typed content', styles: {} }] }])}
    >
      Simulate typing content
    </button>
  ),
}));

describe('NoteEditor', () => {
  it('save: passes the complete, exact form values to onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<NoteEditor note={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Title'), 'A Secret');
    await user.type(screen.getByLabelText('Type'), 'Secret');
    await user.type(screen.getByLabelText('Status'), 'Active');
    await user.type(screen.getByLabelText('Tags (comma-separated)'), 'ebon-sigil, pandemonium');
    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));

    await user.click(screen.getByRole('button', { name: 'Save Note' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      title: 'A Secret',
      type: 'Secret',
      status: 'Active',
      tags: 'ebon-sigil, pandemonium',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Typed content', styles: {} }] }],
    });
  });

  it('rejects saving with an empty title, showing an error instead of calling onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<NoteEditor note={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save Note' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
  });

  it('pre-fills the form from an existing Note, including the tags array joined back into text', () => {
    render(
      <NoteEditor
        note={{
          id: 'note-1',
          campaignId: 'campaign-1',
          title: 'Existing Note',
          type: 'Lore',
          status: 'Active',
          content: [],
          tags: ['a', 'b'],
          createdAt: 'x',
          updatedAt: 'x',
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Title')).toHaveValue('Existing Note');
    expect(screen.getByLabelText('Type')).toHaveValue('Lore');
    expect(screen.getByLabelText('Tags (comma-separated)')).toHaveValue('a, b');
  });

  it('shows a Delete button only when onDelete is provided, and calls it on click', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <NoteEditor
        note={{
          id: 'note-1',
          campaignId: 'campaign-1',
          title: 'Existing',
          type: null,
          status: null,
          content: [],
          tags: [],
          createdAt: 'x',
          updatedAt: 'x',
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onDelete={onDelete}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete Note' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
