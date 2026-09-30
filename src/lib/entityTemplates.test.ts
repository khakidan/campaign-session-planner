import { describe, expect, it } from 'vitest';
import type { PartialBlock } from '@blocknote/core';
import { TEMPLATE_DEFAULTS, TEMPLATE_LABELS, noteTemplate } from './entityTemplates';
import type { TemplateEntityKind } from '../types';

const KINDS: TemplateEntityKind[] = [
  'npc',
  'group',
  'location',
  'session',
  'sessionDebrief',
  'scene',
  'storyline',
  'thread',
  'quest',
  'event',
];

function headingTexts(blocks: PartialBlock[]): string[] {
  return blocks
    .filter((b) => b.type === 'heading')
    .map((b) => (b.content as Array<{ text: string }>)?.map((c) => c.text).join('') ?? '');
}

describe('TEMPLATE_DEFAULTS', () => {
  it('ships exactly one template for every TemplateEntityKind', () => {
    expect(Object.keys(TEMPLATE_DEFAULTS).sort()).toEqual([...KINDS].sort());
  });

  it('gives every kind a non-empty template with at least one heading', () => {
    for (const kind of KINDS) {
      const template = TEMPLATE_DEFAULTS[kind];
      expect(template.length).toBeGreaterThan(0);
      expect(headingTexts(template).length).toBeGreaterThan(0);
    }
  });

  it('makes every top-level heading a collapsed, toggleable heading (Slice 4.2f contract)', () => {
    for (const kind of KINDS) {
      for (const block of TEMPLATE_DEFAULTS[kind]) {
        expect(block.type).toBe('heading');
        expect(block.props).toMatchObject({ level: 3, isToggleable: true });
      }
    }
  });

  it('has a display label for every kind, matching TEMPLATE_DEFAULTS keys exactly', () => {
    expect(Object.keys(TEMPLATE_LABELS).sort()).toEqual(Object.keys(TEMPLATE_DEFAULTS).sort());
  });

  it('includes the key headings for the NPC template', () => {
    expect(headingTexts(TEMPLATE_DEFAULTS.npc)).toEqual(
      expect.arrayContaining(['Identity', 'Motivation & Goals', 'Knowledge', 'Secrets'])
    );
  });

  it('includes link-out sections (not free-text prose) for relationship-style headings', () => {
    const affiliations = TEMPLATE_DEFAULTS.npc.find(
      (b) => (b.content as Array<{ text: string }>)?.[0]?.text === 'Affiliations'
    );
    const guidance = (affiliations?.children as PartialBlock[])?.[0]?.content as Array<{ text: string }>;
    expect(guidance?.[0]?.text).toMatch(/Add Link/);
  });
});

describe('noteTemplate', () => {
  it('is deliberately empty — Note has no shipped starter template', () => {
    expect(noteTemplate).toEqual([]);
  });
});
