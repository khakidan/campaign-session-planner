import React from 'react';
import type { CampaignId, CampaignPlannerRepository, Note, PlannerEntityType } from '../types';
import { NoteEditor, type NoteEditorProps, type NoteFormValues } from './NoteEditor';
import type { EntityEditorLinksProps } from './EntityLinksPanel';
import { buildCrudHandlers, parseTags, type View } from '../lib/plannerRoutes';

export interface NoteEditorRouteProps {
  notes: Note[] | null;
  /** The Notes tab's current `view.id` — `null` means creating a new
   * Note. Passed as a plain id, not the whole discriminated `View`,
   * since this component only ever renders once the parent has already
   * narrowed to `view.mode === 'edit'`. */
  viewId: string | null;
  setView: (kind: PlannerEntityType, next: View) => void;
  runSaving: (fn: () => Promise<void>) => Promise<void>;
  isSaving: boolean;
  campaignId: CampaignId;
  repository: CampaignPlannerRepository;
  links: EntityEditorLinksProps | undefined;
  renderFields: NoteEditorProps['renderFields'];
  createNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => Promise<Note>;
  updateNote: (note: Note) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  reloadNotes: () => Promise<void>;
}

/** The Notes tab's edit view — resolves `view.id` against the already-
 * loaded `notes` list, wires save/autosave/delete through the shared
 * `buildCrudHandlers`, and renders `NoteEditor`. One file per kind here
 * is what keeps `CampaignSessionPlanner.tsx` itself from having to own
 * all 11 kinds' wiring directly (ROADMAP.md's "Refactoring
 * Candidates"). */
export const NoteEditorRoute: React.FC<NoteEditorRouteProps> = ({
  notes,
  viewId,
  setView,
  runSaving,
  isSaving,
  campaignId,
  repository,
  links,
  renderFields,
  createNote,
  updateNote,
  deleteNote,
  reloadNotes,
}) => {
  const note = viewId ? (notes ?? []).find((n) => n.id === viewId) ?? null : null;
  const handlers = buildCrudHandlers({
    kind: 'note',
    entity: note,
    currentViewId: viewId,
    setView,
    runSaving,
    campaignId,
    toPayload: (values: NoteFormValues) => ({
      title: values.title.trim(),
      type: values.type.trim() || null,
      status: values.status.trim() || null,
      content: values.content,
      tags: parseTags(values.tags),
    }),
    createEntity: createNote,
    updateEntity: updateNote,
    deleteEntity: deleteNote,
    saveEntity: repository.saveNote,
    reloadEntity: reloadNotes,
  });
  return (
    <NoteEditor
      key={viewId ?? 'new'}
      note={note}
      isSaving={isSaving}
      links={links}
      renderFields={renderFields}
      onCancel={handlers.onCancel}
      onDelete={handlers.onDelete}
      onSave={handlers.onSave}
      onAutosave={handlers.onAutosave}
    />
  );
};
