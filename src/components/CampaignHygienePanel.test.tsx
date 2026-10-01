import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignHygienePanel } from './CampaignHygienePanel';
import type { CampaignHygieneReport } from '../lib/campaignHygiene';

function emptyGroups() {
  return { npcs: [], groups: [], locations: [], threads: [], quests: [], storylines: [] };
}

function emptyReport(): CampaignHygieneReport {
  return { stale: emptyGroups(), orphaned: emptyGroups() };
}

const npc = { id: 'npc-1', campaignId: 'c1', name: 'Mariel', details: [], createdAt: '', updatedAt: '' };

describe('CampaignHygienePanel', () => {
  it('shows a single all-clear message when nothing is flagged, not 12 empty-group lines', () => {
    render(<CampaignHygienePanel hygiene={emptyReport()} onOpenPlannerEntity={vi.fn()} />);

    expect(screen.getByText('Nothing to flag — campaign looks tidy.')).toBeInTheDocument();
    expect(screen.queryByText('NPCs')).not.toBeInTheDocument();
  });

  it('lists a stale entity under its kind, and omits kinds with nothing stale', () => {
    render(
      <CampaignHygienePanel
        hygiene={{ ...emptyReport(), stale: { ...emptyGroups(), npcs: [npc] } }}
        onOpenPlannerEntity={vi.fn()}
      />
    );

    expect(screen.getByText('Not Updated in 30+ Days')).toBeInTheDocument();
    expect(screen.getByText('Mariel')).toBeInTheDocument();
    expect(screen.getByText('Nothing orphaned.')).toBeInTheDocument();
  });

  it('shows a custom staleDays in its heading', () => {
    render(
      <CampaignHygienePanel
        hygiene={{ ...emptyReport(), stale: { ...emptyGroups(), npcs: [npc] } }}
        onOpenPlannerEntity={vi.fn()}
        staleDays={14}
      />
    );

    expect(screen.getByText('Not Updated in 14+ Days')).toBeInTheDocument();
  });

  it('lists an orphaned entity, and lets a GM click through to it', async () => {
    const user = userEvent.setup();
    const onOpenPlannerEntity = vi.fn();
    render(
      <CampaignHygienePanel
        hygiene={{ ...emptyReport(), orphaned: { ...emptyGroups(), npcs: [npc] } }}
        onOpenPlannerEntity={onOpenPlannerEntity}
      />
    );

    expect(screen.getByText('Not Linked to Anything')).toBeInTheDocument();
    await user.click(screen.getByText('Mariel'));
    expect(onOpenPlannerEntity).toHaveBeenCalledWith({ type: 'npc', id: 'npc-1', source: 'planner' });
  });
});
