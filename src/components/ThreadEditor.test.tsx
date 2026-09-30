import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThreadEditor } from './ThreadEditor';
import { MOCK_TYPED_CONTENT } from '../test/mocks/blockNote';

vi.mock('./BlockNoteFreeformField', async () => (await import('../test/mocks/blockNote')).mockBlockNoteFreeformField());

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
      details: MOCK_TYPED_CONTENT,
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

  it('renderFields: replaces the default field block, and defaultFields lets a host wrap instead of replace', () => {
    render(
      <ThreadEditor
        thread={null}
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
});
