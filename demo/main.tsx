import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CampaignSessionPlanner,
  QuickReferenceDrawerProvider,
  SessionSafetyControls,
  SessionRunPanel,
  QuickCaptureComposer,
  CampaignHygienePanel,
  useCampaignHygiene,
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

const repository = createFakeRepository({
  notes: [goalNote, theoryNote, interestNote, preferenceNote, questionNote, safetyNote],
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
  ],
});

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
  return (
    <div className="min-h-screen bg-white">
      <header className="p-4 border-b border-[var(--csp-neutral-200)] flex items-center justify-between">
        <h1 className="text-lg font-bold text-[var(--csp-neutral-800)]">campaign-session-planner — demo</h1>
        <button
          type="button"
          onClick={() => drawer.open()}
          className="px-3 py-1.5 text-xs font-semibold text-[var(--csp-accent-700)] border border-[var(--csp-accent-600)] rounded-lg hover:bg-[var(--csp-accent-50)] cursor-pointer"
        >
          Open Quick Reference
        </button>
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
        </aside>
      </main>
      <SessionSafetyControls repository={repository} campaignId={TEST_CAMPAIGN_ID} />
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
