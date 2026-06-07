import { describe, expect, it } from 'vitest';
import {
  assertNoSensitiveDerivedMetadataFields,
  DERIVED_METADATA_PRIVACY_RULES,
  findSensitiveDerivedMetadataFields,
  getDerivedMetadataPrivacyRule,
  SENSITIVE_DERIVED_METADATA_FIELDS,
  type DerivedMetadataKind,
} from '../derivedMetadata';

const expectedSensitiveKinds: DerivedMetadataKind[] = [
  'embedding',
  'search_index',
  'search_citation',
  'graph_node',
  'graph_edge',
  'source_backlink',
  'transcript_segment_reference',
  'ai_summary',
  'extracted_entity',
  'auto_tag',
  'task_source_context',
  'calendar_context',
];

describe('derived metadata privacy model', () => {
  it('classifies every known derived metadata kind as sensitive and local-only by default', () => {
    expect(Object.keys(DERIVED_METADATA_PRIVACY_RULES).sort()).toEqual(
      [...expectedSensitiveKinds].sort()
    );

    for (const kind of expectedSensitiveKinds) {
      expect(getDerivedMetadataPrivacyRule(kind)).toMatchObject({
        kind,
        sensitivity: 'sensitive',
        defaultScope: 'local_only',
      });
    }
  });

  it('treats graph/search/provenance field names as sensitive derived metadata', () => {
    expect(SENSITIVE_DERIVED_METADATA_FIELDS).toEqual(
      expect.arrayContaining([
        'sourceMeetingId',
        'sourceTranscriptSegmentId',
        'sourceText',
        'linkedNoteId',
        'provenance',
        'citation',
        'transcriptSegmentId',
        'embedding',
        'graphEdges',
        'excerpt',
        'relatedContext',
      ])
    );
  });

  it('finds sensitive derived metadata fields in a candidate sync payload', () => {
    expect(
      findSensitiveDerivedMetadataFields({
        id: 'task-1',
        title: 'Send launch notes',
        sourceMeetingId: 'meeting-1',
        sourceTranscriptSegmentId: 'segment-1',
        sourceText: 'Alice will send the launch notes.',
      })
    ).toEqual(['sourceMeetingId', 'sourceText', 'sourceTranscriptSegmentId']);
  });

  it('allows current task sync payload fields but rejects source backlinks and citations', () => {
    expect(() =>
      assertNoSensitiveDerivedMetadataFields(
        {
          id: 'task-1',
          title: 'Send launch notes',
          description: 'Follow up from meeting',
          status: 'pending',
          priority: 'high',
          updatedAt: new Date('2026-06-06T10:00:00Z').toISOString(),
          version: 1,
        },
        'todo sync payload'
      )
    ).not.toThrow();

    expect(() =>
      assertNoSensitiveDerivedMetadataFields(
        {
          id: 'task-1',
          title: 'Send launch notes',
          sourceMeetingId: 'meeting-1',
          citation: { href: '/meetings/meeting-1' },
        },
        'todo sync payload'
      )
    ).toThrow(/sourceMeetingId/);
  });
});
