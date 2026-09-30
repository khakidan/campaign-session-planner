import { describe, expect, it } from 'vitest';
import { buildCampaignChanges, selectChangedSince } from './campaignChanges';
import { makeNote } from '../test/fixtures';

describe('selectChangedSince', () => {
  it('keeps only entities updated after the given timestamp', () => {
    const older = makeNote({ id: 'n1', updatedAt: '2024-01-01T00:00:00.000Z' });
    const newer = makeNote({ id: 'n2', updatedAt: '2024-06-01T00:00:00.000Z' });

    expect(selectChangedSince([older, newer], '2024-03-01T00:00:00.000Z')).toEqual([newer]);
  });

  it('excludes an entity updated exactly at the boundary', () => {
    const exact = makeNote({ id: 'n1', updatedAt: '2024-03-01T00:00:00.000Z' });
    expect(selectChangedSince([exact], '2024-03-01T00:00:00.000Z')).toEqual([]);
  });
});

describe('buildCampaignChanges', () => {
  it('applies the timestamp filter independently across every entity kind', () => {
    const since = '2024-03-01T00:00:00.000Z';
    const changedNpc = { id: 'npc-1', updatedAt: '2024-06-01T00:00:00.000Z' } as never;
    const unchangedGroup = { id: 'group-1', updatedAt: '2024-01-01T00:00:00.000Z' } as never;

    const result = buildCampaignChanges(
      { npcs: [changedNpc], groups: [unchangedGroup], locations: [], threads: [], quests: [], events: [] },
      since
    );

    expect(result.npcs).toEqual([changedNpc]);
    expect(result.groups).toEqual([]);
    expect(result.locations).toEqual([]);
  });
});
