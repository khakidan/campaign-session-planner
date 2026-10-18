import type { PlannerSearchItem } from '../components/EntityLinkPicker';
import type { EntityListItem } from '../components/EntityListView';
import type { Event, Group, Location, Lore, Note, Npc, PlannerEntityType, Quest, Scene, Session, Storyline, Thread } from '../types';

/** Every browsable kind's own loaded list (or `null` while still
 * loading) — `CampaignSessionPlanner.tsx`'s 11 `useX` hooks' results,
 * passed through unchanged. Both functions below derive from exactly
 * this same data, just shaped two different ways. */
export interface PlannerEntityLists {
  notes: Note[] | null;
  lores: Lore[] | null;
  npcs: Npc[] | null;
  groups: Group[] | null;
  locations: Location[] | null;
  sessions: Session[] | null;
  allScenes: Scene[] | null;
  storylines: Storyline[] | null;
  threads: Thread[] | null;
  quests: Quest[] | null;
  events: Event[] | null;
}

/** Flattened across every browsable kind — the entity-link picker's
 * planner-owned search results, and the fallback label source for
 * pre-4.2c (Note-only) backlinks that predate `metadata.sourceLabel`.
 * Pure data shaping, no React — kept here instead of inline so it can
 * be unit-tested without rendering anything. */
export function buildPlannerItems(lists: PlannerEntityLists): PlannerSearchItem[] {
  const { notes, lores, npcs, groups, locations, sessions, allScenes, storylines, threads, quests, events } = lists;
  return [
    ...(notes ?? []).map((n): PlannerSearchItem => ({ type: 'note', id: n.id, label: n.title })),
    ...(lores ?? []).map((l): PlannerSearchItem => ({ type: 'lore', id: l.id, label: l.title })),
    ...(npcs ?? []).map((n): PlannerSearchItem => ({ type: 'npc', id: n.id, label: n.name })),
    ...(groups ?? []).map((g): PlannerSearchItem => ({ type: 'group', id: g.id, label: g.name })),
    ...(locations ?? []).map((l): PlannerSearchItem => ({ type: 'location', id: l.id, label: l.name })),
    ...(sessions ?? []).map((s): PlannerSearchItem => ({ type: 'session', id: s.id, label: s.title })),
    ...(allScenes ?? []).map((s): PlannerSearchItem => ({ type: 'scene', id: s.id, label: s.title })),
    ...(storylines ?? []).map((s): PlannerSearchItem => ({ type: 'storyline', id: s.id, label: s.name })),
    ...(threads ?? []).map((t): PlannerSearchItem => ({ type: 'thread', id: t.id, label: t.name })),
    ...(quests ?? []).map((q): PlannerSearchItem => ({ type: 'quest', id: q.id, label: q.name })),
    ...(events ?? []).map((e): PlannerSearchItem => ({ type: 'event', id: e.id, label: e.name })),
  ];
}

/** The list view for every browsable kind is uniform (search/"New X"/a
 * row per record with an optional badge) — one config lookup shaping
 * each kind's own list into `EntityListItem[]`. A Scene's own row
 * shows which Session it belongs to (as `subtitle`, not `badge` —
 * `badge` is reserved for `status`, same as every other kind) since,
 * unlike every other top-level kind, Scenes span multiple parents
 * here. Pure data shaping, no React — see `buildPlannerItems`'s own
 * doc comment for why that matters. */
export function buildListConfig(lists: PlannerEntityLists): Record<PlannerEntityType, { items: EntityListItem[] | null }> {
  const { notes, lores, npcs, groups, locations, sessions, allScenes, storylines, threads, quests, events } = lists;
  const sessionTitleById = new Map((sessions ?? []).map((s): [string, string] => [s.id, s.title]));
  return {
    note: { items: notes === null ? null : notes.map((n): EntityListItem => ({ id: n.id, title: n.title, badge: n.type, tags: n.tags })) },
    lore: { items: lores === null ? null : lores.map((l): EntityListItem => ({ id: l.id, title: l.title, badge: l.status, tags: l.tags })) },
    npc: { items: npcs === null ? null : npcs.map((n): EntityListItem => ({ id: n.id, title: n.name, badge: n.status })) },
    group: { items: groups === null ? null : groups.map((g): EntityListItem => ({ id: g.id, title: g.name, badge: g.type })) },
    location: { items: locations === null ? null : locations.map((l): EntityListItem => ({ id: l.id, title: l.name, badge: l.type })) },
    session: { items: sessions === null ? null : sessions.map((s): EntityListItem => ({ id: s.id, title: s.title, badge: s.status })) },
    scene: {
      items:
        allScenes === null
          ? null
          : allScenes.map((s): EntityListItem => ({
              id: s.id,
              title: s.title,
              badge: s.status,
              subtitle: sessionTitleById.get(s.sessionId) ?? null,
            })),
    },
    storyline: { items: storylines === null ? null : storylines.map((s): EntityListItem => ({ id: s.id, title: s.name, badge: s.status })) },
    thread: { items: threads === null ? null : threads.map((t): EntityListItem => ({ id: t.id, title: t.name, badge: t.status })) },
    quest: { items: quests === null ? null : quests.map((q): EntityListItem => ({ id: q.id, title: q.name, badge: q.status })) },
    event: { items: events === null ? null : events.map((e): EntityListItem => ({ id: e.id, title: e.name, badge: e.eventType })) },
  };
}
