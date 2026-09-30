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
