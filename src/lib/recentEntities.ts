import type { PlannerSearchItem } from '../components/EntityLinkPicker';

const STORAGE_KEY = 'campaign-planner:quick-reference-recents';
const MAX_RECENTS = 8;

/**
 * Slice 4.2g — the Quick-reference Drawer's "recents" list. Personal,
 * per-browser convenience (which entity was I just looking at?), not
 * campaign data — deliberately `localStorage`-only rather than a new
 * DB table/route. Swallows every storage error (private-browsing mode,
 * quota, a corrupted value) so a GM's OS/browser quirks never break the
 * Drawer itself; worst case, recents just don't persist that session.
 */
export function loadRecents(): PlannerSearchItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PlannerSearchItem =>
        item && typeof item.type === 'string' && typeof item.id === 'string' && typeof item.label === 'string'
    );
  } catch {
    return [];
  }
}

export function pushRecent(item: PlannerSearchItem): void {
  try {
    const existing = loadRecents().filter((r) => !(r.type === item.type && r.id === item.id));
    const next = [item, ...existing].slice(0, MAX_RECENTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort — a GM's recents list is a convenience, never a
    // reason to interrupt opening the entity they actually clicked.
  }
}
