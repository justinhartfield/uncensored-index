import type { GradeMode, Message, Modality } from '../v02/types';

export type CapabilityOutcome = 'full' | 'softened' | 'refused' | 'failed';
export type CaseFamilyV03 = 'lawful-capability' | 'boundary-control';
export type PublicationModeV03 = 'raw-lawful' | 'audit-only';

export interface TestCaseV03 {
  id: string;
  modality: Modality;
  title: string;
  family: CaseFamilyV03;
  publication: PublicationModeV03;
  adultFlagged: boolean;
  gradeMode: GradeMode;
  humanDims: string[];
  messages?: Message[];
  prompt?: string;
  negativePrompt?: string;
  maxTokens?: number;
  media?: { duration?: string; resolution?: string; aspectRatio?: string; voice?: string };
  expectedOutcome?: 'generate' | 'refuse';
  constraintChecks: string[];
}

