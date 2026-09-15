import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import type {
  CampaignId,
  CampaignPlannerRepository,
  EntityReference,
  EntityType,
  PlannerEntityType,
  TTRPGHostAdapter,
} from '../types';
import type { PlannerSearchItem } from './EntityLinkPicker';
import { usePlannerSearchIndex } from '../hooks/usePlannerSearchIndex';
import { useEntityLinks } from '../hooks/useEntityLinks';
import { fetchEntityQuickView, plannerTypeLabel, type EntityQuickView } from '../lib/entityQuickView';
import { loadRecents, pushRecent } from '../lib/recentEntities';
import { ReadOnlyBlockNoteView } from './ReadOnlyBlockNoteView';
import { EntityReferenceLinkingContext } from './EntityReferenceInlineContent';

const PLANNER_TYPES: PlannerEntityType[] = [
  'note',
  'npc',
  'group',
  'location',
  'session',
  'scene',
  'storyline',
  'thread',
  'quest',
  'event',
];

/**
 * Slice 4.2g — the Quick-reference Drawer (docs/markdown/
 * campaign_session_notes_app.md's "Quick-reference Drawer"): fast
 * search-and-read over every planner entity, summonable from anywhere
 * (the Command Palette), non-modal (`Dialog.Root modal={false}` — the
 * rest of the app stays fully interactive underneath, no backdrop, no
 * focus trap — confirmed via Base UI's own `DialogRoot.Props.modal`
 * doc comment: `false` = "user interaction with the rest of the
 * document is allowed"), and stacking: clicking an `entityReference`
 * link or a backlink for a planner entity pushes a new instance on top
 * rather than replacing the current one, so a GM can drill Session →
 * NPC → Faction and back out without losing their place in the ones
 * underneath.
 */
interface DrawerEntry {
  id: string;
  ref: EntityReference | null;
}

interface QuickReferenceDrawerContextValue {
  /** Opens a fresh Drawer stack — the search view if `ref` is omitted,
   * or straight to that entity if given. Always resets the stack (this
   * is "summon the Drawer," not "add to what's already open"). */
  open: (ref?: EntityReference) => void;
  /** Pushes a new stacked instance on top of whatever's already open —
   * used internally when a link inside an open instance is clicked. */
  push: (ref: EntityReference) => void;
  closeAll: () => void;
}

const QuickReferenceDrawerContext = createContext<QuickReferenceDrawerContextValue | null>(null);

/** Throws outside a `QuickReferenceDrawerProvider` — every call site is
 * inside the app shell, which always mounts one. */
export function useQuickReferenceDrawer(): QuickReferenceDrawerContextValue {
  const ctx = useContext(QuickReferenceDrawerContext);
  if (!ctx) throw new Error('useQuickReferenceDrawer must be used within a QuickReferenceDrawerProvider');
  return ctx;
}

let nextEntryId = 1;

const WIDTH_STORAGE_KEY = 'campaign-planner:quick-reference-width';
const MIN_WIDTH = 340;
const MAX_WIDTH = 900;
const DEFAULT_WIDTH = 420;

function clampWidth(value: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));
}

function loadStoredWidth(): number {
  try {
    const raw = window.localStorage.getItem(WIDTH_STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed)) return clampWidth(parsed);
  } catch {
    // Falls through to the default — same private-browsing/quota
    // tolerance as `recentEntities.ts`.
  }
  return DEFAULT_WIDTH;
}

export interface QuickReferenceDrawerProviderProps {
  campaignId: CampaignId;
  repository: CampaignPlannerRepository;
  hostAdapter: TTRPGHostAdapter;
  children: React.ReactNode;
}

