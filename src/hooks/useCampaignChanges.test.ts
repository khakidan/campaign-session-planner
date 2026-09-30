import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createFakeRepository, TEST_CAMPAIGN_ID } from '../test/fixtures';
import { useCampaignChanges } from './useCampaignChanges';
import type { Npc, Group } from '../types';

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

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: overrides.id ?? 'group-fixture-1',
    campaignId: TEST_CAMPAIGN_ID,
    name: 'Fixture Group',
    type: null,
    status: null,
    details: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('useCampaignChanges', () => {
  it('returns only entities updated after the given timestamp, across every kind', async () => {
    const changedNpc = makeNpc({ id: 'npc-1', updatedAt: '2024-06-01T00:00:00.000Z' });
    const unchangedGroup = makeGroup({ id: 'group-1', updatedAt: '2024-01-01T00:00:00.000Z' });
    const repository = createFakeRepository({ npcs: [changedNpc], groups: [unchangedGroup] });

    const { result } = renderHook(() => useCampaignChanges(repository, TEST_CAMPAIGN_ID, '2024-03-01T00:00:00.000Z'));

    await waitFor(() => expect(result.current.npcs).toEqual([changedNpc]));
    expect(result.current.groups).toEqual([]);
  });
});
