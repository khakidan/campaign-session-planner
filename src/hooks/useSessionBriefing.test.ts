import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createFakeRepository, makeNote, makeThread, TEST_CAMPAIGN_ID } from '../test/fixtures';
import { useSessionBriefing } from './useSessionBriefing';

describe('useSessionBriefing', () => {
  it('returns the grouped briefing built from this campaign\'s current Notes/Threads', async () => {
    const repository = createFakeRepository({
      notes: [makeNote({ id: 'n1', type: 'Player Theory', title: 'Theory' })],
      threads: [makeThread({ id: 't1', name: 'Open Thread', status: 'Open' })],
    });

    const { result } = renderHook(() => useSessionBriefing(repository, TEST_CAMPAIGN_ID));

    await waitFor(() =>
      expect(result.current).toEqual({
        playerTheories: [expect.objectContaining({ id: 'n1' })],
        playerInterests: [],
        characterGoals: [],
        npcAttachments: [],
        unresolvedQuestions: [],
        activeThreads: [expect.objectContaining({ id: 't1' })],
      })
    );
  });

  it('reloads and regroups when the campaign it is scoped to changes', async () => {
    const repository = createFakeRepository({
      notes: [
        makeNote({ id: 'n1', campaignId: 'campaign-a', type: 'Player Theory', title: 'A theory' }),
        makeNote({ id: 'n2', campaignId: 'campaign-b', type: 'Character Goal', title: 'A goal' }),
      ],
    });

    const { result, rerender } = renderHook(({ campaignId }) => useSessionBriefing(repository, campaignId), {
      initialProps: { campaignId: 'campaign-a' },
    });

    await waitFor(() => expect(result.current.playerTheories).toHaveLength(1));
    expect(result.current.characterGoals).toEqual([]);

    rerender({ campaignId: 'campaign-b' });

    await waitFor(() => expect(result.current.characterGoals).toHaveLength(1));
    expect(result.current.playerTheories).toEqual([]);
  });
});
