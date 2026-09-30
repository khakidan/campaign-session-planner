import { describe, expect, it } from 'vitest';
import { buildSessionBriefing, selectActiveMemoryNotes, selectActiveThreads } from './plannerMemory';
import { makeNote, makeThread } from '../test/fixtures';

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
      activeThreads: [],
    });
  });
});
