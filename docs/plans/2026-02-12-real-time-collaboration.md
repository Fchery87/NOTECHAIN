# Real-Time Collaboration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add real-time collaborative editing to NoteChain, enabling multiple users to edit notes simultaneously with automatic conflict resolution, permissions, and team workspaces.

**Architecture:** Extend the existing CRDT (Conflict-free Replicated Data Type) implementation in `sync-engine` to support multi-user scenarios. Use Bun's native WebSocket for real-time communication. Implement permission layers (view/edit/comment) and user presence awareness.

**Tech Stack:** React, TypeScript, Bun WebSocket (native), CRDT (LWW-Element-Set), Yjs (optional for complex sync), existing encryption layer, Supabase for user management

**Test Framework:** Vitest + React Testing Library + WebSocket mocking

**Cost:** $0 (uses existing infrastructure + Bun WebSocket)

**Timeline:** 4-6 weeks

---

## Prerequisites

Before starting, verify the existing infrastructure:

**Step 0.1: Check existing CRDT implementation**

Run: `ls -la packages/sync-engine/src/`
Expected: Shows existing sync implementation

**Step 0.2: Check auth system**

Run: `ls -la apps/web/src/lib/auth/`
Expected: Auth utilities exist

**Step 0.3: Verify tests pass**

Run: `bun test` from project root

---

## Phase 1: Core Infrastructure (Week 1-2)

## Task 1: Create Permission System

**Files:**

- Create: `packages/core-crypto/src/permissions/PermissionManager.ts`
- Create: `packages/core-crypto/src/permissions/types.ts`
- Test: `packages/core-crypto/src/permissions/__tests__/PermissionManager.test.ts`

**Step 1.1: Create permission types**

Create `packages/core-crypto/src/permissions/types.ts`:

- PermissionLevel enum: 'none' | 'view' | 'comment' | 'edit' | 'admin'
- Permission interface: userId, resourceId, level, grantedAt, grantedBy
- ResourceType enum: 'note' | 'folder' | 'workspace'
- ShareLink interface: id, resourceId, permissionLevel, expiresAt?, maxUses?

**Step 1.2: Write tests**

Test PermissionManager:

- Grant permission
- Check permission
- Revoke permission
- Update permission
- List permissions for resource
- List permissions for user
- Check share link validity
- Validate permission inheritance

**Step 1.3: Implement PermissionManager**

Create `PermissionManager` class:

- grantPermission(userId, resourceId, level, grantedBy)
- revokePermission(userId, resourceId)
- updatePermission(userId, resourceId, newLevel)
- checkPermission(userId, resourceId): PermissionLevel
- getResourcePermissions(resourceId): Permission[]
- getUserPermissions(userId): Permission[]
- createShareLink(resourceId, level, options)
- validateShareLink(linkId): boolean

Uses existing encrypted storage for permissions.

**Step 1.4: Run tests and commit**

```bash
git add packages/core-crypto/src/permissions/
git commit -m "feat(collab): add permission system

- Create PermissionManager for access control
- Support 5 permission levels: none, view, comment, edit, admin
- Implement share links with expiration and usage limits
- Add comprehensive test coverage"
```

---

## Task 2: Create WebSocket Server

**Files:**

- Create: `packages/sync-engine/src/server/WebSocketServer.ts`
- Create: `packages/sync-engine/src/server/ConnectionManager.ts`
- Test: `packages/sync-engine/src/server/__tests__/WebSocketServer.test.ts`

**Step 2.1: Create ConnectionManager**

Manages WebSocket connections:

- Track connected users per document
- Handle user join/leave
- Broadcast messages to document participants
- Handle connection authentication

**Step 2.2: Write WebSocket server**

Create Bun WebSocket server:

- Port: 3001 (separate from HTTP)
- Handle connection upgrade
- Authenticate connections via JWT
- Manage document rooms
- Handle message types:
  - JOIN_DOCUMENT
  - LEAVE_DOCUMENT
  - OPERATION (CRDT operations)
  - CURSOR_POSITION
  - SELECTION
  - PRESENCE

**Step 2.3: Implement message handlers**

- onConnect: Authenticate, add to connections map
- onMessage: Route by type, validate permissions
- onDisconnect: Clean up, notify others
- Broadcast to document: Send to all users editing same doc

**Step 2.4: Run tests and commit**

```bash
git add packages/sync-engine/src/server/
git commit -m "feat(collab): add WebSocket server

- Create Bun native WebSocket server
- Implement ConnectionManager for tracking users
- Support document rooms and broadcasting
- Add authentication and permission validation
- Add comprehensive test coverage"
```

