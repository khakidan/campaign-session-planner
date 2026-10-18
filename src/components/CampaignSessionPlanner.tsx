import React, { useEffect, useMemo, useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type {
  CampaignId,
  CampaignPlannerRepository,
  EntityId,
  EntityReference,
  EntityType,
  PlannerEntityType,
  TTRPGHostAdapter,
} from '../types';
import { useNotes } from '../hooks/useNotes';
import { useLores } from '../hooks/useLores';
import { useNpcs } from '../hooks/useNpcs';
import { useGroups } from '../hooks/useGroups';
import { useLocations } from '../hooks/useLocations';
import { useSessions } from '../hooks/useSessions';
import { useAllScenes } from '../hooks/useScenes';
import { useStorylines } from '../hooks/useStorylines';
import { useThreads } from '../hooks/useThreads';
import { useQuests } from '../hooks/useQuests';
import { useEvents } from '../hooks/useEvents';
import { useEntityLinks } from '../hooks/useEntityLinks';
import { useTemplates } from '../hooks/useTemplates';
import type { NoteEditorProps } from './NoteEditor';
import type { LoreEditorProps } from './LoreEditor';
import type { NpcEditorProps } from './NpcEditor';
import type { GroupEditorProps } from './GroupEditor';
import type { LocationEditorProps } from './LocationEditor';
import type { SessionEditorProps } from './SessionEditor';
import type { StorylineEditorProps } from './StorylineEditor';
import type { ThreadEditorProps } from './ThreadEditor';
import type { QuestEditorProps } from './QuestEditor';
import type { EventEditorProps } from './EventEditor';
import { NoteEditorRoute } from './NoteEditorRoute';
import { LoreEditorRoute } from './LoreEditorRoute';
import { NpcEditorRoute } from './NpcEditorRoute';
import { GroupEditorRoute } from './GroupEditorRoute';
import { LocationEditorRoute } from './LocationEditorRoute';
import { SessionEditorRoute } from './SessionEditorRoute';
import { SceneEditorRoute } from './SceneEditorRoute';
import { StorylineEditorRoute } from './StorylineEditorRoute';
import { ThreadEditorRoute } from './ThreadEditorRoute';
import { QuestEditorRoute } from './QuestEditorRoute';
import { EventEditorRoute } from './EventEditorRoute';
import { EntityListView, type EntityListItem } from './EntityListView';
import { TemplateSettingsPanel } from './TemplateSettingsPanel';
import type { PlannerSearchItem } from './EntityLinkPicker';
import type { TemplateEntityKind } from '../types';
import type { View } from '../lib/plannerRoutes';

/** What the default tab-bar nav renders from, and what a `renderNav`
 * override receives instead — every browsable kind's label, which one
 * is active, a setter for it, and the "Templates" trigger. Deliberately
 * plain data/callbacks, not JSX, so a host can build a sidebar, a
 * dropdown, or anything else entirely from the same inputs rather than
 * restyling the shipped tab bar. */
export interface CampaignSessionPlannerNavProps {
  kinds: PlannerEntityType[];
  labels: Record<PlannerEntityType, string>;
  activeKind: PlannerEntityType;
  onSelectKind: (kind: PlannerEntityType) => void;
  onOpenTemplateSettings: () => void;
}

/** Per-entity-kind field-layout overrides (ROADMAP.md's "further layout
 * customization beyond the tab bar") — each editor's own `renderFields`
 * prop, keyed the same way `TemplateEntityKind`/template overrides are.
 * Every key is independent and optional: customize one kind's fields
 * without touching any other. `scene` covers `SceneEditor` wherever
 * it's shown — both its own top-level tab and inline from
 * `SessionEditor`'s own Scenes sub-section. */
export interface CampaignSessionPlannerRenderFields {
  note?: NoteEditorProps['renderFields'];
  lore?: LoreEditorProps['renderFields'];
  npc?: NpcEditorProps['renderFields'];
  group?: GroupEditorProps['renderFields'];
  location?: LocationEditorProps['renderFields'];
  session?: SessionEditorProps['renderFields'];
  scene?: SessionEditorProps['renderSceneFields'];
  storyline?: StorylineEditorProps['renderFields'];
  thread?: ThreadEditorProps['renderFields'];
  quest?: QuestEditorProps['renderFields'];
  event?: EventEditorProps['renderFields'];
}

export interface CampaignSessionPlannerProps {
  campaignId: CampaignId;
  repository: CampaignPlannerRepository;
  /** The entity-link picker's "Campaign" search results
   * (`hostAdapter.searchEntities`). */
  hostAdapter: TTRPGHostAdapter;
  onOpenHostEntity?: (type: EntityType, id: EntityId) => void;
  /** Replaces the default horizontal tab bar (kind switcher +
   * "Templates" trigger) — the single most opinionated piece of layout
   * this component owns. Omit to keep the shipped tab bar; provide this
   * to render a sidebar, dropdown, or any other navigation shape from
   * the same underlying state instead of overriding its markup/CSS. */
  renderNav?: (props: CampaignSessionPlannerNavProps) => React.ReactNode;
  /** Per-kind field-layout overrides — see `CampaignSessionPlannerRenderFields`.
   * Omit any (or all) keys to keep that kind's shipped field layout. */
  renderFields?: CampaignSessionPlannerRenderFields;
}

/** Slice 4.2c gave Notes/NPCs/Groups/Locations each their own tab;
 * Slice 4.2d added Sessions/Storylines/Threads/Quests/Events the same
 * way; a later pass gave Scene one too, alongside (not instead of) its
 * existing inline management in `SessionEditor.tsx` — see its own doc
 * comment. Lore (ROADMAP.md) got its own tab too, pulled out of what
 * used to be just a suggested `Note.type` value — see `LoreEditor.tsx`.
 * 11 tabs total. Each kind keeps fully independent list/edit state (no
 * cross-kind coupling) so a bug in one kind's view can't bleed into
 * another's. */
const BROWSABLE_KINDS: PlannerEntityType[] = [
  'note',
  'lore',
  'npc',
  'group',
  'location',
  'session',
  'scene',
  'storyline',
  'thread',
  'quest',
  'event',
];
const TAB_LABELS: Record<PlannerEntityType, string> = {
  note: 'Notes',
  lore: 'Lore',
  npc: 'NPCs',
  group: 'Groups',
  location: 'Locations',
  session: 'Sessions',
  scene: 'Scenes',
  storyline: 'Storylines',
  thread: 'Threads',
  quest: 'Quests',
  event: 'Events',
};

/**
 * Slice 4.2a's first real vertical slice was Notes only. Slice 4.2b
 * added real entity-linking (an explicit "Add Link" search panel, not
 * inline `[[`/`@` typing — that's block-editor territory, Slice 4.2e)
 * and a derived backlinks list. Slice 4.2c brought NPC/Group/Location
 * online; Slice 4.2d brought Session (with inline Scenes)/Storyline/
 * Thread/Quest/Event online, using the same proven pattern each time.
 * Deliberately owns no routing of its own (per the doc's "keep the
 * planner embeddable... not as an app that owns routing" constraint) —
 * list/edit is local component state, not URL state; the host page
 * owns the actual route and outer page chrome.
 */
export const CampaignSessionPlanner: React.FC<CampaignSessionPlannerProps> = ({
  campaignId,
  repository,
  hostAdapter,
  onOpenHostEntity,
  renderNav,
  renderFields,
}) => {
  const { notes, error: notesError, reload: reloadNotes, createNote, updateNote, deleteNote } = useNotes(repository, campaignId);
  const { lores, error: loresError, reload: reloadLores, createLore, updateLore, deleteLore } = useLores(repository, campaignId);
  const { npcs, error: npcsError, reload: reloadNpcs, createNpc, updateNpc, deleteNpc } = useNpcs(repository, campaignId);
  const { groups, error: groupsError, reload: reloadGroups, createGroup, updateGroup, deleteGroup } = useGroups(repository, campaignId);
  const { locations, error: locationsError, reload: reloadLocations, createLocation, updateLocation, deleteLocation } = useLocations(
    repository,
    campaignId
  );
  const { sessions, error: sessionsError, reload: reloadSessions, createSession, updateSession, deleteSession } = useSessions(repository, campaignId);
  // Campaign-wide Scenes, backing the top-level "Scenes" tab — scoped
  // to whichever Sessions this campaign already has (Scene itself
  // carries no `campaignId`; see `useAllScenes`'s own doc comment).
  const sessionIds = useMemo(() => (sessions ?? []).map((s) => s.id), [sessions]);
  const { scenes: allScenes, error: scenesError, reload: reloadAllScenes, createScene, updateScene, deleteScene } = useAllScenes(
    repository,
    sessionIds
  );
  const { storylines, error: storylinesError, reload: reloadStorylines, createStoryline, updateStoryline, deleteStoryline } = useStorylines(
    repository,
    campaignId
  );
  const { threads, error: threadsError, reload: reloadThreads, createThread, updateThread, deleteThread } = useThreads(repository, campaignId);
  const { quests, error: questsError, reload: reloadQuests, createQuest, updateQuest, deleteQuest } = useQuests(repository, campaignId);
  const { events, error: eventsError, reload: reloadEvents, createEvent, updateEvent, deleteEvent } = useEvents(repository, campaignId);
  const { templates, error: templatesError, reload: reloadTemplates, saveTemplate, deleteTemplate } = useTemplates(repository, campaignId);

  // Phase 5, Slice 5.4 (docs/markdown/ROADMAP.md) — another connected
  // DM/Co-GM's write anywhere in the planner reloads every top-level list
  // here, so a newly-created NPC (for example) shows up without a manual
  // refresh. Coarse by design (docs/campaign_session_notes_app.md`'s no
  // Player-facing surface means no time-critical concurrent-editing
  // scenario here the way Live Encounter has) — one event, reload
  // everything, rather than per-entity-kind events. `repository
  // .subscribeToChanges` is optional on the interface, so a host that
  // doesn't implement it (or a test's repository fake) just never fires
  // this — the planner still works exactly as it always has.
  useEffect(() => {
    if (!repository.subscribeToChanges) return;
    return repository.subscribeToChanges(() => {
      reloadNotes();
      reloadLores();
      reloadNpcs();
      reloadGroups();
      reloadLocations();
      reloadSessions();
      reloadAllScenes();
      reloadStorylines();
      reloadThreads();
      reloadQuests();
      reloadEvents();
      reloadTemplates();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository]);

  // Slice 4.2f — a campaign's saved template override for one kind, or
  // `undefined` when uncustomized (each editor already falls back to
  // its own shipped default in that case — see e.g. NpcEditor.tsx's
  // `template ?? defaultNpcTemplate`).
  const templateOverride = (kind: TemplateEntityKind): PartialBlock[] | undefined =>
    (templates ?? []).find((t) => t.entityKind === kind)?.blocks as PartialBlock[] | undefined;

  const [showTemplateSettings, setShowTemplateSettings] = useState(false);
  const [activeKind, setActiveKind] = useState<PlannerEntityType>('note');
  const [views, setViews] = useState<Record<PlannerEntityType, View>>({
    note: { mode: 'list' },
    lore: { mode: 'list' },
    npc: { mode: 'list' },
    group: { mode: 'list' },
    location: { mode: 'list' },
    session: { mode: 'list' },
    scene: { mode: 'list' },
    storyline: { mode: 'list' },
    thread: { mode: 'list' },
    quest: { mode: 'list' },
    event: { mode: 'list' },
  });
  const [isSaving, setIsSaving] = useState(false);

  const listError = {
    note: notesError,
    lore: loresError,
    npc: npcsError,
    group: groupsError,
    location: locationsError,
    session: sessionsError,
    scene: scenesError,
    storyline: storylinesError,
    thread: threadsError,
    quest: questsError,
    event: eventsError,
  }[activeKind];
  const view = views[activeKind];
  const setView = (kind: PlannerEntityType, next: View) => setViews((prev) => ({ ...prev, [kind]: next }));

  // Wraps a save/delete action in the shared `isSaving` flag every
  // editor's Save/Delete buttons disable against — factored out once
  // Slice 4.2d pushed this same try/finally to 9 call sites.
  const runSaving = async (fn: () => Promise<void>) => {
    setIsSaving(true);
    try {
      await fn();
    } finally {
      setIsSaving(false);
    }
  };

  // Flattened across every browsable kind — the link picker's
  // planner-owned search results and the fallback label source for
  // pre-4.2c (Note-only) backlinks that predate `metadata.sourceLabel`.
  const plannerItems: PlannerSearchItem[] = useMemo(
    () => [
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
    ],
    [notes, lores, npcs, groups, locations, sessions, allScenes, storylines, threads, quests, events]
  );

  const openPlannerEntity = (ref: EntityReference) => {
    const kind = ref.type as PlannerEntityType;
    setActiveKind(kind);
    setView(kind, { mode: 'edit', id: ref.id });
  };

  // The currently-edited record's own EntityReference + display label
  // — used both for `useEntityLinks` (the link's source when adding a
  // new one) and, via `selfLabel`, to stamp `metadata.sourceLabel` on
  // that new link so any future backlink can render this record's name
  // without a fetch (see useEntityLinks.ts).
  const editingRef: EntityReference | null =
    view.mode === 'edit' && view.id ? { type: activeKind, id: view.id, source: 'planner' } : null;
  const editingLabel = editingRef ? plannerItems.find((i) => i.type === editingRef.type && i.id === editingRef.id)?.label : undefined;
  const { outgoing, incoming, addLink, removeLink } = useEntityLinks(repository, editingRef, campaignId, editingLabel);

  const linksProp = editingRef
    ? {
        plannerItems,
        hostAdapter,
        outgoing,
        incoming,
        onAddLink: addLink,
        onRemoveLink: removeLink,
        onOpenPlannerEntity: openPlannerEntity,
        onOpenHostEntity,
      }
    : undefined;

  if (showTemplateSettings) {
    return (
      <TemplateSettingsPanel
        templates={templates}
        error={templatesError}
        saveTemplate={saveTemplate}
        deleteTemplate={deleteTemplate}
        onClose={() => setShowTemplateSettings(false)}
      />
    );
  }

  // Every kind's own edit-view wiring lives in its own `*EditorRoute`
  // component (ROADMAP.md's "Refactoring Candidates") — this dispatch
  // just resolves `activeKind`/`view.mode` and hands each one the
  // shared pieces (`repository`, `campaignId`, `isSaving`, `linksProp`,
  // `setView`/`runSaving`) plus its own kind-specific lists/CRUD
  // functions/template/renderFields.
  if (activeKind === 'note' && view.mode === 'edit') {
    return (
      <NoteEditorRoute
        notes={notes}
        viewId={view.id}
        setView={setView}
        runSaving={runSaving}
        isSaving={isSaving}
        campaignId={campaignId}
        repository={repository}
        links={linksProp}
        renderFields={renderFields?.note}
        createNote={createNote}
        updateNote={updateNote}
        deleteNote={deleteNote}
        reloadNotes={reloadNotes}
      />
    );
  }

  if (activeKind === 'lore' && view.mode === 'edit') {
    return (
      <LoreEditorRoute
        lores={lores}
        viewId={view.id}
        setView={setView}
        runSaving={runSaving}
        isSaving={isSaving}
        campaignId={campaignId}
        repository={repository}
        links={linksProp}
        renderFields={renderFields?.lore}
        createLore={createLore}
        updateLore={updateLore}
        deleteLore={deleteLore}
        reloadLores={reloadLores}
      />
    );
  }

  if (activeKind === 'npc' && view.mode === 'edit') {
    return (
      <NpcEditorRoute
        npcs={npcs}
        viewId={view.id}
        setView={setView}
        runSaving={runSaving}
        isSaving={isSaving}
        campaignId={campaignId}
        repository={repository}
        links={linksProp}
        template={templateOverride('npc')}
        renderFields={renderFields?.npc}
        createNpc={createNpc}
        updateNpc={updateNpc}
        deleteNpc={deleteNpc}
        reloadNpcs={reloadNpcs}
      />
    );
  }

  if (activeKind === 'group' && view.mode === 'edit') {
    return (
      <GroupEditorRoute
        groups={groups}
        viewId={view.id}
        setView={setView}
        runSaving={runSaving}
        isSaving={isSaving}
        campaignId={campaignId}
        repository={repository}
        links={linksProp}
        template={templateOverride('group')}
        renderFields={renderFields?.group}
        createGroup={createGroup}
        updateGroup={updateGroup}
        deleteGroup={deleteGroup}
        reloadGroups={reloadGroups}
      />
    );
  }

  if (activeKind === 'location' && view.mode === 'edit') {
    return (
      <LocationEditorRoute
        locations={locations}
        viewId={view.id}
        setView={setView}
        runSaving={runSaving}
        isSaving={isSaving}
        campaignId={campaignId}
        repository={repository}
        links={linksProp}
        template={templateOverride('location')}
        renderFields={renderFields?.location}
        createLocation={createLocation}
        updateLocation={updateLocation}
        deleteLocation={deleteLocation}
        reloadLocations={reloadLocations}
      />
    );
  }

  if (activeKind === 'session' && view.mode === 'edit') {
    return (
      <SessionEditorRoute
        sessions={sessions}
        viewId={view.id}
        setView={(next) => setView('session', next)}
        runSaving={runSaving}
        isSaving={isSaving}
        campaignId={campaignId}
        repository={repository}
        hostAdapter={hostAdapter}
        plannerItems={plannerItems}
        links={linksProp}
        template={templateOverride('session')}
        debriefTemplate={templateOverride('sessionDebrief')}
        sceneTemplate={templateOverride('scene')}
        renderFields={renderFields?.session}
        renderSceneFields={renderFields?.scene}
        onScenesChanged={reloadAllScenes}
        onOpenPlannerEntity={openPlannerEntity}
        onOpenHostEntity={onOpenHostEntity}
        createSession={createSession}
        updateSession={updateSession}
        deleteSession={deleteSession}
        reloadSessions={reloadSessions}
      />
    );
  }

  if (activeKind === 'scene' && view.mode === 'edit') {
    return (
      <SceneEditorRoute
        allScenes={allScenes}
        sessions={sessions}
        viewId={view.id}
        setView={(next) => setView('scene', next)}
        runSaving={runSaving}
        isSaving={isSaving}
        campaignId={campaignId}
        repository={repository}
        links={linksProp}
        template={templateOverride('scene')}
        renderFields={renderFields?.scene}
        createScene={createScene}
        updateScene={updateScene}
        deleteScene={deleteScene}
        reloadAllScenes={reloadAllScenes}
      />
    );
  }

  if (activeKind === 'storyline' && view.mode === 'edit') {
    return (
      <StorylineEditorRoute
        storylines={storylines}
        viewId={view.id}
        setView={setView}
        runSaving={runSaving}
        isSaving={isSaving}
        campaignId={campaignId}
        repository={repository}
        links={linksProp}
        template={templateOverride('storyline')}
        renderFields={renderFields?.storyline}
        createStoryline={createStoryline}
        updateStoryline={updateStoryline}
        deleteStoryline={deleteStoryline}
        reloadStorylines={reloadStorylines}
      />
    );
  }

  if (activeKind === 'thread' && view.mode === 'edit') {
    return (
      <ThreadEditorRoute
        threads={threads}
        viewId={view.id}
        setView={setView}
        runSaving={runSaving}
        isSaving={isSaving}
        campaignId={campaignId}
        repository={repository}
        links={linksProp}
        template={templateOverride('thread')}
        renderFields={renderFields?.thread}
        createThread={createThread}
        updateThread={updateThread}
        deleteThread={deleteThread}
        reloadThreads={reloadThreads}
      />
    );
  }

  if (activeKind === 'quest' && view.mode === 'edit') {
    return (
      <QuestEditorRoute
        quests={quests}
        viewId={view.id}
        setView={setView}
        runSaving={runSaving}
        isSaving={isSaving}
        campaignId={campaignId}
        repository={repository}
        links={linksProp}
        template={templateOverride('quest')}
        renderFields={renderFields?.quest}
        createQuest={createQuest}
        updateQuest={updateQuest}
        deleteQuest={deleteQuest}
        reloadQuests={reloadQuests}
      />
    );
  }

  if (activeKind === 'event' && view.mode === 'edit') {
    return (
      <EventEditorRoute
        events={events}
        viewId={view.id}
        setView={setView}
        runSaving={runSaving}
        isSaving={isSaving}
        campaignId={campaignId}
        repository={repository}
        links={linksProp}
        template={templateOverride('event')}
        renderFields={renderFields?.event}
        createEvent={createEvent}
        updateEvent={updateEvent}
        deleteEvent={deleteEvent}
        reloadEvents={reloadEvents}
      />
    );
  }

  // A Scene's own list row shows which Session it belongs to (as
  // `subtitle`, not `badge` — `badge` is reserved for `status`, same as
  // every other kind) since, unlike every other top-level kind, Scenes
  // span multiple parents here.
  const sessionTitleById = new Map((sessions ?? []).map((s): [string, string] => [s.id, s.title]));

  // The list view for every browsable kind is uniform (search/"New X"/
  // a row per record with an optional badge) — fully collapsed into one
  // config lookup, unlike the edit views above (each Editor's props
  // differ too much, Session's especially, to unify safely).
  const listConfig: Record<PlannerEntityType, { items: EntityListItem[] | null }> = {
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
  const listItems = listConfig[activeKind].items;
  const tabLabel = TAB_LABELS[activeKind];

  const navProps: CampaignSessionPlannerNavProps = {
    kinds: BROWSABLE_KINDS,
    labels: TAB_LABELS,
    activeKind,
    onSelectKind: setActiveKind,
    onOpenTemplateSettings: () => setShowTemplateSettings(true),
  };

  return (
    <div className="space-y-4">
      {renderNav ? (
        renderNav(navProps)
      ) : (
        <div className="flex items-center justify-between gap-1 border-b border-[var(--csp-neutral-200)]">
          <div className="flex items-center gap-1 overflow-x-auto">
            {BROWSABLE_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setActiveKind(kind)}
                className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px whitespace-nowrap cursor-pointer ${
                  activeKind === kind
                    ? 'border-[var(--csp-accent-600)] text-[var(--csp-accent-700)]'
                    : 'border-transparent text-[var(--csp-neutral-500)] hover:text-[var(--csp-neutral-800)]'
                }`}
              >
                {TAB_LABELS[kind]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowTemplateSettings(true)}
            className="px-3 py-2 text-xs font-semibold text-[var(--csp-neutral-500)] hover:text-[var(--csp-neutral-800)] whitespace-nowrap cursor-pointer"
          >
            Templates
          </button>
        </div>
      )}

      {listError && <div className="text-xs font-semibold text-[var(--csp-danger-600)]">{listError}</div>}

      <EntityListView
        items={listItems}
        onSelect={(id) => setView(activeKind, { mode: 'edit', id })}
        onCreate={() => setView(activeKind, { mode: 'edit', id: null })}
        createLabel={`New ${tabLabel.replace(/s$/, '')}`}
        emptyLabel={`No ${tabLabel.toLowerCase()} yet — create one to get started.`}
        searchPlaceholder={`Search ${tabLabel.toLowerCase()}…`}
      />
    </div>
  );
};
