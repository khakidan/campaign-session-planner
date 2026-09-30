import React, { useState } from 'react';
import type { CampaignId, CampaignPlannerRepository } from '../types';
import { useNotes } from '../hooks/useNotes';
import { MEMORY_NOTE_TYPES, type MemoryNoteType } from '../lib/plannerMemory';

export interface QuickCaptureComposerProps {
  repository: CampaignPlannerRepository;
  campaignId: CampaignId;
}

/**
 * "Run Mode" (ROADMAP.md) — a couple of taps to record a memory Note
 * (`Player Theory`, `Unresolved Question`, etc.) mid-scene, without
 * pulling up the full `NoteEditor` and losing the GM's place. Plain
 * text only (no rich content, no linking) — a real `Note`, created via
 * the existing `useNotes`, that a GM can open in the full editor later
 * to add content/tags/confidence/links, same as any other Note.
 */
export const QuickCaptureComposer: React.FC<QuickCaptureComposerProps> = ({ repository, campaignId }) => {
  const { createNote } = useNotes(repository, campaignId);
  const [type, setType] = useState<MemoryNoteType>('Unresolved Question');
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastCaptured, setLastCaptured] = useState<string | null>(null);

  const handleCapture = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      await createNote({
        title: trimmed,
        type,
        status: null,
        tags: [],
        content: [{ type: 'paragraph', content: [{ type: 'text', text: trimmed, styles: {} }] }] as never,
      });
      setLastCaptured(trimmed);
      setText('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-1.5 p-3 border border-[var(--csp-neutral-200)] rounded-lg bg-[var(--csp-neutral-50)]">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)]">Quick Capture</h3>
      <div className="flex items-center gap-1.5">
        <select
          aria-label="Note type"
          value={type}
          onChange={(e) => setType(e.target.value as MemoryNoteType)}
          className="px-2 py-1.5 border border-[var(--csp-neutral-300)] rounded-lg text-xs bg-white shrink-0"
        >
          {MEMORY_NOTE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="text"
          aria-label="Quick capture text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCapture();
          }}
          placeholder="Jot it down before you lose it…"
          className="flex-1 min-w-0 px-3 py-1.5 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
        />
        <button
          type="button"
          onClick={handleCapture}
          disabled={isSaving || !text.trim()}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-[var(--csp-accent-600)] hover:bg-[var(--csp-accent-700)] rounded-lg disabled:opacity-50 cursor-pointer shrink-0"
        >
          + Add
        </button>
      </div>
      {lastCaptured && <p className="text-[11px] text-[var(--csp-neutral-400)]">Captured: "{lastCaptured}"</p>}
    </div>
  );
};
