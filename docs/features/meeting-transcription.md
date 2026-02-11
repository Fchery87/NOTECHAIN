# Meeting Transcription

> AI-powered meeting transcription with automatic action item extraction — 100% private and local.

## Overview

NoteChain's meeting transcription feature transforms how you capture and manage meeting content. Using a local Whisper AI model, it automatically transcribes audio recordings and extracts action items — all without sending any data to external servers.

**Key Benefits:**

- **100% Private**: Audio never leaves your device
- **Zero Cost**: No API fees or subscription costs
- **Instant Results**: Real-time transcription as you record
- **Actionable**: Automatic detection of tasks and commitments
- **Integrated**: Seamlessly connects with your notes and calendar

---

## Features

### 🎯 Local AI Transcription

Powered by OpenAI's Whisper model running locally in your browser:

- **100% free** — no API costs or usage limits
- **Works offline** once model is downloaded
- **High accuracy** across multiple accents and speaking styles
- **Fast processing** with GPU acceleration where available

### ✅ Automatic Action Item Detection

Smart AI extraction identifies:

- Tasks and to-dos mentioned in meetings
- Deadlines and time-sensitive commitments
- Assigned responsibilities ("John will...", "I'll handle...")
- Follow-up items and next steps

### 🔐 Encrypted Storage

All meeting data is protected with:

- **XSalsa20-Poly1305 encryption** for transcripts and audio
- **Local-first storage** — data stays on your device
- **Secure backups** with encrypted sync to your private cloud
- **No data mining** — your conversations remain private

### 📅 Calendar Integration

Connect with your calendar to:

- Pre-populate meeting metadata (title, participants, time)
- Link transcripts to calendar events
- Automatic reminders for action items
- Export to calendar as events or tasks

### 📤 Export Capabilities

Share and archive transcripts in multiple formats:

- **Markdown** — for note integration
- **Plain Text** — for universal compatibility
- **JSON** — for programmatic access
- **PDF** — for formal documentation

### 🔍 Full-Text Search

Instantly find any meeting content:

- Search across all transcripts
- Filter by date, participant, or meeting type
- Find specific action items or decisions
- Jump to exact timestamps in recordings

---

## How It Works

### The Transcription Pipeline

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Record    │───▶│   Whisper    │───▶│    Extract   │───▶│   Encrypt &  │
│   Audio     │    │  Transcribe  │    │ Action Items │    │    Store     │
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Step-by-Step Process

1. **Record** — Capture meeting audio via your microphone
2. **Transcribe** — Whisper model processes audio locally
3. **Extract** — AI identifies action items and key decisions
4. **Encrypt** — All data encrypted with XSalsa20-Poly1305
5. **Store** — Saved locally with optional encrypted backup
6. **Integrate** — Linked to notes, calendar, and knowledge graph

### Privacy Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR DEVICE                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Browser    │  │ Local Whisper│  │  Encrypted   │  │
│  │   Recording  │  │    Model     │  │   Storage    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼ (optional encrypted sync)
              ┌─────────────────────────────┐
              │      YOUR PRIVATE CLOUD     │
              │    (end-to-end encrypted)   │
              └─────────────────────────────┘
