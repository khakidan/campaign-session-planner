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

function heading(text: string, children: PartialBlock[] = []): PartialBlock {
  return {
    type: 'heading',
    props: { level: 3, isToggleable: true },
    content: [{ type: 'text', text, styles: {} }],
    children,
  };
}

function para(text = ''): PartialBlock {
  return { type: 'paragraph', content: text ? [{ type: 'text', text, styles: {} }] : [] };
}

function section(title: string, subItems = ''): PartialBlock[] {
  return [heading(title, [para(subItems)])];
}

function linkSection(title: string, what: string): PartialBlock[] {
  return [heading(title, [para(`Link ${what} via "Add Link," or by typing [[ or @ below.`)])];
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
  ...section('Motivation & Goals', 'Motivation, Primary Goal, Secondary Goals'),
  ...section('Knowledge', "Knows, Believes, Doesn't Know, False Beliefs"),
  ...linkSection('Relationships', 'other NPCs, Groups, or Factions'),
  ...section('History'),
  ...section('Current Situation'),
  ...section('Roleplaying', 'Voice, Mannerisms, How to Roleplay'),
  ...section('Tactics', 'Combat Approach, Social Approach'),
  ...section('Secrets'),
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
  ...linkSection('Campaign Activity', 'related Encounters, Events, Quests, Storylines, and Threads'),
  ...linkSection('Connected Locations', 'nearby or related Locations'),
];

export const sessionTemplate: PartialBlock[] = [
  ...section('Overview', 'Summary, Objectives, Preparation'),
  ...linkSection('Campaign Context', 'the active Storylines, Threads, and Quests for this session'),
  ...linkSection('Anticipated Content', 'the NPCs, Locations, Factions, Encounters, Items, and Events expected this session'),
  ...section('GM Materials', 'Secrets, Read-Alouds, Rules References, Maps/Images, Music/Atmosphere'),
  ...section('Running Notes'),
  ...section('Outcomes', 'What Happened? What Changed? What Was Resolved? What Was Introduced?'),
];

export const sessionDebriefTemplate: PartialBlock[] = [
  ...section('New Information'),
  ...section('Things to Remember'),
  ...section('Campaign Updates'),
];

export const sceneTemplate: PartialBlock[] = [
  ...section('Situation', 'Location, Purpose, Setup'),
  ...linkSection('Participants', 'the PCs, NPCs, Factions, and Creatures involved'),
  ...section('GM Guidance', 'GM Intent, Secrets, Key Information, Possible Developments'),
  ...section('Player Context', 'Player Goals, Known Information'),
  ...section('Challenge', 'Opposition, Complications — link the Encounter via "Add Link."'),
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
];

export const threadTemplate: PartialBlock[] = [
  ...section('The Unresolved Element', 'Question/Problem/Possibility, Description'),
  ...section('Origin', 'How It Started — link the originating Session via "Add Link."'),
  ...section('Current State'),
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
];

export const eventTemplate: PartialBlock[] = [
  ...section('Location, Description & Cause'),
  ...linkSection('Participants', 'the NPCs, Factions, or Groups involved'),
  ...section('What Happens', 'Event Sequence'),
  ...section('Player Involvement & If Ignored'),
  ...section('Outcomes', 'Possible Outcomes, Actual Outcome, Consequences'),
  ...section('Campaign Impact'),
  ...linkSection('Connections', 'related Storylines, Threads, Quests, NPCs, Factions, Locations, and Sessions'),
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
