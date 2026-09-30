import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createFakeRepository, TEST_CAMPAIGN_ID } from '../test/fixtures';
import type { CampaignPlannerRepository } from '../types';
import { useNotes } from './useNotes';
import { useNpcs } from './useNpcs';
import { useGroups } from './useGroups';
import { useLocations } from './useLocations';
import { useSessions } from './useSessions';
import { useStorylines } from './useStorylines';
import { useThreads } from './useThreads';
import { useQuests } from './useQuests';
import { useEvents } from './useEvents';

/**
 * Every hook below (useNotes/useNpcs/.../useEvents) is a structurally
 * identical "load + create + update + delete this campaign's rows"
 * hook over `CampaignPlannerRepository` — one table-driven suite covers
 * all nine instead of duplicating the same four tests nine times.
 * `useScenes` (session-scoped, not campaign-scoped) and `useEntityLinks`
 * (outgoing/incoming split) get their own test files since their
 * behavior actually differs.
 */
interface CrudHookConfig<T extends { id: string }> {
  name: string;
  useHook: (repository: CampaignPlannerRepository, campaignId: string) => Record<string, unknown>;
  listKey: string;
  createKey: string;
  updateKey: string;
  deleteKey: string;
  buildCreateInput: (label: string) => Record<string, unknown>;
  displayField: 'title' | 'name';
  seedListKey: 'notes' | 'npcs' | 'groups' | 'locations' | 'sessions' | 'storylines' | 'threads' | 'quests' | 'events';
  makeSeedRow: (id: string, campaignId: string) => T;
}

const configs: CrudHookConfig<any>[] = [
  {
    name: 'useNotes',
    useHook: useNotes,
    listKey: 'notes',
    createKey: 'createNote',
    updateKey: 'updateNote',
    deleteKey: 'deleteNote',
    displayField: 'title',
    buildCreateInput: (label) => ({ title: label, type: null, status: null, content: [], tags: [] }),
    seedListKey: 'notes',
    makeSeedRow: (id, campaignId) => ({
      id,
      campaignId,
      title: 'Seeded Note',
      type: null,
      status: null,
      content: [],
      tags: [],
      createdAt: 'x',
      updatedAt: 'x',
    }),
  },
  {
    name: 'useNpcs',
    useHook: useNpcs,
    listKey: 'npcs',
    createKey: 'createNpc',
    updateKey: 'updateNpc',
    deleteKey: 'deleteNpc',
    displayField: 'name',
    buildCreateInput: (label) => ({ name: label, details: [] }),
    seedListKey: 'npcs',
    makeSeedRow: (id, campaignId) => ({ id, campaignId, name: 'Seeded NPC', details: [], createdAt: 'x', updatedAt: 'x' }),
  },
  {
    name: 'useGroups',
    useHook: useGroups,
    listKey: 'groups',
    createKey: 'createGroup',
    updateKey: 'updateGroup',
    deleteKey: 'deleteGroup',
    displayField: 'name',
    buildCreateInput: (label) => ({ name: label, type: null, status: null, details: [] }),
    seedListKey: 'groups',
    makeSeedRow: (id, campaignId) => ({
      id,
      campaignId,
      name: 'Seeded Group',
      type: null,
      status: null,
      details: [],
      createdAt: 'x',
      updatedAt: 'x',
    }),
  },
  {
    name: 'useLocations',
    useHook: useLocations,
    listKey: 'locations',
    createKey: 'createLocation',
    updateKey: 'updateLocation',
    deleteKey: 'deleteLocation',
    displayField: 'name',
    buildCreateInput: (label) => ({ name: label, type: null, parentLocationId: null, details: [] }),
    seedListKey: 'locations',
    makeSeedRow: (id, campaignId) => ({
      id,
      campaignId,
      name: 'Seeded Location',
      type: null,
      parentLocationId: null,
      details: [],
      createdAt: 'x',
      updatedAt: 'x',
    }),
  },
  {
    name: 'useSessions',
    useHook: useSessions,
    listKey: 'sessions',
    createKey: 'createSession',
    updateKey: 'updateSession',
    deleteKey: 'deleteSession',
    displayField: 'title',
    buildCreateInput: (label) => ({ title: label, sessionNumber: null, date: null, status: null, details: [], debrief: null }),
    seedListKey: 'sessions',
    makeSeedRow: (id, campaignId) => ({
      id,
      campaignId,
      title: 'Seeded Session',
      sessionNumber: null,
      date: null,
      status: null,
      details: [],
      debrief: null,
      createdAt: 'x',
      updatedAt: 'x',
    }),
  },
  {
    name: 'useStorylines',
    useHook: useStorylines,
    listKey: 'storylines',
    createKey: 'createStoryline',
    updateKey: 'updateStoryline',
    deleteKey: 'deleteStoryline',
    displayField: 'name',
    buildCreateInput: (label) => ({ name: label, status: null, priority: null, details: [] }),
    seedListKey: 'storylines',
    makeSeedRow: (id, campaignId) => ({
      id,
      campaignId,
      name: 'Seeded Storyline',
      status: null,
      priority: null,
      details: [],
      createdAt: 'x',
      updatedAt: 'x',
    }),
  },
  {
    name: 'useThreads',
    useHook: useThreads,
    listKey: 'threads',
    createKey: 'createThread',
    updateKey: 'updateThread',
    deleteKey: 'deleteThread',
    displayField: 'name',
    buildCreateInput: (label) => ({ name: label, status: null, priority: null, details: [] }),
    seedListKey: 'threads',
    makeSeedRow: (id, campaignId) => ({
      id,
      campaignId,
      name: 'Seeded Thread',
      status: null,
      priority: null,
      details: [],
      createdAt: 'x',
      updatedAt: 'x',
    }),
  },
  {
    name: 'useQuests',
    useHook: useQuests,
    listKey: 'quests',
    createKey: 'createQuest',
    updateKey: 'updateQuest',
    deleteKey: 'deleteQuest',
    displayField: 'name',
    buildCreateInput: (label) => ({ name: label, status: null, details: [] }),
    seedListKey: 'quests',
    makeSeedRow: (id, campaignId) => ({ id, campaignId, name: 'Seeded Quest', status: null, details: [], createdAt: 'x', updatedAt: 'x' }),
  },
  {
    name: 'useEvents',
    useHook: useEvents,
    listKey: 'events',
    createKey: 'createEvent',
    updateKey: 'updateEvent',
    deleteKey: 'deleteEvent',
    displayField: 'name',
    buildCreateInput: (label) => ({ name: label, eventType: null, status: null, date: null, details: [] }),
    seedListKey: 'events',
    makeSeedRow: (id, campaignId) => ({
      id,
      campaignId,
      name: 'Seeded Event',
      eventType: null,
      status: null,
      date: null,
      details: [],
      createdAt: 'x',
      updatedAt: 'x',
    }),
  },
];

