import type { EntityLink, EntityType, Group, Location, Npc, Quest, Storyline, Thread } from '../types';

/** ROADMAP.md's "Campaign hygiene view" — a default staleness window;
 * mirrors `CampaignChangesPanel`'s pattern (no new entity, derived
 * purely from fields every entity already has) but looks backward
 * across the whole campaign rather than since one prior Session, so
 * there's no natural "since" date to anchor on the way Campaign
 * Changes has — a fixed day count stands in for it instead. */
export const DEFAULT_STALE_DAYS = 30;

/** A free-text `status` (Group/Thread/Quest/Storyline's house style —
 * see `types/index.ts`) that marks an entity as deliberately wound
 * down. An entity in one of these states isn't a hygiene problem —
 * it's supposed to be quiet — so both staleness and orphan checks
 * below skip it. Broader than `plannerMemory.ts`'s own
 * `RESOLVED_STATUSES` (which only needs `resolved`/`archived` for
 * memory Notes) because Thread/Storyline's own suggested values add
 * `Abandoned`/`Paused` as equally "done, not forgotten" states. */
const INACTIVE_STATUSES = new Set(['resolved', 'archived', 'abandoned', 'completed', 'closed', 'paused']);

function isActiveStatus(status: string | null | undefined): boolean {
  if (!status) return true;
  return !INACTIVE_STATUSES.has(status.trim().toLowerCase());
}

interface StaleCandidate {
  id: string;
  updatedAt: string;
  status?: string | null;
}

/** Entities not touched in `staleDays` days as of `asOf`, excluding any
 * already in a wound-down status (see `isActiveStatus`). `asOf` is a
 * parameter rather than `new Date()` read internally so this stays a
 * pure, deterministic function to test. */
export function selectStale<T extends StaleCandidate>(entities: T[], asOf: Date, staleDays: number = DEFAULT_STALE_DAYS): T[] {
  const cutoff = asOf.getTime() - staleDays * 24 * 60 * 60 * 1000;
  return entities.filter((entity) => isActiveStatus(entity.status) && new Date(entity.updatedAt).getTime() < cutoff);
}

interface OrphanCandidate {
  id: string;
  status?: string | null;
}

function isLinked(type: EntityType, id: string, links: EntityLink[]): boolean {
  return links.some((link) => (link.sourceType === type && link.sourceId === id) || (link.targetType === type && link.targetId === id));
}

/** Entities with zero `EntityLink` rows pointing in or out, excluding
 * any already in a wound-down status (an intentionally-closed Thread
 * with nothing linked isn't a loose end). Scoped to the kinds the doc's
 * own entity model expects to connect to something else — Notes and
 * Events are deliberately left out: plenty of legitimate standalone
 * Notes/one-off Events exist by design, so flagging every unlinked one
 * would be noise, not signal. */
export function selectOrphaned<T extends OrphanCandidate>(type: EntityType, entities: T[], links: EntityLink[]): T[] {
  return entities.filter((entity) => isActiveStatus(entity.status) && !isLinked(type, entity.id, links));
}

interface CampaignHygieneGroups {
  npcs: Npc[];
  groups: Group[];
  locations: Location[];
  threads: Thread[];
  quests: Quest[];
  storylines: Storyline[];
}

export interface CampaignHygieneReport {
  stale: CampaignHygieneGroups;
  orphaned: CampaignHygieneGroups;
}

/**
 * ROADMAP.md's "Campaign hygiene view" — the backward-looking,
 * campaign-wide counterpart to `buildCampaignChanges`: instead of "what
 * changed since last session," this is "what's gone quiet, or never
 * got connected to anything, across the whole campaign." Entirely
 * derived from fields/rows this package already has (`updatedAt`,
 * `status`, the `EntityLink` graph) — no new entity, no snapshot table.
 */
export function buildCampaignHygiene(
  state: CampaignHygieneGroups,
  links: EntityLink[],
  asOf: Date,
  staleDays: number = DEFAULT_STALE_DAYS
): CampaignHygieneReport {
  return {
    stale: {
      npcs: selectStale(state.npcs, asOf, staleDays),
      groups: selectStale(state.groups, asOf, staleDays),
      locations: selectStale(state.locations, asOf, staleDays),
      threads: selectStale(state.threads, asOf, staleDays),
      quests: selectStale(state.quests, asOf, staleDays),
      storylines: selectStale(state.storylines, asOf, staleDays),
    },
    orphaned: {
      npcs: selectOrphaned('npc', state.npcs, links),
      groups: selectOrphaned('group', state.groups, links),
      locations: selectOrphaned('location', state.locations, links),
      threads: selectOrphaned('thread', state.threads, links),
      quests: selectOrphaned('quest', state.quests, links),
      storylines: selectOrphaned('storyline', state.storylines, links),
    },
  };
}
