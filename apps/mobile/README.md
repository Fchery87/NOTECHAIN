# @notechain/mobile

NoteChain mobile application built with React Native for iOS and Android.

## Features

- Native iOS and Android support via Expo
- Offline-first with MMKV storage
- Crypto-native encryption using libsodium
- Supabase integration for sync and auth
- Touch/stylus PDF signing
- Calendar integration

## Key Dependencies

| Dependency        | Purpose                 |
| ----------------- | ----------------------- |
| react-native      | Core framework          |
| expo              | Platform abstractions   |
| @react-navigation | Navigation              |
| @notechain/\*     | Shared packages         |
| zustand           | State management        |
| react-native-mmkv | Local encrypted storage |

## Commands

```bash
# Start development server
bun run start

# Run on iOS
bun run ios

# Run on Android
bun run android

# Type checking
bun run typecheck

# Linting
bun run lint

# Formatting
bun run format

# Testing
bun run test
```
