import { describe, expect, it } from 'vitest';
import { toBlocksValue } from './blockNoteUtils';

describe('toBlocksValue', () => {
  it('passes a real Block[] document through unchanged', () => {
    const blocks = [{ type: 'paragraph', content: [{ type: 'text', text: 'hello', styles: {} }] }];
    expect(toBlocksValue(blocks)).toBe(blocks);
  });

  it('returns an empty array for null', () => {
    expect(toBlocksValue(null)).toEqual([]);
  });

  it('returns an empty array for undefined', () => {
    expect(toBlocksValue(undefined)).toEqual([]);
  });

  it('wraps a plain non-empty string into a single paragraph', () => {
    expect(toBlocksValue('Some legacy text')).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'Some legacy text', styles: {} }] },
    ]);
  });

  it('returns an empty array for a blank string', () => {
    expect(toBlocksValue('   ')).toEqual([]);
  });

  it('synthesizes a heading+paragraph pair per non-empty field of a legacy flat details object', () => {
    const legacy = { primaryGoal: 'Protect the village', secondaryGoals: '', beliefs: 'The old gods are misunderstood' };
    const result = toBlocksValue(legacy);
    expect(result).toEqual([
      { type: 'heading', props: { level: 3 }, content: [{ type: 'text', text: 'Primary Goal', styles: {} }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Protect the village', styles: {} }] },
      { type: 'heading', props: { level: 3 }, content: [{ type: 'text', text: 'Beliefs', styles: {} }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'The old gods are misunderstood', styles: {} }] },
    ]);
  });

  it('drops empty/whitespace-only fields entirely from a legacy flat object', () => {
    expect(toBlocksValue({ empty: '', blank: '   ', alsoMissing: undefined })).toEqual([]);
  });

  it('returns an empty array for a number or boolean', () => {
    expect(toBlocksValue(42)).toEqual([]);
    expect(toBlocksValue(true)).toEqual([]);
  });
});
