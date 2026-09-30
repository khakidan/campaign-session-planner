import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityLinksPanel } from './EntityLinksPanel';
import { createFakeHostAdapter, makeEntityLink } from '../test/fixtures';
import type { EntityReference } from '../types';

const selfRef: EntityReference = { type: 'note', id: 'note-1', source: 'planner' };

function baseProps() {
  return {
    selfRef,
    plannerItems: [],
    hostAdapter: createFakeHostAdapter(),
    outgoing: [],
    incoming: [],
    onAddLink: vi.fn(),
    onRemoveLink: vi.fn(),
    onOpenPlannerEntity: vi.fn(),
  };
}

describe('EntityLinksPanel', () => {
  it('shows an empty state for both lists when there are no links', () => {
    render(<EntityLinksPanel {...baseProps()} />);

    expect(screen.getByText('No links yet.')).toBeInTheDocument();
    expect(screen.getByText('Nothing links here yet.')).toBeInTheDocument();
  });

  it('renders the stored label for an outgoing link, not a raw type:id string', () => {
    const link = makeEntityLink({ metadata: { label: 'Sister Mariel' } });
    render(<EntityLinksPanel {...baseProps()} outgoing={[link]} />);

    expect(screen.getByText('Sister Mariel')).toBeInTheDocument();
  });

  it('falls back to the source Note\'s title for a pre-sourceLabel backlink', () => {
    const link = makeEntityLink({
      sourceType: 'note',
      sourceId: 'note-legacy',
      targetType: 'npc',
      targetId: 'npc-1',
      metadata: {},
    });
    render(
      <EntityLinksPanel
        {...baseProps()}
        selfRef={{ type: 'npc', id: 'npc-1', source: 'planner' }}
        incoming={[link]}
        plannerItems={[{ type: 'note', id: 'note-legacy', label: 'Legacy Note Title' }]}
      />
    );

    expect(screen.getByText('Legacy Note Title')).toBeInTheDocument();
  });

  it('clicking a planner-type target opens it via onOpenPlannerEntity, not onOpenHostEntity', async () => {
    const user = userEvent.setup();
    const onOpenPlannerEntity = vi.fn();
    const onOpenHostEntity = vi.fn();
    const link = makeEntityLink({ targetType: 'npc', targetId: 'npc-1', metadata: { label: 'Sister Mariel' } });
    render(<EntityLinksPanel {...baseProps()} outgoing={[link]} onOpenPlannerEntity={onOpenPlannerEntity} onOpenHostEntity={onOpenHostEntity} />);

    await user.click(screen.getByText('Sister Mariel'));

    expect(onOpenPlannerEntity).toHaveBeenCalledWith({ type: 'npc', id: 'npc-1', source: 'planner' });
    expect(onOpenHostEntity).not.toHaveBeenCalled();
  });

  it('clicking a host-type target opens it via onOpenHostEntity, not onOpenPlannerEntity', async () => {
    const user = userEvent.setup();
    const onOpenPlannerEntity = vi.fn();
    const onOpenHostEntity = vi.fn();
    const link = makeEntityLink({ targetType: 'character', targetId: 'char-1', metadata: { label: 'Thorn' } });
    render(<EntityLinksPanel {...baseProps()} outgoing={[link]} onOpenPlannerEntity={onOpenPlannerEntity} onOpenHostEntity={onOpenHostEntity} />);

    await user.click(screen.getByText('Thorn'));

    expect(onOpenHostEntity).toHaveBeenCalledWith('character', 'char-1');
    expect(onOpenPlannerEntity).not.toHaveBeenCalled();
  });

  it('removing a link calls onRemoveLink with exactly that link\'s id', async () => {
    const user = userEvent.setup();
    const onRemoveLink = vi.fn();
    const link = makeEntityLink({ id: 'link-to-remove', metadata: { label: 'Sister Mariel' } });
    render(<EntityLinksPanel {...baseProps()} outgoing={[link]} onRemoveLink={onRemoveLink} />);

    await user.click(screen.getByRole('button', { name: 'Remove link to Sister Mariel' }));

    expect(onRemoveLink).toHaveBeenCalledWith('link-to-remove');
  });

  it('opens the link picker on "+ Add Link" and adding one calls onAddLink', async () => {
    const user = userEvent.setup();
    const onAddLink = vi.fn();
    render(
      <EntityLinksPanel
        {...baseProps()}
        onAddLink={onAddLink}
        plannerItems={[{ type: 'npc', id: 'npc-2', label: 'The Duke' }]}
      />
    );

    await user.click(screen.getByRole('button', { name: '+ Add Link' }));
    await user.click(screen.getByText('The Duke'));

    expect(onAddLink).toHaveBeenCalledWith({ type: 'npc', id: 'npc-2', source: 'planner' }, 'The Duke');
  });
});
