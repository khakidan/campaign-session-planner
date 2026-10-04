import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CampaignSessionPlanner,
  QuickReferenceDrawerProvider,
  SessionSafetyControls,
  SafetyEventToasts,
  type SafetyControlsPosition,
  SessionRunPanel,
  QuickCaptureComposer,
  CampaignHygienePanel,
  useCampaignHygiene,
  SessionRecapView,
  RECAP_HIGHLIGHT_TYPE,
  useQuickReferenceDrawer,
  type NoteFormValues,
  type CampaignPlannerRepository,
} from '../src/index';
import {
  createFakeRepository,
  createFakeHostAdapter,
  makeNote,
  makeThread,
  makeSession,
  makeScene,
  makeEntityLink,
  TEST_CAMPAIGN_ID,
} from '../src/test/fixtures';
import type { Npc, Group, Location, Quest } from '../src/types';

/**
 * A local-only demo harness — never shipped in `dist` (this whole
 * `demo/` folder is outside `tsup`'s `src/index.ts` entry point, so it
 * never affects the published package). Seeds the same in-memory fake
 * `CampaignPlannerRepository`/`TTRPGHostAdapter` the test suite already
 * uses (`src/test/fixtures.ts`) with enough sample data to exercise
 * every Phase 1/Phase 2 feature visually: memory Notes with confidence
 * levels, a Note linked to a host Character (Player Intent), a prior
 * dated Session (Campaign Changes), a Running Session (Safety
 * Controls), and outgoing links on an existing Session (Session
 * Readiness).
 *
 * Run with `npm run demo` from this package's own directory, then open
 * the printed local URL.
 */

const now = new Date().toISOString();
const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const goalNote = makeNote({
  id: 'note-goal',
  title: "Prove himself to his old mentor",
  type: 'Character Goal',
  content: [],
  updatedAt: now,
});
const theoryNote = makeNote({
  id: 'note-theory',
  title: 'The Duke is secretly working with the Fey',
  type: 'Player Theory',
  tags: ['confidence:proposed'],
  updatedAt: now,
});
const interestNote = makeNote({
  id: 'note-interest',
  title: 'Curious about the Whispering God',
  type: 'Player Interest',
  updatedAt: now,
});
const preferenceNote = makeNote({
  id: 'note-preference',
  title: 'Enjoys tactical combat and mechanical mastery',
  type: 'Player Preference',
  updatedAt: now,
});
const questionNote = makeNote({
  id: 'note-question',
  title: 'Who has been leaving fresh flowers at the statues?',
  type: 'Unresolved Question',
  tags: ['confidence:observed'],
  updatedAt: now,
});
const safetyNote = makeNote({
  id: 'note-safety',
  title: 'Table Safety Tools',
  type: 'Session Safety',
  updatedAt: twoWeeksAgo,
});

const openThread = makeThread({ id: 'thread-1', name: 'The Duke is hiding something', status: 'Open' });

// Session Recap: a player-facing highlight written for the prior,
// completed Session — deliberately separate from that Session's
// private Debrief (which may contain GM-only secrets).
const recapHighlight = makeNote({
  id: 'note-recap-1',
  title: 'Session 7 recap',
  type: RECAP_HIGHLIGHT_TYPE,
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'The party arrived in Blackwater and uncovered the first hints that the Duke is hiding something.',
          styles: {},
        },
      ],
    },
  ] as never,
  updatedAt: twoWeeksAgo,
});

const priorSession = makeSession({
  id: 'session-1',
  title: 'Session 7 — Arrival at Blackwater',
  status: 'Completed',
  date: twoWeeksAgo,
  sessionNumber: 7,
});
const runningSession = makeSession({
  id: 'session-2',
  title: 'Session 8 — The Sunken Temple (Live)',
  status: 'Running',
  date: yesterday,
  sessionNumber: 8,
});

const sceneArrival = makeScene({
  id: 'scene-1',
  sessionId: 'session-2',
  title: 'Arrival at the Sunken Temple',
  status: 'Active',
  order: 0,
  details: [
    { type: 'heading', props: { level: 3 }, content: [{ type: 'text', text: 'Situation', styles: {} }] },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'The temple entrance is half-submerged; the party arrives at low tide.', styles: {} }],
    },
  ] as never,
});
const sceneConfrontation = makeScene({
  id: 'scene-2',
  sessionId: 'session-2',
  title: 'Confrontation with the Cultists',
  status: null,
  order: 1,
  details: [
    { type: 'heading', props: { level: 3 }, content: [{ type: 'text', text: 'Situation', styles: {} }] },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Cultists guard the inner sanctum, mid-ritual.', styles: {} }],
    },
  ] as never,
});

