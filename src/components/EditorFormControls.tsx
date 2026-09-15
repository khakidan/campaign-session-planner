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
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      )}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t border-slate-200 pt-4">
      <legend className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">{title}</legend>
      {children}
    </fieldset>
  );
}
