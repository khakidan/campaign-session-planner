import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NpcEditor } from './NpcEditor';

vi.mock('./BlockNoteFreeformField', () => ({
  BlockNoteFreeformField: ({ onChange }: { onChange: (blocks: unknown[]) => void }) => (
    <button
      type="button"
      onClick={() => onChange([{ type: 'paragraph', content: [{ type: 'text', text: 'Motivated by revenge.', styles: {} }] }])}
    >
      Simulate typing content
    </button>
  ),
}));

describe('NpcEditor', () => {
  it('save: passes the exact name and content to onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<NpcEditor npc={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'Sister Mariel');
    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));
    await user.click(screen.getByRole('button', { name: 'Save NPC' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Sister Mariel',
      details: [{ type: 'paragraph', content: [{ type: 'text', text: 'Motivated by revenge.', styles: {} }] }],
    });
  });

  it('rejects saving with an empty name', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<NpcEditor npc={null} onSave={onSave} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save NPC' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
  });
});
