import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StorylineEditor } from './StorylineEditor';
import { MOCK_TYPED_CONTENT } from '../test/mocks/blockNote';

vi.mock('./BlockNoteFreeformField', async () => (await import('../test/mocks/blockNote')).mockBlockNoteFreeformField());

describe('StorylineEditor', () => {
  it('save: passes the complete, exact form values to onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<StorylineEditor storyline={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'The Fey Conspiracy');
    await user.type(screen.getByLabelText('Status'), 'Active');
    await user.selectOptions(screen.getByLabelText('Priority'), 'High');
    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));

    await user.click(screen.getByRole('button', { name: 'Save Storyline' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'The Fey Conspiracy',
      status: 'Active',
      priority: 'High',
      details: MOCK_TYPED_CONTENT,
    }, null);
  });

  it('rejects saving with an empty name', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<StorylineEditor storyline={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save Storyline' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
  });

  it('renderFields: replaces the default field block, and defaultFields lets a host wrap instead of replace', () => {
    render(
      <StorylineEditor
        storyline={null}
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

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Extra Field')).toBeInTheDocument();
  });

  // Regression: Storyline was shipped without autosave at all (unlike Note/
  // Npc/Group/Location/Session) -- a bug report caught it as lost work on
  // navigate-away without an explicit Save click.
  it('autosave: debounces and persists in the background, and reuses the autosave-created id on an explicit Save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onAutosave = vi.fn().mockResolvedValue({ id: 'autosaved-storyline-1' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<StorylineEditor storyline={null} onSave={onSave} onAutosave={onAutosave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'The Fey Conspiracy');
    await vi.advanceTimersByTimeAsync(1500);
    expect(onAutosave).toHaveBeenCalledWith(expect.objectContaining({ name: 'The Fey Conspiracy' }), null);

    await user.click(screen.getByRole('button', { name: 'Save Storyline' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'The Fey Conspiracy' }), 'autosaved-storyline-1');
    vi.useRealTimers();
  });

  it('never autosaves a blank new Storyline — stays disabled until Name is non-empty', async () => {
    const user = userEvent.setup();
    const onAutosave = vi.fn().mockResolvedValue({ id: 'x' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<StorylineEditor storyline={null} onSave={vi.fn()} onAutosave={onAutosave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Status'), 'Active');
    await vi.advanceTimersByTimeAsync(5000);

    expect(onAutosave).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('never autosaves when onAutosave is omitted — a host that has not wired autosave gets the old click-to-save behavior unchanged', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<StorylineEditor storyline={null} onSave={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'The Fey Conspiracy');
    await vi.advanceTimersByTimeAsync(5000);

    expect(screen.queryByText('Saving…')).not.toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