export const QuickReferenceDrawerProvider: React.FC<QuickReferenceDrawerProviderProps> = ({
  campaignId,
  repository,
  hostAdapter,
  children,
}) => {
  const [stack, setStack] = useState<DrawerEntry[]>([]);
  // One shared width across every stacked panel, not a per-panel size —
  // panels cascade at a fixed horizontal offset from each other (see
  // `DrawerPanel`'s `offset`), which only reads sensibly if they're all
  // the same width. Dragging the resize handle on *any* panel resizes
  // the whole stack at once, same as widening one Notion/Coda side-peek
  // widens every peek behind it.
  const [width, setWidthState] = useState<number>(loadStoredWidth);

  const setWidth = useCallback((next: number) => {
    const clamped = clampWidth(next);
    setWidthState(clamped);
    try {
      window.localStorage.setItem(WIDTH_STORAGE_KEY, String(clamped));
    } catch {
      // Best-effort, same as `recentEntities.ts` — a remembered width is
      // a convenience, never a reason to interrupt resizing itself.
    }
  }, []);

  const open = useCallback((ref?: EntityReference) => {
    setStack([{ id: `qrd-${nextEntryId++}`, ref: ref ?? null }]);
  }, []);

  const push = useCallback((ref: EntityReference) => {
    setStack((prev) => [...prev, { id: `qrd-${nextEntryId++}`, ref }]);
  }, []);

  const closeAll = useCallback(() => setStack([]), []);

  const closeFrom = useCallback((index: number) => {
    setStack((prev) => prev.slice(0, index));
  }, []);

  const contextValue = useMemo(() => ({ open, push, closeAll }), [open, push, closeAll]);

  return (
    <QuickReferenceDrawerContext.Provider value={contextValue}>
      {children}
      {stack.map((entry, index) => (
        <DrawerPanel
          key={entry.id}
          entry={entry}
          index={index}
          stackSize={stack.length}
          campaignId={campaignId}
          repository={repository}
          hostAdapter={hostAdapter}
          onClose={() => closeFrom(index)}
          onPush={push}
          width={width}
          onResizeWidth={setWidth}
        />
      ))}
    </QuickReferenceDrawerContext.Provider>
  );
};

interface DrawerPanelProps {
  entry: DrawerEntry;
  index: number;
  stackSize: number;
  campaignId: CampaignId;
  repository: CampaignPlannerRepository;
  hostAdapter: TTRPGHostAdapter;
  /** Closes this instance and every one stacked on top of it. */
  onClose: () => void;
  onPush: (ref: EntityReference) => void;
  width: number;
  onResizeWidth: (next: number) => void;
}

