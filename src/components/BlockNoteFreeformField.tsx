import React, { useMemo, useState } from 'react';
import { BlockNoteSchema, defaultInlineContentSpecs } from '@blocknote/core';
import type { PartialBlock } from '@blocknote/core';
import { useCreateBlockNote, SuggestionMenuController, type DefaultReactSuggestionItem } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';
import './blockNoteBaseline.css';
import './blockNoteColumns.css';
import { entityReferenceInlineContentSpec, EntityReferenceLinkingContext } from './EntityReferenceInlineContent';
import { toBlocksValue } from '../lib/blockNoteUtils';
import type { Block, EntityReference } from '../types';
import type { EntityEditorLinksProps } from './EntityLinksPanel';

const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    entityReference: entityReferenceInlineContentSpec,
  },
});

function isEmptyDocument(blocks: PartialBlock[] | undefined): boolean {
  if (!blocks || blocks.length === 0) return true;
  if (blocks.length > 1) return false;
  const only = blocks[0];
  return only.type === 'paragraph' && (!only.content || (Array.isArray(only.content) && only.content.length === 0));
}

type EntitySuggestionItem = DefaultReactSuggestionItem & { ref: EntityReference };

export interface BlockNoteFreeformFieldProps {
  value: Block[] | null | undefined;
  onChange: (blocks: Block[]) => void;
  /** Omitted while creating a brand-new, unsaved record — same "Linked
   * Entities hidden until saved" rule every editor already follows.
   * When omitted, no `[[`/`@` suggestion menus are registered (those
   * characters are then literal text, not a broken picker). Reuses the
   * exact same object every editor already threads to its
   * `EntityLinksPanel`, so wiring this in is a one-line addition per
   * editor. */
  linking?: EntityEditorLinksProps;
  /** Slice 4.2f — a Notion-style starter structure for this entity
   * kind (see `lib/entityTemplates.ts`), offered via a "+ Use starter
   * template" button only while the document is still the untouched
   * default empty paragraph. Omitted entities (Note) get no button. */
  template?: PartialBlock[];
}

/**
 * Slice 4.2e — the one shared rich-text field every entity's document
 * body (and Session's separate Debrief) renders through. Replaces
 * 4.2c/4.2d's one-small-textarea-per-doc-listed-field editors with a
 * single Notion-style flowing document per entity, plus the doc's
 * "one custom piece to build on top of the library": typing `[[` or
 * `@` searches Notes/NPCs/Groups/.../host entities and inserts a real,
 * clickable `entityReference` node — backed by a real `EntityLink`
 * row, not just styled text.
 *
 * Slice 4.2f briefly added a from-scratch, dependency-free 2-column
 * layout block on top of this. Removed after direct user feedback and
 * repeated live-reproduced bugs (a "+ Two Columns" button, a hover
 * side-menu-positioning fix, and a drag-and-drop guard were all tried
 * in turn — see `CHANGELOG.md`'s entries for the full history) that
 * traced back to BlockNote's real column support requiring a proper
 * NodeView (what the GPL/proprietary-licensed `@blocknote/xl-multi-
 * column` package actually provides), which this project's licensing
 * constraint rules out. Single flowing document only, going forward.
 */
