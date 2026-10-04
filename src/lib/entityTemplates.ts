import type { PartialBlock } from '@blocknote/core';
import type { TemplateEntityKind } from '../types';

/**
 * Slice 4.2f — one starter template per entity kind, a direct,
 * mechanical transcription of that entity's own bullet list from
 * `docs/markdown/campaign_session_notes_app.md`'s "Entity model"
 * section — not invented wording. Rules applied consistently across
 * every entity:
 *  - A bullet already covered by a real property column (Name/Title,
 *    Type, Status, Priority, Date, Location's Parent, Session's
 *    Number) is dropped — it's the properties row, not the document.
 *  - A colon-grouped bullet ("Personality: Demeanor, Quirks, ...")
 *    becomes one heading with the sub-items listed in a guidance
 *    paragraph underneath, not separate headings per sub-item.
 *  - A bullet that's a list of *other entities* (Affiliations,
 *    Relationships, Connections, Campaign Context/Activity,
 *    Anticipated Content, Participants, People & Places, Related
 *    Storylines/Threads, and similar) gets a heading whose guidance
 *    paragraph points at "Add Link"/`[[`/`@` instead of inviting
 *    typed prose — consistent with how every editor's own doc comment
 *    already treats these sections since 4.2c/4.2d.
 *  - Session's "Scenes: planned scenes, scene order" bullet is
 *    dropped entirely — it's the real Scenes sub-section UI
 *    (`SessionEditor.tsx`), not a document heading.
 *  - Every section is a real *toggle heading* (`props.isToggleable:
 *    true`, its guidance paragraph nested as the heading's own
 *    `children`, not a flat sibling) — collapsed by default, so a
 *    freshly-templated document reads as a clean, scannable outline
 *    the GM expands section by section rather than a wall of guidance
 *    text. This was discovered live, not designed in from the start:
 *    `editor.replaceBlocks` was already silently promoting a flat
 *    `[heading, paragraph]` pair into exactly this nested,
 *    `isToggleable: true` shape on its own (confirmed by dumping a
 *    saved document's real JSON) — building it explicitly here removes
 *    the dependency on that undocumented auto-promotion behavior.
 */

/** Exported — Phase 2's `noteTypeTemplates.ts` (per-`Note.type` starter
 * content, e.g. Session Safety) builds on these same primitives rather
 * than duplicating them. */
export function heading(text: string, children: PartialBlock[] = []): PartialBlock {
  return {
    type: 'heading',
    props: { level: 3, isToggleable: true },
    content: [{ type: 'text', text, styles: {} }],
    children,
  };
}

export function para(text = ''): PartialBlock {
  return { type: 'paragraph', content: text ? [{ type: 'text', text, styles: {} }] : [] };
}

export function section(title: string, subItems = ''): PartialBlock[] {
  return [heading(title, [para(subItems)])];
}

export function linkSection(title: string, what: string): PartialBlock[] {
  return [heading(title, [para(`Link ${what} via "Add Link," or by typing [[ or @ below.`)])];
}

/** A single `checkListItem` block — unchecked by default (`checked`
 * defaults to `false` in `@blocknote/core`'s own block config, so it's
 * left out of `props` here). */
export function checkItem(text: string): PartialBlock {
  return { type: 'checkListItem', content: [{ type: 'text', text, styles: {} }] };
}

/** Phase 2 item 1 (Complication Bank) — a toggle heading whose children
 * are real, tickable checklist items instead of a guidance paragraph,
 * for prompt lists a GM ticks off during/after use rather than just
 * reads. */
export function checklistSection(title: string, items: string[]): PartialBlock[] {
  return [heading(title, items.map(checkItem))];
}

/** Phase 2 item 9 (Player-created canon) — the GM Canon / Player Canon
 * / Shared Canon three-way split, for the entity kinds most likely to
 * accumulate both GM-authored and player-authored facts over a
 * campaign's life (Location/NPC/Group). Each is its own toggle heading,
 * not one heading with three guidance lines, so a GM can expand just
 * the one they're adding to. */
function canonSections(): PartialBlock[] {
  return [
    ...section('GM Canon', 'Things you established.'),
    ...section('Player Canon', 'Things players established during play.'),
    ...section('Shared Canon', 'Things established collaboratively.'),
  ];
}

export const noteTemplate: PartialBlock[] = [];
// Note's own doc entry lists only "Content (block-editor document)" —
// no further sub-breakdown to transcribe, unlike every other entity.
// No starter template is offered for Note; a GM writes it freely from
// an empty document, same as before this slice.

