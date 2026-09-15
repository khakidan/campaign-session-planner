// docs/markdown/campaign_session_notes_app.md — the Campaign Session
// Planner's public contracts. This package never imports the host app's
// Prisma models or types (see the doc's "Implementation constraints") —
// every host-owned entity this package touches is one of the generic
// TTRPG* shapes below, resolved through `TTRPGHostAdapter` at read time.
//
// Slice 4.2a implemented Note + EntityLink; Slice 4.2c added Npc/Group/
// Location; Slice 4.2d added Session/Scene/Storyline/Thread/Quest/
// Event — every entity the doc's Entity Model describes is now real.
// Slice 4.2e reshaped every entity Notion-style: a small properties row
// (the fields already real Prisma columns — Name/Type/Status/Priority/
// Date/Location's Parent) plus ONE BlockNote rich-text document per
// entity, replacing 4.2c/4.2d's one-small-textarea-per-doc-listed-field
// design. `Block` (BlockNote's own document-node type) is re-exported
// here since every entity's body/`details`/`debrief` field is now
// `Block[]`, not a flat object of strings.

import type { Block as CoreBlock } from '@blocknote/core';
/** Every BlockNote field in this package shares one custom schema
 * (`BlockNoteFreeformField.tsx`'s `entityReference` inline content),
 * so the exact `Block<BSchema, ISchema, SSchema>` generic parameters
 * differ from `@blocknote/core`'s bare default export. Storage-level
 * contracts (`Note.content`, `Npc.details`, etc.) don't need that
 * precision — they only ever round-trip this as opaque JSON — so
 * `any` parameters keep this type assignable everywhere without
 * forcing every consumer to import and match the custom schema type. */
export type Block = CoreBlock<any, any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type EntityId = string;
export type CampaignId = string;
export type NoteId = string;
export type NpcId = string;
export type GroupId = string;
export type LocationId = string;
export type SessionId = string;
export type SceneId = string;
export type StorylineId = string;
export type ThreadId = string;
export type QuestId = string;
export type EventId = string;
export type EntityLinkId = string;

/** A host-owned entity type this package can reference but never owns. */
export type HostEntityType = 'character' | 'adversary' | 'environment' | 'encounter' | 'item';

/** A planner-owned entity type. Scene is planner-owned but has no
 * top-level tab (Slice 4.2d) — it only exists nested under a Session —
 * yet it's still a real, independently-linkable `EntityType`. */
export type PlannerEntityType =
  | 'note'
  | 'npc'
  | 'group'
  | 'location'
  | 'session'
  | 'scene'
  | 'storyline'
  | 'thread'
  | 'quest'
  | 'event';

export type EntityType = HostEntityType | PlannerEntityType;

/**
 * A stable reference to either a planner-owned or host-owned entity —
 * the one contract the planner and host must always agree on (the doc's
 * "The universal entity-link system").
 */
export interface EntityReference {
  type: EntityType;
  id: EntityId;
  source: 'planner' | 'host';
}

export interface GameSystemInfo {
  id: string;
  name: string;
}

export interface EntitySearchFilters {
  types?: EntityType[];
}

export interface EntitySearchResult {
  type: EntityType;
  id: EntityId;
  source: 'planner' | 'host';
  label: string;
  description?: string;
}

// Generic host-entity shapes — deliberately minimal (just enough for a
// search result / reference card), not a mirror of the host's full
// Character/Adversary/etc. record. The host adapter maps its real,
// game-specific data onto these at the boundary.
export interface TTRPGCharacter {
  id: EntityId;
  name: string;
  summary?: string;
}
export interface TTRPGAdversary {
  id: EntityId;
  name: string;
  summary?: string;
}
export interface TTRPGEnvironment {
  id: EntityId;
  name: string;
  summary?: string;
}
export interface TTRPGEncounter {
  id: EntityId;
  name: string;
  summary?: string;
}
export interface TTRPGItem {
  id: EntityId;
  name: string;
  summary?: string;
}
export type TTRPGEntity = TTRPGCharacter | TTRPGAdversary | TTRPGEnvironment | TTRPGEncounter | TTRPGItem;

/**
 * The host → planner integration contract. One implementation per host
 * app (this app supplies `DaggerheartHostAdapter`, `src/server` side —
 * see docs/markdown/campaign_session_notes_app.md's "Package boundary").
 * The planner never branches on which game system it's running under;
 * game-specific behavior only ever flows through this interface.
 */
