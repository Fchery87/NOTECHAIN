import type { ActionItem } from '../ai/transcription/actionItemExtractor';
import type { EncryptedTodo } from '../db';

export interface MeetingActionItemTodoSource {
  meetingId: string;
  meetingTitle: string;
  actionItem: ActionItem;
}

export type MeetingLinkedTodoInput = Omit<
  EncryptedTodo,
  'id' | 'ciphertext' | 'nonce' | 'authTag' | 'version'
>;

function mapActionPriorityToTodoPriority(
  priority: ActionItem['priority']
): EncryptedTodo['priority'] {
  if (priority === 'high') return 'high';
  if (priority === 'low') return 'low';
  return 'medium';
}

export function createTodoInputFromMeetingActionItem({
  meetingId,
  meetingTitle,
  actionItem,
}: MeetingActionItemTodoSource): MeetingLinkedTodoInput {
  const now = new Date();
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
    createdAt: now,
    updatedAt: now,
  };
}