export const npcTemplate: PartialBlock[] = [
  ...section('Identity', 'Aliases/Titles, Ancestry/Species, Age, Pronouns, Occupation'),
  ...linkSection('Affiliations', 'Groups, Factions, and Organizations'),
  ...section('Appearance'),
  ...section('Personality', 'Demeanor, Quirks, Traits, Values, Fears, Flaws'),
  ...section('Motivation & Goals', 'Motivation, Primary Goal, Secondary Goals, Will Do, Will Not Do'),
  ...section('Knowledge', "Knows, Believes, Doesn't Know, False Beliefs"),
  ...linkSection('Relationships', 'other NPCs, Groups, or Factions'),
  ...section('History'),
  ...section('Current Situation'),
  ...section('Current Pressure', "What's bearing on this NPC right now?"),
  ...section('Player Connection', 'How do the players relate to this NPC?'),
  ...section('Roleplaying', 'Voice, Mannerisms, How to Roleplay'),
  ...section('Tactics', 'Combat Approach, Social Approach'),
  ...section('Secrets'),
  ...canonSections(),
  ...section('Campaign Role'),
];

export const groupTemplate: PartialBlock[] = [
  ...section('Identity', 'Description'),
  ...section('Ideology', 'Beliefs, Values, Culture'),
  ...section('Goals', 'Primary Goal, Secondary Goals'),
  ...section('Leadership'),
  ...section('Membership', 'Important Members, General Membership'),
  ...section('Resources', 'Wealth, Influence, Military Power, Information, Territory'),
  ...section('Methods'),
  ...linkSection('Relationships', 'Allies, Rivals, Enemies, and Subordinates'),
  ...section('Reputation'),
  ...section('Current Activity'),
  ...section('Internal Conflicts'),
  ...section('Secrets'),
  ...canonSections(),
  ...section('Campaign Role'),
];

export const locationTemplate: PartialBlock[] = [
  ...section('Description, Appearance, Atmosphere & Features'),
  ...section('Inhabitants'),
  ...section('History'),
  ...section('Current State'),
  ...section('Access'),
  ...section('Resources'),
  ...section('Secrets'),
  ...canonSections(),
  ...linkSection('Campaign Activity', 'related Encounters, Events, Quests, Storylines, and Threads'),
  ...linkSection('Connected Locations', 'nearby or related Locations'),
];

/** Phase 2 item 1 — the proposal's 10 "story accelerator" prompts, as
 * real tickable checklist items rather than a paragraph of guidance a
 * GM has to remember exists. */
const COMPLICATION_BANK_ITEMS = [
  'An NPC arrives unexpectedly.',
  'An old thread resurfaces.',
  "Someone misinterprets the party's actions.",
  'A faction makes a move.',
  'The environment changes.',
  'A useful resource becomes dangerous.',
  'An NPC asks for a favor.',
  'A player-created detail becomes relevant.',
  'A previous consequence catches up.',
  "A secret is revealed—but not the one the players expected.",
];

export const sessionTemplate: PartialBlock[] = [
  ...section('Overview', 'Summary, Objectives, Preparation'),
  ...linkSection('Campaign Context', 'the active Storylines, Threads, and Quests for this session'),
  ...linkSection('Anticipated Content', 'the NPCs, Locations, Factions, Encounters, Items, and Events expected this session'),
  ...linkSection('Player Hooks', 'the active memory Notes (Player Theories, Character Goals, ...) this session could follow up on'),
  ...section('GM Materials', 'Secrets, Read-Alouds, Rules References, Maps/Images, Music/Atmosphere'),
  ...checklistSection('Complication Bank', COMPLICATION_BANK_ITEMS),
  ...section('Running Notes'),
  ...section('Outcomes', 'What Happened? What Changed? What Was Resolved? What Was Introduced?'),
];

export const sessionDebriefTemplate: PartialBlock[] = [
  ...section('New Information'),
  ...section('Things to Remember'),
  ...section('Things Players Were Excited About'),
  ...section('Things Players Disengaged From'),
  ...checklistSection('Session Pulse', [
    'Combat',
    'Exploration',
    'Social Interaction',
    'Character Development',
    'Mystery',
    'Worldbuilding',
    'Comedy',
  ]),
  ...section('Campaign Updates'),
  // ROADMAP.md's "Session recap as an output" — everything above is
  // GM-only and can mix in secrets, so the shareable, player-facing
  // recap deliberately isn't built from this document. Pointed at its
  // own separate convention instead of a document heading here.
  ...linkSection(
    'Recap Highlights (Player-Facing)',
    'one or more Notes of type "Recap Highlight" (create them from the Notes tab first, written for players)'
  ),
];