---

## Task 3: Extend CRDT for Multi-User

**Files:**

- Modify: `packages/sync-engine/src/crdt/DocumentCRDT.ts` (or create)
- Create: `packages/sync-engine/src/crdt/MultiUserSync.ts`
- Test: `packages/sync-engine/src/crdt/__tests__/MultiUserSync.test.ts`

**Step 3.1: Analyze existing CRDT**

Review existing LWW-Element-Set implementation:

- Understand current single-user optimization
- Identify multi-user requirements

**Step 3.2: Create MultiUserSync**

Extend CRDT for collaboration:

- Operation types: INSERT, DELETE, RETAIN, FORMAT
- Vector clocks for ordering
- User IDs in operations
- Conflict resolution strategies
- Transform operations (OT) for cursor positions

**Step 3.3: Implement sync protocol**

Message structure:

```typescript
interface SyncMessage {
  type: 'operation' | 'sync' | 'presence';
  documentId: string;
  userId: string;
  timestamp: number;
  vectorClock: VectorClock;
  operation?: CRDTOperation;
  presence?: PresenceInfo;
}
```

**Step 3.4: Run tests and commit**

```bash
git add packages/sync-engine/src/crdt/
git commit -m "feat(collab): extend CRDT for multi-user sync

- Add vector clocks for operation ordering
- Implement multi-user operation types
- Add transform operations for cursors
- Support conflict resolution strategies
- Add comprehensive test coverage"
```

---

## Phase 2: Client-Side Implementation (Week 2-3)

## Task 4: Create Collaboration Hook

**Files:**

- Create: `apps/web/src/hooks/useCollaboration.ts`
- Create: `apps/web/src/hooks/useWebSocket.ts`
- Test: `apps/web/src/hooks/__tests__/useCollaboration.test.ts`

**Step 4.1: Create useWebSocket hook**

Manages WebSocket connection:

- Connect to server
- Reconnect on disconnect
- Handle authentication
- Send/receive messages
- Connection state (connected, disconnected, connecting)

**Step 4.2: Create useCollaboration hook**

Main collaboration interface:

- Props: documentId, userId, permissionLevel
- State:
  - connectedUsers: UserPresence[]
  - isConnected: boolean
  - pendingOperations: Operation[]
  - localCursor: CursorPosition
- Methods:
  - sendOperation(operation)
  - updateCursor(position)
  - updateSelection(range)
- Events:
  - onUserJoin
  - onUserLeave
  - onRemoteOperation
  - onCursorUpdate

**Step 4.3: Integrate with TipTap**

Hook into TipTap editor:

- Listen for local changes
- Convert to CRDT operations
- Send via WebSocket
- Apply remote operations to editor
- Handle conflicts

**Step 4.4: Run tests and commit**

```bash
git add apps/web/src/hooks/
git commit -m "feat(collab): add collaboration hooks

- Create useWebSocket for connection management
- Create useCollaboration for document sync
- Integrate with TipTap editor
- Support real-time operation sync
- Add comprehensive test coverage"
```

---

## Task 5: Create Collaborative Editor Component

**Files:**

- Create: `apps/web/src/components/CollaborativeEditor.tsx`
- Create: `apps/web/src/components/CollaborationPresence.tsx`
- Create: `apps/web/src/components/CollaborationCursors.tsx`
- Test: `apps/web/src/components/__tests__/CollaborativeEditor.test.tsx`

**Step 5.1: Create CollaborationPresence**

Show active users:

- User avatars in toolbar
- Connection status indicators
- User names on hover
- Color coding per user

**Step 5.2: Create CollaborationCursors**

Render remote cursors:

- Cursor position markers
- User name labels near cursors
- Selection highlights
- Different colors per user
- Smooth animations for cursor movement

**Step 5.3: Create CollaborativeEditor**

Wrap NoteEditor with collaboration:

- Use useCollaboration hook
- Render CollaborationPresence
- Render CollaborationCursors
- Show connection status
- Show sync indicator (saving/saved)
- Handle permission level (read-only vs edit)
- Show "User is editing..." indicators

**Step 5.4: Run tests and commit**

```bash
git add apps/web/src/components/
git commit -m "feat(collab): add collaborative editor components

- Create CollaborationPresence for active users
- Create CollaborationCursors for remote cursors
- Create CollaborativeEditor wrapping NoteEditor
- Support permission-based editing
- Add connection and sync indicators
- Add comprehensive test coverage"
```

