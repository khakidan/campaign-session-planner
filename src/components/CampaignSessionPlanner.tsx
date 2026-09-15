import React, { useEffect, useMemo, useState } from 'react';
import type { PartialBlock } from '@blocknote/core';
import type { CampaignId, CampaignPlannerRepository, EntityId, EntityReference, EntityType, PlannerEntityType, TTRPGHostAdapter } from '../types';
import { useNotes } from '../hooks/useNotes';
import { useNpcs } from '../hooks/useNpcs';
import { useGroups } from '../hooks/useGroups';
import { useLocations } from '../hooks/useLocations';
import { useSessions } from '../hooks/useSessions';
import { useStorylines } from '../hooks/useStorylines';
import { useThreads } from '../hooks/useThreads';
import { useQuests } from '../hooks/useQuests';
import { useEvents } from '../hooks/useEvents';
import { useEntityLinks } from '../hooks/useEntityLinks';
import { useTemplates } from '../hooks/useTemplates';
import { NoteEditor, type NoteFormValues } from './NoteEditor';
import { NpcEditor, type NpcFormValues } from './NpcEditor';
import { GroupEditor, type GroupFormValues } from './GroupEditor';
import { LocationEditor, type LocationFormValues } from './LocationEditor';
import { SessionEditor, type SessionFormValues } from './SessionEditor';
import { StorylineEditor, type StorylineFormValues } from './StorylineEditor';
import { ThreadEditor, type ThreadFormValues } from './ThreadEditor';
import { QuestEditor, type QuestFormValues } from './QuestEditor';
import { EventEditor, type EventFormValues } from './EventEditor';
import { EntityListView, type EntityListItem } from './EntityListView';
import { TemplateSettingsPanel } from './TemplateSettingsPanel';
import type { PlannerSearchItem } from './EntityLinkPicker';
import type { TemplateEntityKind } from '../types';

export interface CampaignSessionPlannerProps {
  campaignId: CampaignId;
  repository: CampaignPlannerRepository;
  /** The entity-link picker's "Campaign" search results
   * (`hostAdapter.searchEntities`). */
  hostAdapter: TTRPGHostAdapter;
  onOpenHostEntity?: (type: EntityType, id: EntityId) => void;
}

/** Slice 4.2c gave Notes/NPCs/Groups/Locations each their own tab;
 * Slice 4.2d added Sessions/Storylines/Threads/Quests/Events the same
 * way — 9 tabs total. Scene has no tab (managed inline inside
 * `SessionEditor.tsx` — see its own doc comment). Each kind keeps
 * fully independent list/edit state (no cross-kind coupling) so a bug
 * in one kind's view can't bleed into another's. */
