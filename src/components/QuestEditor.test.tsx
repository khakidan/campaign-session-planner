import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestEditor } from './QuestEditor';

vi.mock('./BlockNoteFreeformField', () => ({
  BlockNoteFreeformField: ({ onChange }: { onChange: (blocks: unknown[]) => void }) => (
    <button
      type="button"
      onClick={() => onChange([{ type: 'paragraph', content: [{ type: 'text', text: 'Recover the Oortgard Amulet.', styles: {} }] }])}
    >
      Simulate typing content
    </button>
  ),
}));

describe('QuestEditor', () => {
  it('save: passes the complete, exact form values to onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<QuestEditor quest={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'The Oortgard Amulet');
    await user.type(screen.getByLabelText('Status'), 'Active');
    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));

    await user.click(screen.getByRole('button', { name: 'Save Quest' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'The Oortgard Amulet',
      status: 'Active',
      details: [{ type: 'paragraph', content: [{ type: 'text', text: 'Recover the Oortgard Amulet.', styles: {} }] }],
    });
  });

  it('rejects saving with an empty name', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<QuestEditor quest={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save Quest' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
  });
});
