import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createFakeRepository, makeEntityLink, makeNote, makeSession, TEST_CAMPAIGN_ID } from '../test/fixtures';
import { useSessionRecap } from './useSessionRecap';
import { RECAP_HIGHLIGHT_TYPE } from '../lib/sessionRecap';

describe('useSessionRecap', () => {
  it('resolves the Session and its linked Recap Highlight Notes', async () => {
    const session = makeSession({ id: 'session-1', title: 'The Sunken Temple' });
    const highlight = makeNote({ id: 'note-1', type: RECAP_HIGHLIGHT_TYPE, title: 'Highlight' });
    const link = makeEntityLink({ sourceType: 'note', sourceId: 'note-1', targetType: 'session', targetId: 'session-1' });
    const repository = createFakeRepository({ sessions: [session], notes: [highlight], links: [link] });

    const { result } = renderHook(() => useSessionRecap(repository, TEST_CAMPAIGN_ID, 'session-1'));

    await waitFor(() => expect(result.current.session).toEqual(session));
    expect(result.current.highlights).toEqual([highlight]);
  });

  it('excludes a Note of a different type even when linked', async () => {
    const session = makeSession({ id: 'session-1' });
    const note = makeNote({ id: 'note-1', type: 'General' });
    const link = makeEntityLink({ sourceType: 'note', sourceId: 'note-1', targetType: 'session', targetId: 'session-1' });
    const repository = createFakeRepository({ sessions: [session], notes: [note], links: [link] });

    const { result } = renderHook(() => useSessionRecap(repository, TEST_CAMPAIGN_ID, 'session-1'));

    await waitFor(() => expect(result.current.session).toEqual(session));
    expect(result.current.highlights).toEqual([]);
  });

  it('returns a null session for an id that does not exist', async () => {
    const repository = createFakeRepository();
    const { result } = renderHook(() => useSessionRecap(repository, TEST_CAMPAIGN_ID, 'missing-session'));

    await waitFor(() => expect(result.current.highlights).toEqual([]));
    expect(result.current.session).toBeNull();
  });
});
