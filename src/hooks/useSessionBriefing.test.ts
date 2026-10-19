import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createFakeHostAdapter, createFakeRepository, makeEntityLink, makeNote, makeSession, makeThread, TEST_CAMPAIGN_ID } from '../test/fixtures';
import { RECAP_HIGHLIGHT_TYPE } from '../lib/sessionRecap';
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
        playerPreferences: [],
        activeThreads: [expect.objectContaining({ id: 't1' })],
        byCharacter: [],
        previousSessionHighlights: [],
      })
    );
  });

  it('resolves byCharacter from Note↔Character links when a hostAdapter is given', async () => {
    const goal = makeNote({ id: 'n1', type: 'Character Goal', title: "Seraphine's goal" });
    const repository = createFakeRepository({
      notes: [goal],
      links: [
        makeEntityLink({
          id: 'link-1',
          sourceType: 'note',
          sourceId: 'n1',
          targetType: 'character',
          targetId: 'char-1',
        }),
      ],
    });
    const hostAdapter = createFakeHostAdapter({
      getCharacters: async (ids) => (ids.includes('char-1') ? [{ id: 'char-1', name: 'Seraphine' }] : []),
    });

    const { result } = renderHook(() => useSessionBriefing(repository, TEST_CAMPAIGN_ID, hostAdapter));

    await waitFor(() =>
      expect(result.current.byCharacter).toEqual([
        { character: { id: 'char-1', name: 'Seraphine' }, notes: [goal] },
      ])
    );
  });

  it('leaves byCharacter empty when no hostAdapter is given', async () => {
    const repository = createFakeRepository({ notes: [makeNote({ id: 'n1', type: 'Player Theory' })] });
    const { result } = renderHook(() => useSessionBriefing(repository, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current.playerTheories).toHaveLength(1));
    expect(result.current.byCharacter).toEqual([]);
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

  it('resolves previousSessionHighlights from Recap Highlight Notes linked to previousSessionId', async () => {
    const session = makeSession({ id: 'session-1' });
    const highlight = makeNote({ id: 'n1', type: RECAP_HIGHLIGHT_TYPE, title: 'The vault collapsed' });
    const unrelated = makeNote({ id: 'n2', type: RECAP_HIGHLIGHT_TYPE, title: 'Not linked to this Session' });
    const repository = createFakeRepository({
      sessions: [session],
      notes: [highlight, unrelated],
      links: [makeEntityLink({ id: 'link-1', sourceType: 'session', sourceId: 'session-1', targetType: 'note', targetId: 'n1' })],
    });

    const { result } = renderHook(() => useSessionBriefing(repository, TEST_CAMPAIGN_ID, undefined, 'session-1'));

    await waitFor(() => expect(result.current.previousSessionHighlights).toEqual([highlight]));
  });

  it('leaves previousSessionHighlights empty when previousSessionId is omitted', async () => {
    const repository = createFakeRepository({ notes: [makeNote({ id: 'n1', type: RECAP_HIGHLIGHT_TYPE })] });

    const { result } = renderHook(() => useSessionBriefing(repository, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current.byCharacter).toEqual([]));
    expect(result.current.previousSessionHighlights).toEqual([]);
  });
});
