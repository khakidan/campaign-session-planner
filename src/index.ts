// Every component's color classes resolve through the CSS custom
// properties this defines (see theme.css's own doc comment) — imported
// here, at the one entry point every consumer already goes through, so
// a host gets the default palette for free and can override it without
// needing to know this file exists.
import './theme.css';

export { CampaignSessionPlanner } from './components/CampaignSessionPlanner';
export type {
  CampaignSessionPlannerProps,
  CampaignSessionPlannerNavProps,
  CampaignSessionPlannerRenderFields,
} from './components/CampaignSessionPlanner';
export { QuickReferenceDrawerProvider, useQuickReferenceDrawer } from './components/QuickReferenceDrawer';
export type { QuickReferenceDrawerProviderProps } from './components/QuickReferenceDrawer';
export { useNotes } from './hooks/useNotes';
export { useNpcs } from './hooks/useNpcs';
export { useGroups } from './hooks/useGroups';
export { useLocations } from './hooks/useLocations';
export { useSessions } from './hooks/useSessions';
export { useScenes } from './hooks/useScenes';
export { useStorylines } from './hooks/useStorylines';
export { useThreads } from './hooks/useThreads';
export { useQuests } from './hooks/useQuests';
export { useEvents } from './hooks/useEvents';
export { useEntityLinks } from './hooks/useEntityLinks';
export { useTemplates } from './hooks/useTemplates';
export { useSessionBriefing } from './hooks/useSessionBriefing';
export type { UseSessionBriefingResult, CharacterMemoryGroup } from './hooks/useSessionBriefing';
export { useCampaignChanges } from './hooks/useCampaignChanges';
export { SessionBriefingPanel } from './components/SessionBriefingPanel';
export type { SessionBriefingPanelProps } from './components/SessionBriefingPanel';
export { SessionReadinessChecklist } from './components/SessionReadinessChecklist';
export type { SessionReadinessChecklistProps } from './components/SessionReadinessChecklist';
export { CampaignChangesPanel } from './components/CampaignChangesPanel';
export type { CampaignChangesPanelProps } from './components/CampaignChangesPanel';
export { SessionSafetyControls, SAFETY_EVENT_NOTE_TYPE } from './components/SessionSafetyControls';
export type { SessionSafetyControlsProps } from './components/SessionSafetyControls';
export {
  MEMORY_NOTE_TYPES,
  OBSERVATION_CONFIDENCE_LEVELS,
  selectActiveMemoryNotes,
  selectActiveThreads,
  buildSessionBriefing,
  groupMemoryByCharacter,
  getNoteConfidence,
  withConfidence,
} from './lib/plannerMemory';
export type { MemoryNoteType, SessionBriefing, ObservationConfidence } from './lib/plannerMemory';
export { checkSessionReadiness } from './lib/sessionReadiness';
export type { SessionReadinessCheck } from './lib/sessionReadiness';
export { selectChangedSince, buildCampaignChanges } from './lib/campaignChanges';
export type { CampaignChanges } from './lib/campaignChanges';
export { NOTE_TYPE_TEMPLATES } from './lib/noteTypeTemplates';
export {
  heading,
  para,
  section,
  linkSection,
  checkItem,
  checklistSection,
  noteTemplate,
  npcTemplate,
  groupTemplate,
  locationTemplate,
  sessionTemplate,
  sessionDebriefTemplate,
  sceneTemplate,
  storylineTemplate,
  threadTemplate,
  questTemplate,
  eventTemplate,
  TEMPLATE_DEFAULTS,
  TEMPLATE_LABELS,
} from './lib/entityTemplates';

