import type { ActionItem } from '../ai/transcription/actionItemExtractor';
import type { CreateTaskInput } from '../tasks/taskAdapter';

export interface MeetingActionItemTodoSource {
  meetingId: string;
  meetingTitle: string;
  actionItem: ActionItem;
}

export type MeetingLinkedTodoInput = CreateTaskInput;

function mapActionPriorityToTodoPriority(
  priority: ActionItem['priority']
): CreateTaskInput['priority'] {
  if (priority === 'high') return 'high';
  if (priority === 'low') return 'low';
  return 'medium';
}

export function createTodoInputFromMeetingActionItem({
  meetingId,
  meetingTitle,
  actionItem,
}: MeetingActionItemTodoSource): MeetingLinkedTodoInput {
  const source = actionItem.provenance?.source;
  const sourceLabel = source
    ? `Source: ${meetingTitle} · ${source.segmentId}`
    : `Source: ${meetingTitle}`;

  return {
    title: actionItem.text,
    description: [sourceLabel, source?.text].filter(Boolean).join('\n\n'),
    priority: mapActionPriorityToTodoPriority(actionItem.priority),
    status: 'pending',
    sourceType: 'meeting',
    sourceMeetingId: meetingId,
    sourceTranscriptSegmentId: source?.segmentId,
    sourceText: source?.text,
  };
}