describe.each(configs)('$name', (config) => {
  it('loads only this campaign\'s rows on mount', async () => {
    const ownRow = config.makeSeedRow('own-1', TEST_CAMPAIGN_ID);
    const otherCampaignRow = config.makeSeedRow('other-1', 'campaign-other');
    const repository = createFakeRepository({ [config.seedListKey]: [ownRow, otherCampaignRow] } as never);

    const { result } = renderHook(() => config.useHook(repository, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current[config.listKey]).not.toBeNull());
    expect(result.current[config.listKey]).toEqual([ownRow]);
  });

  it('create: persists the exact object passed in, with the campaignId attached', async () => {
    const repository = createFakeRepository();
    const { result } = renderHook(() => config.useHook(repository, TEST_CAMPAIGN_ID));
    await waitFor(() => expect(result.current[config.listKey]).not.toBeNull());

    await act(async () => {
      await (result.current[config.createKey] as (input: unknown) => Promise<unknown>)(
        config.buildCreateInput('Brand New')
      );
    });

    await waitFor(() => expect((result.current[config.listKey] as unknown[]).length).toBe(1));
    const created = (result.current[config.listKey] as Record<string, unknown>[])[0];
    expect(created).toMatchObject({ ...config.buildCreateInput('Brand New'), campaignId: TEST_CAMPAIGN_ID });
    expect(created.id).toBeTruthy();
  });

  it('update: persists the exact changed fields, not just that a save happened', async () => {
    const seedRow = config.makeSeedRow('own-1', TEST_CAMPAIGN_ID);
    const repository = createFakeRepository({ [config.seedListKey]: [seedRow] } as never);
    const { result } = renderHook(() => config.useHook(repository, TEST_CAMPAIGN_ID));
    await waitFor(() => expect(result.current[config.listKey]).not.toBeNull());

    const changed = { ...seedRow, [config.displayField]: 'Renamed' };
    await act(async () => {
      await (result.current[config.updateKey] as (input: unknown) => Promise<unknown>)(changed);
    });

    await waitFor(() => {
      const row = (result.current[config.listKey] as Record<string, unknown>[])[0];
      expect(row[config.displayField]).toBe('Renamed');
    });
  });

  it('delete: removes exactly that row and leaves the rest', async () => {
    const rowToDelete = config.makeSeedRow('delete-me', TEST_CAMPAIGN_ID);
    const rowToKeep = config.makeSeedRow('keep-me', TEST_CAMPAIGN_ID);
    const repository = createFakeRepository({ [config.seedListKey]: [rowToDelete, rowToKeep] } as never);
    const { result } = renderHook(() => config.useHook(repository, TEST_CAMPAIGN_ID));
    await waitFor(() => expect((result.current[config.listKey] as unknown[])?.length).toBe(2));

    await act(async () => {
      await (result.current[config.deleteKey] as (id: string) => Promise<void>)('delete-me');
    });

    await waitFor(() => expect((result.current[config.listKey] as unknown[]).length).toBe(1));
    expect((result.current[config.listKey] as Record<string, unknown>[])[0].id).toBe('keep-me');
  });

  it('surfaces a load failure through `error` instead of throwing', async () => {
    const repository = createFakeRepository();
    const failingGetter = `get${config.name.replace('use', '')}` as keyof CampaignPlannerRepository;
    (repository[failingGetter] as unknown as () => Promise<never>) = () => Promise.reject(new Error('network down'));

    const { result } = renderHook(() => config.useHook(repository, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current.error).toBe('network down'));
  });
});
