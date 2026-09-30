import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionRunPanel } from './SessionRunPanel';
import { createFakeRepository, makeEntityLink, makeScene, makeSession, TEST_CAMPAIGN_ID } from '../test/fixtures';

describe('SessionRunPanel', () => {
  it('renders nothing when no Session is Running', () => {
    const repository = createFakeRepository({ sessions: [makeSession({ id: 's1', status: 'Draft' })] });
    const { container } = render(
      <SessionRunPanel repository={repository} campaignId={TEST_CAMPAIGN_ID} onOpenPlannerEntity={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the Running Session\'s title and a "no Scenes" message when it has none', async () => {
    const repository = createFakeRepository({
      sessions: [makeSession({ id: 's1', title: 'The Sunken Temple', status: 'Running' })],
    });
    render(<SessionRunPanel repository={repository} campaignId={TEST_CAMPAIGN_ID} onOpenPlannerEntity={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Now Running: The Sunken Temple')).toBeInTheDocument());
    expect(screen.getByText('No Scenes prepared for this Session yet.')).toBeInTheDocument();
  });

  it('shows the first Scene by order, and Prev/Next navigate between Scenes', async () => {
    const user = userEvent.setup();
    const session = makeSession({ id: 's1', status: 'Running' });
    const sceneA = makeScene({ id: 'scene-a', sessionId: 's1', title: 'Arrival', order: 0 });
    const sceneB = makeScene({ id: 'scene-b', sessionId: 's1', title: 'Confrontation', order: 1 });
    const repository = createFakeRepository({ sessions: [session], scenes: [sceneB, sceneA] });

    render(<SessionRunPanel repository={repository} campaignId={TEST_CAMPAIGN_ID} onOpenPlannerEntity={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Arrival')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Previous Scene' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Next Scene' }));
    expect(screen.getByText('Confrontation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next Scene' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Previous Scene' }));
    expect(screen.getByText('Arrival')).toBeInTheDocument();
  });

  it('renders the active Scene\'s linked entities as chips, and tapping one calls onOpenPlannerEntity', async () => {
    const user = userEvent.setup();
    const session = makeSession({ id: 's1', status: 'Running' });
    const scene = makeScene({ id: 'scene-a', sessionId: 's1', title: 'Arrival', order: 0 });
    const link = makeEntityLink({
      sourceType: 'scene',
      sourceId: 'scene-a',
      targetType: 'npc',
      targetId: 'npc-1',
      metadata: { label: 'Sister Mariel' },
    });
    const repository = createFakeRepository({ sessions: [session], scenes: [scene], links: [link] });
    const onOpenPlannerEntity = vi.fn();

    render(<SessionRunPanel repository={repository} campaignId={TEST_CAMPAIGN_ID} onOpenPlannerEntity={onOpenPlannerEntity} />);

    const chip = await screen.findByRole('button', { name: 'Sister Mariel' });
    await user.click(chip);

    expect(onOpenPlannerEntity).toHaveBeenCalledWith({ type: 'npc', id: 'npc-1', source: 'planner' });
  });

  it('calls onOpenHostEntity, not onOpenPlannerEntity, for a host-owned linked entity', async () => {
    const user = userEvent.setup();
    const session = makeSession({ id: 's1', status: 'Running' });
    const scene = makeScene({ id: 'scene-a', sessionId: 's1', title: 'Arrival', order: 0 });
    const link = makeEntityLink({
      sourceType: 'scene',
      sourceId: 'scene-a',
      targetType: 'character',
      targetId: 'char-1',
      metadata: { label: 'Thorn' },
    });
    const repository = createFakeRepository({ sessions: [session], scenes: [scene], links: [link] });
    const onOpenPlannerEntity = vi.fn();
    const onOpenHostEntity = vi.fn();

    render(
      <SessionRunPanel
        repository={repository}
        campaignId={TEST_CAMPAIGN_ID}
        onOpenPlannerEntity={onOpenPlannerEntity}
        onOpenHostEntity={onOpenHostEntity}
      />
    );

    const chip = await screen.findByRole('button', { name: 'Thorn' });
    await user.click(chip);

    expect(onOpenHostEntity).toHaveBeenCalledWith('character', 'char-1');
    expect(onOpenPlannerEntity).not.toHaveBeenCalled();
  });
});