---

## Phase 3: Sharing & Permissions UI (Week 3-4)

## Task 6: Create Share Dialog

**Files:**

- Create: `apps/web/src/components/ShareDialog.tsx`
- Create: `apps/web/src/components/PermissionSelector.tsx`
- Create: `apps/web/src/components/ShareLinkManager.tsx`
- Test: `apps/web/src/components/__tests__/ShareDialog.test.tsx`

**Step 6.1: Create PermissionSelector**

Dropdown for permission levels:

- View: Can read only
- Comment: Can read and add comments
- Edit: Can read and edit
- Admin: Full control including sharing

**Step 6.2: Create ShareLinkManager**

Manage shareable links:

- Create new share link
- Set expiration date
- Set max uses
- Copy link to clipboard
- Revoke links
- View usage statistics

**Step 6.3: Create ShareDialog**

Main sharing interface:

- Modal dialog
- Current permissions list
- Add user by email/username
- Set permission level
- Generate share link
- Manage existing shares
- Visibility toggle (private, link, public)

**Step 6.4: Run tests and commit**

```bash
git add apps/web/src/components/
git commit -m "feat(collab): add share dialog components

- Create ShareDialog for managing permissions
- Create PermissionSelector for access levels
- Create ShareLinkManager for link sharing
- Support user invites and link generation
- Add comprehensive test coverage"
```

---

## Task 7: Create Activity Feed

**Files:**

- Create: `apps/web/src/components/ActivityFeed.tsx`
- Create: `apps/web/src/lib/activity/activityLog.ts`
- Test: `apps/web/src/components/__tests__/ActivityFeed.test.tsx`

**Step 7.1: Create activity logger**

Log activities:

- Note created/edited/deleted
- User joined/left
- Permission changes
- Comments added
- Versions saved

**Step 7.2: Create ActivityFeed component**

Display recent activity:

- Timeline of events
- User avatars and names
- Action descriptions
- Timestamps (relative)
- Filter by event type
- Real-time updates

**Step 7.3: Run tests and commit**

```bash
git add apps/web/src/components/ apps/web/src/lib/activity/
git commit -m "feat(collab): add activity feed

- Create activity logger for tracking changes
- Create ActivityFeed component for timeline view
- Support real-time activity updates
- Add filtering by event type
- Add comprehensive test coverage"
```

---

## Task 8: Create Version History

**Files:**

- Create: `apps/web/src/components/VersionHistory.tsx`
- Create: `apps/web/src/lib/versions/versionManager.ts`
- Test: `apps/web/src/components/__tests__/VersionHistory.test.tsx`

**Step 8.1: Create version manager**

Save and restore versions:

- Auto-save versions periodically
- Save version on explicit action
- Store version metadata (timestamp, user, changes)
- Restore to previous version
- Compare versions

**Step 8.2: Create VersionHistory component**

Version browser UI:

- List of versions (newest first)
- Version preview
- Restore button
- Compare mode
- Who made changes
- When changes were made
- Change summary

**Step 8.3: Run tests and commit**

```bash
git add apps/web/src/components/ apps/web/src/lib/versions/
git commit -m "feat(collab): add version history

- Create version manager for saving snapshots
- Create VersionHistory component for browsing
- Support restore and compare
- Add auto-save functionality
- Add comprehensive test coverage"
```

---

## Phase 4: Team Workspaces (Week 4-5)

## Task 9: Create Team/Workspace System

**Files:**

- Create: `apps/web/src/lib/teams/teamManager.ts`
- Create: `apps/web/src/lib/teams/types.ts`
- Modify: `apps/web/src/lib/storage/` (add team storage)
- Test: `apps/web/src/lib/teams/__tests__/teamManager.test.ts`

**Step 9.1: Create team types**

Team interfaces:

- Team: id, name, description, ownerId, members, createdAt
- TeamMember: userId, role, joinedAt
- Workspace: id, teamId, name, folders, settings

**Step 9.2: Create team manager**

Team operations:

- createTeam(name, ownerId)
- inviteMember(teamId, email, role)
- acceptInvite(inviteId)
- removeMember(teamId, userId)
- updateMemberRole(teamId, userId, newRole)
- deleteTeam(teamId)
- getTeam(teamId)
- getUserTeams(userId)

**Step 9.3: Run tests and commit**

```bash
git add apps/web/src/lib/teams/
git commit -m "feat(collab): add team workspace system

- Create team management functionality
- Support member invites and roles
- Add workspace organization
- Integrate with permission system
- Add comprehensive test coverage"
```