const npc: Npc = {
  id: 'npc-1',
  campaignId: TEST_CAMPAIGN_ID,
  name: 'Sister Mariel',
  details: [
    { type: 'heading', props: { level: 3 }, content: [{ type: 'text', text: 'Secrets', styles: {} }] },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Secretly loyal to the Fey Court, not the temple she claims to serve.', styles: {} }],
    },
  ] as never,
  createdAt: twoWeeksAgo,
  updatedAt: now,
};
const group: Group = {
  id: 'group-1',
  campaignId: TEST_CAMPAIGN_ID,
  name: 'The Dockside Cartel',
  type: 'CRIMINAL_SYNDICATE',
  status: null,
  details: [],
  createdAt: twoWeeksAgo,
  updatedAt: twoWeeksAgo,
};
const location: Location = {
  id: 'location-1',
  campaignId: TEST_CAMPAIGN_ID,
  name: 'Blackwater Lighthouse',
  type: null,
  parentLocationId: null,
  details: [],
  createdAt: twoWeeksAgo,
  updatedAt: now,
};

const longAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

// Campaign Hygiene: an old, never-linked Quest — seeded so the demo
// shows both the "stale" and "orphaned" sections with real data rather
// than just the all-clear empty state.
const forgottenQuest: Quest = {
  id: 'quest-forgotten',
  campaignId: TEST_CAMPAIGN_ID,
  name: 'Investigate the sunken bell',
  status: null,
  details: [],
  createdAt: longAgo,
  updatedAt: longAgo,
};

/**
 * The shared `createFakeRepository` fixture deliberately doesn't
 * implement `subscribeToChanges` (see its own doc comment in
 * `src/test/fixtures.ts`) — every other demo feature so far tolerated
 * that (documented as "expected, not a bug" in CHANGELOG.md for Quick
 * Capture). `SafetyEventToasts`/`useSafetyEventAlerts` specifically
 * needs a working `subscribeToChanges` to demonstrate live cross-
 * component notification at all, so this demo-only wrapper adds a
 * minimal one: every mutating call notifies, same contract a real
 * host's repository (backed by a real-time subscription) would
 * fulfill. Not part of the package itself.
 */
function withChangeNotifications(repo: CampaignPlannerRepository): CampaignPlannerRepository {
  const listeners = new Set<() => void>();
  const MUTATING_METHODS = [
    'saveNote', 'deleteNote', 'saveNpc', 'deleteNpc', 'saveGroup', 'deleteGroup',
    'saveLocation', 'deleteLocation', 'saveSession', 'deleteSession', 'saveScene', 'deleteScene',
    'saveStoryline', 'deleteStoryline', 'saveThread', 'deleteThread', 'saveQuest', 'deleteQuest',
    'saveEvent', 'deleteEvent', 'createLink', 'deleteLink', 'saveTemplate', 'deleteTemplate',
  ] as const satisfies ReadonlyArray<keyof CampaignPlannerRepository>;

  const wrapped = { ...repo };
  for (const method of MUTATING_METHODS) {
    const original = repo[method] as (...args: unknown[]) => Promise<unknown>;
    (wrapped[method] as unknown as (...args: unknown[]) => Promise<unknown>) = async (...args: unknown[]) => {
      const result = await original(...args);
      listeners.forEach((listener) => listener());
      return result;
    };
  }
  wrapped.subscribeToChanges = (onChange) => {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  };
  return wrapped;
}

