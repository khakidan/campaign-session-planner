import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  CampaignSessionPlanner,
  QuickReferenceDrawerProvider,
  SessionSafetyControls,
  useQuickReferenceDrawer,
} from '../src/index';
import {
  createFakeRepository,
  createFakeHostAdapter,
  makeNote,
  makeThread,
  makeSession,
  makeEntityLink,
  TEST_CAMPAIGN_ID,
} from '../src/test/fixtures';
import type { Npc, Group, Location } from '../src/types';

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

const npc: Npc = { id: 'npc-1', campaignId: TEST_CAMPAIGN_ID, name: 'Sister Mariel', details: [], createdAt: twoWeeksAgo, updatedAt: now };
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

const repository = createFakeRepository({
  notes: [goalNote, theoryNote, interestNote, preferenceNote, questionNote, safetyNote],
  threads: [openThread],
  sessions: [priorSession, runningSession],
  npcs: [npc],
  groups: [group],
  locations: [location],
  links: [
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
      <main className="p-6">
        <CampaignSessionPlanner campaignId={TEST_CAMPAIGN_ID} repository={repository} hostAdapter={hostAdapter} />
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
