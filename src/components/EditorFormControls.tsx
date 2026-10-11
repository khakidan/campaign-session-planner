import React from 'react';

// Slice 4.2d — extracted from NpcEditor.tsx/GroupEditor.tsx/
// LocationEditor.tsx, which each redefined these two components
// identically. Adding 6 more editors (Session/Scene/Storyline/Thread/
// Quest/Event) in this slice would have meant 6 more copies — past the
// duplication threshold that already justified pulling `EntityListView`
// out for the same reason in Slice 4.2c. Internal to the package, not
// exported from `index.ts` (this was never part of the public API even
// as copy-pasted code).

export function Field({
  id,
  label,
  value,
  onChange,
  multiline = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--csp-neutral-500)] mb-1" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
        />
      )}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t border-[var(--csp-neutral-200)] pt-4">
      <legend className="text-xs font-bold uppercase tracking-wider text-[var(--csp-neutral-600)] mb-1">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Background-autosave status, shown next to the explicit Save button
 * (ROADMAP.md's "Campaign Planner Notes App") — one component shared by
 * every Editor's `useAutosave` wiring rather than five copies of the
 * same three-state label. Renders nothing for 'idle' (nothing has
 * changed yet, so there's nothing to say) or 'error' (autosave failing
 * silently in the background isn't worth alarming over mid-edit; the
 * explicit Save button's own error path is still there for a real
 * problem — e.g. the required-field validation — the moment the GM
 * tries to finish up). */
export function AutosaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'saving') {
    return <span className="text-[11px] font-semibold text-[var(--csp-neutral-500)]">Saving…</span>;
  }
  if (status === 'saved') {
    return <span className="text-[11px] font-semibold text-[var(--csp-accent-600)]">Saved</span>;
  }
  return null;
}
