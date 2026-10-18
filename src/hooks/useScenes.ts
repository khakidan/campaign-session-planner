import { useCallback, useEffect, useState } from 'react';
import type { CampaignPlannerRepository, Scene, SceneId, SessionId } from '../types';

/**
 * Loads and mutates one Session's Scenes through the host-supplied
 * `CampaignPlannerRepository` — scoped to `sessionId`. Used by
 * `SessionEditor.tsx`'s inline Scenes sub-section. `sessionId` is
 * `null` while creating a brand-new, unsaved Session — Scenes can't
 * exist yet.
 */
export function useScenes(repository: CampaignPlannerRepository, sessionId: SessionId | null) {
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!sessionId) {
      setScenes([]);
      return Promise.resolve();
    }
    setError(null);
    return repository
      .getScenes(sessionId)
      .then(setScenes)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load Scenes.'));
  }, [repository, sessionId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createScene = useCallback(
    async (scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt' | 'sessionId'>) => {
      if (!sessionId) throw new Error('Cannot add a Scene before the Session itself is saved.');
      const created = await repository.saveScene({ ...scene, sessionId });
      await reload();
      return created;
    },
    [repository, sessionId, reload]
  );

  const updateScene = useCallback(
    async (scene: Scene) => {
      const saved = await repository.saveScene(scene);
      await reload();
      return saved;
    },
    [repository, reload]
  );

  const deleteScene = useCallback(
    async (id: SceneId) => {
      await repository.deleteScene(id);
      await reload();
    },
    [repository, reload]
  );

  return { scenes, error, reload, createScene, updateScene, deleteScene };
}

/**
 * The campaign-wide counterpart to `useScenes` — backs the top-level
 * "Scenes" tab in `CampaignSessionPlanner.tsx`. The repository has no
 * single "all Scenes in this campaign" call (Scene itself carries no
 * `campaignId`), so this fetches every given Session's Scenes in
 * parallel and flattens them; the caller supplies `sessionIds` from
 * its own already-loaded, campaign-scoped Session list.
 */
export function useAllScenes(repository: CampaignPlannerRepository, sessionIds: SessionId[]) {
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idsKey = sessionIds.join(',');

  const reload = useCallback(() => {
    if (sessionIds.length === 0) {
      setScenes([]);
      return Promise.resolve();
    }
    setError(null);
    return Promise.all(sessionIds.map((id) => repository.getScenes(id)))
      .then((lists) => setScenes(lists.flat()))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load Scenes.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository, idsKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createScene = useCallback(
    async (scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => {
      const created = await repository.saveScene(scene);
      await reload();
      return created;
    },
    [repository, reload]
  );

  const updateScene = useCallback(
    async (scene: Scene) => {
      const saved = await repository.saveScene(scene);
      await reload();
      return saved;
    },
    [repository, reload]
  );

  const deleteScene = useCallback(
    async (id: SceneId) => {
      await repository.deleteScene(id);
      await reload();
    },
    [repository, reload]
  );

  return { scenes, error, reload, createScene, updateScene, deleteScene };
}
