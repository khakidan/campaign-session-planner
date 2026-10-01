import { describe, expect, it } from 'vitest';
import { buildCampaignHygiene, selectOrphaned, selectStale } from './campaignHygiene';
import { makeEntityLink, makeThread, TEST_CAMPAIGN_ID } from '../test/fixtures';
import type { Group, Location, Npc, Quest, Storyline } from '../types';

const ASOF = new Date('2024-06-01T00:00:00.000Z');

function makeNpc(overrides: Partial<Npc> = {}): Npc {
  return {
    id: overrides.id ?? 'npc-fixture-1',
    campaignId: TEST_CAMPAIGN_ID,
    name: 'Fixture NPC',
    details: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
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
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: overrides.id ?? 'location-fixture-1',
    campaignId: TEST_CAMPAIGN_ID,
    name: 'Fixture Location',
    type: null,
    parentLocationId: null,
    details: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: overrides.id ?? 'quest-fixture-1',
    campaignId: TEST_CAMPAIGN_ID,
    name: 'Fixture Quest',
    status: null,
    details: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeStoryline(overrides: Partial<Storyline> = {}): Storyline {
  return {
    id: overrides.id ?? 'storyline-fixture-1',
    campaignId: TEST_CAMPAIGN_ID,
    name: 'Fixture Storyline',
    status: null,
    priority: null,
    details: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function emptyState() {
  return { npcs: [], groups: [], locations: [], threads: [], quests: [], storylines: [] };
}

describe('selectStale', () => {
  it('keeps entities not updated within staleDays of asOf', () => {
    const stale = makeNpc({ id: 'n1', updatedAt: '2024-01-01T00:00:00.000Z' });
    const fresh = makeNpc({ id: 'n2', updatedAt: '2024-05-25T00:00:00.000Z' });

    expect(selectStale([stale, fresh], ASOF, 30)).toEqual([stale]);
  });

  it('excludes an entity whose status marks it as deliberately wound down', () => {
    const staleButResolved = makeThread({ id: 't1', updatedAt: '2024-01-01T00:00:00.000Z', status: 'Resolved' });
    const staleAndOpen = makeThread({ id: 't2', updatedAt: '2024-01-01T00:00:00.000Z', status: 'Open' });

    expect(selectStale([staleButResolved, staleAndOpen], ASOF, 30)).toEqual([staleAndOpen]);
  });

  it('treats a missing status as active', () => {
    const stale = makeNpc({ id: 'n1', updatedAt: '2024-01-01T00:00:00.000Z' });
    expect(selectStale([stale], ASOF, 30)).toEqual([stale]);
  });
});

describe('selectOrphaned', () => {
  it('keeps entities with no EntityLink row pointing in or out', () => {
    const linked = makeNpc({ id: 'npc-1' });
    const orphan = makeNpc({ id: 'npc-2' });
    const link = makeEntityLink({ sourceType: 'note', sourceId: 'note-1', targetType: 'npc', targetId: 'npc-1' });

    expect(selectOrphaned('npc', [linked, orphan], [link])).toEqual([orphan]);
  });

  it('counts an entity as linked whether it is the source or the target', () => {
    const asSource = makeThread({ id: 'thread-1' });
    const link = makeEntityLink({ sourceType: 'thread', sourceId: 'thread-1', targetType: 'npc', targetId: 'npc-1' });

    expect(selectOrphaned('thread', [asSource], [link])).toEqual([]);
  });

  it('excludes an entity whose status marks it as deliberately wound down', () => {
    const resolvedOrphan = makeThread({ id: 't1', status: 'Abandoned' });
    expect(selectOrphaned('thread', [resolvedOrphan], [])).toEqual([]);
  });
});

describe('buildCampaignHygiene', () => {
  it('returns every group empty given no data', () => {
    const report = buildCampaignHygiene(emptyState(), [], ASOF);
    expect(report.stale).toEqual(emptyState());
    expect(report.orphaned).toEqual(emptyState());
  });

  it('flags a never-linked, never-updated NPC in both stale and orphaned', () => {
    const forgotten = makeNpc({ id: 'npc-1', updatedAt: '2024-01-01T00:00:00.000Z' });
    const report = buildCampaignHygiene({ ...emptyState(), npcs: [forgotten] }, [], ASOF, 30);

    expect(report.stale.npcs).toEqual([forgotten]);
    expect(report.orphaned.npcs).toEqual([forgotten]);
  });

  it('does not flag a recently-updated, linked Location', () => {
    const active = makeLocation({ id: 'loc-1', updatedAt: '2024-05-30T00:00:00.000Z' });
    const link = makeEntityLink({ sourceType: 'location', sourceId: 'loc-1', targetType: 'npc', targetId: 'npc-1' });
    const report = buildCampaignHygiene({ ...emptyState(), locations: [active] }, [link], ASOF, 30);

    expect(report.stale.locations).toEqual([]);
    expect(report.orphaned.locations).toEqual([]);
  });

  it('covers Quest and Storyline the same way as the other kinds', () => {
    const quest = makeQuest({ id: 'quest-1', updatedAt: '2024-01-01T00:00:00.000Z' });
    const storyline = makeStoryline({ id: 'storyline-1', updatedAt: '2024-01-01T00:00:00.000Z' });
    const report = buildCampaignHygiene({ ...emptyState(), quests: [quest], storylines: [storyline] }, [], ASOF, 30);

    expect(report.stale.quests).toEqual([quest]);
    expect(report.stale.storylines).toEqual([storyline]);
    expect(report.orphaned.quests).toEqual([quest]);
    expect(report.orphaned.storylines).toEqual([storyline]);
  });
});
