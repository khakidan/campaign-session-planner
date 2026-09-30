import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createFakeRepository, makeNote, makeSession, makeThread, TEST_CAMPAIGN_ID } from '../test/fixtures';
import { usePlannerSearchIndex } from './usePlannerSearchIndex';

const paragraph = (text: string) => [{ type: 'paragraph', content: [{ type: 'text', text, styles: {} }] }] as never;

describe('usePlannerSearchIndex', () => {
  it('flattens every planner entity kind (except Scene) into one labeled, typed list', async () => {
    const repository = createFakeRepository({
      notes: [makeNote({ id: 'note-1', title: 'A Secret' })],
      threads: [makeThread({ id: 'thread-1', name: 'The Duke' })],
    });

    const { result } = renderHook(() => usePlannerSearchIndex(repository, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current.items).not.toBeNull());
    expect(result.current.items).toEqual(
      expect.arrayContaining([
        { type: 'note', id: 'note-1', label: 'A Secret', content: '' },
        { type: 'thread', id: 'thread-1', label: 'The Duke', content: '' },
      ])
    );
  });

  it('extracts each entity\'s document body into `content` for full-content search', async () => {
    const repository = createFakeRepository({
      notes: [
        makeNote({
          id: 'note-1',
          title: 'A Secret',
          content: paragraph('The Duke is a vampire.'),
        }),
      ],
    });

    const { result } = renderHook(() => usePlannerSearchIndex(repository, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current.items).not.toBeNull());
    expect(result.current.items?.find((i) => i.id === 'note-1')?.content).toBe('The Duke is a vampire.');
  });

  it('concatenates a Session\'s details and debrief into one `content` string', async () => {
    const repository = createFakeRepository({
      sessions: [
        makeSession({
          id: 'session-1',
          title: 'The Sunken Temple',
          details: paragraph('Prep notes.'),
          debrief: paragraph('They found the relic.'),
        }),
      ],
    });

    const { result } = renderHook(() => usePlannerSearchIndex(repository, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current.items).not.toBeNull());
    expect(result.current.items?.find((i) => i.id === 'session-1')?.content).toBe('Prep notes. They found the relic.');
  });

  it('excludes Scenes — they are only ever reached nested under their Session', async () => {
    const repository = createFakeRepository();
    const { result } = renderHook(() => usePlannerSearchIndex(repository, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current.items).not.toBeNull());
    expect(result.current.items?.some((item) => item.type === 'scene')).toBe(false);
  });

  it('surfaces a load failure through `error`', async () => {
    const repository = createFakeRepository();
    repository.getNotes = () => Promise.reject(new Error('network down'));

    const { result } = renderHook(() => usePlannerSearchIndex(repository, TEST_CAMPAIGN_ID));

    await waitFor(() => expect(result.current.error).toBe('network down'));
  });
});
