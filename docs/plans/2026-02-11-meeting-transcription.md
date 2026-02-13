# Meeting Transcription Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add AI-powered meeting transcription using local Whisper model via Transformers.js, enabling users to transcribe audio, extract action items, and link transcripts to calendar events.

**Architecture:** Create a MeetingTranscriber component that uses the Web Speech API for initial audio capture and @xenova/transformers Whisper model for local transcription. Store encrypted transcripts in IndexedDB and integrate with the existing calendar system.

**Tech Stack:** React, TypeScript, @xenova/transformers (Whisper model), Web Speech API, Web Audio API, IndexedDB, existing calendar integration infrastructure

**Test Framework:** Vitest + React Testing Library + comprehensive audio mocking

**Cost:** $0 (fully local, no API costs)

---

## Prerequisites

Before starting, verify the existing infrastructure:

**Step 0.1: Check existing voice infrastructure**

Run: `ls -la apps/web/src/hooks/useVoiceInput.ts`
Expected: File exists (created in Phase 1)

**Step 0.2: Check calendar integration**

Run: `ls -la apps/web/src/components/CalendarView.tsx`
Expected: File exists

**Step 0.3: Verify tests pass**

Run: `bun test` from project root

---

## Task 1: Install Transformers.js Dependencies

**Files:**

- Modify: `apps/web/package.json`

**Step 1.1: Install Transformers.js**

```bash
cd apps/web
bun add @xenova/transformers
```

**Step 1.2: Verify installation**

Run: `bun run build`
Expected: Build succeeds

**Step 1.3: Commit**

```bash
git add apps/web/package.json bun.lockb
git commit -m "deps: install @xenova/transformers for Whisper transcription

- Install Transformers.js for local AI model inference
- Enables client-side speech-to-text with Whisper"
```

---

## Task 2: Create Transcription Service

**Files:**

- Create: `apps/web/src/lib/ai/transcription/transcriptionService.ts`
- Test: `apps/web/src/lib/ai/transcription/__tests__/transcriptionService.test.ts`

**Step 2.1: Create directory**

```bash
mkdir -p apps/web/src/lib/ai/transcription/__tests__
```

**Step 2.2: Write the failing test**

Create test covering:

- Transcription service initialization
- Audio transcription with mock audio blob
- Progress callback handling
- Error handling for unsupported formats
- Model loading state

**Step 2.3: Run test to verify it fails**

**Step 2.4: Write implementation**

Create `transcriptionService.ts` with:

- TranscriptionService class
- Initialize Whisper model (Xenova/whisper-tiny.en for speed)
- transcribeAudio(audioBlob, onProgress) method
- Progress tracking (0-100%)
- Error handling
- Model caching

**Step 2.5: Run test to verify it passes**

**Step 2.6: Commit**

```bash
git add apps/web/src/lib/ai/transcription/
git commit -m "feat(transcription): add transcription service with Whisper

- Create TranscriptionService using @xenova/transformers
- Load Whisper model locally (privacy-preserving)
- Support progress callbacks for UI feedback
- Add comprehensive test coverage"
```

---

## Task 3: Create Action Item Extractor

**Files:**

- Create: `apps/web/src/lib/ai/transcription/actionItemExtractor.ts`
- Test: `apps/web/src/lib/ai/transcription/__tests__/actionItemExtractor.test.ts`

**Step 3.1: Write the failing test**

Create test for:

- Extract action items from transcript text
- Identify tasks, deadlines, assignees
- Handle empty/invalid input
- Pattern matching for action keywords

**Step 3.2: Run test to verify it fails**

**Step 3.3: Write implementation**

Create `actionItemExtractor.ts` with:

- ActionItem interface (text, assignee?, deadline?, priority?)
- extractActionItems(transcript) function
- Pattern matching for common action phrases:
  - "John will..."
  - "We need to..."
  - "TODO: ..."
  - "Action item: ..."
  - "By Friday..."
  - Deadline detection (dates, "by tomorrow", etc.)