const repository = withChangeNotifications(createFakeRepository({
  notes: [goalNote, theoryNote, interestNote, preferenceNote, questionNote, safetyNote, recapHighlight],
  threads: [openThread],
  sessions: [priorSession, runningSession],
  npcs: [npc],
  groups: [group],
  locations: [location],
  quests: [forgottenQuest],
  scenes: [sceneArrival, sceneConfrontation],
  links: [
    // Run Mode: the active Scene has an NPC linked to it, shown as a chip.
    makeEntityLink({
      id: 'link-scene-npc',
      sourceType: 'scene',
      sourceId: 'scene-1',
      targetType: 'npc',
      targetId: 'npc-1',
      metadata: { label: npc.name },
    }),
    // Player Intent: the Character Goal note is linked to a host Character.
    makeEntityLink({
      id: 'link-goal-char',
      sourceType: 'note',
      sourceId: 'note-goal',
      targetType: 'character',
      targetId: 'char-1',
      metadata: { label: 'Thorn', sourceLabel: goalNote.title },
    }),
    // Session Readiness: the prior Session already has a linked Thread and NPC.
    makeEntityLink({
      id: 'link-session-thread',
      sourceType: 'session',
      sourceId: 'session-1',
      targetType: 'thread',
      targetId: 'thread-1',
      metadata: { label: openThread.name },
    }),
    makeEntityLink({
      id: 'link-session-npc',
      sourceType: 'session',
      sourceId: 'session-1',
      targetType: 'npc',
      targetId: 'npc-1',
      metadata: { label: npc.name },
    }),
    // Session Recap: the highlight Note linked to the Session it's about.
    makeEntityLink({
      id: 'link-recap-session',
      sourceType: 'note',
      sourceId: 'note-recap-1',
      targetType: 'session',
      targetId: 'session-1',
      metadata: { label: priorSession.title },
    }),
  ],
}));

const hostAdapter = createFakeHostAdapter({
  getCharacters: async (ids) =>
    [{ id: 'char-1', name: 'Thorn', summary: 'A former mercenary seeking redemption.' }].filter((c) => ids.includes(c.id)),
  searchEntities: async (query) => {
    const all = [{ type: 'character' as const, id: 'char-1', source: 'host' as const, label: 'Thorn' }];
    const q = query.trim().toLowerCase();
    return q ? all.filter((r) => r.label.toLowerCase().includes(q)) : all;
  },
});

/**
 * Demonstrates the `renderFields` layout-customization prop: adds a
 * "Priority" field alongside the shipped Note fields. Its value lives
 * in this component's own local state, not in `NoteFormValues` — the
 * point of the demo is that a host's custom field data doesn't need to
 * round-trip through this package at all; it's saved by whatever the
 * host's own `onSave` does, entirely independent of `CampaignPlannerRepository`.
 */
const notePriorities = new Map<string, string>();

function NoteFieldsWithDemoPriority({
  defaultFields,
}: {
  values: NoteFormValues;
  onChange: React.Dispatch<React.SetStateAction<NoteFormValues>>;
  defaultFields: React.ReactNode;
}) {
  const [priority, setPriority] = useState(() => notePriorities.get('draft') ?? '');

  return (
    <>
      {defaultFields}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1" htmlFor="demo-priority">
          Priority (demo custom field — host-owned, not persisted by this package)
        </label>
        <select
          id="demo-priority"
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            notePriorities.set('draft', e.target.value);
          }}
          className="w-full px-3 py-2 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
        >
          <option value="">Unset</option>
          <option value="low">Low</option>
          <option value="high">High</option>
        </select>
      </div>
    </>
  );
}

/**
 * Campaign Hygiene is a standalone, host-placed building block (like
 * Run Mode's pieces) rather than something auto-wired into
 * `CampaignSessionPlanner` — this tiny wrapper is the demo's own
 * "campaign dashboard" stand-in, not part of the package itself.
 */
const CampaignHygieneDemo: React.FC<{ repository: CampaignPlannerRepository }> = ({ repository }) => {
  const drawer = useQuickReferenceDrawer();
  const hygiene = useCampaignHygiene(repository, TEST_CAMPAIGN_ID);
  return <CampaignHygienePanel hygiene={hygiene} onOpenPlannerEntity={(ref) => drawer.push(ref)} />;
};

