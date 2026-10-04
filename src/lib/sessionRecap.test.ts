import { describe, expect, it } from 'vitest';
import { RECAP_HIGHLIGHT_TYPE, selectSessionRecapHighlights } from './sessionRecap';
import { makeEntityLink, makeNote } from '../test/fixtures';

describe('selectSessionRecapHighlights', () => {
  it('keeps a Recap Highlight Note linked to the Session, note-as-source', () => {
    const note = makeNote({ id: 'note-1', type: RECAP_HIGHLIGHT_TYPE });
    const link = makeEntityLink({ sourceType: 'note', sourceId: 'note-1', targetType: 'session', targetId: 'session-1' });

    expect(selectSessionRecapHighlights([note], 'session-1', [link])).toEqual([note]);
  });

  it('keeps a Recap Highlight Note linked to the Session, session-as-source', () => {
    const note = makeNote({ id: 'note-1', type: RECAP_HIGHLIGHT_TYPE });
    const link = makeEntityLink({ sourceType: 'session', sourceId: 'session-1', targetType: 'note', targetId: 'note-1' });

    expect(selectSessionRecapHighlights([note], 'session-1', [link])).toEqual([note]);
  });

  it('excludes a Recap Highlight Note not linked to this Session', () => {
    const note = makeNote({ id: 'note-1', type: RECAP_HIGHLIGHT_TYPE });
    const link = makeEntityLink({ sourceType: 'note', sourceId: 'note-1', targetType: 'session', targetId: 'session-2' });

    expect(selectSessionRecapHighlights([note], 'session-1', [link])).toEqual([]);
  });

  it('excludes a Note of a different type even if linked to this Session', () => {
    const note = makeNote({ id: 'note-1', type: 'General' });
    const link = makeEntityLink({ sourceType: 'note', sourceId: 'note-1', targetType: 'session', targetId: 'session-1' });

    expect(selectSessionRecapHighlights([note], 'session-1', [link])).toEqual([]);
  });

  it('excludes a correctly-typed Note with no link to any Session', () => {
    const note = makeNote({ id: 'note-1', type: RECAP_HIGHLIGHT_TYPE });
    expect(selectSessionRecapHighlights([note], 'session-1', [])).toEqual([]);
  });
});
