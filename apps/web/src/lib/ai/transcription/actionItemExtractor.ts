/**
 * Action Item Extractor
 *
 * Extracts tasks and action items from meeting transcripts using pattern matching.
 */

export interface TranscriptSegmentSource {
  /** Source kind for meeting-derived artifacts */
  type: 'transcript';
  /** Stable segment identifier within the transcript */
  segmentId: string;
  /** Character offset where the source segment starts */
  startOffset: number;
  /** Character offset where the source segment ends */
  endOffset: number;
  /** Source text used to derive the artifact */
  text: string;
}

export interface MeetingArtifactProvenance {
  /** Source transcript segment for the extracted artifact */
  source: TranscriptSegmentSource;
  /** Extraction confidence from 0 to 1 */
  confidence: number;
  /** Whether a user has confirmed or rejected the extraction */
  confirmationStatus: 'candidate' | 'confirmed' | 'rejected';
}

export interface ActionItem {
  /** The action item text description */
  text: string;
  /** Name of the person assigned to the task */
  assignee?: string;
  /** Date or relative time for the deadline */
  deadline?: string;
  /** Priority level of the action item */
  priority?: 'high' | 'medium' | 'low';
  /** Whether the action item is completed */
  completed: boolean;
  /** Source citation and confidence for meeting-derived action items */
  provenance?: MeetingArtifactProvenance;
}

// Action verb patterns
const ACTION_VERBS = [/\bwill\b/i, /\bneed\s+to\b/i, /\bshould\b/i, /\bmust\b/i, /\bgoing\s+to\b/i];

// TODO-style patterns
const TODO_PATTERNS = [/^\s*TODO[:\s]+/i, /^\s*ACTION\s+ITEM[:\s]+/i, /^\s*FOLLOW[-\s]?UP[:\s]+/i];

// Assignment patterns (e.g., "John will", "assigned to Sarah")
const ASSIGNMENT_PATTERNS = [
  /\b([A-Z][a-z]+)\s+will\b/i,
  /\b([A-Z][a-z]+)\s+should\b/i,
  /\b([A-Z][a-z]+)\s+must\b/i,
  /\bassigned\s+to\s+([A-Z][a-z]+)\b/i,
];

// Assignment-only patterns (sentences with "assigned to" should be action items)
const ASSIGNMENT_ONLY_PATTERNS = [/\bassigned\s+to\s+[A-Z][a-z]+/i];

// Deadline patterns
const DEADLINE_PATTERNS = [
  /\bby\s+(tomorrow)\b/i,
  /\bby\s+(next\s+week)\b/i,
  /\bby\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i,
  /\bby\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/i,
];

// Additional content patterns that indicate an action item
const TASK_INDICATOR_PATTERNS = [
  /\b(review|check|update|create|prepare|send|call|fix|deploy|complete|finalize|schedule|submit)\b/i,
  /\b(the|a|this)\s+\w{4,}/i, // Has a noun phrase (at least 4 chars to avoid "is", "an")
];

// Priority keywords
const PRIORITY_HIGH = ['urgent', 'urgently', 'important', 'ASAP', 'critical', 'priority'];
const PRIORITY_MEDIUM: string[] = [];
const PRIORITY_LOW: string[] = [];

interface TranscriptSegmentCandidate {
  text: string;
  segmentId: string;
  startOffset: number;
  endOffset: number;
}

/**
 * Split text into transcript segments while preserving character offsets.
 */
function splitIntoTranscriptSegments(text: string): TranscriptSegmentCandidate[] {
  const segments: TranscriptSegmentCandidate[] = [];
  const sentencePattern = /[^.!?]+[.!?]*/g;
  let match: RegExpExecArray | null;

  while ((match = sentencePattern.exec(text)) !== null) {
    const rawText = match[0];
    const trimmedText = rawText.trim();

    if (!trimmedText) continue;

    const leadingWhitespace = rawText.search(/\S/);
    const startOffset = match.index + (leadingWhitespace === -1 ? 0 : leadingWhitespace);
    const endOffset = startOffset + trimmedText.length;

    segments.push({
      text: trimmedText.replace(/[.!?]+$/, '').trim(),
      segmentId: `transcript-segment-${segments.length + 1}`,
      startOffset,
      endOffset,
    });
  }

  return segments;
}

/**
 * Check if a sentence contains action patterns
 */
