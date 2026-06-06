# Decomposition Review Cleanup Implementation Plan

Date: 2026-06-06

## Goal

Close the remaining thermo-nuclear code-quality review findings from the decomposition pass while preserving behavior and keeping the implementation boring, typed, and maintainable.

## Approval Target

The branch is ready for approval when:

- `MeetingTranscriber` no longer carries stale refactor sediment or duplicated transcript state.
- Sync note domain types no longer live in, or are imported from, a React hook module.
- `SecuritySettingsPanel` is no longer a 587-line multi-workflow component; each security/portability workflow has a focused owner.
- Generated/runtime artifacts are not left in the working tree.
- Focused tests and app typecheck pass.

## Work Plan

### 1. Tighten the transcription controller

Files:

- `apps/web/src/hooks/useMeetingTranscriptionController.ts`
- `apps/web/src/components/MeetingTranscriber.tsx`

Tasks:

1. Delete controller-local `hfTranscript` state.
2. Use `huggingFaceTranscript` from `useHuggingFaceTranscription` as the single source of truth for Hugging Face transcription output.
3. Ensure new Hugging Face recordings clear stale transcript through the provider hook reset path.
4. Delete the unused `handleTranscriptChange` callback from `MeetingTranscriber`.
5. Keep the current public behavior and existing tests green.

Rationale:

The duplicate `hfTranscript` mirror weakens the state invariant and can keep an old transcript visible after reset. The controller should select between provider transcripts, not shadow them.

### 2. Move sync note types to a neutral module

Files:

- new `apps/web/src/lib/sync/noteSyncTypes.ts`
- `apps/web/src/lib/sync/useNotesSync.ts`
- `apps/web/src/lib/sync/noteSyncOperations.ts`
- any import sites that consume `Note` or `RemoteNoteChange`

Tasks:

1. Create `noteSyncTypes.ts` containing `Note` and `RemoteNoteChange`.
2. Import those types from the neutral module in both the hook and operation helpers.
3. Remove the inverted type dependency from `noteSyncOperations.ts` to `useNotesSync.ts`.
4. Keep imports ordered normally: all imports first, then exported types/functions.

Rationale:

Sync-domain helpers should not depend conceptually on a React hook file. The hook should consume sync-domain contracts, not own them.

### 3. Decompose `SecuritySettingsPanel`

Files:

- `apps/web/src/app/settings/_components/SecuritySettingsPanel.tsx`
- new files under `apps/web/src/app/settings/_components/security/`

Target structure:

```txt
apps/web/src/app/settings/_components/security/
  RecoveryKeySection.tsx
  EncryptedBackupSection.tsx
  MarkdownPortabilitySection.tsx
  JsonWorkspacePortabilitySection.tsx
```

Tasks:

1. Move recovery-key state, handlers, and JSX into `RecoveryKeySection`.
2. Move encrypted backup state, handlers, and JSX into `EncryptedBackupSection`.
3. Move Markdown import/export state, handlers, and JSX into `MarkdownPortabilitySection`.
4. Move JSON workspace import/export state, handlers, and JSX into `JsonWorkspacePortabilitySection`.
5. Leave `SecuritySettingsPanel` as a thin composition component that owns shared context only if needed.
6. Keep each section direct and local; do not create generic status/error abstractions unless they delete meaningful duplication.

Rationale:

The initial split fixed the settings-page god component, but moved four independent workflows into one 587-line section component. Each workflow has distinct state and behavior, so each should own its own focused component.

### 4. Clean generated/runtime artifacts

Tasks:

1. Remove `.harness/` from the working tree if it is present and untracked.
2. Do not delete intentional source files or docs.
3. If runtime artifacts should recur, add or confirm ignore coverage separately.

### 5. Verify

Commands:

```bash
cd apps/web
bun run typecheck --pretty false
bun run test \
  src/components/__tests__/MeetingTranscriber.test.tsx \
  src/hooks/__tests__/useAudioCapture.test.ts \
  src/lib/sync/__tests__/remoteNoteApply.test.ts \
  src/lib/sync/__tests__/noteSyncLocalStore.test.ts \
  src/lib/sync/__tests__/recoveryBackupState.test.ts \
  src/lib/backup/__tests__/encryptedWorkspaceBackup.test.ts \
  src/lib/backup/__tests__/jsonWorkspacePortability.test.ts \
  src/lib/backup/__tests__/markdownPortability.test.ts
```

Expected result:

- Typecheck exits `0`.
- Focused tests pass. If a focused test fails for a pre-existing environment/config reason, document the exact failure and run the closest valid project-script equivalent.

## Non-goals

- Do not redesign the transcription provider UI beyond the current behavior.
- Do not introduce a generic form/status framework for settings sections.
- Do not change sync semantics, encryption formats, backup formats, or persistence behavior.