---

## Task 10: Create Team UI Components

**Files:**

- Create: `apps/web/src/components/TeamSwitcher.tsx`
- Create: `apps/web/src/components/TeamSettings.tsx`
- Create: `apps/web/src/components/MemberList.tsx`
- Create: `apps/web/src/app/teams/page.tsx`
- Test: Various test files

**Step 10.1: Create TeamSwitcher**

Dropdown to switch between teams:

- List user's teams
- Create new team
- Switch context

**Step 10.2: Create TeamSettings**

Team management UI:

- Team name and description
- Member list with roles
- Invite new members
- Delete team
- Workspace settings

**Step 10.3: Create team pages**

- /teams - List all teams
- /teams/[id] - Team dashboard
- /teams/[id]/settings - Team settings

**Step 10.4: Run tests and commit**

```bash
git add apps/web/src/components/ apps/web/src/app/teams/
git commit -m "feat(collab): add team UI components

- Create TeamSwitcher for context switching
- Create TeamSettings for management
- Add team pages and routing
- Support team creation and invites
- Add comprehensive test coverage"
```

---

## Phase 5: Integration & Polish (Week 5-6)

## Task 11: Integrate with Existing Note System

**Files:**

- Modify: `apps/web/src/components/NoteEditor.tsx`
- Modify: `apps/web/src/app/notes/[id]/page.tsx`
- Modify: `apps/web/src/components/NoteCard.tsx`

**Step 11.1: Update NoteEditor**

Add collaboration features:

- Use CollaborativeEditor when note is shared
- Show share button in toolbar
- Show collaboration status
- Handle permissions

**Step 11.2: Update note pages**

- Check permissions on load
- Show appropriate UI based on permission level
- Handle share links

**Step 11.3: Update NoteCard**

Show collaboration indicators:

- Shared icon if note has collaborators
- Permission level badge
- Last edited by

**Step 11.4: Run tests and commit**

```bash
git add apps/web/src/components/ apps/web/src/app/notes/
git commit -m "feat(collab): integrate with existing note system

- Update NoteEditor with collaboration features
- Add permission checks on note pages
- Show collaboration indicators in note cards
- Support share links and permissions"
```

---

## Task 12: Add Navigation and Documentation

**Files:**

- Modify: `apps/web/src/app/components/Navigation.tsx`
- Create: `docs/features/real-time-collaboration.md`

**Step 12.1: Update navigation**

Add team/workspace links:

- Teams link in navigation
- Current team indicator
- Create team button

**Step 12.2: Create documentation**

Comprehensive docs covering:

- Real-time collaboration overview
- How to share notes
- Permission levels explained
- Team workspaces
- Version history
- Activity feed
- Best practices
- Troubleshooting

**Step 12.3: Commit**

```bash
git add apps/web/src/app/components/Navigation.tsx docs/features/real-time-collaboration.md
git commit -m "feat(collab): add navigation and documentation

- Update navigation with team links
- Add comprehensive collaboration documentation
- Document permissions and best practices"
```

---

## Summary

**Total Tasks:** 12
**Estimated Time:** 4-6 weeks
**Cost:** $0 (uses existing infrastructure)

**What Was Built:**

1. ✅ Permission system with 5 access levels
2. ✅ Bun WebSocket server
3. ✅ Extended CRDT for multi-user sync
4. ✅ Collaboration hooks (useCollaboration, useWebSocket)
5. ✅ Collaborative editor with cursors and presence
6. ✅ Share dialog and permission UI
7. ✅ Activity feed
8. ✅ Version history
9. ✅ Team workspace system
10. ✅ Team UI components
11. ✅ Integration with existing notes
12. ✅ Navigation and documentation

**Key Features:**

- Real-time collaborative editing
- Conflict-free replicated data types (CRDT)
- Permission system (view/comment/edit/admin)
- Team workspaces
- Version history
- Activity feed
- Share links
- User presence and cursors

**Architecture Highlights:**

- Bun native WebSocket (no Socket.io)
- Extended existing CRDT implementation
- Vector clocks for operation ordering
- Transform operations for cursors
- Encrypted storage for permissions

**Privacy & Security:**

- End-to-end encryption for document content
- Permission-based access control
- Share links with expiration
- All data encrypted at rest

**Next Steps:**

- Scale testing with multiple users
- Mobile responsiveness for collaboration
- Offline support with sync queue
- Advanced conflict resolution UI

**This implementation transforms NoteChain from a single-user app to a team collaboration platform!**
