import type { Event, Group, Location, Npc, Quest, Thread } from '../types';

interface TimestampedEntity {
  id: string;
  updatedAt: string;
}

/**
 * Phase 2 item 5 (Campaign Changes) — "what's changed since last
 * session" needs no new entity, snapshot table, or diffing engine:
 * every entity this package owns already carries a real `updatedAt`.
 * "Changed" just means "touched since `since`."
 */
export function selectChangedSince<T extends TimestampedEntity>(entities: T[], since: string): T[] {
  const sinceTime = new Date(since).getTime();
  return entities.filter((entity) => new Date(entity.updatedAt).getTime() > sinceTime);
}

export interface CampaignChanges {
  npcs: Npc[];
  groups: Group[];
  locations: Location[];
  threads: Thread[];
  quests: Quest[];
  events: Event[];
}

export function buildCampaignChanges(
  state: { npcs: Npc[]; groups: Group[]; locations: Location[]; threads: Thread[]; quests: Quest[]; events: Event[] },
  since: string
): CampaignChanges {
  return {
    npcs: selectChangedSince(state.npcs, since),
    groups: selectChangedSince(state.groups, since),
    locations: selectChangedSince(state.locations, since),
    threads: selectChangedSince(state.threads, since),
    quests: selectChangedSince(state.quests, since),
    events: selectChangedSince(state.events, since),
  };
}
