import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createFakeRepository, makeEntityLink, TEST_CAMPAIGN_ID } from '../test/fixtures';
import { useCampaignHygiene } from './useCampaignHygiene';
import type { Npc } from '../types';

function makeNpc(overrides: Partial<Npc> = {}): Npc {
  return {
    id: overrides.id ?? 'npc-fixture-1',
    campaignId: TEST_CAMPAIGN_ID,
    name: 'Fixture NPC',
    details: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('useCampaignHygiene', () => {
  it('flags a long-untouched, unlinked NPC as both stale and orphaned', async () => {
    const stale = makeNpc({ id: 'npc-1', updatedAt: '2000-01-01T00:00:00.000Z' });
    const repository = createFakeRepository({ npcs: [stale] });

    const { result } = renderHook(() => useCampaignHygiene(repository, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current.stale.npcs).toEqual([stale]));
    expect(result.current.orphaned.npcs).toEqual([stale]);
  });

  it('does not flag a linked NPC as orphaned', async () => {
    const npc = makeNpc({ id: 'npc-1', updatedAt: '2000-01-01T00:00:00.000Z' });
    const link = makeEntityLink({ sourceType: 'note', sourceId: 'note-1', targetType: 'npc', targetId: 'npc-1' });
    const repository = createFakeRepository({ npcs: [npc], links: [link] });

    const { result } = renderHook(() => useCampaignHygiene(repository, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current.stale.npcs).toEqual([npc]));
    expect(result.current.orphaned.npcs).toEqual([]);
  });

  it('only counts links belonging to this campaign', async () => {
    const npc = makeNpc({ id: 'npc-1', updatedAt: '2000-01-01T00:00:00.000Z' });
    const otherCampaignLink = makeEntityLink({
      sourceType: 'note',
      sourceId: 'note-1',
      targetType: 'npc',
      targetId: 'npc-1',
      campaignId: 'other-campaign',
    });
    const repository = createFakeRepository({ npcs: [npc], links: [otherCampaignLink] });

    const { result } = renderHook(() => useCampaignHygiene(repository, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current.stale.npcs).toEqual([npc]));
    expect(result.current.orphaned.npcs).toEqual([npc]);
  });

  it('respects a custom staleDays threshold', async () => {
    const recentButOld = makeNpc({ id: 'npc-1', updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() });
    const repository = createFakeRepository({ npcs: [recentButOld] });

    const { result } = renderHook(() => useCampaignHygiene(repository, TEST_CAMPAIGN_ID, 5));

    await waitFor(() => expect(result.current.stale.npcs).toEqual([recentButOld]));
  });
});
