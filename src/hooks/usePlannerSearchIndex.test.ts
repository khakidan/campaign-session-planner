import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createFakeRepository, makeNote, makeThread, TEST_CAMPAIGN_ID } from '../test/fixtures';
import { usePlannerSearchIndex } from './usePlannerSearchIndex';

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
        { type: 'note', id: 'note-1', label: 'A Secret' },
        { type: 'thread', id: 'thread-1', label: 'The Duke' },
      ])
    );
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
