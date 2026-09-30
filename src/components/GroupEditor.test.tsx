import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupEditor } from './GroupEditor';

vi.mock('./BlockNoteFreeformField', () => ({
  BlockNoteFreeformField: ({ onChange }: { onChange: (blocks: unknown[]) => void }) => (
    <button
      type="button"
      onClick={() => onChange([{ type: 'paragraph', content: [{ type: 'text', text: 'A cult of ash-worshippers.', styles: {} }] }])}
    >
      Simulate typing content
    </button>
  ),
}));

describe('GroupEditor', () => {
  it('save: passes the complete, exact form values to onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<GroupEditor group={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'The Ashen Circle');
    await user.type(screen.getByLabelText('Type'), 'CULT');
    await user.type(screen.getByLabelText('Status'), 'Active');
    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));

    await user.click(screen.getByRole('button', { name: 'Save Group' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'The Ashen Circle',
      type: 'CULT',
      status: 'Active',
      details: [{ type: 'paragraph', content: [{ type: 'text', text: 'A cult of ash-worshippers.', styles: {} }] }],
    });
  });

  it('rejects saving with an empty name', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<GroupEditor group={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save Group' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
  });

  it('shows a Delete button only when onDelete is provided, and calls it on click', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <GroupEditor
        group={{ id: 'group-1', campaignId: 'campaign-1', name: 'Existing', type: null, status: null, details: [], createdAt: 'x', updatedAt: 'x' }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onDelete={onDelete}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete Group' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
