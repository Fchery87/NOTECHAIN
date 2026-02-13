# Real-Time Collaboration

> Your thoughts. Encrypted. Together.

NoteChain's real-time collaboration enables multiple users to work on the same notes simultaneously with automatic conflict resolution, end-to-end encryption, and granular permission controls.

## Overview

NoteChain uses CRDTs (Conflict-free Replicated Data Types) to ensure that all collaborators see a consistent view of the document, even when working offline. All changes are encrypted end-to-end using AES-256-GCM before being synced.

## Key Features

- **Real-time Editing**: See collaborators' cursors and changes instantly
- **End-to-End Encryption**: All content is encrypted on the client before transmission
- **Permission Levels**: Fine-grained access control (view, comment, edit, admin)
- **Share Links**: Generate shareable links with expiration and usage limits
- **Version History**: Restore previous versions at any time
- **Activity Feed**: Track all changes made to shared documents
- **Team Workspaces**: Organize notes into team workspaces

## How to Share Notes

### 1. Using the Share Dialog

1. Open any note
2. Click the **Share** button in the toolbar
3. The Share dialog opens with two tabs:
   - **People**: Add collaborators by email
   - **Links**: Generate shareable links

### 2. Adding Collaborators

1. In the Share dialog, go to the **People** tab
2. Type a name or email in the search field
3. Select a permission level from the dropdown:
   - **View**: Can read only
   - **Comment**: Can read and add comments
   - **Edit**: Can read and edit
   - **Admin**: Full control including sharing

4. Click **Add** to grant access

### 3. Generating Share Links

1. In the Share dialog, go to the **Links** tab
2. Click **Create Link**
3. Set permission level for the link
4. Optionally set:
   - **Expiration**: Date when link expires
   - **Max uses**: Number of times link can be used
5. Click **Copy** to copy the link to clipboard

### 4. Managing Existing Shares

- **Change permission**: Select a new level from the dropdown next to a user
- **Remove access**: Click the trash icon next to a user
- **Revoke links**: Click **Revoke** next to any link

## Permission Levels

| Level   | View | Comment | Edit | Share | Delete |
| ------- | ---- | ------- | ---- | ----- | ------ |
| View    | ✓    | ✗       | ✗    | ✗     | ✗      |
| Comment | ✓    | ✓       | ✗    | ✗     | ✗      |
| Edit    | ✓    | ✓       | ✓    | ✗     | ✗      |
| Admin   | ✓    | ✓       | ✓    | ✓     | ✓      |

## Team Workspaces

### Creating a Team

1. Navigate to **Teams** in the sidebar
2. Click **Create Team**
3. Enter team name and description
4. Click **Create**

### Managing Team Members

1. Go to your team page
2. Click **Settings**
3. Under **Members**, you can:
   - Invite new members by email
   - Change member roles
   - Remove members

### Team Roles

| Role   | Create Notes | Manage Members | Delete Team |
| ------ | ------------ | -------------- | ----------- |
| Owner  | ✓            | ✓              | ✓           |
| Admin  | ✓            | ✓              | ✗           |
| Member | ✓            | ✗              | ✗           |
| Viewer | ✗            | ✗              | ✗           |

## Version History

Every change to a shared note is automatically saved. To view or restore previous versions:

1. Open the note
2. Click the **History** button in the toolbar
3. Browse versions in the timeline
4. Click **Preview** to see a version
5. Click **Restore** to revert to that version

## Activity Feed

The Activity Feed shows a timeline of all changes to shared notes, including:

- Note created/edited/deleted
- Users joined/left
- Permission changes
- Comments added

Access it from the note's **Activity** tab.

## Best Practices

1. **Use appropriate permissions**: Only grant Edit access to trusted collaborators
2. **Set link expiration**: Use expiration dates for sensitive documents
3. **Review activity**: Regularly check the Activity Feed for unexpected changes
4. **Use version history**: Restore previous versions if mistakes are made

## Troubleshooting

### Cursors not showing

- Ensure WebSocket connection is active (check connection indicator)
- Refresh the page

### Changes not syncing

- Check your internet connection
- Verify you have Edit permission
- Check the sync status in the toolbar

### Can't access shared note

- Verify the share link hasn't expired
- Check your permission level
- Contact the note owner for access

## Security

All collaboration features use end-to-end encryption:

- **Content**: Encrypted with AES-256-GCM before transmission
- **Keys**: Encrypted with the user's key pair
- **Storage**: All data stored encrypted at rest

Your encryption keys never leave your device.
