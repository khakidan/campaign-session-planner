import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createFakeRepository } from '../test/fixtures';
import { useScenes, useAllScenes } from './useScenes';

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

describe('useAllScenes', () => {
  it('fetches every given sessionId\'s Scenes and flattens them into one list', async () => {
    const sceneA = { id: 'scene-1', sessionId: 'session-a', title: 'A', sceneNumber: null, status: null, order: 0, details: [], createdAt: 'x', updatedAt: 'x' };
    const sceneB = { id: 'scene-2', sessionId: 'session-b', title: 'B', sceneNumber: null, status: null, order: 0, details: [], createdAt: 'x', updatedAt: 'x' };
    const repository = createFakeRepository({ scenes: [sceneA, sceneB] });

    const { result } = renderHook(() => useAllScenes(repository, ['session-a', 'session-b']));

    await waitFor(() => expect(result.current.scenes).toHaveLength(2));
    expect(result.current.scenes).toEqual(expect.arrayContaining([sceneA, sceneB]));
  });

  it('returns an empty list, not null or an error, when no sessionIds are given', async () => {
    const repository = createFakeRepository();
    const { result } = renderHook(() => useAllScenes(repository, []));

    await waitFor(() => expect(result.current.scenes).toEqual([]));
    expect(result.current.error).toBeNull();
  });

  it('create/update/delete all reload the aggregate afterward', async () => {
    const repository = createFakeRepository();
    const { result } = renderHook(() => useAllScenes(repository, ['session-1']));
    await waitFor(() => expect(result.current.scenes).toEqual([]));

    await act(async () => {
      await result.current.createScene({ sessionId: 'session-1', title: 'Arrival', sceneNumber: null, status: null, order: 0, details: [] });
    });
    await waitFor(() => expect(result.current.scenes).toHaveLength(1));
    const created = result.current.scenes![0];

    await act(async () => {
      await result.current.updateScene({ ...created, title: 'Arrival, Updated' });
    });
    await waitFor(() => expect(result.current.scenes?.[0].title).toBe('Arrival, Updated'));

    await act(async () => {
      await result.current.deleteScene(created.id);
    });
    await waitFor(() => expect(result.current.scenes).toEqual([]));
  });
});
