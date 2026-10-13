import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventEditor } from './EventEditor';
import { MOCK_TYPED_CONTENT } from '../test/mocks/blockNote';

vi.mock('./BlockNoteFreeformField', async () => (await import('../test/mocks/blockNote')).mockBlockNoteFreeformField());

describe('EventEditor', () => {
  it('save: passes the complete, exact form values to onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<EventEditor event={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'The Bridge Collapse');
    await user.type(screen.getByLabelText('Event Type'), 'Disaster');
    await user.type(screen.getByLabelText('Status'), 'Occurred');
    fireEvent.change(screen.getByLabelText('Date / Time'), { target: { value: '2024-03-15' } });
    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));

    await user.click(screen.getByRole('button', { name: 'Save Event' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'The Bridge Collapse',
      eventType: 'Disaster',
      status: 'Occurred',
      date: '2024-03-15',
      details: MOCK_TYPED_CONTENT,
    }, null);
  });

  it('rejects saving with an empty name', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<EventEditor event={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save Event' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
  });

  it('renderFields: replaces the default field block, and defaultFields lets a host wrap instead of replace', () => {
    render(
      <EventEditor
        event={null}
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

  // Regression: Event was shipped without autosave at all (unlike Note/Npc/
  // Group/Location/Session) -- a bug report caught it as lost work on
  // navigate-away without an explicit Save click.
  it('autosave: debounces and persists in the background, and reuses the autosave-created id on an explicit Save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onAutosave = vi.fn().mockResolvedValue({ id: 'autosaved-event-1' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<EventEditor event={null} onSave={onSave} onAutosave={onAutosave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'The Bridge Collapse');
    await vi.advanceTimersByTimeAsync(1500);
    expect(onAutosave).toHaveBeenCalledWith(expect.objectContaining({ name: 'The Bridge Collapse' }), null);

    await user.click(screen.getByRole('button', { name: 'Save Event' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'The Bridge Collapse' }), 'autosaved-event-1');
    vi.useRealTimers();
  });

  it('never autosaves a blank new Event — stays disabled until Name is non-empty', async () => {
    const user = userEvent.setup();
    const onAutosave = vi.fn().mockResolvedValue({ id: 'x' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<EventEditor event={null} onSave={vi.fn()} onAutosave={onAutosave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Event Type'), 'Disaster');
    await vi.advanceTimersByTimeAsync(5000);

    expect(onAutosave).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('never autosaves when onAutosave is omitted — a host that has not wired autosave gets the old click-to-save behavior unchanged', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<EventEditor event={null} onSave={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'The Bridge Collapse');
    await vi.advanceTimersByTimeAsync(5000);

    expect(screen.queryByText('Saving…')).not.toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
