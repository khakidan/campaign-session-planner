import type {
  Block,
  CampaignId,
  CampaignPlannerRepository,
  EntityLink,
  EntityLinkId,
  EntityReference,
  EntitySearchResult,
  Event,
  EventId,
  GameSystemInfo,
  Group,
  GroupId,
  Location,
  LocationId,
  Note,
  NoteId,
  Npc,
  NpcId,
  PlannerTemplate,
  Quest,
  QuestId,
  Scene,
  SceneId,
  Session,
  SessionId,
  Storyline,
  StorylineId,
  TemplateEntityKind,
  Thread,
  ThreadId,
  TTRPGAdversary,
  TTRPGCharacter,
  TTRPGEncounter,
  TTRPGEntity,
  TTRPGEnvironment,
  TTRPGHostAdapter,
  TTRPGItem,
} from '../types';

/**
 * A real, in-memory implementation of `CampaignPlannerRepository` — not
 * a `vi.fn()` stub returning canned values. Every hook/component test
 * in this package uses this instead of mocking individual repository
 * methods, per `ROADMAP.md`'s Testing Plan: assertions check what this
 * fake actually stored/returned, not whether a mock "was called."
 */
export interface FakeRepositorySeed {
  notes?: Note[];
  npcs?: Npc[];
  groups?: Group[];
  locations?: Location[];
  sessions?: Session[];
  scenes?: Scene[];
  storylines?: Storyline[];
  threads?: Thread[];
  quests?: Quest[];
  events?: Event[];
  links?: EntityLink[];
  templates?: PlannerTemplate[];
}

