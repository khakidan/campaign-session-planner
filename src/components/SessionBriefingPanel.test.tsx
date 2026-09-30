import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionBriefingPanel } from './SessionBriefingPanel';
import { makeNote, makeThread } from '../test/fixtures';
import type { SessionBriefing } from '../lib/plannerMemory';

function emptyBriefing(): SessionBriefing {
  return {
    playerTheories: [],
    playerInterests: [],
    characterGoals: [],
    npcAttachments: [],
    unresolvedQuestions: [],
    playerPreferences: [],
    activeThreads: [],
  };
}

describe('SessionBriefingPanel', () => {
  it('shows an empty-state message for every group when there is no data yet', () => {
    render(<SessionBriefingPanel briefing={emptyBriefing()} onOpenPlannerEntity={vi.fn()} />);

    expect(screen.getByText('No open threads yet.')).toBeInTheDocument();
    expect(screen.getByText('No open player theories yet.')).toBeInTheDocument();
    expect(screen.getByText('No unresolved questions yet.')).toBeInTheDocument();
    expect(screen.getByText('No noted player interests yet.')).toBeInTheDocument();
    expect(screen.getByText('No noted character goals yet.')).toBeInTheDocument();
    expect(screen.getByText('No noted NPC attachments yet.')).toBeInTheDocument();
  });

  it('renders each group\'s items and lets a GM click through to the real entity', async () => {
    const user = userEvent.setup();
    const onOpenPlannerEntity = vi.fn();
    const theory = makeNote({ id: 'n1', title: 'The duke is a doppelganger' });
    const thread = makeThread({ id: 't1', name: 'The missing caravan' });

    render(
      <SessionBriefingPanel
        briefing={{ ...emptyBriefing(), playerTheories: [theory], activeThreads: [thread] }}
        onOpenPlannerEntity={onOpenPlannerEntity}
      />
    );

    expect(screen.getByText('The duke is a doppelganger')).toBeInTheDocument();
    expect(screen.getByText('The missing caravan')).toBeInTheDocument();

    await user.click(screen.getByText('The duke is a doppelganger'));
    expect(onOpenPlannerEntity).toHaveBeenCalledWith({ type: 'note', id: 'n1', source: 'planner' });

    await user.click(screen.getByText('The missing caravan'));
    expect(onOpenPlannerEntity).toHaveBeenCalledWith({ type: 'thread', id: 't1', source: 'planner' });
  });

  it('shows a confidence badge on a Note that has one, and none on a Thread or an unconfident Note', () => {
    const proposed = makeNote({ id: 'n1', title: 'The duke is a doppelganger', tags: ['confidence:proposed'] });
    const plain = makeThread({ id: 't1', name: 'The missing caravan' });

    render(
      <SessionBriefingPanel
        briefing={{ ...emptyBriefing(), playerTheories: [proposed], activeThreads: [plain] }}
        onOpenPlannerEntity={vi.fn()}
      />
    );

    expect(screen.getByText('proposed — unconfirmed')).toBeInTheDocument();
  });

  it('renders "Why This Session Matters" per character when byCharacter is given, and omits it otherwise', () => {
    const goal = makeNote({ id: 'n1', title: "Seraphine's goal" });
    const { rerender } = render(
      <SessionBriefingPanel briefing={emptyBriefing()} onOpenPlannerEntity={vi.fn()} />
    );
    expect(screen.queryByText('Why This Session Matters')).not.toBeInTheDocument();

    rerender(
      <SessionBriefingPanel
        briefing={emptyBriefing()}
        onOpenPlannerEntity={vi.fn()}
        byCharacter={[{ character: { id: 'char-1', name: 'Seraphine' }, notes: [goal] }]}
      />
    );

    expect(screen.getByText('Why This Session Matters')).toBeInTheDocument();
    expect(screen.getByText('Seraphine')).toBeInTheDocument();
    expect(screen.getByText("Seraphine's goal")).toBeInTheDocument();
  });
});
