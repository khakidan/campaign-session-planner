import { describe, expect, it } from 'vitest';
import {
  buildSafetyEventTags,
  getSafetyEventSessionId,
  getSafetyEventTool,
  getSafetyEventTriggeredBy,
} from './safetyEvents';

describe('buildSafetyEventTags / getSafetyEventTool / getSafetyEventSessionId / getSafetyEventTriggeredBy', () => {
  it('round-trips tool and session id with no triggeredBy', () => {
    const tags = buildSafetyEventTags('X-Card', 'session-1');
    expect(getSafetyEventTool({ tags })).toBe('X-Card');
    expect(getSafetyEventSessionId({ tags })).toBe('session-1');
    expect(getSafetyEventTriggeredBy({ tags })).toBeNull();
  });

  it('round-trips triggeredBy when supplied', () => {
    const tags = buildSafetyEventTags('Pause', 'session-1', 'Alice');
    expect(getSafetyEventTriggeredBy({ tags })).toBe('Alice');
  });

  it('returns null for every getter on a Note with unrelated tags', () => {
    const tags = ['ebon-sigil', 'confidence:proposed'];
    expect(getSafetyEventTool({ tags })).toBeNull();
    expect(getSafetyEventSessionId({ tags })).toBeNull();
    expect(getSafetyEventTriggeredBy({ tags })).toBeNull();
  });
});