function containsActionPattern(sentence: string): boolean {
  // Check action verbs
  for (const pattern of ACTION_VERBS) {
    if (pattern.test(sentence)) {
      return true;
    }
  }

  // Check TODO patterns
  for (const pattern of TODO_PATTERNS) {
    if (pattern.test(sentence)) {
      return true;
    }
  }

  // Check assignment-only patterns (e.g., "assigned to Jessica")
  for (const pattern of ASSIGNMENT_ONLY_PATTERNS) {
    if (pattern.test(sentence)) {
      return true;
    }
  }

  // Check if sentence contains priority keywords AND has task indicators
  // (Avoids flagging sentences like "This is urgent" without actual tasks)
  const lowerSentence = sentence.toLowerCase();
  const priorityKeywords = [...PRIORITY_HIGH, ...PRIORITY_MEDIUM, ...PRIORITY_LOW];
  const hasPriorityKeyword = priorityKeywords.some(keyword =>
    lowerSentence.includes(keyword.toLowerCase())
  );

  if (hasPriorityKeyword) {
    // Require task indicators for priority-only sentences
    const hasTaskIndicator = TASK_INDICATOR_PATTERNS.some(pattern => pattern.test(sentence));
    if (hasTaskIndicator) {
      return true;
    }
  }

  return false;
}

/**
 * Extract assignee from sentence
 */
function extractAssignee(sentence: string): string | undefined {
  for (const pattern of ASSIGNMENT_PATTERNS) {
    const match = sentence.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Try generic name pattern for "assigned to" style
  const assignedToMatch = sentence.match(/\bassigned\s+to\s+([A-Z][a-z]+)\b/i);
  if (assignedToMatch && assignedToMatch[1]) {
    return assignedToMatch[1];
  }

  return undefined;
}

/**
 * Extract deadline from sentence
 */
function extractDeadline(sentence: string): string | undefined {
  for (const pattern of DEADLINE_PATTERNS) {
    const match = sentence.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return undefined;
}

/**
 * Determine priority based on keywords
 */
function determinePriority(sentence: string): 'high' | 'medium' | 'low' | undefined {
  const lowerSentence = sentence.toLowerCase();

  for (const keyword of PRIORITY_HIGH) {
    if (lowerSentence.includes(keyword.toLowerCase())) {
      return 'high';
    }
  }

  for (const keyword of PRIORITY_MEDIUM) {
    if (lowerSentence.includes(keyword.toLowerCase())) {
      return 'medium';
    }
  }

  for (const keyword of PRIORITY_LOW) {
    if (lowerSentence.includes(keyword.toLowerCase())) {
      return 'low';
    }
  }

  return undefined;
}

/**
 * Clean up the action item text
 */
function cleanActionText(sentence: string): string {
  let cleaned = sentence;

  // Remove TODO-style prefixes
  for (const pattern of TODO_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove extra whitespace
  cleaned = cleaned.trim();

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

function estimateActionItemConfidence(sentence: string): number {
  let confidence = 0.55;

  if (ACTION_VERBS.some(pattern => pattern.test(sentence))) confidence += 0.15;
  if (TODO_PATTERNS.some(pattern => pattern.test(sentence))) confidence += 0.15;
  if (extractAssignee(sentence)) confidence += 0.1;
  if (extractDeadline(sentence)) confidence += 0.05;
  if (determinePriority(sentence)) confidence += 0.05;

  return Math.min(confidence, 0.95);
}

function createProvenance(segment: TranscriptSegmentCandidate): MeetingArtifactProvenance {
  return {
    source: {
      type: 'transcript',
      segmentId: segment.segmentId,
      startOffset: segment.startOffset,
      endOffset: segment.endOffset,
      text: segment.text,
    },
    confidence: estimateActionItemConfidence(segment.text),
    confirmationStatus: 'candidate',
  };
}

export function addMissingActionItemProvenance(
  actionItems: ActionItem[],
  transcript: string
): ActionItem[] {
  const segments = splitIntoTranscriptSegments(transcript);

  return actionItems.map((item, index) => {
    if (item.provenance) return item;

    const matchingSegment = segments.find(segment =>
      segment.text.toLowerCase().includes(item.text.toLowerCase())
    );
    const fallbackSegment: TranscriptSegmentCandidate = matchingSegment ?? {
      text: item.text,
      segmentId: `transcript-segment-${index + 1}`,
      startOffset: -1,
      endOffset: -1,
    };

    return {
      ...item,
      provenance: createProvenance(fallbackSegment),
    };
  });
}

/**
 * Extract action items from a transcript
 *
 * @param transcript - The meeting transcript text
 * @returns Array of ActionItem objects
 */
export function extractActionItems(transcript: string): ActionItem[] {
  const segments = splitIntoTranscriptSegments(transcript);
  const actionItems: ActionItem[] = [];

  for (const segment of segments) {
    const sentence = segment.text;

    if (containsActionPattern(sentence)) {
      const actionItem: ActionItem = {
        text: cleanActionText(sentence),
        completed: false,
        provenance: createProvenance(segment),
      };

      actionItem.assignee = extractAssignee(sentence);
      actionItem.deadline = extractDeadline(sentence);
      actionItem.priority = determinePriority(sentence);

      actionItems.push(actionItem);
    }
  }

  return actionItems;
}