```

**No external AI services. No data sharing. Complete privacy.**

---

## Usage

### Accessing the Meetings Page

1. Open NoteChain and sign in
2. Navigate to **Meetings** from the main sidebar
3. View your meeting history or start a new recording

### Recording a Meeting

1. Click **"New Meeting"** button
2. Grant microphone permissions when prompted
3. Click **"Start Recording"** when ready
4. Speak naturally — transcription happens in real-time
5. Click **"Stop Recording"** when finished
6. Review and save the transcript

**Tips for best results:**

- Use a quality microphone
- Minimize background noise
- Speak clearly at a moderate pace
- Position microphone centrally if multiple speakers

### Viewing the Transcript

After recording, your transcript includes:

- **Full text** of the conversation with timestamps
- **Speaker labels** (when diarization is enabled)
- **Highlighted action items** automatically detected
- **Search functionality** to find specific moments

### Managing Action Items

Detected action items appear in a dedicated panel:

- Review AI-extracted tasks
- Edit descriptions or add details
- Assign due dates and priorities
- Mark complete as you finish them
- Convert to standalone notes

### Exporting Transcripts

From the meeting detail view:

1. Click **"Export"** button
2. Choose your preferred format:
   - Markdown (.md)
   - Plain Text (.txt)
   - JSON (.json)
   - PDF (.pdf)
3. Select content to include (full transcript, action items only, etc.)
4. Download or share directly

### Calendar Integration

**Connecting your calendar:**

1. Go to **Settings** → **Integrations**
2. Select your calendar provider (Google, Outlook, etc.)
3. Authenticate with OAuth (secure, scoped permissions)
4. Enable automatic meeting linking

**How it works:**

- Calendar events pre-populate meeting metadata
- Transcripts automatically link to events
- Action items can create calendar tasks
- Meeting reminders include transcript links

---

## Privacy & Security

### Local Processing Guarantee

✅ **Audio never leaves your device**

The Whisper model runs entirely in your browser using WebAssembly and WebGL acceleration. No audio data is sent to any server for processing.

### Encryption Standards

- **Algorithm**: XSalsa20-Poly1305 (NaCl/libsodium standard)
- **Key management**: Derived from your master password
- **Storage**: All transcripts and metadata encrypted at rest
- **Sync**: End-to-end encrypted backup to your private cloud

### Data Sovereignty

- You own all your data
- No data mining or profiling
- No third-party AI services
- No analytics or tracking
- Export your data anytime

### Browser Security

- Web Audio API with secure contexts (HTTPS)
- Microphone access requires explicit permission
- No persistent audio storage without encryption
- Automatic session timeout for security

---

## Browser Support

### Supported Browsers

Meeting transcription requires modern browser features:

| Browser | Version | Status          |
| ------- | ------- | --------------- |
| Chrome  | 90+     | ✅ Full support |
| Firefox | 88+     | ✅ Full support |
| Safari  | 14.1+   | ✅ Full support |
| Edge    | 90+     | ✅ Full support |
| Brave   | 1.20+   | ✅ Full support |

### Required Permissions

- **Microphone**: Essential for recording
- **Storage**: For local model caching and data storage
- **Notifications**: Optional, for meeting reminders

### System Requirements

- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for Whisper model cache
- **CPU**: Modern multi-core processor
- **GPU**: Optional, accelerates transcription

---

## Future Enhancements

### 🌍 Multi-Language Support

- Automatic language detection
- 99+ languages supported by Whisper
- Mixed-language meeting support
- Real-time translation overlay

### 👥 Speaker Diarization

- Automatic speaker identification
- "Who said what" attribution
- Speaker profiles and voice signatures
- Multi-person meeting support

### ⚡ Real-Time Transcription

- Live transcription as you speak
- Streaming word-by-word display
- Immediate action item detection
- Collaborative live editing

### 📋 Meeting Templates

- Pre-defined meeting structures
- Custom templates for standups, 1:1s, retrospectives
- Automatic section detection
- Structured note generation

### 🔗 Enhanced Integrations

- Zoom/Teams/Meet meeting import
- Automatic recording upload
- CRM integration for sales calls
- Project management tool sync

### 🤖 Smart Summaries

- AI-generated meeting summaries
- Key decision extraction
- Sentiment analysis
- Meeting quality insights

---

## Troubleshooting

### Common Issues

**Transcription quality is poor**

- Check microphone placement and quality
- Reduce background noise
- Speak clearly and at moderate pace
- Ensure browser has microphone access

**Recording won't start**

- Verify microphone permissions in browser settings
- Check that microphone isn't used by another app
- Try refreshing the page
- Restart browser if issues persist

**Model download is slow**

- First use requires downloading Whisper (~150MB)
- Downloads are cached for future use
- Use a stable internet connection for initial setup
- Consider using smaller model variants for faster loading

**Action items not detected**

- Ensure clear task language ("I will...", "Need to...")
- Check that dates/deadlines are mentioned explicitly
- Review and manually add items if needed
- AI improves with context over time

### Getting Help

- **Documentation**: [docs.notechain.app](https://docs.notechain.app)
- **GitHub Issues**: [github.com/notechain/notechain/issues](https://github.com/notechain/notechain/issues)
- **Community Discord**: [discord.gg/notechain](https://discord.gg/notechain)
- **Email Support**: support@notechain.app

---

## Related Documentation

- [Voice-to-Text](./voice-to-text.md) — General voice capture features
- [Knowledge Graph](./knowledge-graph.md) — How meetings connect to your notes
- [Privacy Policy](../privacy-policy.md) — Complete privacy practices
- [API Documentation](../api/README.md) — Programmatic access to meetings

---

_Your meetings. Your words. Your privacy. — NoteChain_