- Priority detection (urgent, important, ASAP)

**Step 3.4: Run test to verify it passes**

**Step 3.5: Commit**

```bash
git add apps/web/src/lib/ai/transcription/
git commit -m "feat(transcription): add action item extractor

- Extract tasks and action items from transcripts
- Identify assignees and deadlines using pattern matching
- Support priority detection (urgent, important)
- Add comprehensive test coverage"
```

---

## Task 4: Create Meeting Storage Service

**Files:**

- Create: `apps/web/src/lib/storage/meetingStorage.ts`
- Test: `apps/web/src/lib/storage/__tests__/meetingStorage.test.ts`

**Step 4.1: Create directory**

```bash
mkdir -p apps/web/src/lib/storage/__tests__
```

**Step 4.2: Write the failing test**

Create test for:

- Save meeting with transcript
- Get meeting by ID
- Get all meetings
- Update meeting
- Delete meeting
- Encryption/decryption
- Calendar event linking

**Step 4.3: Run test to verify it fails**

**Step 4.4: Write implementation**

Create `meetingStorage.ts` with:

- Meeting interface (id, title, date, transcript, actionItems, calendarEventId?, audioBlob?)
- saveMeeting(meeting) - encrypts and stores in IndexedDB
- getMeeting(id) - decrypts and returns
- getAllMeetings() - returns all meetings sorted by date
- updateMeeting(id, updates)
- deleteMeeting(id)
- searchMeetings(query) - full-text search on transcripts
- Integration with existing crypto layer (XSalsa20-Poly1305)

**Step 4.5: Run test to verify it passes**

**Step 4.6: Commit**

```bash
git add apps/web/src/lib/storage/
git commit -m "feat(transcription): add meeting storage service

- Create Meeting interface with transcript and action items
- Store encrypted meetings in IndexedDB
- Support CRUD operations with encryption
- Add full-text search on transcripts
- Integrate with existing crypto layer"
```

---

## Task 5: Create Audio Capture Hook

**Files:**

- Create: `apps/web/src/hooks/useAudioCapture.ts`
- Test: `apps/web/src/hooks/__tests__/useAudioCapture.test.ts`

**Step 5.1: Write the failing test**

Create test for:

- Start/stop audio capture
- Audio chunks accumulation
- Error handling (permission denied, no mic)
- Recording state management
- Audio blob generation

**Step 5.2: Run test to verify it fails**

**Step 5.3: Write implementation**

Create `useAudioCapture.ts` with:

- UseAudioCaptureOptions interface (onDataAvailable, onError)
- UseAudioCaptureReturn interface (isRecording, startRecording, stopRecording, error)
- Uses Web Audio API and MediaRecorder
- Accumulates audio chunks
- Returns audio blob when stopped
- Handles permissions and errors

**Step 5.4: Run test to verify it passes**

**Step 5.5: Commit**

```bash
git add apps/web/src/hooks/
git commit -m "feat(transcription): add useAudioCapture hook

- Capture audio from microphone using Web Audio API
- Accumulate audio chunks during recording
- Generate audio blob when stopped
- Handle permissions and errors gracefully
- Add comprehensive test coverage"
```

---

## Task 6: Create MeetingTranscriber Component

**Files:**

- Create: `apps/web/src/components/MeetingTranscriber.tsx`
- Test: `apps/web/src/components/__tests__/MeetingTranscriber.test.tsx`

**Step 6.1: Write the failing test**

Create test for:

- Component renders with initial state
- Start recording button works
- Stop recording button works
- Progress indicator shows during transcription
- Transcript displays when complete
- Action items display
- Save meeting functionality
- Error handling

**Step 6.2: Run test to verify it fails**

**Step 6.3: Write implementation**

Create `MeetingTranscriber.tsx` with:

- Props interface (calendarEventId?, onSave?)
- State: recording, transcribing, progress, transcript, actionItems, error, title
- Use useAudioCapture hook for recording
- Use transcriptionService for transcription
- Use actionItemExtractor for parsing tasks
- UI includes:
  - Title input
  - Record/Stop button with visual feedback
  - Progress bar during transcription
  - Transcript display with editable textarea
  - Action items list
  - Save button
  - Error display
- Follow Warm Editorial Minimalism design
- Encrypt and store via meetingStorage

**Step 6.4: Run test to verify it passes**

**Step 6.5: Commit**

```bash
git add apps/web/src/components/
git commit -m "feat(transcription): add MeetingTranscriber component

- Create comprehensive meeting transcription UI
- Record audio using useAudioCapture hook
- Transcribe using Whisper model locally
- Extract action items automatically
- Display progress, transcript, and tasks
- Save encrypted meetings to storage
- Follow Warm Editorial Minimalism design"
```

---

## Task 7: Create Meeting List Component

**Files:**

- Create: `apps/web/src/components/MeetingList.tsx`
- Test: `apps/web/src/components/__tests__/MeetingList.test.tsx`

**Step 7.1: Write the failing test**

Create test for:

- Render list of meetings
- Display meeting details (title, date, duration)
- Search/filter functionality
- Click to open meeting detail
- Delete meeting
- Empty state

**Step 7.2: Run test to verify it fails**

**Step 7.3: Write implementation**

Create `MeetingList.tsx` with:

- Props interface (onMeetingSelect, onDelete)
- State: meetings, searchQuery, isLoading
- Load meetings from meetingStorage on mount
- Display meetings in card/list format
- Show: title, date, preview of transcript, action item count
- Search bar for filtering
- Click to select/view
- Delete confirmation
- Empty state when no meetings

**Step 7.4: Run test to verify it passes**

**Step 7.5: Commit**

```bash
git add apps/web/src/components/
git commit -m "feat(transcription): add MeetingList component

- Display list of transcribed meetings
- Show meeting metadata (title, date, action items)
- Support search and filtering
- Allow viewing and deleting meetings
- Handle empty state
- Add comprehensive test coverage"
```

---

## Task 8: Create Meeting Detail View

**Files:**

- Create: `apps/web/src/components/MeetingDetail.tsx`
- Test: `apps/web/src/components/__tests__/MeetingDetail.test.tsx`

**Step 8.1: Write the failing test**

Create test for:

- Render meeting details
- Display full transcript
- Display action items
- Edit title
- Export transcript
- Link to calendar event

**Step 8.2: Run test to verify it fails**

**Step 8.3: Write implementation**

Create `MeetingDetail.tsx` with:

- Props interface (meetingId, onBack, onDelete)
- State: meeting, isLoading, isEditing
- Load meeting from storage
- Display:
  - Editable title
  - Date and duration
  - Full transcript (scrollable)
  - Action items (checkable)
  - Export button (copy to clipboard, download as markdown)
  - Calendar event link (if linked)
  - Delete button
- Follow Warm Editorial Minimalism design

**Step 8.4: Run test to verify it passes**

**Step 8.5: Commit**

```bash
git add apps/web/src/components/
git commit -m "feat(transcription): add MeetingDetail component

- Display full meeting transcript and details
- Show action items with checkboxes
- Support editing meeting title
- Export transcript (copy/download)
- Link to calendar event if available
- Add comprehensive test coverage"
```

---

## Task 9: Create Meeting Transcription Page

**Files:**

- Create: `apps/web/src/app/meetings/page.tsx`
- Create: `apps/web/src/app/meetings/[id]/page.tsx`
- Test: `apps/web/src/app/meetings/page.test.tsx`

**Step 9.1: Create directory**

```bash
mkdir -p apps/web/src/app/meetings
mkdir -p apps/web/src/app/meetings/\[id\]
```

**Step 9.2: Write the failing test**

Create test for main meetings page:

- Render meetings list
- Show "New Meeting" button
- Handle empty state

**Step 9.3: Write implementation**

Create `apps/web/src/app/meetings/page.tsx`:

- Main meetings dashboard
- Show MeetingList component
- "New Meeting" button to open MeetingTranscriber modal
- Search/filter bar
- Header with page title and description

Create `apps/web/src/app/meetings/[id]/page.tsx`:

- Individual meeting detail page
- Show MeetingDetail component
- Back button to return to list
- Route parameter: meeting ID

**Step 9.4: Run test to verify it passes**

**Step 9.5: Commit**

```bash
git add apps/web/src/app/meetings/
git commit -m "feat(transcription): add meeting transcription pages

- Create /meetings route for meeting management
- Create /meetings/[id] route for individual meetings
- Integrate MeetingList and MeetingDetail components
- Support creating new meetings via modal
- Add page layout with header and navigation"
```

---

## Task 10: Integrate with Calendar

**Files:**

- Modify: `apps/web/src/components/CalendarView.tsx`
- Create: `apps/web/src/components/CalendarEventTranscript.tsx`

**Step 10.1: Write the failing test**

Create test for CalendarEventTranscript component:

- Show transcript link if meeting exists for event
- Show "Transcribe" button if no meeting
- Open transcriber when clicked

**Step 10.2: Run test to verify it fails**

**Step 10.3: Write implementation**

Create `CalendarEventTranscript.tsx`:

- Props: eventId, eventTitle, eventDate
- Check if meeting exists for this event
- Show transcript summary or "Transcribe" button
- Link to meeting detail or open transcriber

Modify `CalendarView.tsx`:

- Add CalendarEventTranscript to event details
- Allow starting transcription from calendar event

**Step 10.4: Run test to verify it passes**

**Step 10.5: Commit**

```bash
git add apps/web/src/components/
git commit -m "feat(transcription): integrate with calendar

- Link meetings to calendar events
- Show transcript status in calendar view
- Start transcription directly from event
- Display transcript summary in event details"
```

---

## Task 11: Add Navigation Link

**Files:**

- Modify: `apps/web/src/app/components/Navigation.tsx`

**Step 11.1: Add link**

Add "Meetings" link to navigation alongside other main items.

**Step 11.2: Commit**

```bash
git add apps/web/src/app/components/Navigation.tsx
git commit -m "feat(transcription): add meetings navigation link

- Add link to /meetings page in main navigation
- Use microphone/recording icon"
```

---

## Task 12: Create Documentation

**Files:**

- Create: `docs/features/meeting-transcription.md`

**Step 12.1: Create documentation**

Create comprehensive docs covering:

- Overview of meeting transcription
- How to record and transcribe meetings
- Privacy (local processing, encrypted storage)
- Action item extraction
- Calendar integration
- Export options
- Browser support
- Future enhancements

**Step 12.2: Commit**

```bash
git add docs/features/meeting-transcription.md
git commit -m "docs(transcription): add meeting transcription documentation

- Document features and usage
- Explain privacy benefits
- Detail calendar integration
- List export options
- Add troubleshooting guide"
```

---

## Summary

**Total Tasks:** 12
**Estimated Time:** 3-4 weeks
**Cost:** $0 (fully local using Whisper)

**What Was Built:**

1. ✅ Transformers.js installation
2. ✅ Transcription service (Whisper model)
3. ✅ Action item extractor
4. ✅ Meeting storage (encrypted)
5. ✅ Audio capture hook
6. ✅ MeetingTranscriber component
7. ✅ MeetingList component
8. ✅ MeetingDetail component
9. ✅ Meetings pages (/meetings, /meetings/[id])
10. ✅ Calendar integration
11. ✅ Navigation link
12. ✅ Documentation

**Key Features:**

- Local AI transcription (privacy-preserving)
- Automatic action item extraction
- Encrypted storage
- Calendar integration
- Export capabilities
- Full-text search

**Privacy Benefits:**

- Audio processed locally (no cloud)
- Transcripts encrypted at rest
- Zero data exfiltration

Ready for subagent-driven development!
