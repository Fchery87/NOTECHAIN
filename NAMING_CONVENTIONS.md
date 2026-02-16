# NoteChain Naming Conventions Guide

This document establishes naming conventions for the NoteChain codebase to ensure consistency and readability across all files and components.

---

## Table of Contents

1. [File Naming](#file-naming)
2. [Component Naming](#component-naming)
3. [Function & Variable Naming](#function--variable-naming)
4. [Database Naming](#database-naming)
5. [TypeScript Interfaces & Types](#typescript-interfaces--types)
6. [CSS & Styling](#css--styling)
7. [API Routes](#api-routes)

---

## File Naming

### React Components

- **PascalCase** for component files
- Match the component name

```
✅ Good:
components/NoteEditor.tsx
components/TodoList.tsx
components/PDFViewer.tsx

❌ Avoid:
components/note-editor.tsx
components/todo_list.tsx
```

### Utility & Helper Files

- **kebab-case** for utility files
- Descriptive, action-oriented names

```
✅ Good:
lib/security/rate-limiter.ts
lib/neon-client.ts
lib/db.ts

❌ Avoid:
lib/security/RateLimiter.ts
lib/NeonClient.ts
```

### Hook Files

- **camelCase** with `use` prefix
- Match the hook export name

```
✅ Good:
hooks/useWebSocket.ts
hooks/useCollaboration.ts
hooks/useAuth.ts

❌ Avoid:
hooks/WebSocket.ts
hooks/use-websocket.ts
```

### Test Files

- Same naming as the file being tested
- `.test.ts` or `.spec.ts` suffix

```
✅ Good:
hooks/useCollaboration.test.ts
components/NoteEditor.spec.tsx

❌ Avoid:
hooks/useCollaboration_test.ts
```

---

## Component Naming

### Component Declaration

- **PascalCase** for component names
- Descriptive, noun-based names

```tsx
✅ Good:
export function NoteEditor() { ... }
export const TodoList = () => { ... }
export class PDFRepository { ... }

❌ Avoid:
export function noteEditor() { ... }
export const todo_list = () => { ... }
```

### Prop Interfaces

- Component name + `Props` suffix
- Export alongside component

```tsx
✅ Good:
interface NoteEditorProps {
  noteId: string;
  onSave: (content: string) => void;
}

export function NoteEditor({ noteId, onSave }: NoteEditorProps) { ... }

❌ Avoid:
interface INoteEditor { ... }
interface noteEditorData { ... }
```

---

## Function & Variable Naming

### Functions

- **camelCase** for all functions
- Verb-first for actions
- Boolean-returning functions use `is`, `has`, `can`, `should` prefixes

```tsx
✅ Good:
function getNoteById(id: string) { ... }
function createTodo(todo: Todo) { ... }
function isAuthenticated() { ... }
function hasPermission(user: User, action: string) { ... }
function canEditDocument(doc: Document) { ... }

❌ Avoid:
function GetNoteById() { ... }
function note_create() { ... }
function authenticated() { ... }
```

### Event Handlers

Two acceptable patterns:

1. **`handle` prefix** - for internal component handlers
2. **`on` prefix** - for prop callbacks passed to components

```tsx
✅ Good (Internal handlers):
function handleSubmit(e: FormEvent) { ... }
function handleNoteChange(content: string) { ... }
<button onClick={handleClick}>

✅ Good (Prop callbacks):
interface NoteEditorProps {
  onSave: (content: string) => void;
  onCancel: () => void;
}

// Usage:
<NoteEditor onSave={handleSave} onCancel={handleCancel} />

❌ Avoid mixing:
interface NoteEditorProps {
  handleSave: (content: string) => void; // Don't use 'handle' in props
}
```

### Variables

- **camelCase** for all variables
- Descriptive, meaningful names
- Boolean variables use `is`, `has`, `can`, `should` prefixes

```tsx
✅ Good:
const noteCount = notes.length;
const isLoading = true;
const hasUnsavedChanges = false;
const currentUser = useAuth();

❌ Avoid:
const NoteCount = notes.length;
const loading = true;
const unsaved = false;
```

### Constants

- **SCREAMING_SNAKE_CASE** for true constants
- **camelCase** for configuration objects

```tsx
✅ Good:
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://api.notechain.app';
const DEFAULT_PAGE_SIZE = 20;

const defaultConfig = {
  timeout: 5000,
  retries: 3,
};

❌ Avoid:
const maxRetries = 3; // Should be MAX_RETRIES
const api_base_url = '...';
```

### Private/Internal Variables

- Prefix with underscore when intentionally unused or internal

```tsx
✅ Good:
const _internalState = useRef(null);
// Unused parameter in destructuring
const { id, _unused, name } = data;

❌ Avoid:
const __privateVar = 1;
const m_memberVariable = 1;
```

---

## Database Naming

### Table Names

- **snake_case** (plural)
- Descriptive, domain-driven names

```sql
✅ Good:
notes
todos
pdf_signatures
calendar_events
meeting_transcripts

❌ Avoid:
Notes
note
pdfSignatures
```

### Column Names

- **snake_case**
- Consistent with table naming

```sql
✅ Good:
created_at
updated_at
user_id
folder_id

❌ Avoid:
createdAt
userId
folderId
```

### Primary Keys

- Use `id` as the primary key column name

```sql
✅ Good:
id UUID PRIMARY KEY DEFAULT gen_random_uuid();

❌ Avoid:
note_id UUID PRIMARY KEY
notes_id UUID PRIMARY KEY
```

### Foreign Keys

- `{referenced_table}_id` pattern

```sql
✅ Good:
user_id REFERENCES users(id)
folder_id REFERENCES folders(id)

❌ Avoid:
userId REFERENCES users(id)
folder REFERENCES folders(id)
```

---

## TypeScript Interfaces & Types

### Interfaces vs Types

- Use **interfaces** for object shapes that can be extended
- Use **types** for unions, intersections, and computed types

```tsx
✅ Good:
interface User {
  id: string;
  email: string;
}

type Status = 'pending' | 'completed' | 'failed';
type NoteWithTags = Note & { tags: Tag[] };

❌ Avoid:
type User = {
  id: string;
  email: string;
}
```

### Naming Convention

- **PascalCase** for all types and interfaces
- No `I` prefix for interfaces

```tsx
✅ Good:
interface Note { ... }
interface TodoProps { ... }
type UserRole = 'admin' | 'user';

❌ Avoid:
interface INote { ... }
interface todo_props { ... }
type userRole = 'admin' | 'user';
```

### Generic Type Parameters

- Single uppercase letter for simple cases
- Descriptive PascalCase for complex cases

```tsx
✅ Good:
function identity<T>(value: T): T { ... }
interface Repository<T extends BaseEntity> { ... }
type ApiResponse<TData, TError> = { ... };

❌ Avoid:
function identity<type>(value: type): type { ... }
```

---

## CSS & Styling

### Tailwind CSS Classes

- Use consistent ordering (layout → spacing → visual → typography → state)
- Group related classes

```tsx
✅ Good:
<div className="
  flex items-center justify-between
  px-6 py-4
  bg-stone-50 rounded-xl border border-stone-200
  text-stone-700 font-medium
  hover:bg-stone-100 transition-colors duration-300
">

❌ Avoid:
<div className="text-stone-700 flex px-6 bg-stone-50 hover:bg-stone-100 py-4">
```

### Custom CSS Classes

- **kebab-case** for class names
- BEM-like naming for component-scoped styles

```css
✅ Good:
.note-editor { ... }
.note-editor__toolbar { ... }
.note-editor--fullscreen { ... }

❌ Avoid:
.noteEditor { ... }
.NoteEditor { ... }
```

### CSS Variables

- **kebab-case** with descriptive prefixes

```css
✅ Good:
--color-bg-primary
--color-text-muted
--spacing-md
--font-serif

❌ Avoid:
--colorBgPrimary
--text-muted-color
```

---

## API Routes

### Route File Naming

- **kebab-case** for route files
- Follow Next.js App Router conventions

```
✅ Good:
app/api/auth/login/route.ts
app/api/admin/users/route.ts
app/api/notes/[id]/route.ts

❌ Avoid:
app/api/auth/Login/route.ts
app/api/admin_users/route.ts
```

### Route Handlers

- Named exports for HTTP methods

```tsx
✅ Good:
export async function GET(request: Request) { ... }
export async function POST(request: Request) { ... }
export async function PUT(request: Request) { ... }
export async function DELETE(request: Request) { ... }

❌ Avoid:
export async function getNotes(request: Request) { ... }
export async function handlePost(request: Request) { ... }
```

---

## Quick Reference

| Category                  | Convention           | Example              |
| ------------------------- | -------------------- | -------------------- |
| React Components          | PascalCase           | `NoteEditor.tsx`     |
| Utility Files             | kebab-case           | `rate-limiter.ts`    |
| Hooks                     | camelCase + use      | `useAuth.ts`         |
| Functions                 | camelCase            | `getNoteById()`      |
| Boolean Functions         | is/has/can prefix    | `isAuthenticated()`  |
| Event Handlers (internal) | handle prefix        | `handleSubmit()`     |
| Event Props               | on prefix            | `onSave`             |
| Variables                 | camelCase            | `noteCount`          |
| Constants                 | SCREAMING_SNAKE_CASE | `MAX_RETRIES`        |
| Database Tables           | snake_case (plural)  | `calendar_events`    |
| Database Columns          | snake_case           | `created_at`         |
| TypeScript Types          | PascalCase           | `UserRole`           |
| CSS Classes               | kebab-case           | `.note-editor`       |
| CSS Variables             | kebab-case           | `--color-bg-primary` |

---

## Enforcement

### ESLint Rules

Add these rules to `eslint.config.mjs` to enforce naming conventions:

```javascript
{
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow',
      },
      {
        selector: 'function',
        format: ['camelCase', 'PascalCase'],
        filter: {
          regex: '^GET$|^POST$|^PUT$|^DELETE$|^PATCH$',
          match: false,
        },
      },
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: false,
        },
      },
    ],
  },
}
```

### Pre-commit Hooks

Consider adding a pre-commit hook to check naming conventions:

```bash
#!/bin/sh
# Check for common naming violations
git diff --cached --name-only | grep -E '\.(tsx?|jsx?)$' | xargs -I {} sh -c '
  # Check for PascalCase component files
  if echo "{}" | grep -q "components/"; then
    basename "{}" | grep -E "^[A-Z]" || echo "Warning: {} should be PascalCase"
  fi
'
```

---

_Last updated: 2026-02-16_
_Part of NoteChain Sprint 4 Technical Debt Remediation_
