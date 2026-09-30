import { describe, expect, it } from 'vitest';
import type { PartialBlock } from '@blocknote/core';
import { NOTE_TYPE_TEMPLATES } from './noteTypeTemplates';

function headingTexts(blocks: PartialBlock[]): string[] {
  return blocks
    .filter((b) => b.type === 'heading')
    .map((b) => (b.content as Array<{ text: string }>)?.map((c) => c.text).join('') ?? '');
}

describe('NOTE_TYPE_TEMPLATES', () => {
  it("ships a Session Safety template with Rating/Lines/Veils/Tools/Concerns/Boundaries", () => {
    const template = NOTE_TYPE_TEMPLATES['Session Safety'];
    expect(template).toBeDefined();
    expect(headingTexts(template!)).toEqual([
      'Rating',
      'Lines',
      'Veils',
      'Tools',
      'Session-Specific Concerns',
      'Active Boundaries',
    ]);
  });

  it('ships the Tools heading as real checkListItem blocks', () => {
    const toolsHeading = NOTE_TYPE_TEMPLATES['Session Safety']!.find(
      (b) => b.type === 'heading' && (b.content as Array<{ text: string }>)?.[0]?.text === 'Tools'
    );
    const items = (toolsHeading!.children as PartialBlock[]).map((b) => b.type);
    expect(items).toEqual(['checkListItem', 'checkListItem', 'checkListItem', 'checkListItem', 'checkListItem']);
  });

  it('ships a Player Contribution template with the Accept → Develop prompt', () => {
    const template = NOTE_TYPE_TEMPLATES['Player Contribution'];
    expect(template).toBeDefined();
    expect(headingTexts(template!)).toEqual(['Player Proposal', 'Accept → Develop']);
  });

  it('has no entry for an unrecognized type', () => {
    expect(NOTE_TYPE_TEMPLATES['General']).toBeUndefined();
  });
});
