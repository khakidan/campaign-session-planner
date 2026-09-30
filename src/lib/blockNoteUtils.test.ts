import { describe, expect, it } from 'vitest';
import { extractBlockText, toBlocksValue } from './blockNoteUtils';

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

describe('extractBlockText', () => {
  it('joins every text run across paragraphs into one string', () => {
    const blocks = [
      { type: 'paragraph', content: [{ type: 'text', text: 'The cult worships', styles: {} }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'a sunken god.', styles: {} }] },
    ];
    expect(extractBlockText(blocks)).toBe('The cult worships a sunken god.');
  });

  it('recurses into nested children blocks', () => {
    const blocks = [
      {
        type: 'heading',
        content: [{ type: 'text', text: 'Secrets', styles: {} }],
        children: [{ type: 'paragraph', content: [{ type: 'text', text: 'She is the Duke in disguise.', styles: {} }] }],
      },
    ];
    expect(extractBlockText(blocks)).toBe('Secrets She is the Duke in disguise.');
  });

  it('includes an entityReference inline node\'s label, which has no .text field', () => {
    const blocks = [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Ask', styles: {} },
          { type: 'entityReference', props: { refType: 'npc', refId: 'npc-1', refSource: 'planner', label: 'Sister Mariel' } },
          { type: 'text', text: 'about it.', styles: {} },
        ],
      },
    ];
    expect(extractBlockText(blocks)).toBe('Ask Sister Mariel about it.');
  });

  it('returns an empty string for null/undefined/non-array input', () => {
    expect(extractBlockText(null)).toBe('');
    expect(extractBlockText(undefined)).toBe('');
    expect(extractBlockText({ legacyField: 'text' })).toBe('');
  });

  it('returns an empty string for an empty document', () => {
    expect(extractBlockText([])).toBe('');
  });
});
