export type DerivedMetadataKind =
  | 'embedding'
  | 'search_index'
  | 'search_citation'
  | 'graph_node'
  | 'graph_edge'
  | 'source_backlink'
  | 'transcript_segment_reference'
  | 'ai_summary'
  | 'extracted_entity'
  | 'auto_tag'
  | 'task_source_context'
  | 'calendar_context';

export type DerivedMetadataSensitivity = 'sensitive';
export type DerivedMetadataDefaultScope = 'local_only';

export interface DerivedMetadataPrivacyRule {
  kind: DerivedMetadataKind;
  sensitivity: DerivedMetadataSensitivity;
  defaultScope: DerivedMetadataDefaultScope;
  rationale: string;
}

export const DERIVED_METADATA_PRIVACY_RULES = {
  embedding: {
    kind: 'embedding',
    sensitivity: 'sensitive',
    defaultScope: 'local_only',
    rationale: 'Embeddings can reveal semantic content even without source text.',
  },
  search_index: {
    kind: 'search_index',
    sensitivity: 'sensitive',
    defaultScope: 'local_only',
    rationale: 'Search indexes contain tokens and snippets derived from private content.',
  },
  search_citation: {
    kind: 'search_citation',
    sensitivity: 'sensitive',
    defaultScope: 'local_only',
    rationale: 'Citations expose source IDs, snippets, and relationship paths.',
  },
  graph_node: {
    kind: 'graph_node',
    sensitivity: 'sensitive',
    defaultScope: 'local_only',
    rationale: 'Graph nodes expose private entities, titles, excerpts, and source references.',
  },
  graph_edge: {
    kind: 'graph_edge',
    sensitivity: 'sensitive',
    defaultScope: 'local_only',
    rationale: 'Graph edges reveal relationships between private artifacts.',
  },
  source_backlink: {
    kind: 'source_backlink',
    sensitivity: 'sensitive',
    defaultScope: 'local_only',
    rationale:
      'Source backlinks reveal provenance between meetings, notes, tasks, and transcript spans.',
  },
  transcript_segment_reference: {
    kind: 'transcript_segment_reference',
    sensitivity: 'sensitive',
    defaultScope: 'local_only',
    rationale: 'Transcript segment references identify cited spans of private conversations.',
  },
  ai_summary: {
    kind: 'ai_summary',
    sensitivity: 'sensitive',
    defaultScope: 'local_only',
    rationale: 'Summaries compress private source content and can reveal the original meaning.',
  },
  extracted_entity: {
    kind: 'extracted_entity',
    sensitivity: 'sensitive',
    defaultScope: 'local_only',
    rationale: 'Extracted people, projects, places, and topics reveal private context.',
  },
  auto_tag: {
    kind: 'auto_tag',
    sensitivity: 'sensitive',
    defaultScope: 'local_only',
    rationale: 'Generated tags reveal private topics and classification decisions.',
  },
  task_source_context: {
    kind: 'task_source_context',
    sensitivity: 'sensitive',
    defaultScope: 'local_only',
    rationale:
      'Meeting-derived task context reveals source meetings, transcript spans, and quotes.',
  },
  calendar_context: {
    kind: 'calendar_context',
    sensitivity: 'sensitive',
    defaultScope: 'local_only',
    rationale: 'Calendar context reveals time, participants, meetings, and intent.',
  },
} satisfies Record<DerivedMetadataKind, DerivedMetadataPrivacyRule>;

export type SensitiveDerivedMetadataField =
  | 'sourceType'
  | 'sourceMeetingId'
  | 'sourceTranscriptSegmentId'
  | 'sourceText'
  | 'linkedNoteId'
  | 'provenance'
  | 'citation'
  | 'citations'
  | 'transcriptSegmentId'
  | 'embedding'
  | 'embeddings'
  | 'graphNodes'
  | 'graphEdges'
  | 'excerpt'
  | 'matchReason'
  | 'sharedKeywords'
  | 'relatedContext';

export const SENSITIVE_DERIVED_METADATA_FIELDS = [
  'sourceType',
  'sourceMeetingId',
  'sourceTranscriptSegmentId',
  'sourceText',
  'linkedNoteId',
  'provenance',
  'citation',
  'citations',
  'transcriptSegmentId',
  'embedding',
  'embeddings',
  'graphNodes',
  'graphEdges',
  'excerpt',
  'matchReason',
  'sharedKeywords',
  'relatedContext',
] as const satisfies readonly SensitiveDerivedMetadataField[];

const SENSITIVE_FIELD_SET = new Set<string>(SENSITIVE_DERIVED_METADATA_FIELDS);

export function getDerivedMetadataPrivacyRule(
  kind: DerivedMetadataKind
): DerivedMetadataPrivacyRule {
  return DERIVED_METADATA_PRIVACY_RULES[kind];
}

export function findSensitiveDerivedMetadataFields(record: object): string[] {
  return Object.keys(record)
    .filter(key => SENSITIVE_FIELD_SET.has(key))
    .sort();
}

export function assertNoSensitiveDerivedMetadataFields(record: object, context: string): void {
  const fields = findSensitiveDerivedMetadataFields(record);
  if (fields.length === 0) return;

  throw new Error(
    `${context} contains sensitive derived metadata fields that must stay local by default: ${fields.join(
      ', '
    )}`
  );
}
