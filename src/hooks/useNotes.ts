import { useCallback, useEffect, useState } from 'react';
import type { CampaignId, CampaignPlannerRepository, Note, NoteId } from '../types';

/**
 * Loads and mutates this campaign's Notes through the host-supplied
 * `CampaignPlannerRepository` — the package never fetches or persists
 * anything itself, only through this interface (see types/index.ts).
 */
export function useNotes(repository: CampaignPlannerRepository, campaignId: CampaignId) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    return repository
      .getNotes(campaignId)
      .then(setNotes)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load notes.'));
  }, [repository, campaignId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createNote = useCallback(
    async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => {
      const created = await repository.saveNote({ ...note, campaignId });
      await reload();
      return created;
    },
    [repository, campaignId, reload]
  );

  const updateNote = useCallback(
    async (note: Note) => {
      const saved = await repository.saveNote(note);
      await reload();
      return saved;
    },
    [repository, reload]
  );

  const deleteNote = useCallback(
    async (id: NoteId) => {
      await repository.deleteNote(id);
      await reload();
    },
    [repository, reload]
  );

  return { notes, error, reload, createNote, updateNote, deleteNote };
}
