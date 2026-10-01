import { describe, expect, it } from 'vitest';
import {
  buildSessionBriefing,
  getNoteConfidence,
  groupMemoryByCharacter,
  isSessionBriefingEmpty,
  selectActiveMemoryNotes,
  selectActiveThreads,
  withConfidence,
} from './plannerMemory';
import { makeEntityLink, makeNote, makeThread } from '../test/fixtures';

describe('selectActiveMemoryNotes', () => {
  it('keeps only memory-typed Notes', () => {
    const theory = makeNote({ id: 'n1', type: 'Player Theory' });
    const general = makeNote({ id: 'n2', type: 'General' });
    const untyped = makeNote({ id: 'n3', type: null });

    expect(selectActiveMemoryNotes([theory, general, untyped])).toEqual([theory]);
  });

  it('excludes memory Notes marked Resolved or Archived, case/whitespace-insensitively', () => {
    const resolved = makeNote({ id: 'n1', type: 'Unresolved Question', status: ' Resolved ' });
    const archived = makeNote({ id: 'n2', type: 'Unresolved Question', status: 'archived' });
    const open = makeNote({ id: 'n3', type: 'Unresolved Question', status: 'Open' });
    const unset = makeNote({ id: 'n4', type: 'Unresolved Question', status: null });

    const result = selectActiveMemoryNotes([resolved, archived, open, unset]);
    expect(result).toEqual([open, unset]);
  });
});

describe('selectActiveThreads', () => {
  it('keeps Threads with status Open or unset, excludes everything else', () => {
    const open = makeThread({ id: 't1', status: 'Open' });
    const unset = makeThread({ id: 't2', status: null });
    const resolved = makeThread({ id: 't3', status: 'Resolved' });
    const abandoned = makeThread({ id: 't4', status: 'Abandoned' });

    expect(selectActiveThreads([open, unset, resolved, abandoned])).toEqual([open, unset]);
  });
});

describe('buildSessionBriefing', () => {
  it('groups active memory Notes by type and active Threads, excluding resolved/irrelevant rows', () => {
    const theory = makeNote({ id: 'n1', type: 'Player Theory', title: 'Theory' });
    const interest = makeNote({ id: 'n2', type: 'Player Interest', title: 'Interest' });
    const goal = makeNote({ id: 'n3', type: 'Character Goal', title: 'Goal' });
    const attachment = makeNote({ id: 'n4', type: 'NPC Attachment', title: 'Attachment' });
    const question = makeNote({ id: 'n5', type: 'Unresolved Question', title: 'Question' });
    const resolvedTheory = makeNote({ id: 'n6', type: 'Player Theory', title: 'Resolved Theory', status: 'Resolved' });
    const generalNote = makeNote({ id: 'n7', type: 'General', title: 'Not memory' });
    const openThread = makeThread({ id: 't1', name: 'Open Thread', status: 'Open' });
    const resolvedThread = makeThread({ id: 't2', name: 'Resolved Thread', status: 'Resolved' });

    const briefing = buildSessionBriefing(
      [theory, interest, goal, attachment, question, resolvedTheory, generalNote],
      [openThread, resolvedThread]
    );

    expect(briefing).toEqual({
      playerTheories: [theory],
      playerInterests: [interest],
      characterGoals: [goal],
      npcAttachments: [attachment],
      unresolvedQuestions: [question],
      playerPreferences: [],
      activeThreads: [openThread],
    });
  });

  it('returns empty groups, not an error, given no data', () => {
    expect(buildSessionBriefing([], [])).toEqual({
      playerTheories: [],
      playerInterests: [],
      characterGoals: [],
      npcAttachments: [],
      unresolvedQuestions: [],
      playerPreferences: [],
      activeThreads: [],
    });
  });

  it('groups Player Preference notes into their own bucket', () => {
    const preference = makeNote({ id: 'n1', type: 'Player Preference', title: 'Likes tactical combat' });
    const briefing = buildSessionBriefing([preference], []);
    expect(briefing.playerPreferences).toEqual([preference]);
  });
});

describe('getNoteConfidence / withConfidence', () => {
  it('reads a confidence tag off an otherwise plain tag list', () => {
    expect(getNoteConfidence(makeNote({ tags: ['ebon-sigil', 'confidence:proposed', 'pandemonium'] }))).toBe('proposed');
  });

  it('returns null when no confidence tag is present, or the value is unrecognized', () => {
    expect(getNoteConfidence(makeNote({ tags: ['ebon-sigil'] }))).toBeNull();
    expect(getNoteConfidence(makeNote({ tags: ['confidence:certain'] }))).toBeNull();
  });

  it('sets a confidence tag without disturbing other tags', () => {
    expect(withConfidence(['ebon-sigil'], 'observed')).toEqual(['ebon-sigil', 'confidence:observed']);
  });

  it('replaces an existing confidence tag rather than appending a second one', () => {
    expect(withConfidence(['ebon-sigil', 'confidence:proposed'], 'observed')).toEqual(['ebon-sigil', 'confidence:observed']);
  });

  it('clears the confidence tag when given null', () => {
    expect(withConfidence(['ebon-sigil', 'confidence:proposed'], null)).toEqual(['ebon-sigil']);
  });
});

describe('isSessionBriefingEmpty', () => {
  it('is true when every group is empty', () => {
    expect(isSessionBriefingEmpty(buildSessionBriefing([], []))).toBe(true);
  });

  it('is false as soon as any single group has an item', () => {
    const theory = makeNote({ id: 'n1', type: 'Player Theory' });
    expect(isSessionBriefingEmpty(buildSessionBriefing([theory], []))).toBe(false);

    const openThread = makeThread({ id: 't1', status: 'Open' });
    expect(isSessionBriefingEmpty(buildSessionBriefing([], [openThread]))).toBe(false);
  });
});

describe('groupMemoryByCharacter', () => {
  it('groups active memory Notes by the host character each is linked to', () => {
    const theory = makeNote({ id: 'n1', type: 'Player Theory', title: 'Theory' });
    const goal = makeNote({ id: 'n2', type: 'Character Goal', title: 'Goal' });
    const unlinked = makeNote({ id: 'n3', type: 'Player Interest', title: 'Unlinked interest' });
    const link1 = makeEntityLink({
      id: 'link-1',
      sourceType: 'note',
      sourceId: 'n1',
      targetType: 'character',
      targetId: 'char-1',
    });
    const link2 = makeEntityLink({
      id: 'link-2',
      sourceType: 'note',
      sourceId: 'n2',
      targetType: 'character',
      targetId: 'char-1',
    });

    const result = groupMemoryByCharacter([theory, goal, unlinked], [link1, link2]);

    expect(result.get('char-1')).toEqual([theory, goal]);
    expect(result.size).toBe(1);
  });

  it('excludes resolved/inactive Notes and Notes with no character link', () => {
    const resolved = makeNote({ id: 'n1', type: 'Player Theory', status: 'Resolved' });
    const link = makeEntityLink({ sourceType: 'note', sourceId: 'n1', targetType: 'character', targetId: 'char-1' });

    expect(groupMemoryByCharacter([resolved], [link]).size).toBe(0);
  });
});
