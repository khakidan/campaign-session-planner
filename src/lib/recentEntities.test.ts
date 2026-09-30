import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadRecents, pushRecent } from './recentEntities';
import type { PlannerSearchItem } from '../components/EntityLinkPicker';

const note = (id: string, label: string): PlannerSearchItem => ({ type: 'note', id, label });

describe('recentEntities', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts empty when nothing has been pushed', () => {
    expect(loadRecents()).toEqual([]);
  });

  it('returns a pushed item on the next load', () => {
    pushRecent(note('note-1', 'A Secret'));
    expect(loadRecents()).toEqual([note('note-1', 'A Secret')]);
  });

  it('puts the most recently pushed item first', () => {
    pushRecent(note('note-1', 'First'));
    pushRecent(note('note-2', 'Second'));
    expect(loadRecents()).toEqual([note('note-2', 'Second'), note('note-1', 'First')]);
  });

  it('de-duplicates by type+id, moving the re-pushed item back to the front instead of listing it twice', () => {
    pushRecent(note('note-1', 'First'));
    pushRecent(note('note-2', 'Second'));
    pushRecent(note('note-1', 'First (renamed)'));
    expect(loadRecents()).toEqual([note('note-1', 'First (renamed)'), note('note-2', 'Second')]);
  });

  it('caps the list at 8 entries, dropping the oldest', () => {
    for (let i = 0; i < 10; i++) {
      pushRecent(note(`note-${i}`, `Note ${i}`));
    }
    const recents = loadRecents();
    expect(recents).toHaveLength(8);
    expect(recents[0]).toEqual(note('note-9', 'Note 9'));
    expect(recents.find((r) => r.id === 'note-0')).toBeUndefined();
    expect(recents.find((r) => r.id === 'note-1')).toBeUndefined();
  });

  it('returns an empty array instead of throwing when storage holds malformed JSON', () => {
    window.localStorage.setItem('campaign-planner:quick-reference-recents', '{not json');
    expect(loadRecents()).toEqual([]);
  });

  it('returns an empty array when storage holds a non-array value', () => {
    window.localStorage.setItem('campaign-planner:quick-reference-recents', JSON.stringify({ not: 'an array' }));
    expect(loadRecents()).toEqual([]);
  });

  it('filters out malformed entries that are missing required fields', () => {
    window.localStorage.setItem(
      'campaign-planner:quick-reference-recents',
      JSON.stringify([{ type: 'note', id: 'note-1', label: 'Good' }, { type: 'note' }, null])
    );
    expect(loadRecents()).toEqual([note('note-1', 'Good')]);
  });

  it('swallows a storage write error instead of throwing, so opening an entity never breaks', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => pushRecent(note('note-1', 'First'))).not.toThrow();
    setItemSpy.mockRestore();
  });
});