export const sceneTemplate: PartialBlock[] = [
  ...section('Situation', 'Location, Purpose, Setup'),
  ...section('Priority', 'CORE / SUPPORTING / OPTIONAL'),
  ...section('Time Budget', 'A rough estimate, e.g. "15 min" — how much of the session this scene is worth.'),
  ...linkSection('Participants', 'the PCs, NPCs, Factions, and Creatures involved'),
  ...section(
    'Scene Truth',
    'One thing the GM establishes as true when the scene begins — then invite players to add supporting detail ("Paint the Scene").'
  ),
  ...section(
    'Player Prompts',
    'What detail tells you this place was once important? What does your character notice or remember here? Who recognizes something here, and how?'
  ),
  ...checklistSection('Collaboration Opportunity', [
    'Different information',
    'Complementary abilities',
    'Social disagreement',
    'Shared objective',
    'Resource tradeoff',
    'Character relationship',
    'Combined creative solution',
  ]),
  ...section(
    'GM Guidance',
    'GM Intent, Secrets, Key Information, Possible Developments. Not everything needs an answer yet — it\'s fine to leave what happens next unknown and react to the players.'
  ),
  ...section('Player Context', 'Player Goals, Known Information'),
  ...section('Challenge', 'Opposition, Complications — link the Encounter via "Add Link."'),
  ...section(
    'Pacing',
    'If short on time: KEEP / CUT / COMPRESS. If players are engaged: EXPAND / FOLLOW PLAYERS. If players disengage: MOVE ON.'
  ),
  ...section('Outcomes', 'What Happened?, Consequences'),
  ...linkSection('Campaign Connections', 'related Storylines, Threads, Quests, and Events'),
];

export const storylineTemplate: PartialBlock[] = [
  ...section('Premise, Central Conflict & Stakeholders'),
  ...section('Goals', 'Player Goals, Antagonist Goals, Other Stakeholder Goals'),
  ...section('Current State & Player Involvement'),
  ...section('Progression', 'Beginning, Current Development, Possible Future Developments'),
  ...section('Milestones & Possible Outcomes'),
  ...linkSection('Active Threads & Quests', 'the Threads and Quests this storyline is driving'),
  ...linkSection('Important People & Places', 'the NPCs, Groups, and Locations central to this storyline'),
  ...section('History', 'Session History'),
  ...section('Secrets'),
  ...section('Player Contributions'),
];

export const threadTemplate: PartialBlock[] = [
  ...section('The Unresolved Element', 'Question/Problem/Possibility, Description'),
  ...section('Origin', 'How It Started — link the originating Session via "Add Link."'),
  ...section('Current State', 'Pressure (Low/Medium/High), Player Investment (Low/Medium/High)'),
  ...section('Player Knowledge', "What Players Know, What Players Don't Know"),
  ...section('Possible Developments'),
  ...section('Resolution', 'How It Could Resolve, Actual Resolution — link the resolving Session via "Add Link."'),
  ...linkSection('Connections', 'related Storylines, Quests, NPCs, Factions, Locations, Events, and Sessions'),
];

export const questTemplate: PartialBlock[] = [
  ...section('Objective, Description, Quest Giver & Motivation'),
  ...section('Requirements, Steps, Obstacles & Time Pressure'),
  ...section('Current State'),
  ...section('Rewards & Consequences'),
  ...linkSection('Related Storylines & Threads', 'the Storylines and Threads this quest connects to'),
  ...linkSection('People, Places & Encounters', 'the NPCs, Locations, and Encounters involved'),
  ...section('Session History'),
  ...section('Player Contributions'),
];

export const eventTemplate: PartialBlock[] = [
  ...section('Location, Description & Cause'),
  ...linkSection('Participants', 'the NPCs, Factions, or Groups involved'),
  ...section('What Happens', 'Event Sequence'),
  ...section('Player Involvement & If Ignored'),
  ...section('Outcomes', 'Possible Outcomes, Actual Outcome, Consequences'),
  ...section('Campaign Impact'),
  ...linkSection('Connections', 'related Storylines, Threads, Quests, NPCs, Factions, Locations, and Sessions'),
  ...section('Player Contributions'),
];

/** Slice 4.2f — the shipped default per `TemplateEntityKind`, keyed the
 * same way `PlannerTemplate.entityKind` and the `/campaign-planner/
 * templates/:entityKind` route are — the fallback the Template
 * Settings panel and every editor use whenever a campaign has no saved
 * override for that kind yet. */
export const TEMPLATE_DEFAULTS: Record<TemplateEntityKind, PartialBlock[]> = {
  npc: npcTemplate,
  group: groupTemplate,
  location: locationTemplate,
  session: sessionTemplate,
  sessionDebrief: sessionDebriefTemplate,
  scene: sceneTemplate,
  storyline: storylineTemplate,
  thread: threadTemplate,
  quest: questTemplate,
  event: eventTemplate,
};

/** Display labels for the Template Settings panel. */
export const TEMPLATE_LABELS: Record<TemplateEntityKind, string> = {
  npc: 'NPC',
  group: 'Group',
  location: 'Location',
  session: 'Session',
  sessionDebrief: 'Session Debrief',
  scene: 'Scene',
  storyline: 'Storyline',
  thread: 'Thread',
  quest: 'Quest',
  event: 'Event',
};