export interface TTRPGHostAdapter {
  getGameSystem(): GameSystemInfo;
  getCharacters(ids: EntityId[]): Promise<TTRPGCharacter[]>;
  getAdversaries(ids: EntityId[]): Promise<TTRPGAdversary[]>;
  getEnvironments(ids: EntityId[]): Promise<TTRPGEnvironment[]>;
  getEncounters(ids: EntityId[]): Promise<TTRPGEncounter[]>;
  getItems(ids: EntityId[]): Promise<TTRPGItem[]>;
  searchEntities(query: string, filters?: EntitySearchFilters): Promise<EntitySearchResult[]>;
  getEntity(type: EntityType, id: EntityId): Promise<TTRPGEntity | null>;
  /** Navigates to the host's own page for this entity (e.g. `/adversaries/:id`). */
  openEntity(type: EntityType, id: EntityId): void;
}

export interface Note {
  id: NoteId;
  campaignId: CampaignId;
  title: string;
  /** Free text, matching this app's own house style for status-like
   * fields (see prisma/schema.prisma's Character.status, etc.) — not a
   * closed enum. Suggested values: General / Idea / Reminder / Research
   * / Lore / Session Note / GM Note / Player Note / Secret. */
  type?: string | null;
  status?: string | null;
  /** A BlockNote document (Slice 4.2e) — the page body, not a flat
   * string. May contain `entityReference` inline nodes created via the
   * `[[`/`@` picker, each backed by a real `EntityLink` row. */
  content?: Block[] | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EntityLink {
  id: EntityLinkId;
  campaignId: CampaignId;
  sourceType: EntityType;
  sourceId: EntityId;
  targetType: EntityType;
  targetId: EntityId;
  relationshipType: string;
  /** `label` is the *target's* display name, captured at creation time
   * from the link picker's search result. `sourceLabel` (Slice 4.2c) is
   * the *source's* display name, captured the same way — set by
   * whichever entity's editor created the link, so a backlink can
   * render its source's name without an extra fetch or an assumption
   * about the source's type. Links created in Slice 4.2b (Note-only)
   * predate `sourceLabel`; renderers fall back to a Note-title lookup
   * for those. */
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Npc {
  id: NpcId;
  campaignId: CampaignId;
  name: string;
  /** One BlockNote document (Slice 4.2e) replacing every doc-listed NPC
   * field (Aliases, Appearance, Personality, Motivation, Knowledge,
   * History, Roleplaying, Tactics, Secrets, Campaign Role, ...) — the
   * GM writes it as free-flowing prose, Notion-page style, not one
   * small boxed answer per question. Affiliations/Relationships stay
   * `EntityLink`s, not document content. */
  details?: Block[] | null;
  createdAt: string;
  updatedAt: string;
}

/** Faction/Organization, one table with a `type` discriminator per the
 * doc ("this replaces the source doc's separate Faction and
 * Organization templates with one table"). Allies/Rivals/Enemies/
 * Subordinates/Membership are `EntityLink`s, not document content. */
export interface Group {
  id: GroupId;
  campaignId: CampaignId;
  name: string;
  /** Free text, matching this app's house style — suggested values:
   * FACTION / ORGANIZATION / GUILD / GOVERNMENT / INSTITUTION / CULT /
   * MILITARY / CRIMINAL_SYNDICATE. */
  type?: string | null;
  /** The doc lists a Status field for Group but gives no enumerated
   * options (unlike Session/Thread/Storyline) — plain free text, no
   * suggestions, same treatment as `Note.status`. */
  status?: string | null;
  /** One BlockNote document (Slice 4.2e) replacing every doc-listed
   * Group field (Ideology, Goals, Leadership, Resources, Methods,
   * Reputation, Current Activity, Secrets, Campaign Role, ...). */
  details?: Block[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: LocationId;
  campaignId: CampaignId;
  name: string;
  /** Free text — the doc gives no suggested list for Location's Type,
   * unlike Group's, so no datalist suggestions are offered. */
  type?: string | null;
  /** Self-referential — supports nested locations (e.g. a district
   * within a city). */
  parentLocationId?: LocationId | null;
  /** One BlockNote document (Slice 4.2e) replacing every doc-listed
   * Location field (Description, Appearance, Atmosphere, Features,
   * Inhabitants, History, Current State, Access, Resources, Secrets).
   * Connected Locations stays an `EntityLink`, not document content. */
  details?: Block[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: SessionId;
  campaignId: CampaignId;
  title: string;
  sessionNumber?: number | null;
  /** ISO date string. */
  date?: string | null;
  /** Free text — suggested values Draft / Prepared / Running /
   * Completed (the doc's Session Lifecycle), not a closed enum,
   * matching this app's house style. */
  status?: string | null;
  /** One BlockNote document (Slice 4.2e) replacing every doc-listed
   * Session field (Summary, Objectives, Preparation, GM Materials,
   * Running Notes, Outcomes, ...). Scenes/active Storylines-Threads-
   * Quests/Anticipated NPCs-Locations-Factions-Events are Scene rows +
   * `EntityLink`s, not document content. */
  details?: Block[] | null;
  /** A second, separate BlockNote document (Slice 4.2e) — "collected
   * when a session moves to Completed" per the doc's Session Lifecycle
   * section; the UI only shows this once `status === 'Completed'`. Kept
   * as its own document rather than folded into `details` since it's a
   * distinct, secondary moment, not part of the main write-up. */
  debrief?: Block[] | null;
  createdAt: string;
  updatedAt: string;
}

/** A Scene only ever exists nested under one Session (the doc's tree:
 * Sessions → Scenes → Encounters) and has no top-level tab in the UI,
 * but is still a real, independently-linkable entity — see "Scene has
 * no top-level tab" in docs/markdown/ROADMAP.md's Slice 4.2d write-up. */
export interface Scene {
  id: SceneId;
  sessionId: SessionId;
  title: string;
  sceneNumber?: number | null;
  status?: string | null;
  /** GM-controlled ordering within the Session — not derived from
   * `createdAt`. */
  order: number;
  /** One BlockNote document (Slice 4.2e) replacing every doc-listed
   * Scene field (Situation, GM Guidance, Player Context, Challenge,
   * Outcomes, ...). Participants/Linked Encounter/Campaign Connections
   * stay `EntityLink`s, not document content. */
  details?: Block[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Storyline {
  id: StorylineId;
  campaignId: CampaignId;
  name: string;
  /** Free text — suggested values Active / Resolved / Abandoned /
   * Paused, not a closed enum. */
  status?: string | null;
  priority?: string | null;
  /** One BlockNote document (Slice 4.2e) replacing every doc-listed
   * Storyline field (Premise, Goals, Progression, Milestones, History,
   * Secrets, ...). Active Threads/Quests/Important People & Places
   * stay `EntityLink`s, not document content. */
  details?: Block[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Thread {
  id: ThreadId;
  campaignId: CampaignId;
  name: string;
  /** Free text — suggested values Open / Resolved / Abandoned, not a
   * closed enum. */
  status?: string | null;
  priority?: string | null;
  /** One BlockNote document (Slice 4.2e) replacing every doc-listed
   * Thread field (The Unresolved Element, Origin, Player Knowledge,
   * Resolution, ...). Created-In/Resolved-In Session and every other
   * Connection stay `EntityLink`s, not document content. */
  details?: Block[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Quest {
  id: QuestId;
  campaignId: CampaignId;
  name: string;
  /** Free text — the doc gives no suggested list for Quest's Status,
   * so no datalist suggestions are offered. */
  status?: string | null;
  /** One BlockNote document (Slice 4.2e) replacing every doc-listed
   * Quest field (Overview, Requirements, Current State, Rewards,
   * History, ...). Related Storylines/Threads/People & Places/
   * Encounters stay `EntityLink`s, not document content. */
  details?: Block[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: EventId;
  campaignId: CampaignId;
  name: string;
  /** Free text — the doc gives no suggested list for Event's Type or
   * Status, so no datalist suggestions are offered for either. */
  eventType?: string | null;
  status?: string | null;
  /** ISO date string. */
  date?: string | null;
  /** One BlockNote document (Slice 4.2e) replacing every doc-listed
   * Event field (Description, What Happens, Player Involvement,
   * Outcomes, Campaign Impact, ...). Participants and every other
   * Connection stay `EntityLink`s, not document content. */
  details?: Block[] | null;
  createdAt: string;
  updatedAt: string;
}

/** Slice 4.2f — the entity kinds that ship a starter template (see
 * `lib/entityTemplates.ts`) and so can have a per-campaign override.
 * Note is excluded — it has no shipped template (the doc gives no
 * sub-breakdown of its "Content" bullet to transcribe). Session's body
 * and Debrief are separate documents, so `'session'`/`'sessionDebrief'`
 * are separate kinds here even though both belong to `Session`. */
export type TemplateEntityKind =
  | 'npc'
  | 'group'
  | 'location'
  | 'session'
  | 'sessionDebrief'
  | 'scene'
  | 'storyline'
  | 'thread'
  | 'quest'
  | 'event';

/** A campaign's saved override of one entity kind's starter template.
 * Absence of a row for a given kind (i.e. it's missing from
 * `getTemplates`'s result) means "use the shipped default." */
export interface PlannerTemplate {
  id: string;
  campaignId: CampaignId;
  entityKind: TemplateEntityKind;
  blocks: Block[];
  updatedAt: string;
}

/**
 * The planner → storage contract. This app implements it against
 * Postgres/Prisma (`src/server/campaignPlannerRepository.ts`); the
 * planner package never queries Postgres directly and never imports
 * Prisma models — it only calls this interface.
 */
export interface CampaignPlannerRepository {
  getNotes(campaignId: CampaignId): Promise<Note[]>;
  getNote(id: NoteId): Promise<Note | null>;
  saveNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: NoteId }): Promise<Note>;
  deleteNote(id: NoteId): Promise<void>;
  getNpcs(campaignId: CampaignId): Promise<Npc[]>;
  getNpc(id: NpcId): Promise<Npc | null>;
  saveNpc(npc: Omit<Npc, 'id' | 'createdAt' | 'updatedAt'> & { id?: NpcId }): Promise<Npc>;
  deleteNpc(id: NpcId): Promise<void>;
  getGroups(campaignId: CampaignId): Promise<Group[]>;
  getGroup(id: GroupId): Promise<Group | null>;
  saveGroup(group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'> & { id?: GroupId }): Promise<Group>;
  deleteGroup(id: GroupId): Promise<void>;
  getLocations(campaignId: CampaignId): Promise<Location[]>;
  getLocation(id: LocationId): Promise<Location | null>;
  saveLocation(location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'> & { id?: LocationId }): Promise<Location>;
  deleteLocation(id: LocationId): Promise<void>;
  getSessions(campaignId: CampaignId): Promise<Session[]>;
  getSession(id: SessionId): Promise<Session | null>;
  saveSession(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'> & { id?: SessionId }): Promise<Session>;
  deleteSession(id: SessionId): Promise<void>;
  /** Scoped to one Session — Scenes are never listed campaign-wide. */
  getScenes(sessionId: SessionId): Promise<Scene[]>;
  getScene(id: SceneId): Promise<Scene | null>;
  saveScene(scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'> & { id?: SceneId }): Promise<Scene>;
  deleteScene(id: SceneId): Promise<void>;
  getStorylines(campaignId: CampaignId): Promise<Storyline[]>;
  getStoryline(id: StorylineId): Promise<Storyline | null>;
  saveStoryline(storyline: Omit<Storyline, 'id' | 'createdAt' | 'updatedAt'> & { id?: StorylineId }): Promise<Storyline>;
  deleteStoryline(id: StorylineId): Promise<void>;
  getThreads(campaignId: CampaignId): Promise<Thread[]>;
  getThread(id: ThreadId): Promise<Thread | null>;
  saveThread(thread: Omit<Thread, 'id' | 'createdAt' | 'updatedAt'> & { id?: ThreadId }): Promise<Thread>;
  deleteThread(id: ThreadId): Promise<void>;
  getQuests(campaignId: CampaignId): Promise<Quest[]>;
  getQuest(id: QuestId): Promise<Quest | null>;
  saveQuest(quest: Omit<Quest, 'id' | 'createdAt' | 'updatedAt'> & { id?: QuestId }): Promise<Quest>;
  deleteQuest(id: QuestId): Promise<void>;
  getEvents(campaignId: CampaignId): Promise<Event[]>;
  getEvent(id: EventId): Promise<Event | null>;
  saveEvent(event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> & { id?: EventId }): Promise<Event>;
  deleteEvent(id: EventId): Promise<void>;
  getLinks(source?: EntityReference): Promise<EntityLink[]>;
  createLink(link: Omit<EntityLink, 'id' | 'createdAt'>): Promise<EntityLink>;
  deleteLink(id: EntityLinkId): Promise<void>;
  /** Only campaign-customized kinds come back — a missing kind means
   * "use the shipped default." */
  getTemplates(campaignId: CampaignId): Promise<PlannerTemplate[]>;
  saveTemplate(campaignId: CampaignId, entityKind: TemplateEntityKind, blocks: Block[]): Promise<PlannerTemplate>;
  /** Reverts one kind back to its shipped default. */
  deleteTemplate(campaignId: CampaignId, entityKind: TemplateEntityKind): Promise<void>;
  /**
   * Optional (Phase 5, Slice 5.4): notifies `onChange` whenever any planner
   * data may have changed on the backing store, from any source — another
   * connected DM/Co-GM, or a change made through this same session.
   * Returns an unsubscribe function. The package deliberately doesn't know
   * *how* a host detects this (WebSocket push, polling, anything else) —
   * only that it can. A host that doesn't implement it (or a repository
   * fake in a test) simply gets no live updates; the planner still works
   * exactly as it always has, reload-on-mutation only.
   */
  subscribeToChanges?(onChange: () => void): () => void;
}
