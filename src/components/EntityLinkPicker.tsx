import React, { useEffect, useState } from 'react';
import type { EntityReference, EntitySearchResult, PlannerEntityType, TTRPGHostAdapter } from '../types';

/** A generic, searchable planner-owned item — one row per Note/NPC/
 * Group/Location/Session/Scene/Storyline/Thread/Quest/Event, built by
 * the caller from whichever of those lists is currently loaded (Slice
 * 4.2c generalized this from Notes-only; Slice 4.2d added the rest). */
export interface PlannerSearchItem {
  type: PlannerEntityType;
  id: string;
  label: string;
}

const PLANNER_TYPE_LABELS: Record<PlannerEntityType, string> = {
  note: 'Notes',
  npc: 'NPCs',
  group: 'Groups',
  location: 'Locations',
  session: 'Sessions',
  scene: 'Scenes',
  storyline: 'Storylines',
  thread: 'Threads',
  quest: 'Quests',
  event: 'Events',
};

export interface EntityLinkPickerProps {
  plannerItems: PlannerSearchItem[];
  hostAdapter: TTRPGHostAdapter;
  /** Never offered as a link target — an entity can't link to itself. */
  excludeRef: EntityReference;
  onSelect: (target: EntityReference, label: string) => void;
  onClose: () => void;
}

/**
 * Slice 4.2b's link picker — an explicit "Add Link" search panel, not
 * inline `[[`/`@` typing inside the textarea. That richer, cursor-
 * anchored trigger is real BlockNote territory (Slice 4.2e); building
 * it against today's plain-textarea editors would be throwaway work
 * the moment the block editor lands. This still delivers the actually
 * valuable part — real `EntityLink` rows and backlinks — via a
 * simpler, durable UI.
 *
 * Searches two sources: planner-owned entities (filtered from the
 * already-loaded `plannerItems` list, client-side — no extra fetch;
 * Slice 4.2a/4.2b only ever passed Notes here, Slice 4.2c widened it to
 * NPCs/Groups/Locations too) and host-owned entities
 * (`hostAdapter.searchEntities`, async).
 */
export const EntityLinkPicker: React.FC<EntityLinkPickerProps> = ({
  plannerItems,
  hostAdapter,
  excludeRef,
  onSelect,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [hostResults, setHostResults] = useState<EntitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsSearching(true);
    hostAdapter
      .searchEntities(query)
      .then((results) => {
        if (!cancelled) setHostResults(results);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hostAdapter, query]);

  const q = query.trim().toLowerCase();
  const plannerResults = plannerItems.filter(
    (item) =>
      !(excludeRef.type === item.type && excludeRef.id === item.id) &&
      (!q || item.label.toLowerCase().includes(q))
  );
  const plannerResultsByType = new Map<PlannerEntityType, PlannerSearchItem[]>();
  for (const item of plannerResults) {
    const bucket = plannerResultsByType.get(item.type) ?? [];
    bucket.push(item);
    plannerResultsByType.set(item.type, bucket);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-900/40" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-slate-200">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, NPCs, groups, locations, characters…"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {plannerResults.length === 0 && hostResults.length === 0 && !isSearching && (
            <div className="p-4 text-xs text-slate-500 text-center">No matches.</div>
          )}

          {Array.from(plannerResultsByType.entries()).map(([type, items]) => (
            <div key={type}>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {PLANNER_TYPE_LABELS[type]}
              </div>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect({ type: item.type, id: item.id, source: 'planner' }, item.label)}
                  className="w-full text-left px-2 py-1.5 text-sm text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}

          {hostResults.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Campaign</div>
              {hostResults.map((r) => (
                <button
                  key={`${r.type}:${r.id}`}
                  type="button"
                  onClick={() => onSelect({ type: r.type, id: r.id, source: 'host' }, r.label)}
                  className="w-full text-left px-2 py-1.5 text-sm text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer flex items-center justify-between gap-2"
                >
                  <span>{r.label}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 shrink-0">{r.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-2 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