// Layout customization (ROADMAP.md's "further layout customization
// beyond the tab bar") has two tiers: `CampaignSessionPlanner`'s
// `renderFields` prop (above) covers reordering/hiding/adding to a
// shipped editor's top field block without touching anything else.
// For a host that wants to replace an editor's markup more completely
// than that, these exports are the same building blocks
// `CampaignSessionPlanner` itself is built from — the individual
// per-kind editor components (each already includes validation, the
// BlockNote content field, entity-linking, and Save/Cancel/Delete —
// use one directly instead of reimplementing it), and the lower-level
// primitives (`BlockNoteFreeformField`, `EntityLinksPanel`,
// `EntityLinkPicker`, the starter templates above) for a host building
// a screen from scratch.
export { NoteEditor } from './components/NoteEditor';
export type { NoteEditorProps, NoteFormValues } from './components/NoteEditor';
export { NpcEditor } from './components/NpcEditor';
export type { NpcEditorProps, NpcFormValues } from './components/NpcEditor';
export { GroupEditor } from './components/GroupEditor';
export type { GroupEditorProps, GroupFormValues } from './components/GroupEditor';
export { LocationEditor } from './components/LocationEditor';
export type { LocationEditorProps, LocationFormValues } from './components/LocationEditor';
export { SceneEditor } from './components/SceneEditor';
export type { SceneEditorProps, SceneFormValues } from './components/SceneEditor';
export { SessionEditor } from './components/SessionEditor';
export type { SessionEditorProps, SessionFormValues } from './components/SessionEditor';
export { StorylineEditor } from './components/StorylineEditor';
export type { StorylineEditorProps, StorylineFormValues } from './components/StorylineEditor';
export { ThreadEditor } from './components/ThreadEditor';
export type { ThreadEditorProps, ThreadFormValues } from './components/ThreadEditor';
export { QuestEditor } from './components/QuestEditor';
export type { QuestEditorProps, QuestFormValues } from './components/QuestEditor';
export { EventEditor } from './components/EventEditor';
export type { EventEditorProps, EventFormValues } from './components/EventEditor';
export { BlockNoteFreeformField } from './components/BlockNoteFreeformField';
export type { BlockNoteFreeformFieldProps } from './components/BlockNoteFreeformField';
export { EntityLinksPanel } from './components/EntityLinksPanel';
export type { EntityLinksPanelProps, EntityEditorLinksProps } from './components/EntityLinksPanel';
export { EntityLinkPicker } from './components/EntityLinkPicker';
export type { EntityLinkPickerProps, PlannerSearchItem } from './components/EntityLinkPicker';
export { ReadOnlyBlockNoteView } from './components/ReadOnlyBlockNoteView';
export type { ReadOnlyBlockNoteViewProps } from './components/ReadOnlyBlockNoteView';
export { EntityReferenceLinkingContext } from './components/EntityReferenceInlineContent';
export type { EntityReferenceLinkingHandlers } from './components/EntityReferenceInlineContent';
export type { PartialBlock } from '@blocknote/core';

// "Run Mode" (ROADMAP.md) — small, non-modal, composable pieces for
// the moment of actually running a session, meant to sit alongside a
// host's own live-session screen (initiative, character sheets,
// combat), never to replace or navigate away from it. Neither of these
// is a route or a modal; a host places them wherever its own layout
// has room, the same way `SessionSafetyControls` already works.
export { SessionRunPanel } from './components/SessionRunPanel';
export type { SessionRunPanelProps } from './components/SessionRunPanel';
export { QuickCaptureComposer } from './components/QuickCaptureComposer';
export type { QuickCaptureComposerProps } from './components/QuickCaptureComposer';
export type {
  Block,
  CampaignId,
  CampaignPlannerRepository,
  EntityId,
  EntityLink,
  EntityLinkId,
  EntityReference,
  EntitySearchFilters,
  EntitySearchResult,
  EntityType,
  Event,
  EventId,
  GameSystemInfo,
  Group,
  GroupId,
  HostEntityType,
  Location,
  LocationId,
  Note,
  NoteId,
  Npc,
  NpcId,
  PlannerEntityType,
  PlannerTemplate,
  Quest,
  QuestId,
  Scene,
  SceneId,
  Session,
  SessionId,
  Storyline,
  StorylineId,
  TemplateEntityKind,
  Thread,
  ThreadId,
  TTRPGAdversary,
  TTRPGCharacter,
  TTRPGEncounter,
  TTRPGEnvironment,
  TTRPGEntity,
  TTRPGHostAdapter,
  TTRPGItem,
} from './types';
