import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NpcEditor } from './NpcEditor';
import { MOCK_TYPED_CONTENT } from '../test/mocks/blockNote';

vi.mock('./BlockNoteFreeformField', async () => (await import('../test/mocks/blockNote')).mockBlockNoteFreeformField());

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
      details: MOCK_TYPED_CONTENT,
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
