# @notechain/desktop

NoteChain desktop application built with Tauri 2.0 (Rust + React).

## Features

- Cross-platform desktop (Windows, macOS, Linux)
- Native system integration
- Secure file system access
- System tray support
- Auto-updates

## Key Dependencies

| Dependency      | Purpose          |
| --------------- | ---------------- |
| @tauri-apps/api | Tauri IPC        |
| react           | UI library       |
| @notechain/\*   | Shared packages  |
| zustand         | State management |

## Commands

```bash
# Development
bun run tauri dev

# Build for production
bun run tauri build

# Type checking
bun run typecheck

# Linting
bun run lint

# Formatting
bun run format

# Testing
bun run test
```