const App: React.FC = () => {
  const drawer = useQuickReferenceDrawer();

  // Demonstrates SessionSafetyControls' `visible`/`position` props.
  // This package has no GM/Player concept of its own — "Viewing as"
  // here stands in for whatever role check a real host app would run
  // (e.g. `session.role === 'player'`) before deciding whether to show
  // the control at all.
  const [viewingAs, setViewingAs] = useState<'gm' | 'player'>('gm');
  const [safetyPosition, setSafetyPosition] = useState<SafetyControlsPosition>('bottom-right');

  return (
    <div className="min-h-screen bg-white">
      <header className="p-4 border-b border-[var(--csp-neutral-200)] flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-[var(--csp-neutral-800)]">campaign-session-planner — demo</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--csp-neutral-600)]">
            Viewing as
            <select
              value={viewingAs}
              onChange={(e) => setViewingAs(e.target.value as 'gm' | 'player')}
              className="px-2 py-1 border border-[var(--csp-neutral-300)] rounded-lg text-xs"
            >
              <option value="gm">GM</option>
              <option value="player">Player</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--csp-neutral-600)]">
            Safety controls position
            <select
              value={safetyPosition}
              onChange={(e) => setSafetyPosition(e.target.value as SafetyControlsPosition)}
              className="px-2 py-1 border border-[var(--csp-neutral-300)] rounded-lg text-xs"
            >
              <option value="bottom-right">Bottom right</option>
              <option value="bottom-left">Bottom left</option>
              <option value="top-right">Top right</option>
              <option value="top-left">Top left</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => drawer.open()}
            className="px-3 py-1.5 text-xs font-semibold text-[var(--csp-accent-700)] border border-[var(--csp-accent-600)] rounded-lg hover:bg-[var(--csp-accent-50)] cursor-pointer"
          >
            Open Quick Reference
          </button>
        </div>
      </header>
      <main className="p-6 flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          <CampaignSessionPlanner
            campaignId={TEST_CAMPAIGN_ID}
            repository={repository}
            hostAdapter={hostAdapter}
            renderFields={{ note: NoteFieldsWithDemoPriority }}
          />
        </div>

        {/* Stands in for the HOST APP's own live-session screen (its
            initiative tracker, character sheets, combat UI — none of
            which this package owns or renders). Run Mode's pieces sit
            in a sidebar *next to* that, never replacing or navigating
            away from it — see ROADMAP.md's "Run Mode" entry. */}
        <aside className="w-80 shrink-0 space-y-4 sticky top-6">
          <div className="p-3 border border-dashed border-[var(--csp-neutral-300)] rounded-lg text-xs text-[var(--csp-neutral-400)] italic">
            (Stand-in for the host app's own live-session screen — initiative, character sheets, combat. This package
            never renders that.)
          </div>
          <SessionRunPanel
            repository={repository}
            campaignId={TEST_CAMPAIGN_ID}
            onOpenPlannerEntity={(ref) => drawer.push(ref)}
            onOpenHostEntity={(type, id) => alert(`Host app would open its own ${type} page for ${id}`)}
          />
          <QuickCaptureComposer repository={repository} campaignId={TEST_CAMPAIGN_ID} />
          <CampaignHygieneDemo repository={repository} />
          {/* Session Recap: a standalone building block, same as the
              two above — shown here for the prior, completed Session's
              player-facing recap, built from the 'Recap Highlight' Note
              seeded above rather than that Session's private Debrief. */}
          <SessionRecapView
            repository={repository}
            campaignId={TEST_CAMPAIGN_ID}
            sessionId="session-1"
            onOpenPlannerEntity={(ref) => drawer.push(ref)}
          />
        </aside>
      </main>
      <SessionSafetyControls
        repository={repository}
        campaignId={TEST_CAMPAIGN_ID}
        visible={viewingAs === 'player'}
        position={safetyPosition}
        triggeredBy="Alice"
      />
      {/* The GM-side half: SafetyEventToasts is built on
          useSafetyEventAlerts, the same hook a host with its own toast
          system would wire `onSafetyEvent` from instead. In a real app
          this renders on a separate GM-only screen from the Player
          controls above — kept always-mounted here (rather than
          gated on `viewingAs`, like the controls above are) purely so
          this one demo page can show the end-to-end flow: trigger as
          "Player," see the toast land right here. */}
      <SafetyEventToasts repository={repository} campaignId={TEST_CAMPAIGN_ID} />
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QuickReferenceDrawerProvider campaignId={TEST_CAMPAIGN_ID} repository={repository} hostAdapter={hostAdapter}>
      <App />
    </QuickReferenceDrawerProvider>
  </React.StrictMode>
);
