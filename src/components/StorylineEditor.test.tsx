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
    await user.type(screen.getByLabelText('Priority'), 'High');
    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));

    await user.click(screen.getByRole('button', { name: 'Save Storyline' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'The Fey Conspiracy',
      status: 'Active',
      priority: 'High',
      details: MOCK_TYPED_CONTENT,
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