export const BlockNoteFreeformField: React.FC<BlockNoteFreeformFieldProps> = ({ value, onChange, linking, template }) => {
  const initialContent = useMemo(() => {
    const blocks = toBlocksValue(value);
    return blocks.length > 0 ? (blocks as PartialBlock[]) : undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only used once, at mount, matching every other Field's useState(() => ...) lazy-init pattern

  const editor = useCreateBlockNote({ schema, initialContent }, []); // eslint-disable-line react-hooks/exhaustive-deps -- create once per mount, matching `initialContent`'s own once-at-mount semantics

  // Seeded once from whether the document was empty at mount; flipped
  // permanently to true the instant anything changes it (the GM's own
  // first keystroke or the template being applied both count), so the
  // "+ Use starter template" button can never silently clobber real
  // content after the fact.
  const [hasContent, setHasContent] = useState(() => !isEmptyDocument(initialContent));

  const applyTemplate = () => {
    if (!template || template.length === 0) return;
    editor.replaceBlocks(editor.document, template);
    setHasContent(true);
    onChange(editor.document as unknown as Block[]);
  };

  // DefaultSuggestionItem requires `onItemClick` on the item itself
  // (not just as a controller-level prop) for BlockNote's own default
  // menu UI to work, so it's built in here rather than passed
  // separately to `SuggestionMenuController`.
  const handleSelect = async (ref: EntityReference, label: string) => {
    editor.insertInlineContent([
      { type: 'entityReference', props: { refType: ref.type, refId: ref.id, refSource: ref.source, label } },
      ' ',
    ]);
    if (!linking) return;
    const alreadyLinked = linking.outgoing.some(
      (l) => l.relationshipType === 'mentions' && l.targetType === ref.type && l.targetId === ref.id
    );
    if (!alreadyLinked) await linking.onAddLink(ref, label);
  };

  const getItems = async (query: string): Promise<EntitySuggestionItem[]> => {
    if (!linking) return [];
    const q = query.trim().toLowerCase();
    const plannerItems: EntitySuggestionItem[] = linking.plannerItems
      .filter((item) => !q || item.label.toLowerCase().includes(q))
      .map((item) => {
        const ref: EntityReference = { type: item.type, id: item.id, source: 'planner' };
        return { title: item.label, subtext: item.type, ref, onItemClick: () => handleSelect(ref, item.label) };
      });
    const hostResults = await linking.hostAdapter.searchEntities(query);
    const hostItems: EntitySuggestionItem[] = hostResults.map((r) => {
      const ref: EntityReference = { type: r.type, id: r.id, source: 'host' };
      return { title: r.label, subtext: r.type, ref, onItemClick: () => handleSelect(ref, r.label) };
    });
    return [...plannerItems, ...hostItems];
  };

  const view = (
    <div>
      <div className="mb-2 flex items-center gap-3 text-sm">
        {template && template.length > 0 && !hasContent && (
          <button
            type="button"
            onClick={applyTemplate}
            className="text-left text-emerald-700 hover:underline cursor-pointer"
          >
            + Use starter template
          </button>
        )}
        {/* Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z already undo/redo — BlockNote
            wires ProseMirror's history plugin to those by default, no
            code needed for the shortcuts themselves. These buttons exist
            purely for discoverability (there was previously no visible
            affordance suggesting undo/redo existed at all) and as a
            click target for anyone who'd rather not use the keyboard. */}
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.undo()}
            title="Undo (Cmd/Ctrl+Z)"
            aria-label="Undo"
            className="px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
          >
            ↺ Undo
          </button>
          <button
            type="button"
            onClick={() => editor.redo()}
            title="Redo (Cmd/Ctrl+Shift+Z)"
            aria-label="Redo"
            className="px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
          >
            ↻ Redo
          </button>
        </span>
      </div>
      <BlockNoteView
        editor={editor}
        className="bnff-editable"
        onChange={() => {
          setHasContent(true);
          onChange(editor.document as unknown as Block[]);
        }}
      >
        {linking && (
          <>
            <SuggestionMenuController triggerCharacter="@" getItems={getItems} />
            <SuggestionMenuController triggerCharacter="[[" getItems={getItems} />
          </>
        )}
      </BlockNoteView>
    </div>
  );

  if (!linking) return view;
  return (
    <EntityReferenceLinkingContext.Provider
      value={{ onOpenPlannerEntity: linking.onOpenPlannerEntity, onOpenHostEntity: linking.onOpenHostEntity }}
    >
      {view}
    </EntityReferenceLinkingContext.Provider>
  );
};