const BROWSABLE_KINDS: PlannerEntityType[] = [
  'note',
  'npc',
  'group',
  'location',
  'session',
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
}) => {
  const { notes, error: notesError, reload: reloadNotes, createNote, updateNote, deleteNote } = useNotes(repository, campaignId);
  const { npcs, error: npcsError, reload: reloadNpcs, createNpc, updateNpc, deleteNpc } = useNpcs(repository, campaignId);
  const { groups, error: groupsError, reload: reloadGroups, createGroup, updateGroup, deleteGroup } = useGroups(repository, campaignId);
  const { locations, error: locationsError, reload: reloadLocations, createLocation, updateLocation, deleteLocation } = useLocations(
    repository,
    campaignId
  );
  const { sessions, error: sessionsError, reload: reloadSessions, createSession, updateSession, deleteSession } = useSessions(repository, campaignId);
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
    scene: { mode: 'list' }, // unused — Scene has no top-level tab, kept only so the Record type is total
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
    scene: null,
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
  // Scenes are added separately, inside `SessionEditor.tsx`, scoped to
  // whichever Session is currently open (they're never loaded here).
  const plannerItems: PlannerSearchItem[] = useMemo(
    () => [
      ...(notes ?? []).map((n): PlannerSearchItem => ({ type: 'note', id: n.id, label: n.title })),
      ...(npcs ?? []).map((n): PlannerSearchItem => ({ type: 'npc', id: n.id, label: n.name })),
      ...(groups ?? []).map((g): PlannerSearchItem => ({ type: 'group', id: g.id, label: g.name })),
      ...(locations ?? []).map((l): PlannerSearchItem => ({ type: 'location', id: l.id, label: l.name })),
      ...(sessions ?? []).map((s): PlannerSearchItem => ({ type: 'session', id: s.id, label: s.title })),
      ...(storylines ?? []).map((s): PlannerSearchItem => ({ type: 'storyline', id: s.id, label: s.name })),
      ...(threads ?? []).map((t): PlannerSearchItem => ({ type: 'thread', id: t.id, label: t.name })),
      ...(quests ?? []).map((q): PlannerSearchItem => ({ type: 'quest', id: q.id, label: q.name })),
      ...(events ?? []).map((e): PlannerSearchItem => ({ type: 'event', id: e.id, label: e.name })),
    ],
    [notes, npcs, groups, locations, sessions, storylines, threads, quests, events]
  );

  const openPlannerEntity = (ref: EntityReference) => {
    const kind = ref.type as PlannerEntityType;
    if (kind === 'scene') return; // Scenes open from inside their own Session's editor, not via a tab switch.
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
    return (
      <NoteEditor
        key={view.id ?? 'new'}
        note={note}
        isSaving={isSaving}
        links={linksProp}
        onCancel={() => setView('note', { mode: 'list' })}
        onDelete={note ? () => runSaving(async () => {
          await deleteNote(note.id);
          setView('note', { mode: 'list' });
        }) : undefined}
        onSave={(values: NoteFormValues) =>
          runSaving(async () => {
            const payload = {
              title: values.title.trim(),
              type: values.type.trim() || null,
              status: values.status.trim() || null,
              content: values.content,
              tags: parseTags(values.tags),
            };
            if (note) await updateNote({ ...note, ...payload });
            else await createNote(payload);
            setView('note', { mode: 'list' });
          })
        }
      />
    );
  }

  if (activeKind === 'npc' && view.mode === 'edit') {
    const npc = view.id ? (npcs ?? []).find((n) => n.id === view.id) ?? null : null;
    return (
      <NpcEditor
        key={view.id ?? 'new'}
        npc={npc}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('npc')}
        onCancel={() => setView('npc', { mode: 'list' })}
        onDelete={npc ? () => runSaving(async () => {
          await deleteNpc(npc.id);
          setView('npc', { mode: 'list' });
        }) : undefined}
        onSave={(values: NpcFormValues) =>
          runSaving(async () => {
            const payload = { name: values.name.trim(), details: values.details };
            if (npc) await updateNpc({ ...npc, ...payload });
            else await createNpc(payload);
            setView('npc', { mode: 'list' });
          })
        }
      />
    );
  }

  if (activeKind === 'group' && view.mode === 'edit') {
    const group = view.id ? (groups ?? []).find((g) => g.id === view.id) ?? null : null;
    return (
      <GroupEditor
        key={view.id ?? 'new'}
        group={group}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('group')}
        onCancel={() => setView('group', { mode: 'list' })}
        onDelete={group ? () => runSaving(async () => {
          await deleteGroup(group.id);
          setView('group', { mode: 'list' });
        }) : undefined}
        onSave={(values: GroupFormValues) =>
          runSaving(async () => {
            const payload = {
              name: values.name.trim(),
              type: values.type.trim() || null,
              status: values.status.trim() || null,
              details: values.details,
            };
            if (group) await updateGroup({ ...group, ...payload });
            else await createGroup(payload);
            setView('group', { mode: 'list' });
          })
        }
      />
    );
  }

  if (activeKind === 'location' && view.mode === 'edit') {
    const location = view.id ? (locations ?? []).find((l) => l.id === view.id) ?? null : null;
    return (
      <LocationEditor
        key={view.id ?? 'new'}
        location={location}
        otherLocations={(locations ?? []).filter((l) => l.id !== location?.id)}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('location')}
        onCancel={() => setView('location', { mode: 'list' })}
        onDelete={location ? () => runSaving(async () => {
          await deleteLocation(location.id);
          setView('location', { mode: 'list' });
        }) : undefined}
        onSave={(values: LocationFormValues) =>
          runSaving(async () => {
            const payload = {
              name: values.name.trim(),
              type: values.type.trim() || null,
              parentLocationId: values.parentLocationId || null,
              details: values.details,
            };
            if (location) await updateLocation({ ...location, ...payload });
            else await createLocation(payload);
            setView('location', { mode: 'list' });
          })
        }
      />
    );
  }

  if (activeKind === 'session' && view.mode === 'edit') {
    const session = view.id ? (sessions ?? []).find((s) => s.id === view.id) ?? null : null;
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
        onOpenPlannerEntity={openPlannerEntity}
        onOpenHostEntity={onOpenHostEntity}
        onCancel={() => setView('session', { mode: 'list' })}
        onDelete={session ? () => runSaving(async () => {
          await deleteSession(session.id);
          setView('session', { mode: 'list' });
        }) : undefined}
        onSave={(values: SessionFormValues) =>
          runSaving(async () => {
            const payload = {
              title: values.title.trim(),
              sessionNumber: values.sessionNumber.trim() ? Number(values.sessionNumber) : null,
              date: values.date || null,
              status: values.status.trim() || null,
              details: values.details,
              debrief: values.debrief,
            };
            if (session) await updateSession({ ...session, ...payload });
            else await createSession(payload);
            setView('session', { mode: 'list' });
          })
        }
      />
    );
  }

  if (activeKind === 'storyline' && view.mode === 'edit') {
    const storyline = view.id ? (storylines ?? []).find((s) => s.id === view.id) ?? null : null;
    return (
      <StorylineEditor
        key={view.id ?? 'new'}
        storyline={storyline}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('storyline')}
        onCancel={() => setView('storyline', { mode: 'list' })}
        onDelete={storyline ? () => runSaving(async () => {
          await deleteStoryline(storyline.id);
          setView('storyline', { mode: 'list' });
        }) : undefined}
        onSave={(values: StorylineFormValues) =>
          runSaving(async () => {
            const payload = {
              name: values.name.trim(),
              status: values.status.trim() || null,
              priority: values.priority.trim() || null,
              details: values.details,
            };
            if (storyline) await updateStoryline({ ...storyline, ...payload });
            else await createStoryline(payload);
            setView('storyline', { mode: 'list' });
          })
        }
      />
    );
  }

  if (activeKind === 'thread' && view.mode === 'edit') {
    const thread = view.id ? (threads ?? []).find((t) => t.id === view.id) ?? null : null;
    return (
      <ThreadEditor
        key={view.id ?? 'new'}
        thread={thread}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('thread')}
        onCancel={() => setView('thread', { mode: 'list' })}
        onDelete={thread ? () => runSaving(async () => {
          await deleteThread(thread.id);
          setView('thread', { mode: 'list' });
        }) : undefined}
        onSave={(values: ThreadFormValues) =>
          runSaving(async () => {
            const payload = {
              name: values.name.trim(),
              status: values.status.trim() || null,
              priority: values.priority.trim() || null,
              details: values.details,
            };
            if (thread) await updateThread({ ...thread, ...payload });
            else await createThread(payload);
            setView('thread', { mode: 'list' });
          })
        }
      />
    );
  }

  if (activeKind === 'quest' && view.mode === 'edit') {
    const quest = view.id ? (quests ?? []).find((q) => q.id === view.id) ?? null : null;
    return (
      <QuestEditor
        key={view.id ?? 'new'}
        quest={quest}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('quest')}
        onCancel={() => setView('quest', { mode: 'list' })}
        onDelete={quest ? () => runSaving(async () => {
          await deleteQuest(quest.id);
          setView('quest', { mode: 'list' });
        }) : undefined}
        onSave={(values: QuestFormValues) =>
          runSaving(async () => {
            const payload = { name: values.name.trim(), status: values.status.trim() || null, details: values.details };
            if (quest) await updateQuest({ ...quest, ...payload });
            else await createQuest(payload);
            setView('quest', { mode: 'list' });
          })
        }
      />
    );
  }

  if (activeKind === 'event' && view.mode === 'edit') {
    const event = view.id ? (events ?? []).find((e) => e.id === view.id) ?? null : null;
    return (
      <EventEditor
        key={view.id ?? 'new'}
        event={event}
        isSaving={isSaving}
        links={linksProp}
        template={templateOverride('event')}
        onCancel={() => setView('event', { mode: 'list' })}
        onDelete={event ? () => runSaving(async () => {
          await deleteEvent(event.id);
          setView('event', { mode: 'list' });
        }) : undefined}
        onSave={(values: EventFormValues) =>
          runSaving(async () => {
            const payload = {
              name: values.name.trim(),
              eventType: values.eventType.trim() || null,
              status: values.status.trim() || null,
              date: values.date || null,
              details: values.details,
            };
            if (event) await updateEvent({ ...event, ...payload });
            else await createEvent(payload);
            setView('event', { mode: 'list' });
          })
        }
      />
    );
  }

  // The list view for every browsable kind is uniform (search/"New X"/
  // a row per record with an optional badge) — fully collapsed into one
  // config lookup, unlike the edit views above (each Editor's props
  // differ too much, Session's especially, to unify safely).
  const listConfig: Record<Exclude<PlannerEntityType, 'scene'>, { items: EntityListItem[] | null }> = {
    note: { items: notes === null ? null : notes.map((n): EntityListItem => ({ id: n.id, title: n.title, badge: n.type, tags: n.tags })) },
    npc: { items: npcs === null ? null : npcs.map((n): EntityListItem => ({ id: n.id, title: n.name })) },
    group: { items: groups === null ? null : groups.map((g): EntityListItem => ({ id: g.id, title: g.name, badge: g.type })) },
    location: { items: locations === null ? null : locations.map((l): EntityListItem => ({ id: l.id, title: l.name, badge: l.type })) },
    session: { items: sessions === null ? null : sessions.map((s): EntityListItem => ({ id: s.id, title: s.title, badge: s.status })) },
    storyline: { items: storylines === null ? null : storylines.map((s): EntityListItem => ({ id: s.id, title: s.name, badge: s.status })) },
    thread: { items: threads === null ? null : threads.map((t): EntityListItem => ({ id: t.id, title: t.name, badge: t.status })) },
    quest: { items: quests === null ? null : quests.map((q): EntityListItem => ({ id: q.id, title: q.name, badge: q.status })) },
    event: { items: events === null ? null : events.map((e): EntityListItem => ({ id: e.id, title: e.name, badge: e.eventType })) },
  };
  const listItems = listConfig[activeKind as Exclude<PlannerEntityType, 'scene'>].items;
  const tabLabel = TAB_LABELS[activeKind];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-1 border-b border-slate-200">
        <div className="flex items-center gap-1 overflow-x-auto">
          {BROWSABLE_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setActiveKind(kind)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px whitespace-nowrap cursor-pointer ${
                activeKind === kind
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {TAB_LABELS[kind]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowTemplateSettings(true)}
          className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 whitespace-nowrap cursor-pointer"
        >
          Templates
        </button>
      </div>

      {listError && <div className="text-xs font-semibold text-rose-600">{listError}</div>}

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
