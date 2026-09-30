import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignChangesPanel } from './CampaignChangesPanel';
import type { CampaignChanges } from '../lib/campaignChanges';

function emptyChanges(): CampaignChanges {
  return { npcs: [], groups: [], locations: [], threads: [], quests: [], events: [] };
}

describe('CampaignChangesPanel', () => {
  it('shows an empty-state message for every group when nothing changed', () => {
    render(<CampaignChangesPanel changes={emptyChanges()} onOpenPlannerEntity={vi.fn()} />);
    expect(screen.getByText('No NPCs changed.')).toBeInTheDocument();
    expect(screen.getByText('No Threads changed.')).toBeInTheDocument();
  });

  it('renders changed entities and lets a GM click through to the real one', async () => {
    const user = userEvent.setup();
    const onOpenPlannerEntity = vi.fn();
    const npc = { id: 'npc-1', campaignId: 'c1', name: 'Mariel', details: [], createdAt: '', updatedAt: '' };

    render(
      <CampaignChangesPanel changes={{ ...emptyChanges(), npcs: [npc] }} onOpenPlannerEntity={onOpenPlannerEntity} />
    );

    await user.click(screen.getByText('Mariel'));
    expect(onOpenPlannerEntity).toHaveBeenCalledWith({ type: 'npc', id: 'npc-1', source: 'planner' });
  });
});