export function createFakeRepository(seed: FakeRepositorySeed = {}): CampaignPlannerRepository {
  let nextId = 1;
  const id = (prefix: string) => `${prefix}-${nextId++}`;
  const now = () => new Date('2024-01-01T00:00:00.000Z').toISOString();

  const notes = new Map<NoteId, Note>((seed.notes ?? []).map((n) => [n.id, n]));
  const npcs = new Map<NpcId, Npc>((seed.npcs ?? []).map((n) => [n.id, n]));
  const groups = new Map<GroupId, Group>((seed.groups ?? []).map((g) => [g.id, g]));
  const locations = new Map<LocationId, Location>((seed.locations ?? []).map((l) => [l.id, l]));
  const sessions = new Map<SessionId, Session>((seed.sessions ?? []).map((s) => [s.id, s]));
  const scenes = new Map<SceneId, Scene>((seed.scenes ?? []).map((s) => [s.id, s]));
  const storylines = new Map<StorylineId, Storyline>((seed.storylines ?? []).map((s) => [s.id, s]));
  const threads = new Map<ThreadId, Thread>((seed.threads ?? []).map((t) => [t.id, t]));
  const quests = new Map<QuestId, Quest>((seed.quests ?? []).map((q) => [q.id, q]));
  const events = new Map<EventId, Event>((seed.events ?? []).map((e) => [e.id, e]));
  const links = new Map<EntityLinkId, EntityLink>((seed.links ?? []).map((l) => [l.id, l]));
  const templates = new Map<string, PlannerTemplate>(
    (seed.templates ?? []).map((t) => [`${t.campaignId}:${t.entityKind}`, t])
  );

  function makeCrud<T extends { id: string; createdAt: string; updatedAt: string }>(
    store: Map<string, T>,
    prefix: string
  ) {
    return {
      getAll: async (predicate: (item: T) => boolean) => [...store.values()].filter(predicate),
      getOne: async (itemId: string) => store.get(itemId) ?? null,
      save: async (input: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<T> => {
        if (input.id) {
          const existing = store.get(input.id);
          if (!existing) throw new Error(`${prefix} ${input.id} not found`);
          const updated = { ...existing, ...input, updatedAt: now() } as T;
          store.set(input.id, updated);
          return updated;
        }
        const created = { ...input, id: id(prefix), createdAt: now(), updatedAt: now() } as T;
        store.set(created.id, created);
        return created;
      },
      delete: async (itemId: string) => {
        store.delete(itemId);
      },
    };
  }

  const noteCrud = makeCrud(notes, 'note');
  const npcCrud = makeCrud(npcs, 'npc');
  const groupCrud = makeCrud(groups, 'group');
  const locationCrud = makeCrud(locations, 'location');
  const sessionCrud = makeCrud(sessions, 'session');
  const sceneCrud = makeCrud(scenes, 'scene');
  const storylineCrud = makeCrud(storylines, 'storyline');
  const threadCrud = makeCrud(threads, 'thread');
  const questCrud = makeCrud(quests, 'quest');
  const eventCrud = makeCrud(events, 'event');

  return {
    getNotes: (campaignId) => noteCrud.getAll((n) => n.campaignId === campaignId),
    getNote: (noteId) => noteCrud.getOne(noteId),
    saveNote: (note) => noteCrud.save(note),
    deleteNote: (noteId) => noteCrud.delete(noteId),

    getNpcs: (campaignId) => npcCrud.getAll((n) => n.campaignId === campaignId),
    getNpc: (npcId) => npcCrud.getOne(npcId),
    saveNpc: (npc) => npcCrud.save(npc),
    deleteNpc: (npcId) => npcCrud.delete(npcId),

    getGroups: (campaignId) => groupCrud.getAll((g) => g.campaignId === campaignId),
    getGroup: (groupId) => groupCrud.getOne(groupId),
    saveGroup: (group) => groupCrud.save(group),
    deleteGroup: (groupId) => groupCrud.delete(groupId),

    getLocations: (campaignId) => locationCrud.getAll((l) => l.campaignId === campaignId),
    getLocation: (locationId) => locationCrud.getOne(locationId),
    saveLocation: (location) => locationCrud.save(location),
    deleteLocation: (locationId) => locationCrud.delete(locationId),

    getSessions: (campaignId) => sessionCrud.getAll((s) => s.campaignId === campaignId),
    getSession: (sessionId) => sessionCrud.getOne(sessionId),
    saveSession: (session) => sessionCrud.save(session),
    deleteSession: (sessionId) => sessionCrud.delete(sessionId),

    getScenes: (sessionId) => sceneCrud.getAll((s) => s.sessionId === sessionId),
    getScene: (sceneId) => sceneCrud.getOne(sceneId),
    saveScene: (scene) => sceneCrud.save(scene),
    deleteScene: (sceneId) => sceneCrud.delete(sceneId),

    getStorylines: (campaignId) => storylineCrud.getAll((s) => s.campaignId === campaignId),
    getStoryline: (storylineId) => storylineCrud.getOne(storylineId),
    saveStoryline: (storyline) => storylineCrud.save(storyline),
    deleteStoryline: (storylineId) => storylineCrud.delete(storylineId),

    getThreads: (campaignId) => threadCrud.getAll((t) => t.campaignId === campaignId),
    getThread: (threadId) => threadCrud.getOne(threadId),
    saveThread: (thread) => threadCrud.save(thread),
    deleteThread: (threadId) => threadCrud.delete(threadId),

    getQuests: (campaignId) => questCrud.getAll((q) => q.campaignId === campaignId),
    getQuest: (questId) => questCrud.getOne(questId),
    saveQuest: (quest) => questCrud.save(quest),
    deleteQuest: (questId) => questCrud.delete(questId),

    getEvents: (campaignId) => eventCrud.getAll((e) => e.campaignId === campaignId),
    getEvent: (eventId) => eventCrud.getOne(eventId),
    saveEvent: (event) => eventCrud.save(event),
    deleteEvent: (eventId) => eventCrud.delete(eventId),

    getLinks: async (source?: EntityReference) => {
      if (!source) return [...links.values()];
      return [...links.values()].filter(
        (l) =>
          (l.sourceType === source.type && l.sourceId === source.id) ||
          (l.targetType === source.type && l.targetId === source.id)
      );
    },
    createLink: async (link) => {
      const created: EntityLink = { ...link, id: id('link'), createdAt: now() };
      links.set(created.id, created);
      return created;
    },
    deleteLink: async (linkId) => {
      links.delete(linkId);
    },

    getTemplates: async (campaignId) => [...templates.values()].filter((t) => t.campaignId === campaignId),
    saveTemplate: async (campaignId, entityKind, blocks) => {
      const key = `${campaignId}:${entityKind}`;
      const existing = templates.get(key);
      const saved: PlannerTemplate = {
        id: existing?.id ?? id('template'),
        campaignId,
        entityKind,
        blocks,
        updatedAt: now(),
      };
      templates.set(key, saved);
      return saved;
    },
    deleteTemplate: async (campaignId, entityKind) => {
      templates.delete(`${campaignId}:${entityKind}`);
    },
  };
}

/** A minimal, deterministic `TTRPGHostAdapter` fake — no mocking of the
 * package under test, just a small real implementation backed by
 * whatever host-owned fixture rows a test seeds it with. */
export function createFakeHostAdapter(overrides: Partial<TTRPGHostAdapter> = {}): TTRPGHostAdapter {
  const gameSystem: GameSystemInfo = { id: 'daggerheart', name: 'Daggerheart' };
  return {
    getGameSystem: () => gameSystem,
    getCharacters: async (): Promise<TTRPGCharacter[]> => [],
    getAdversaries: async (): Promise<TTRPGAdversary[]> => [],
    getEnvironments: async (): Promise<TTRPGEnvironment[]> => [],
    getEncounters: async (): Promise<TTRPGEncounter[]> => [],
    getItems: async (): Promise<TTRPGItem[]> => [],
    searchEntities: async (): Promise<EntitySearchResult[]> => [],
    getEntity: async (): Promise<TTRPGEntity | null> => null,
    openEntity: () => {},
    ...overrides,
  };
}

export const TEST_CAMPAIGN_ID: CampaignId = 'campaign-1';

export function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id ?? 'note-fixture-1',
    campaignId: TEST_CAMPAIGN_ID,
    title: 'Fixture Note',
    type: null,
    status: null,
    content: [] as Block[],
    tags: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: overrides.id ?? 'thread-fixture-1',
    campaignId: TEST_CAMPAIGN_ID,
    name: 'Fixture Thread',
    status: null,
    priority: null,
    details: [] as Block[],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: overrides.id ?? 'session-fixture-1',
    campaignId: TEST_CAMPAIGN_ID,
    title: 'Fixture Session',
    sessionNumber: null,
    date: null,
    status: null,
    details: [] as Block[],
    debrief: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: overrides.id ?? 'scene-fixture-1',
    sessionId: overrides.sessionId ?? 'session-fixture-1',
    title: 'Fixture Scene',
    sceneNumber: null,
    status: null,
    order: 0,
    details: [] as Block[],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeEntityLink(overrides: Partial<EntityLink> = {}): EntityLink {
  return {
    id: overrides.id ?? 'link-fixture-1',
    campaignId: TEST_CAMPAIGN_ID,
    sourceType: 'note',
    sourceId: 'note-fixture-1',
    targetType: 'npc',
    targetId: 'npc-fixture-1',
    relationshipType: 'mentions',
    metadata: {},
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}
