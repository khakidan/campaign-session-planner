import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoreEditor } from './LoreEditor';
import { MOCK_TYPED_CONTENT } from '../test/mocks/blockNote';

vi.mock('./BlockNoteFreeformField', async () => (await import('../test/mocks/blockNote')).mockBlockNoteFreeformField());

describe('LoreEditor', () => {
  it('save: passes the complete, exact form values to onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<LoreEditor lore={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Title'), 'The Ebon Sigil');
    await user.type(screen.getByLabelText('Status'), 'Established');
    await user.type(screen.getByLabelText('Tags (comma-separated)'), 'ebon-sigil, pandemonium');
    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));

    await user.click(screen.getByRole('button', { name: 'Save Lore' }));

    expect(onSave).toHaveBeenCalledWith(
      {
        title: 'The Ebon Sigil',
        status: 'Established',
        tags: 'ebon-sigil, pandemonium',
        content: MOCK_TYPED_CONTENT,
      },
      null
    );
  });

  it('rejects saving with an empty title', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<LoreEditor lore={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save Lore' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
  });

  it('pre-fills the form from an existing Lore entry, including the tags array joined back into text', () => {
    render(
      <LoreEditor
        lore={{
          id: 'lore-1',
          campaignId: 'campaign-1',
          title: 'The Ebon Sigil',
          status: 'Established',
          content: [],
          tags: ['a', 'b'],
          createdAt: 'x',
          updatedAt: 'x',
        }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Title')).toHaveValue('The Ebon Sigil');
    expect(screen.getByLabelText('Status')).toHaveValue('Established');
    expect(screen.getByLabelText('Tags (comma-separated)')).toHaveValue('a, b');
  });

  it('shows a Delete button only when onDelete is provided, and calls it on click', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<LoreEditor lore={null} onSave={vi.fn()} onCancel={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: 'Delete Lore' }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('renderFields: replaces the default field block, and defaultFields lets a host wrap instead of replace', () => {
    render(
      <LoreEditor
        lore={null}
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

  it('autosave: debounces and persists in the background, and reuses the autosave-created id on an explicit Save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onAutosave = vi.fn().mockResolvedValue({ id: 'autosaved-lore-1' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<LoreEditor lore={null} onSave={onSave} onAutosave={onAutosave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Title'), 'The Ebon Sigil');
    await vi.advanceTimersByTimeAsync(1500);
    expect(onAutosave).toHaveBeenCalledWith(expect.objectContaining({ title: 'The Ebon Sigil' }), null);

    await user.click(screen.getByRole('button', { name: 'Save Lore' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'The Ebon Sigil' }), 'autosaved-lore-1');
    vi.useRealTimers();
  });

  it('never autosaves a blank new Lore entry — stays disabled until Title is non-empty', async () => {
    const user = userEvent.setup();
    const onAutosave = vi.fn().mockResolvedValue({ id: 'x' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<LoreEditor lore={null} onSave={vi.fn()} onAutosave={onAutosave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Status'), 'Established');
    await vi.advanceTimersByTimeAsync(5000);

    expect(onAutosave).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('never autosaves when onAutosave is omitted — a host that has not wired autosave gets the old click-to-save behavior unchanged', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<LoreEditor lore={null} onSave={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Title'), 'The Ebon Sigil');
    await vi.advanceTimersByTimeAsync(5000);

    expect(screen.queryByText('Saving…')).not.toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
