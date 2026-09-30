import { describe, expect, it } from 'vitest';
import { checkSessionReadiness } from './sessionReadiness';
import { makeEntityLink, makeScene } from '../test/fixtures';

describe('checkSessionReadiness', () => {
  it('reports every check unmet for a brand-new session with nothing prepared', () => {
    expect(checkSessionReadiness([], [])).toEqual([
      { label: 'Session has at least one Scene', met: false },
      { label: 'At least one active Thread or Quest is linked', met: false },
      { label: 'At least one NPC or Location is anticipated', met: false },
    ]);
  });

  it('marks the Scene check met once a Scene exists', () => {
    const scene = makeScene({ sessionId: 'session-1' });
    const result = checkSessionReadiness([scene], []);
    expect(result.find((c) => c.label.includes('Scene'))?.met).toBe(true);
  });

  it('marks the Thread/Quest and NPC/Location checks met from outgoing links', () => {
    const outgoingThread = makeEntityLink({ sourceType: 'session', sourceId: 'session-1', targetType: 'thread', targetId: 't1' });
    const outgoingNpc = makeEntityLink({ sourceType: 'session', sourceId: 'session-1', targetType: 'npc', targetId: 'npc-1' });

    const result = checkSessionReadiness([], [outgoingThread, outgoingNpc]);

    expect(result.find((c) => c.label.includes('Thread or Quest'))?.met).toBe(true);
    expect(result.find((c) => c.label.includes('NPC or Location'))?.met).toBe(true);
  });

  it('ignores links to unrelated target types', () => {
    const eventLink = makeEntityLink({ sourceType: 'session', sourceId: 'session-1', targetType: 'event', targetId: 'e1' });
    const result = checkSessionReadiness([], [eventLink]);
    expect(result.find((c) => c.label.includes('Thread or Quest'))?.met).toBe(false);
    expect(result.find((c) => c.label.includes('NPC or Location'))?.met).toBe(false);
  });
});
