# NoteChain User Guide

## Getting Started

### Creating Your Account

1. Visit [app.notechain.app](https://app.notechain.app)
2. Click "Get Started"
3. Enter your email and create a strong password
4. **Important**: Save your recovery key securely. We cannot recover your account without it.

### Understanding Encryption

NoteChain uses zero-knowledge encryption:

- Your notes are encrypted on your device before syncing
- Only you hold the encryption keys
- We cannot read your notes, even if compelled
- Your privacy is mathematically guaranteed

### Your First Note

1. Click the "+" button in the sidebar
2. Give your note a title
3. Start writing in the editor
4. Your note auto-saves and encrypts automatically

## Using the Editor

### Rich Text Formatting

- **Bold**: `**text**` or Ctrl/Cmd+B
- _Italic_: `*text*` or Ctrl/Cmd+I
- `Code`: `` `code` `` or Ctrl/Cmd+`
- [Links](https://example.com): `[text](url)`
- Headers: `# H1`, `## H2`, `### H3`

### Task Lists

Create checkboxes with:

```markdown
- [ ] Unchecked task
- [x] Completed task
```

### Tags

Add tags to organize your notes:

- Type `#` followed by the tag name
- Or use the tag selector in the sidebar
- Click any tag to filter notes

### Attachments

Drag and drop files into your notes:

- Images are displayed inline
- PDFs and other files are stored as attachments
- All attachments are encrypted

## AI Assistant

### Getting Suggestions

Select text and click the sparkle icon (✨) to:

- Get writing suggestions
- Summarize content
- Expand on ideas
- Fix grammar

### Privacy with AI

- AI operates on-device when possible
- Cloud AI uses secure enclaves
- Your data is never used to train models
- Processing is ephemeral (data discarded immediately)

### Commands

Type `/` in the editor to access AI commands:

- `/summarize` - Create a summary
- `/expand` - Expand on selected text
- `/rewrite` - Rewrite for clarity
- `/tags` - Suggest tags

## Organization

### Notebooks

Create notebooks to group related notes:

1. Click "New Notebook" in the sidebar
2. Name your notebook
3. Drag notes into it

### Favorites

Star important notes for quick access:

- Click the star icon on any note
- Access from the "Favorites" section

### Search

Press `Cmd/Ctrl + K` to search:

- Searches titles and content
- Filters by tags
- Recent notes appear first

## Sync & Backup

### Multiple Devices

NoteChain syncs across all your devices:

- Changes appear in real-time
- Works offline
- Automatic conflict resolution

### Offline Access

Your notes are stored locally:

- Access without internet
- Changes sync when reconnected
- Enable "Offline Mode" in settings

### Exporting

Export your notes anytime:

- **Markdown**: Preserves formatting
- **PDF**: For sharing
- **JSON**: Complete data export

Go to Settings → Export to download your data.

## Security

### Your Encryption Keys

- Stored in your browser's secure storage
- Protected by your password
- Never transmitted to our servers

### Recovery Key

Your recovery key is essential:

- Store in a password manager
- Write down and keep safe
- Needed if you forget your password

### Changing Password

1. Go to Settings → Security
2. Enter current password
3. Set new password
4. Re-encryption happens automatically

## Keyboard Shortcuts

| Shortcut               | Action            |
| ---------------------- | ----------------- |
| `Cmd/Ctrl + N`         | New note          |
| `Cmd/Ctrl + K`         | Search            |
| `Cmd/Ctrl + S`         | Save note         |
| `Cmd/Ctrl + Shift + D` | Delete note       |
| `Cmd/Ctrl + B`         | Bold              |
| `Cmd/Ctrl + I`         | Italic            |
| `Cmd/Ctrl + Shift + F` | Fullscreen editor |
| `Cmd/Ctrl + ?`         | Show shortcuts    |

## Tips & Tricks

### Daily Notes

Create a note with today's date:

- Use the command palette (`Cmd/Ctrl + Shift + P`)
- Type "Daily Note"
- Automatically creates dated note

### Templates

Create reusable templates:

1. Make a note with placeholder content
2. Save as template in settings
3. Use "New from Template" option

### Quick Capture

Use the browser extension or mobile share:

- Save articles for later
- Capture ideas instantly
- All encrypted automatically

### Linking Notes

Link between notes with `[[Note Title]]`:

- Creates bidirectional links
- See backlinks in sidebar
- Build a personal knowledge base

## Troubleshooting

### Sync Issues

If notes aren't syncing:

1. Check internet connection
2. Refresh the page
3. Check Settings → Sync Status
4. Force sync: `Cmd/Ctrl + Shift + R`

### Lost Encryption Key

If you lose your recovery key:

- We cannot recover your notes
- This is by design (zero-knowledge)
- Always keep your recovery key safe

### Performance

If the app feels slow:

- Clear browser cache
- Disable browser extensions
- Update to latest browser version
- Try incognito/private mode

## Getting Help

- **In-app Help**: Click the "?" icon
- **Email**: support@notechain.app
- **Documentation**: [docs.notechain.app](https://docs.notechain.app)
- **Community**: [community.notechain.app](https://community.notechain.app)

## Feedback

We love hearing from you:

- Use the feedback button in the app
- Email: feedback@notechain.app
- Feature requests welcome!
