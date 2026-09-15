import { useCallback, useEffect, useState } from 'react';
import type { CampaignPlannerRepository, Scene, SceneId, SessionId } from '../types';

/**
 * Loads and mutates one Session's Scenes through the host-supplied
 * `CampaignPlannerRepository` — scoped to `sessionId`, not
 * `campaignId`, since Scenes are never listed campaign-wide (Slice
 * 4.2d's "Scene has no top-level tab" decision). `sessionId` is `null`
 * while creating a brand-new, unsaved Session — Scenes can't exist yet.
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
