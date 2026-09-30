import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThreadEditor } from './ThreadEditor';

vi.mock('./BlockNoteFreeformField', () => ({
  BlockNoteFreeformField: ({ onChange }: { onChange: (blocks: unknown[]) => void }) => (
    <button
      type="button"
      onClick={() => onChange([{ type: 'paragraph', content: [{ type: 'text', text: 'The Duke is hiding something.', styles: {} }] }])}
    >
      Simulate typing content
    </button>
  ),
}));

describe('ThreadEditor', () => {
  it('save: passes the complete, exact form values to onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ThreadEditor thread={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), "The Duke's Secret");
    await user.type(screen.getByLabelText('Status'), 'Open');
    await user.type(screen.getByLabelText('Priority'), 'High');
    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));

    await user.click(screen.getByRole('button', { name: 'Save Thread' }));

    expect(onSave).toHaveBeenCalledWith({
      name: "The Duke's Secret",
      status: 'Open',
      priority: 'High',
      details: [{ type: 'paragraph', content: [{ type: 'text', text: 'The Duke is hiding something.', styles: {} }] }],
    });
  });

  it('rejects saving with an empty name', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ThreadEditor thread={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save Thread' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
  });
});
