import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocationEditor } from './LocationEditor';
import type { Location } from '../types';
import { MOCK_TYPED_CONTENT } from '../test/mocks/blockNote';

vi.mock('./BlockNoteFreeformField', async () => (await import('../test/mocks/blockNote')).mockBlockNoteFreeformField());

const otherLocation: Location = {
  id: 'location-parent',
  campaignId: 'campaign-1',
  name: 'The Coastal Reach',
  type: null,
  parentLocationId: null,
  details: [],
  createdAt: 'x',
  updatedAt: 'x',
};

describe('LocationEditor', () => {
  it('save: passes the complete, exact form values to onSave, including the chosen parent', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<LocationEditor location={null} otherLocations={[otherLocation]} onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'Blackwater Village');
    await user.type(screen.getByLabelText('Type'), 'Village');
    await user.selectOptions(screen.getByLabelText('Parent Location'), 'location-parent');
    await user.click(screen.getByRole('button', { name: 'Simulate typing content' }));

    await user.click(screen.getByRole('button', { name: 'Save Location' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Blackwater Village',
      type: 'Village',
      parentLocationId: 'location-parent',
      details: MOCK_TYPED_CONTENT,
    });
  });

  it('defaults the parent to "None" (empty string), not a specific location', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<LocationEditor location={null} otherLocations={[otherLocation]} onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'Standalone Hamlet');
    await user.click(screen.getByRole('button', { name: 'Save Location' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ parentLocationId: '' }));
  });

  it('rejects saving with an empty name', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<LocationEditor location={null} otherLocations={[]} onSave={onSave} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save Location' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
  });

  it('offers every otherLocation as a parent option, by name', () => {
    render(<LocationEditor location={null} otherLocations={[otherLocation]} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('option', { name: 'The Coastal Reach' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'None' })).toBeInTheDocument();
  });
});
