import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StorylineEditor } from './StorylineEditor';

vi.mock('./BlockNoteFreeformField', () => ({
  BlockNoteFreeformField: ({ onChange }: { onChange: (blocks: unknown[]) => void }) => (
    <button
      type="button"
      onClick={() => onChange([{ type: 'paragraph', content: [{ type: 'text', text: 'A conspiracy unfolds.', styles: {} }] }])}
    >
      Simulate typing content
    </button>
  ),
}));

describe('StorylineEditor', () => {
  it('save: passes the complete, exact form values to onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<StorylineEditor storyline={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'The Fey Conspiracy');
    await user.type(screen.getByLabelText('Status'), 'Active');
    await user.type(screen.getByLabelText('Priority'), 'High');
    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));

    await user.click(screen.getByRole('button', { name: 'Save Storyline' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'The Fey Conspiracy',
      status: 'Active',
      priority: 'High',
      details: [{ type: 'paragraph', content: [{ type: 'text', text: 'A conspiracy unfolds.', styles: {} }] }],
    });
  });

  it('rejects saving with an empty name', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<StorylineEditor storyline={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save Storyline' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
  });
});
