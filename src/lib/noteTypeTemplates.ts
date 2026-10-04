import type { PartialBlock } from '@blocknote/core';
import { checklistSection, heading, para, section } from './entityTemplates';
import { RECAP_HIGHLIGHT_TYPE } from './sessionRecap';

/**
 * Phase 2 item 7 — the mechanism items 8 (Session Safety) and 6
 * (Player Contribution) both need: `TEMPLATE_DEFAULTS` ships one
 * template per `TemplateEntityKind`, and `Note` deliberately has none
 * (a generic Note has no fixed shape). These two ideas instead want a
 * *specific* `Note.type` to come with its own starter content — keyed
 * by the exact suggested `type` string, not a `TemplateEntityKind`, so
 * this is a parallel, smaller mechanism rather than an extension of
 * `TEMPLATE_DEFAULTS`.
 */
export const NOTE_TYPE_TEMPLATES: Partial<Record<string, PartialBlock[]>> = {
  /** Phase 2 item 8 — durable, table-wide context a GM writes once and
   * revisits, not per-Session content (hence a Note, not a new
   * entity/field — see ROADMAP.md's rationale). */
  'Session Safety': [
    ...section('Rating', 'PG / PG-13 / R / etc.'),
    ...section('Lines', 'Topics not to include.'),
    ...section('Veils', 'Topics allowed but not explicitly described.'),
    ...checklistSection('Tools', ['X-Card', 'Pause', 'Rewind', 'Fast Forward', 'Resume']),
    ...section('Session-Specific Concerns'),
    ...section('Active Boundaries'),
  ],

  /** Phase 2 item 6 — the proposal's "Yes, and..." chain: a player's
   * proposed idea, developed by the GM's own "And..." follow-ups
   * written straight into the same document as the conversation
   * develops. No new mechanism beyond a freeform BlockNote document
   * with `[[`/`@` linking (already built) — this is just the prompt a
   * GM sees instead of a blank page. */
  'Player Contribution': [
    heading('Player Proposal', [para('What did a player propose or ask to do?')]),
    heading('Accept → Develop', [
      para(
        'Existing NPC connection? Existing faction connection? New NPC? Cost? Complication? Future thread? Write each "And..." follow-up as it develops.'
      ),
    ]),
  ],

  /** ROADMAP.md's "Session recap as an output" — the deliberately
   * player-facing counterpart to the Debrief (which is GM-only and can
   * mix in secrets). Link one of these to a Session and it appears in
   * that Session's `SessionRecapView`. */
  [RECAP_HIGHLIGHT_TYPE]: [
    para('In a sentence or two, what will the players remember from this session?'),
  ],
};
