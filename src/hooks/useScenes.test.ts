import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createFakeRepository } from '../test/fixtures';
import { useScenes } from './useScenes';

describe('useScenes', () => {
  it('loads only the Scenes belonging to the given sessionId, never campaign-wide', async () => {
    const ownScene = {
      id: 'scene-1',
      sessionId: 'session-1',
      title: 'Arrival',
      sceneNumber: 1,
      status: null,
      order: 0,
      details: [],
      createdAt: 'x',
      updatedAt: 'x',
    };
    const otherSessionScene = { ...ownScene, id: 'scene-2', sessionId: 'session-2', title: 'Other Session Scene' };
    const repository = createFakeRepository({ scenes: [ownScene, otherSessionScene] });

    const { result } = renderHook(() => useScenes(repository, 'session-1'));

    await waitFor(() => expect(result.current.scenes).toEqual([ownScene]));
  });

  it('returns an empty list, not null or an error, while sessionId is null (unsaved Session)', async () => {
    const repository = createFakeRepository();
    const { result } = renderHook(() => useScenes(repository, null));

    await waitFor(() => expect(result.current.scenes).toEqual([]));
    expect(result.current.error).toBeNull();
  });

  it('throws instead of silently creating a Scene while sessionId is null', async () => {
    const repository = createFakeRepository();
    const { result } = renderHook(() => useScenes(repository, null));
    await waitFor(() => expect(result.current.scenes).toEqual([]));

    await expect(
      result.current.createScene({ title: 'Too Early', sceneNumber: null, status: null, order: 0, details: [] })
    ).rejects.toThrow('Cannot add a Scene before the Session itself is saved.');
  });

  it('create: attaches the given sessionId to the saved Scene', async () => {
    const repository = createFakeRepository();
    const { result } = renderHook(() => useScenes(repository, 'session-1'));
    await waitFor(() => expect(result.current.scenes).toEqual([]));

    await act(async () => {
      await result.current.createScene({ title: 'Arrival', sceneNumber: 1, status: null, order: 0, details: [] });
    });

    await waitFor(() => expect(result.current.scenes).toHaveLength(1));
    expect(result.current.scenes?.[0]).toMatchObject({ title: 'Arrival', sessionId: 'session-1' });
  });
});
