// Every component's color classes resolve through the CSS custom
// properties this defines (see theme.css's own doc comment) — imported
// here, at the one entry point every consumer already goes through, so
// a host gets the default palette for free and can override it without
// needing to know this file exists.
import './theme.css';

export { CampaignSessionPlanner } from './components/CampaignSessionPlanner';
export type { CampaignSessionPlannerProps, CampaignSessionPlannerNavProps } from './components/CampaignSessionPlanner';
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
