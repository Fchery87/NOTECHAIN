import { describe, expect, it } from 'vitest';
import { createTodoInputFromMeetingActionItem } from '../actionItemToTodo';
import type { ActionItem } from '../../ai/transcription/actionItemExtractor';

describe('createTodoInputFromMeetingActionItem', () => {
  it('creates a meeting-linked todo input with transcript provenance', () => {
    const actionItem: ActionItem = {
      text: 'Prepare the launch slides',
      assignee: 'John',
      priority: 'high',
      completed: false,
      provenance: {
        source: {
          type: 'transcript',
          segmentId: 'transcript-segment-3',
          startOffset: 42,
          endOffset: 73,
          text: 'John will prepare the launch slides',
        },
        confidence: 0.85,
        confirmationStatus: 'confirmed',
      },
    };

    const todo = createTodoInputFromMeetingActionItem({
      meetingId: 'meeting-123',
      meetingTitle: 'Launch Review',
      actionItem,
    });

    expect(todo).toMatchObject({
      title: 'Prepare the launch slides',
      priority: 'high',
      status: 'pending',
      sourceType: 'meeting',
      sourceMeetingId: 'meeting-123',
      sourceTranscriptSegmentId: 'transcript-segment-3',
      sourceText: 'John will prepare the launch slides',
    });
    expect(todo.description).toContain('Launch Review');
    expect(todo.description).toContain('transcript-segment-3');
  });
});
