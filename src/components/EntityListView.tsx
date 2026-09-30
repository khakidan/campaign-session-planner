import React, { useMemo, useState } from 'react';

export interface EntityListItem {
  id: string;
  title: string;
  badge?: string | null;
  subtitle?: string | null;
  tags?: string[];
}

export interface EntityListViewProps {
  items: EntityListItem[] | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  createLabel: string;
  emptyLabel: string;
  searchPlaceholder: string;
}

/**
 * Slice 4.2c — the list/search/"New X" UI, generalized out of Note's
 * original inline `CampaignSessionPlanner` markup once NPC/Group/
 * Location needed the exact same shape (4 near-identical call sites is
 * past this project's "three similar lines is fine" threshold for a
 * shared component).
 */
export const EntityListView: React.FC<EntityListViewProps> = ({
  items,
  onSelect,
  onCreate,
  createLabel,
  emptyLabel,
  searchPlaceholder,
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) => item.title.toLowerCase().includes(q) || item.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [items, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="flex-1 px-3 py-2 border border-[var(--csp-neutral-300)] rounded-lg text-sm"
        />
        <button
          type="button"
          onClick={onCreate}
          className="px-3 py-2 text-xs font-semibold text-white bg-[var(--csp-accent-600)] hover:bg-[var(--csp-accent-700)] rounded-lg whitespace-nowrap cursor-pointer"
        >
          {createLabel}
        </button>
      </div>

      {items === null ? (
        <div className="text-xs text-[var(--csp-neutral-500)]">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 border border-dashed border-[var(--csp-neutral-300)] rounded-xl text-center text-xs text-[var(--csp-neutral-500)]">
          {items.length === 0 ? emptyLabel : 'No matches.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className="w-full text-left p-3 border border-[var(--csp-neutral-200)] rounded-xl hover:border-[var(--csp-neutral-300)] hover:bg-[var(--csp-neutral-50)] transition cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-[var(--csp-neutral-900)]">{item.title}</span>
                {item.badge && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--csp-accent-700)] bg-[var(--csp-accent-50)] px-2 py-0.5 rounded-full shrink-0">
                    {item.badge}
                  </span>
                )}
              </div>
              {item.subtitle && <div className="mt-1 text-[11px] text-[var(--csp-neutral-500)]">{item.subtitle}</div>}
              {item.tags && item.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span key={tag} className="text-[10px] text-[var(--csp-neutral-500)] bg-[var(--csp-neutral-100)] px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
