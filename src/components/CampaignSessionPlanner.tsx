import React, { useEffect, useMemo, useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type {
  CampaignId,
  CampaignPlannerRepository,
  EntityId,
  EntityReference,
  EntityType,
  Event,
  Group,
  Location,
  Note,
  Npc,
  PlannerEntityType,
  Quest,
  Scene,
  Session,
  Storyline,
  Thread,
  TTRPGHostAdapter,
} from '../types';
import { useNotes } from '../hooks/useNotes';
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
import { NoteEditor, type NoteEditorProps, type NoteFormValues } from './NoteEditor';
import { NpcEditor, type NpcEditorProps, type NpcFormValues } from './NpcEditor';
import { GroupEditor, type GroupEditorProps, type GroupFormValues } from './GroupEditor';
import { LocationEditor, type LocationEditorProps, type LocationFormValues } from './LocationEditor';
import { SessionEditor, type SessionEditorProps, type SessionFormValues } from './SessionEditor';
import { SceneEditor, type SceneFormValues } from './SceneEditor';
import { StorylineEditor, type StorylineEditorProps, type StorylineFormValues } from './StorylineEditor';
import { ThreadEditor, type ThreadEditorProps, type ThreadFormValues } from './ThreadEditor';
import { QuestEditor, type QuestEditorProps, type QuestFormValues } from './QuestEditor';
import { EventEditor, type EventEditorProps, type EventFormValues } from './EventEditor';
import { EntityListView, type EntityListItem } from './EntityListView';
import { TemplateSettingsPanel } from './TemplateSettingsPanel';
import type { PlannerSearchItem } from './EntityLinkPicker';
import type { TemplateEntityKind } from '../types';

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
 * comment. 10 tabs total. Each kind keeps fully independent list/edit
 * state (no cross-kind coupling) so a bug in one kind's view can't
 * bleed into another's. */
const BROWSABLE_KINDS: PlannerEntityType[] = [
  'note',
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

type View = { mode: 'list' } | { mode: 'edit'; id: string | null };

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

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
    [notes, npcs, groups, locations, sessions, allScenes, storylines, threads, quests, events]
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

  if (activeKind === 'note' && view.mode === 'edit') {
    const note = view.id ? (notes ?? []).find((n) => n.id === view.id) ?? null : null;
    const noteFormPayload = (values: NoteFormValues) => ({
      title: values.title.trim(),
      type: values.type.trim() || null,
      status: values.status.trim() || null,
      content: values.content,
      tags: parseTags(values.tags),
    });
    return (
      <NoteEditor
        key={view.id ?? 'new'}
        note={note}
        isSaving={isSaving}
        links={linksProp}
        renderFields={renderFields?.note}
        onCancel={() => setView('note', { mode: 'list' })}
        onDelete={note ? () => runSaving(async () => {
          await deleteNote(note.id);
          setView('note', { mode: 'list' });
        }) : undefined}
        onSave={(values: NoteFormValues, existingId: string | null) =>
          runSaving(async () => {
            const payload = noteFormPayload(values);
            const saved = existingId
              ? await updateNote({ ...note, id: existingId, campaignId, ...payload } as Note)
              : await createNote(payload);
            // `existingId` is the *editor's* own knowledge, which an
            // autosave may already have updated in the background;
            // `view.id` is whether this view has ever actually shown
            // linking for this record. An autosave can create the real
            // row without this view learning its id, so this explicit
            // Save click can still be the first moment it's revealed —
            // branch on `view.id`, not `existingId`, so that moment
            // doesn't close the editor the instant it happens.
            setView('note', view.id ? { mode: 'list' } : { mode: 'edit', id: saved.id });
          })
        }
        onAutosave={async (values: NoteFormValues, existingId: string | null) => {
          const payload = noteFormPayload(values);
          if (existingId) {
            const saved = await repository.saveNote({ id: existingId, campaignId, ...payload });
            await reloadNotes();
            return { id: saved.id };
          }
          const created = await createNote(payload);
          return { id: created.id };
        }}
      />
    );
  }

  if (activeKind === 'npc' && view.mode === 'edit') {
    const npc = view.id ? (npcs ?? []).find((n) => n.id === view.id) ?? null : null;
    const npcFormPayload = (values: NpcFormValues) => ({ name: values.name.trim(), details: values.details });
    return (
      <NpcEditor
        key={view.id ?? 'new'}
        npc={npc}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('npc')}
        renderFields={renderFields?.npc}
        onCancel={() => setView('npc', { mode: 'list' })}
        onDelete={npc ? () => runSaving(async () => {
          await deleteNpc(npc.id);
          setView('npc', { mode: 'list' });
        }) : undefined}
        onSave={(values: NpcFormValues, existingId: string | null) =>
          runSaving(async () => {
            const payload = npcFormPayload(values);
            const saved = existingId
              ? await updateNpc({ ...npc, id: existingId, campaignId, ...payload } as Npc)
              : await createNpc(payload);
            setView('npc', view.id ? { mode: 'list' } : { mode: 'edit', id: saved.id });
          })
        }
        onAutosave={async (values: NpcFormValues, existingId: string | null) => {
          const payload = npcFormPayload(values);
          if (existingId) {
            const saved = await repository.saveNpc({ id: existingId, campaignId, ...payload });
            await reloadNpcs();
            return { id: saved.id };
          }
          const created = await createNpc(payload);
          return { id: created.id };
        }}
      />
    );
  }

  if (activeKind === 'group' && view.mode === 'edit') {
    const group = view.id ? (groups ?? []).find((g) => g.id === view.id) ?? null : null;
    const groupFormPayload = (values: GroupFormValues) => ({
      name: values.name.trim(),
      type: values.type.trim() || null,
      status: values.status.trim() || null,
      details: values.details,
    });
    return (
      <GroupEditor
        key={view.id ?? 'new'}
        group={group}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('group')}
        renderFields={renderFields?.group}
        onCancel={() => setView('group', { mode: 'list' })}
        onDelete={group ? () => runSaving(async () => {
          await deleteGroup(group.id);
          setView('group', { mode: 'list' });
        }) : undefined}
        onSave={(values: GroupFormValues, existingId: string | null) =>
          runSaving(async () => {
            const payload = groupFormPayload(values);
            const saved = existingId
              ? await updateGroup({ ...group, id: existingId, campaignId, ...payload } as Group)
              : await createGroup(payload);
            setView('group', view.id ? { mode: 'list' } : { mode: 'edit', id: saved.id });
          })
        }
        onAutosave={async (values: GroupFormValues, existingId: string | null) => {
          const payload = groupFormPayload(values);
          if (existingId) {
            const saved = await repository.saveGroup({ id: existingId, campaignId, ...payload });
            await reloadGroups();
            return { id: saved.id };
          }
          const created = await createGroup(payload);
          return { id: created.id };
        }}
      />
    );
  }

  if (activeKind === 'location' && view.mode === 'edit') {
    const location = view.id ? (locations ?? []).find((l) => l.id === view.id) ?? null : null;
    const locationFormPayload = (values: LocationFormValues) => ({
      name: values.name.trim(),
      type: values.type.trim() || null,
      parentLocationId: values.parentLocationId || null,
      details: values.details,
    });
    return (
      <LocationEditor
        key={view.id ?? 'new'}
        location={location}
        otherLocations={(locations ?? []).filter((l) => l.id !== location?.id)}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('location')}
        renderFields={renderFields?.location}
        onCancel={() => setView('location', { mode: 'list' })}
        onDelete={location ? () => runSaving(async () => {
          await deleteLocation(location.id);
          setView('location', { mode: 'list' });
        }) : undefined}
        onSave={(values: LocationFormValues, existingId: string | null) =>
          runSaving(async () => {
            const payload = locationFormPayload(values);
            const saved = existingId
              ? await updateLocation({ ...location, id: existingId, campaignId, ...payload } as Location)
              : await createLocation(payload);
            setView('location', view.id ? { mode: 'list' } : { mode: 'edit', id: saved.id });
          })
        }
        onAutosave={async (values: LocationFormValues, existingId: string | null) => {
          const payload = locationFormPayload(values);
          if (existingId) {
            const saved = await repository.saveLocation({ id: existingId, campaignId, ...payload });
            await reloadLocations();
            return { id: saved.id };
          }
          const created = await createLocation(payload);
          return { id: created.id };
        }}
      />
    );
  }

  if (activeKind === 'session' && view.mode === 'edit') {
    const session = view.id ? (sessions ?? []).find((s) => s.id === view.id) ?? null : null;
    const sessionFormPayload = (values: SessionFormValues) => ({
      title: values.title.trim(),
      sessionNumber: values.sessionNumber.trim() ? Number(values.sessionNumber) : null,
      date: values.date || null,
      status: values.status.trim() || null,
      details: values.details,
      debrief: values.debrief,
    });
    return (
      <SessionEditor
        key={view.id ?? 'new'}
        session={session}
        repository={repository}
        campaignId={campaignId}
        hostAdapter={hostAdapter}
        plannerItems={plannerItems}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('session')}
        debriefTemplate={templateOverride('sessionDebrief')}
        sceneTemplate={templateOverride('scene')}
        renderFields={renderFields?.session}
        renderSceneFields={renderFields?.scene}
        onScenesChanged={reloadAllScenes}
        onOpenPlannerEntity={openPlannerEntity}
        onOpenHostEntity={onOpenHostEntity}
        onCancel={() => setView('session', { mode: 'list' })}
        onDelete={session ? () => runSaving(async () => {
          await deleteSession(session.id);
          setView('session', { mode: 'list' });
        }) : undefined}
        onSave={(values: SessionFormValues, existingId: string | null) =>
          runSaving(async () => {
            const payload = sessionFormPayload(values);
            const saved = existingId
              ? await updateSession({ ...session, id: existingId, campaignId, ...payload } as Session)
              : await createSession(payload);
            setView('session', view.id ? { mode: 'list' } : { mode: 'edit', id: saved.id });
          })
        }
        onAutosave={async (values: SessionFormValues, existingId: string | null) => {
          const payload = sessionFormPayload(values);
          if (existingId) {
            const saved = await repository.saveSession({ id: existingId, campaignId, ...payload });
            await reloadSessions();
            return { id: saved.id };
          }
          const created = await createSession(payload);
          return { id: created.id };
        }}
      />
    );
  }

  if (activeKind === 'scene' && view.mode === 'edit') {
    const scene = view.id ? (allScenes ?? []).find((s) => s.id === view.id) ?? null : null;
    const sceneFormPayload = (values: SceneFormValues) => ({
      title: values.title.trim(),
      sceneNumber: values.sceneNumber.trim() ? Number(values.sceneNumber) : null,
      status: values.status.trim() || null,
      details: values.details,
    });
    // A Scene's `order` only has meaning within its own Session — keep
    // it when the Session is unchanged, otherwise append at the end of
    // the newly-chosen Session's own Scenes (same as `SessionEditor
    // .tsx`'s "+ Add Scene", just picking the Session explicitly here
    // instead of it being implicit).
    const resolveOrder = (sessionId: string) =>
      scene && scene.sessionId === sessionId ? scene.order : (allScenes ?? []).filter((s) => s.sessionId === sessionId).length;
    return (
      <SceneEditor
        key={view.id ?? 'new'}
        scene={scene}
        sessions={(sessions ?? []).map((s) => ({ id: s.id, title: s.title }))}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('scene')}
        renderFields={renderFields?.scene}
        onCancel={() => setView('scene', { mode: 'list' })}
        onDelete={scene ? () => runSaving(async () => {
          await deleteScene(scene.id);
          setView('scene', { mode: 'list' });
        }) : undefined}
        onSave={(values: SceneFormValues, existingId: string | null) =>
          runSaving(async () => {
            const payload = sceneFormPayload(values);
            const saved = existingId
              ? await updateScene({ ...scene, id: existingId, sessionId: values.sessionId, order: resolveOrder(values.sessionId), ...payload } as Scene)
              : await createScene({ ...payload, sessionId: values.sessionId, order: resolveOrder(values.sessionId) });
            setView('scene', view.id ? { mode: 'list' } : { mode: 'edit', id: saved.id });
          })
        }
        onAutosave={async (values: SceneFormValues, existingId: string | null) => {
          const payload = sceneFormPayload(values);
          if (existingId) {
            const saved = await repository.saveScene({
              id: existingId,
              sessionId: values.sessionId,
              order: resolveOrder(values.sessionId),
              ...payload,
            });
            await reloadAllScenes();
            return { id: saved.id };
          }
          const created = await createScene({ ...payload, sessionId: values.sessionId, order: resolveOrder(values.sessionId) });
          return { id: created.id };
        }}
      />
    );
  }

  if (activeKind === 'storyline' && view.mode === 'edit') {
    const storyline = view.id ? (storylines ?? []).find((s) => s.id === view.id) ?? null : null;
    const storylineFormPayload = (values: StorylineFormValues) => ({
      name: values.name.trim(),
      status: values.status.trim() || null,
      priority: values.priority.trim() || null,
      details: values.details,
    });
    return (
      <StorylineEditor
        key={view.id ?? 'new'}
        storyline={storyline}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('storyline')}
        renderFields={renderFields?.storyline}
        onCancel={() => setView('storyline', { mode: 'list' })}
        onDelete={storyline ? () => runSaving(async () => {
          await deleteStoryline(storyline.id);
          setView('storyline', { mode: 'list' });
        }) : undefined}
        onSave={(values: StorylineFormValues, existingId: string | null) =>
          runSaving(async () => {
            const payload = storylineFormPayload(values);
            const saved = existingId
              ? await updateStoryline({ ...storyline, id: existingId, campaignId, ...payload } as Storyline)
              : await createStoryline(payload);
            setView('storyline', view.id ? { mode: 'list' } : { mode: 'edit', id: saved.id });
          })
        }
        onAutosave={async (values: StorylineFormValues, existingId: string | null) => {
          const payload = storylineFormPayload(values);
          if (existingId) {
            const saved = await repository.saveStoryline({ id: existingId, campaignId, ...payload });
            await reloadStorylines();
            return { id: saved.id };
          }
          const created = await createStoryline(payload);
          return { id: created.id };
        }}
      />
    );
  }

  if (activeKind === 'thread' && view.mode === 'edit') {
    const thread = view.id ? (threads ?? []).find((t) => t.id === view.id) ?? null : null;
    const threadFormPayload = (values: ThreadFormValues) => ({
      name: values.name.trim(),
      status: values.status.trim() || null,
      priority: values.priority.trim() || null,
      details: values.details,
    });
    return (
      <ThreadEditor
        key={view.id ?? 'new'}
        thread={thread}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('thread')}
        renderFields={renderFields?.thread}
        onCancel={() => setView('thread', { mode: 'list' })}
        onDelete={thread ? () => runSaving(async () => {
          await deleteThread(thread.id);
          setView('thread', { mode: 'list' });
        }) : undefined}
        onSave={(values: ThreadFormValues, existingId: string | null) =>
          runSaving(async () => {
            const payload = threadFormPayload(values);
            const saved = existingId
              ? await updateThread({ ...thread, id: existingId, campaignId, ...payload } as Thread)
              : await createThread(payload);
            setView('thread', view.id ? { mode: 'list' } : { mode: 'edit', id: saved.id });
          })
        }
        onAutosave={async (values: ThreadFormValues, existingId: string | null) => {
          const payload = threadFormPayload(values);
          if (existingId) {
            const saved = await repository.saveThread({ id: existingId, campaignId, ...payload });
            await reloadThreads();
            return { id: saved.id };
          }
          const created = await createThread(payload);
          return { id: created.id };
        }}
      />
    );
  }

  if (activeKind === 'quest' && view.mode === 'edit') {
    const quest = view.id ? (quests ?? []).find((q) => q.id === view.id) ?? null : null;
    const questFormPayload = (values: QuestFormValues) => ({ name: values.name.trim(), status: values.status.trim() || null, details: values.details });
    return (
      <QuestEditor
        key={view.id ?? 'new'}
        quest={quest}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('quest')}
        renderFields={renderFields?.quest}
        onCancel={() => setView('quest', { mode: 'list' })}
        onDelete={quest ? () => runSaving(async () => {
          await deleteQuest(quest.id);
          setView('quest', { mode: 'list' });
        }) : undefined}
        onSave={(values: QuestFormValues, existingId: string | null) =>
          runSaving(async () => {
            const payload = questFormPayload(values);
            const saved = existingId
              ? await updateQuest({ ...quest, id: existingId, campaignId, ...payload } as Quest)
              : await createQuest(payload);
            setView('quest', view.id ? { mode: 'list' } : { mode: 'edit', id: saved.id });
          })
        }
        onAutosave={async (values: QuestFormValues, existingId: string | null) => {
          const payload = questFormPayload(values);
          if (existingId) {
            const saved = await repository.saveQuest({ id: existingId, campaignId, ...payload });
            await reloadQuests();
            return { id: saved.id };
          }
          const created = await createQuest(payload);
          return { id: created.id };
        }}
      />
    );
  }

  if (activeKind === 'event' && view.mode === 'edit') {
    const event = view.id ? (events ?? []).find((e) => e.id === view.id) ?? null : null;
    const eventFormPayload = (values: EventFormValues) => ({
      name: values.name.trim(),
      eventType: values.eventType.trim() || null,
      status: values.status.trim() || null,
      date: values.date || null,
      details: values.details,
    });
    return (
      <EventEditor
        key={view.id ?? 'new'}
        event={event}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('event')}
        renderFields={renderFields?.event}
        onCancel={() => setView('event', { mode: 'list' })}
        onDelete={event ? () => runSaving(async () => {
          await deleteEvent(event.id);
          setView('event', { mode: 'list' });
        }) : undefined}
        onSave={(values: EventFormValues, existingId: string | null) =>
          runSaving(async () => {
            const payload = eventFormPayload(values);
            const saved = existingId
              ? await updateEvent({ ...event, id: existingId, campaignId, ...payload } as Event)
              : await createEvent(payload);
            setView('event', view.id ? { mode: 'list' } : { mode: 'edit', id: saved.id });
          })
        }
        onAutosave={async (values: EventFormValues, existingId: string | null) => {
          const payload = eventFormPayload(values);
          if (existingId) {
            const saved = await repository.saveEvent({ id: existingId, campaignId, ...payload });
            await reloadEvents();
            return { id: saved.id };
          }
          const created = await createEvent(payload);
          return { id: created.id };
        }}
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
    npc: { items: npcs === null ? null : npcs.map((n): EntityListItem => ({ id: n.id, title: n.name })) },
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
