import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteEditor } from './NoteEditor';
import { MOCK_TYPED_CONTENT } from '../test/mocks/blockNote';

// `BlockNoteFreeformField` wraps a real ProseMirror-based rich-text
// engine (BlockNote) — per ROADMAP.md's Testing Plan, that's exactly
// the kind of heavy third-party dependency this project's testing
// philosophy says is fine to stub, since it is not the thing under
// test here (NoteEditor's own field-wiring/validation/save behavior
// is). The shared mock still exercises the real `onChange` contract.
// Dynamically imported inside the factory — `vi.mock` is hoisted above
// this file's own top-level imports, so referencing a statically
// imported binding here hits a "before initialization" error.
vi.mock('./BlockNoteFreeformField', async () => (await import('../test/mocks/blockNote')).mockBlockNoteFreeformField());

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
    expect(onSave).toHaveBeenCalledWith(
      {
        title: 'A Secret',
        type: 'Secret',
        status: 'Active',
        tags: 'ebon-sigil, pandemonium',
        content: MOCK_TYPED_CONTENT,
      },
      null
    );
  });

  it('save: passes the autosave-created id, not null, once a background autosave has already created the record', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onAutosave = vi.fn().mockResolvedValue({ id: 'autosaved-note-1' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<NoteEditor note={null} onSave={onSave} onAutosave={onAutosave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Title'), 'A Secret');
    await vi.advanceTimersByTimeAsync(1500);
    expect(onAutosave).toHaveBeenCalledWith(expect.objectContaining({ title: 'A Secret' }), null);

    await user.click(screen.getByRole('button', { name: 'Save Note' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'A Secret' }), 'autosaved-note-1');
    vi.useRealTimers();
  });

  it('never autosaves a blank new Note — stays disabled until Title is non-empty', async () => {
    const user = userEvent.setup();
    const onAutosave = vi.fn().mockResolvedValue({ id: 'x' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<NoteEditor note={null} onSave={vi.fn()} onAutosave={onAutosave} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));
    await vi.advanceTimersByTimeAsync(5000);

    expect(onAutosave).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('never autosaves when onAutosave is omitted — a host that has not wired autosave gets the old click-to-save behavior unchanged', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<NoteEditor note={null} onSave={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Title'), 'A Secret');
    await vi.advanceTimersByTimeAsync(5000);

    expect(screen.queryByText('Saving…')).not.toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows the Saving…/Saved indicator as autosave runs', async () => {
    const user = userEvent.setup();
    const onAutosave = vi.fn().mockResolvedValue({ id: 'note-1' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<NoteEditor note={null} onSave={vi.fn()} onAutosave={onAutosave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Title'), 'A Secret');
    expect(screen.queryByText('Saving…')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();
    vi.useRealTimers();
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

  it('setting Confidence adds a confidence tag without disturbing existing tags', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<NoteEditor note={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Title'), 'A Theory');
    await user.type(screen.getByLabelText('Tags (comma-separated)'), 'ebon-sigil');
    await user.selectOptions(screen.getByLabelText('Confidence'), 'proposed');
    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));
    await user.click(screen.getByRole('button', { name: 'Save Note' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ tags: 'ebon-sigil, confidence:proposed' }), null);
  });

  it('pre-fills Confidence from an existing Note\'s tags', () => {
    render(
      <NoteEditor
        note={{
          id: 'note-1',
          campaignId: 'campaign-1',
          title: 'Existing',
          type: 'Player Theory',
          status: null,
          content: [],
          tags: ['confidence:inferred'],
          createdAt: 'x',
          updatedAt: 'x',
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Confidence')).toHaveValue('inferred');
  });

  it('shows the Session Briefing hint only once Type is set to a memory type, not for a plain type', async () => {
    const user = userEvent.setup();
    render(<NoteEditor note={null} onSave={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Type'), 'General');
    expect(screen.queryByText(/Surfaces automatically in Session Briefing/)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Type'));
    await user.type(screen.getByLabelText('Type'), 'Player Theory');
    expect(screen.getByText(/Surfaces automatically in Session Briefing/)).toBeInTheDocument();
  });

  it('shows the Recap Highlight hint only for that exact type', async () => {
    const user = userEvent.setup();
    render(<NoteEditor note={null} onSave={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Type'), 'Player Theory');
    expect(screen.queryByText(/shareable recap/)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Type'));
    await user.type(screen.getByLabelText('Type'), 'Recap Highlight');
    expect(screen.getByText(/shareable recap/)).toBeInTheDocument();
  });

  it('shows the confidence-badge hint only once a Confidence level is chosen', async () => {
    const user = userEvent.setup();
    render(<NoteEditor note={null} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByText(/never mistaken for a confirmed fact/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Confidence'), 'proposed');
    expect(screen.getByText(/never mistaken for a confirmed fact/)).toBeInTheDocument();
  });

  it('renderFields: replaces the default field block, receiving values/onChange/defaultFields', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <NoteEditor
        note={null}
        onSave={onSave}
        onCancel={vi.fn()}
        renderFields={({ values, onChange }) => (
          <button type="button" onClick={() => onChange((prev) => ({ ...prev, title: `custom-${values.title}` }))}>
            Set Custom Title
          </button>
        )}
      />
    );

    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Set Custom Title' }));
    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));
    await user.click(screen.getByRole('button', { name: 'Save Note' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'custom-' }), null);
  });

  it('renderFields: defaultFields lets a host wrap the shipped fields instead of replacing them', () => {
    render(
      <NoteEditor
        note={null}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        renderFields={({ defaultFields }) => (
          <div data-testid="wrapper">
            {defaultFields}
            <input aria-label="Extra Field" />
          </div>
        )}
      />
    );

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Extra Field')).toBeInTheDocument();
  });
});
