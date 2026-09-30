import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityLinkPicker, type PlannerSearchItem } from './EntityLinkPicker';
import { createFakeHostAdapter } from '../test/fixtures';
import type { EntityReference } from '../types';

const plannerItems: PlannerSearchItem[] = [
  { type: 'note', id: 'note-1', label: 'A Secret' },
  { type: 'npc', id: 'npc-1', label: 'Sister Mariel' },
];
const excludeRef: EntityReference = { type: 'note', id: 'note-self', source: 'planner' };

describe('EntityLinkPicker', () => {
  it('lists planner items grouped by type, filtered by the search query', async () => {
    const user = userEvent.setup();
    render(
      <EntityLinkPicker plannerItems={plannerItems} hostAdapter={createFakeHostAdapter()} excludeRef={excludeRef} onSelect={vi.fn()} onClose={vi.fn()} />
    );

    expect(screen.getByText('A Secret')).toBeInTheDocument();
    expect(screen.getByText('Sister Mariel')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Search notes/), 'mariel');

    expect(screen.queryByText('A Secret')).not.toBeInTheDocument();
    expect(screen.getByText('Sister Mariel')).toBeInTheDocument();
  });

  it('excludes the entity being edited from its own link-target results', () => {
    render(
      <EntityLinkPicker
        plannerItems={[...plannerItems, { type: 'note', id: 'note-self', label: 'This Very Note' }]}
        hostAdapter={createFakeHostAdapter()}
        excludeRef={excludeRef}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByText('This Very Note')).not.toBeInTheDocument();
  });

  it('shows host-adapter search results under a separate "Campaign" group', async () => {
    const hostAdapter = createFakeHostAdapter({
      searchEntities: async () => [{ type: 'character', id: 'char-1', source: 'host', label: 'Thorn' }],
    });
    render(<EntityLinkPicker plannerItems={[]} hostAdapter={hostAdapter} excludeRef={excludeRef} onSelect={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Thorn')).toBeInTheDocument());
    expect(screen.getByText('Campaign')).toBeInTheDocument();
  });

  it('selecting a planner result calls onSelect with the exact EntityReference and label', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <EntityLinkPicker plannerItems={plannerItems} hostAdapter={createFakeHostAdapter()} excludeRef={excludeRef} onSelect={onSelect} onClose={vi.fn()} />
    );

    await user.click(screen.getByText('Sister Mariel'));

    expect(onSelect).toHaveBeenCalledWith({ type: 'npc', id: 'npc-1', source: 'planner' }, 'Sister Mariel');
  });

  it('selecting a host result calls onSelect with source "host"', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const hostAdapter = createFakeHostAdapter({
      searchEntities: async () => [{ type: 'character', id: 'char-1', source: 'host', label: 'Thorn' }],
    });
    render(<EntityLinkPicker plannerItems={[]} hostAdapter={hostAdapter} excludeRef={excludeRef} onSelect={onSelect} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Thorn')).toBeInTheDocument());
    await user.click(screen.getByText('Thorn'));

    expect(onSelect).toHaveBeenCalledWith({ type: 'character', id: 'char-1', source: 'host' }, 'Thorn');
  });

  it('clicking Cancel or the backdrop calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<EntityLinkPicker plannerItems={plannerItems} hostAdapter={createFakeHostAdapter()} excludeRef={excludeRef} onSelect={vi.fn()} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
