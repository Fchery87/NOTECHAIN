# @notechain/web

NoteChain web application built with Next.js 14 as a Progressive Web App.

## Features

- Next.js 14 App Router
- PWA with offline support
- IndexedDB storage via Dexie.js
- SSR-ready architecture
- Responsive design
- PDF workflows

## Key Dependencies

| Dependency    | Purpose           |
| ------------- | ----------------- |
| next          | React framework   |
| react         | UI library        |
| dexie         | IndexedDB wrapper |
| @notechain/\* | Shared packages   |
| zustand       | State management  |
| pdf-lib       | PDF manipulation  |

## Commands

```bash
# Development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Type checking
bun run typecheck

# Linting
bun run lint

# Formatting
bun run format

# Testing
bun run test
```