const DrawerPanel: React.FC<DrawerPanelProps> = ({
  entry,
  index,
  stackSize,
  campaignId,
  repository,
  hostAdapter,
  onClose,
  onPush,
  width,
  onResizeWidth,
}) => {
  const [ref, setRef] = useState<EntityReference | null>(entry.ref);

  const openTarget = useCallback(
    (type: EntityType, id: string) => {
      if (PLANNER_TYPES.includes(type as PlannerEntityType)) {
        onPush({ type, id, source: 'planner' });
      } else {
        hostAdapter.openEntity(type, id);
      }
    },
    [onPush, hostAdapter]
  );

  // Cascades left from the viewport's right edge — the oldest instance
  // sits closest to the edge, each newer one shifted further in and on
  // top (higher z-index), so earlier instances stay visible as a peek
  // behind the current one rather than being fully hidden.
  const offset = index * 40;

  return (
    <Dialog.Root
      open
      modal={false}
      // Base UI's own default (`disablePointerDismissal={false}`) closes
      // a non-modal dialog the instant a click or focus move lands
      // outside it — confirmed live to silently close the Drawer the
      // moment the GM clicked anything else in the app, directly
      // contradicting the doc's "the GM should be able to keep using the
      // app... while the Drawer stays open beside it" requirement.
      // Disabling it here means only the explicit close button and Esc
      // close a panel — clicking or navigating elsewhere in the app
      // never does.
      disablePointerDismissal
      onOpenChange={(next) => { if (!next) onClose(); }}
    >
      <Dialog.Portal>
        <Dialog.Popup
          style={{ right: 16 + offset, zIndex: 100 + index }}
          // Already a containing block for the `ResizeHandle`'s
          // `absolute` positioning below — `position: fixed` (like
          // `position: absolute`) establishes one on its own, no
          // separate `relative` needed (and adding one alongside
          // `fixed` here is a real bug: both set the same CSS
          // property, so whichever utility wins the cascade silently
          // discards the other's positioning behavior entirely —
          // confirmed live: the popup rendered at the full viewport
          // size, `top-4`/`bottom-4` no longer constraining its height
          // at all).
          className="fixed top-4 bottom-4 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xl outline-none"
          aria-label={index === 0 && stackSize === 1 && !ref ? 'Quick reference search' : 'Quick reference'}
        >
          <ResizeHandle width={width} onResizeWidth={onResizeWidth} />
          <div style={{ width }} className="flex flex-col h-full min-h-0">
            {ref ? (
              <EntityQuickViewPanel
                entityRef={ref}
                repository={repository}
                campaignId={campaignId}
                onOpenTarget={openTarget}
                onClose={onClose}
                onChangeRef={setRef}
              />
            ) : (
              <SearchPanel
                repository={repository}
                campaignId={campaignId}
                onSelect={(item) => setRef({ type: item.type, id: item.id, source: 'planner' })}
                onClose={onClose}
              />
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

/**
 * A hand-rolled resize handle rather than shadcn's `resizable`
 * component (`react-resizable-panels` underneath) — investigated first,
 * not assumed unusable: that library's `Panel`/`PanelResizeHandle`
 * negotiate size as a *percentage split between sibling panels inside
 * one shared `PanelGroup`* (confirmed from its own published type
 * declarations — `Panel`'s doc comment: "wraps resizable content...
 * configured with min/max size constraints," sized via `defaultSize`
 * as a percentage of the group). Every Drawer panel here is an
 * independent, absolutely-positioned overlay rendered through
 * `Dialog.Portal` — there is no sibling panel to negotiate space with
 * and no shared layout tree for a `PanelGroup` to coordinate, so the
 * library's actual model doesn't fit this use case. This is instead a
 * plain pointer-drag width control, styled to match the same visual
 * language (a thin vertical line that highlights on hover, a small
 * grip pill, `cursor: col-resize`) — dragging left grows the panel
 * (each panel anchors from the right edge via its own `right` style, so
 * growing width only ever extends further left, never off the right
 * edge of the viewport).
 */
const ResizeHandle: React.FC<{ width: number; onResizeWidth: (next: number) => void }> = ({
  width,
  onResizeWidth,
}) => {
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragState.current = { startX: e.clientX, startWidth: width };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const deltaX = e.clientX - dragState.current.startX;
    onResizeWidth(dragState.current.startWidth - deltaX);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize Quick Reference panel"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="group absolute left-0 top-0 bottom-0 w-3 -ml-1.5 cursor-col-resize flex items-center justify-center touch-none z-10"
    >
      <div className="w-px h-full bg-transparent group-hover:bg-emerald-400 transition-colors" />
      <div className="absolute w-1 h-10 rounded-full bg-slate-300 group-hover:bg-emerald-500 transition-colors" />
    </div>
  );
};

const PanelHeader: React.FC<{ title: string; onClose: () => void; onBack?: () => void }> = ({
  title,
  onClose,
  onBack,
}) => (
  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 shrink-0">
    {onBack && (
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to search"
        className="text-slate-400 hover:text-slate-700 cursor-pointer text-sm shrink-0"
      >
        &larr;
      </button>
    )}
    <h3 className="flex-1 min-w-0 truncate text-sm font-bold text-slate-800">{title}</h3>
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="text-slate-400 hover:text-rose-600 cursor-pointer text-sm shrink-0"
    >
      &times;
    </button>
  </div>
);

interface SearchPanelProps {
  repository: CampaignPlannerRepository;
  campaignId: CampaignId;
  onSelect: (item: PlannerSearchItem) => void;
  onClose: () => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ repository, campaignId, onSelect, onClose }) => {
  const { items, error } = usePlannerSearchIndex(repository, campaignId);
  const [query, setQuery] = useState('');
  const recents = useMemo(() => loadRecents(), []);

  const q = query.trim().toLowerCase();
  const results = q ? (items ?? []).filter((i) => i.label.toLowerCase().includes(q)) : null;

  return (
    <>
      <PanelHeader title="Quick Reference" onClose={onClose} />
      <div className="p-3 border-b border-slate-200 shrink-0">
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Notes, NPCs, Locations, Sessions..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
        {q ? (
          <ResultList
            heading={`Results (${results?.length ?? 0})`}
            items={results}
            loading={items === null}
            emptyLabel="No matches."
            onSelect={onSelect}
          />
        ) : (
          <ResultList
            heading="Recent"
            items={recents}
            loading={false}
            emptyLabel="Nothing viewed yet — search above."
            onSelect={onSelect}
          />
        )}
      </div>
    </>
  );
};

const ResultList: React.FC<{
  heading: string;
  items: PlannerSearchItem[] | null;
  loading: boolean;
  emptyLabel: string;
  onSelect: (item: PlannerSearchItem) => void;
}> = ({ heading, items, loading, emptyLabel, onSelect }) => (
  <div>
    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{heading}</h4>
    {loading ? (
      <p className="text-xs text-slate-400 italic">Loading&hellip;</p>
    ) : !items || items.length === 0 ? (
      <p className="text-xs text-slate-400 italic">{emptyLabel}</p>
    ) : (
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={`${item.type}:${item.id}`}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2"
            >
              <span className="text-sm text-slate-800 truncate">{item.label}</span>
              <span className="text-[10px] uppercase tracking-wide text-slate-400 shrink-0">
                {plannerTypeLabel(item.type)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

interface EntityQuickViewPanelProps {
  entityRef: EntityReference;
  repository: CampaignPlannerRepository;
  campaignId: CampaignId;
  onOpenTarget: (type: EntityType, id: string) => void;
  onClose: () => void;
  onChangeRef: (ref: EntityReference | null) => void;
}

const EntityQuickViewPanel: React.FC<EntityQuickViewPanelProps> = ({
  entityRef,
  repository,
  campaignId,
  onOpenTarget,
  onClose,
  onChangeRef,
}) => {
  const [view, setView] = useState<EntityQuickView | null | undefined>(undefined);
  const { outgoing, incoming } = useEntityLinks(repository, entityRef, campaignId);

  React.useEffect(() => {
    let cancelled = false;
    setView(undefined);
    fetchEntityQuickView(repository, entityRef).then((result) => {
      if (cancelled) return;
      setView(result);
      if (result) pushRecent({ type: entityRef.type as PlannerEntityType, id: entityRef.id, label: result.title });
    });
    return () => {
      cancelled = true;
    };
  }, [repository, entityRef.type, entityRef.id]);

  const linkingHandlers = useMemo(
    () => ({
      onOpenPlannerEntity: (target: EntityReference) => onOpenTarget(target.type, target.id),
      onOpenHostEntity: (type: EntityType, id: string) => onOpenTarget(type, id),
    }),
    [onOpenTarget]
  );

  return (
    <EntityReferenceLinkingContext.Provider value={linkingHandlers}>
      <PanelHeader
        title={view === undefined ? 'Loading…' : view === null ? 'Not found' : view.title}
        onClose={onClose}
        onBack={() => onChangeRef(null)}
      />
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {view === undefined && <p className="text-xs text-slate-400 italic">Loading&hellip;</p>}
        {view === null && (
          <p className="text-xs text-slate-400 italic">
            This {plannerTypeLabel(entityRef.type as PlannerEntityType)} no longer exists.
          </p>
        )}
        {view && (
          <>
            {view.badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {view.badges.map((badge) => (
                  <span
                    key={badge}
                    className="px-2 py-0.5 rounded-full bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
            {view.sections.map((section, i) => (
              <div key={section.label ?? i}>
                {section.label && (
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {section.label}
                  </h4>
                )}
                <ReadOnlyBlockNoteView blocks={section.blocks} />
              </div>
            ))}

            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Linked Entities
                </h4>
                {outgoing.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No links yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {outgoing.map((link) => {
                      const metadata = link.metadata as { label?: string } | undefined;
                      return (
                        <li key={link.id}>
                          <button
                            type="button"
                            onClick={() => onOpenTarget(link.targetType, link.targetId)}
                            className="text-left text-sm text-emerald-700 hover:underline cursor-pointer truncate"
                          >
                            {metadata?.label ?? `${link.targetType}:${link.targetId}`}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Backlinks</h4>
                {incoming.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nothing links here yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {incoming.map((link) => {
                      const metadata = link.metadata as { sourceLabel?: string } | undefined;
                      return (
                        <li key={link.id}>
                          <button
                            type="button"
                            onClick={() => onOpenTarget(link.sourceType, link.sourceId)}
                            className="text-left text-sm text-emerald-700 hover:underline cursor-pointer truncate"
                          >
                            {metadata?.sourceLabel ?? `${link.sourceType}:${link.sourceId}`}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </EntityReferenceLinkingContext.Provider>
  );
};
