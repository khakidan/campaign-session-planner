import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventEditor } from './EventEditor';

vi.mock('./BlockNoteFreeformField', () => ({
  BlockNoteFreeformField: ({ onChange }: { onChange: (blocks: unknown[]) => void }) => (
    <button
      type="button"
      onClick={() => onChange([{ type: 'paragraph', content: [{ type: 'text', text: 'The bridge collapses.', styles: {} }] }])}
    >
      Simulate typing content
    </button>
  ),
}));

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
      details: [{ type: 'paragraph', content: [{ type: 'text', text: 'The bridge collapses.', styles: {} }] }],
    });
  });

  it('rejects saving with an empty name', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<EventEditor event={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save Event' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
  });
});
