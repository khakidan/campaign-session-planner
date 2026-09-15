import React, { useMemo } from 'react';
import { BlockNoteSchema, defaultInlineContentSpecs } from '@blocknote/core';
import type { PartialBlock } from '@blocknote/core';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';
import './blockNoteBaseline.css';
import './blockNoteColumns.css';
import './readOnlyTypography.css';
import { entityReferenceInlineContentSpec } from './EntityReferenceInlineContent';
import { toBlocksValue } from '../lib/blockNoteUtils';
import type { Block } from '../types';

const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    entityReference: entityReferenceInlineContentSpec,
  },
});

export interface ReadOnlyBlockNoteViewProps {
  blocks: Block[];
}

/**
 * Slice 4.2g — the Quick-reference Drawer's read-only document renderer.
 * A deliberately smaller sibling of `BlockNoteFreeformField.tsx`: same
 * schema (so `entityReference` nodes render and stay clickable — a
 * click resolves via `EntityReferenceLinkingContext`, same as the full
 * editor, so wrap this in that Context's Provider to make links live),
 * but `editable={false}` and every interactive controller (side menu,
 * formatting toolbar, slash menu, link toolbar) turned off — none of
 * them make sense on content the Drawer only ever displays, never
 * edits. No `[[`/`@` picker either, for the same reason.
 */
export const ReadOnlyBlockNoteView: React.FC<ReadOnlyBlockNoteViewProps> = ({ blocks }) => {
  const initialContent = useMemo(() => {
    const converted = toBlocksValue(blocks);
    return converted.length > 0 ? (converted as PartialBlock[]) : undefined;
  }, [blocks]);

  const editor = useCreateBlockNote({ schema, initialContent }, [initialContent]);

  if (!initialContent) {
    return <p className="text-xs text-slate-400 italic">Nothing written here yet.</p>;
  }

  return (
    <BlockNoteView
      editor={editor}
      editable={false}
      sideMenu={false}
      formattingToolbar={false}
      slashMenu={false}
      linkToolbar={false}
      emojiPicker={false}
      filePanel={false}
      tableHandles={false}
      className="qrd-readonly"
    />
  );
};
