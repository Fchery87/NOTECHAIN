import type { GuidedAnswer, PrdBuilderSession, PrdSourceNote, ProjectBrief } from '../prdBuilder';

export type PrdGenerationMode = 'local' | 'ai-enhanced' | 'ai-enhanced-with-research';

export interface PrdAiConsent {
  externalAi: true;
  webResearch?: boolean;
  acceptedAt: string;
}

export interface PrdResearchConsent {
  webResearch: true;
  acceptedAt: string;
}

export interface ResearchCitation {
  id: string;
  title: string;
  url: string;
  snippet: string;
  retrievedAt: string;
}

export interface ResearchBrief {
  query: string;
  summary: string;
  citations: ResearchCitation[];
  warnings: string[];
  generatedAt: string;
  token?: string;
}

export interface GeneratePrdAiInput {
  mode: Exclude<PrdGenerationMode, 'local'>;
  consent: PrdAiConsent;
  brief: ProjectBrief;
  sourceNotes: Array<Pick<PrdSourceNote, 'id' | 'title'> & { plainText: string }>;
  answers: GuidedAnswer[];
  researchBrief?: ResearchBrief;
  deterministicMarkdown: string;
}

export interface GeneratePrdAiResult {
  markdown: string;
  provider: string;
  model: string;
  generatedAt: string;
  warnings: string[];
  traceability: {
    sourceNoteIds: string[];
    researchCitationUrls: string[];
  };
}

export interface ResearchInput {
  query: string;
  consent: PrdResearchConsent;
}

export interface PrdAiProvider {
  readonly provider: string;
  readonly model: string;
  generatePrd(input: GeneratePrdAiInput): Promise<GeneratePrdAiResult>;
}

export interface ResearchProvider {
  readonly provider: string;
  search(input: ResearchInput): Promise<ResearchBrief>;
}

export type GeneratePrdRouteRequest = GeneratePrdAiInput;

export type GeneratePrdRouteResponse = GeneratePrdAiResult;

export type ResearchRouteRequest = ResearchInput;

export interface PrdBuilderAiClientPayload {
  session: PrdBuilderSession;
  answers: GuidedAnswer[];
  mode: PrdGenerationMode;
  researchBrief?: ResearchBrief;
}
