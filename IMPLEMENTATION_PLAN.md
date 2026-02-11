# NoteChain Implementation Plan

## From Architecture to Functional Application

> **Goal:** Wire up all existing code into a fully functional, production-ready encrypted note-taking app.

**Current Status:** 80% coded, 20% wired up
**Target:** 100% functional with all features working end-to-end
**Timeline:** 4-6 weeks (phased approach)

---

## 🎯 Implementation Philosophy

**Don't Rewrite - Wire Up!**

All the hard work is done:

- ✅ Encryption library exists
- ✅ Database layer complete
- ✅ AI engine built
- ✅ Sync service coded
- ✅ Components created

**We just need to connect them!**

---

## 📋 Phase 1: Authentication Foundation (Week 1)

### 1.1 Supabase Auth Integration

**Priority:** CRITICAL - Blocks everything else

**Implementation:**

```bash
# Install required packages
npm install @supabase/ssr @supabase/supabase-js
```

**Files to Create:**

1. **`apps/web/src/lib/supabase/client.ts`** - Browser client

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

2. **`apps/web/src/lib/supabase/server.ts`** - Server client

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
```

3. **`apps/web/src/middleware.ts`** - Auth middleware (NEW FILE)

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect routes
  if (!user && !request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

### 1.2 Auth Pages

**Create:**

- `apps/web/src/app/auth/login/page.tsx`
- `apps/web/src/app/auth/signup/page.tsx`
- `apps/web/src/app/auth/callback/route.ts` (PKCE code exchange)

**Key Implementation Details:**

- Use PKCE flow (more secure than implicit)
- Store session in HTTP-only cookies
- Support email/password + OAuth (Google, GitHub)
- Add "Remember me" option

**Reuse:** Existing `auth-service.ts` for encryption key derivation

### 1.3 Environment Variables

**.env.local:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Supabase Setup Tasks:**

- [ ] Create Supabase project
- [ ] Run migrations: `supabase db push`
- [ ] Enable Email auth provider
- [ ] Configure OAuth providers (Google, GitHub)
- [ ] Set up auth email templates

---

## 📋 Phase 2: Database Integration (Week 1-2)

### 2.1 Replace Mock Data with Real DB

**Strategy:** Incremental replacement

**Current State:**

- Notes page: Mock data
- Todos page: Mock data
- PDFs page: Mock data

**Implementation:**

1. **Create Database Context Provider**

`apps/web/src/lib/db/context.tsx:`

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getDatabase } from './db'

const DBContext = createContext(null)

export function DBProvider({ children }) {
  const [db, setDb] = useState(null)

  useEffect(() => {
    getDatabase().then(setDb)
  }, [])

  return <DBContext.Provider value={db}>{children}</DBContext.Provider>
}

export const useDB = () => useContext(DBContext)
```

2. **Update Notes Page** (`apps/web/src/app/notes/page.tsx`)

Replace mock data with:

```typescript
const { db } = useDB();
const [notes, setNotes] = useState<Note[]>([]);

useEffect(() => {
  if (!db) return;

  // Load notes from IndexedDB
  db.notes.toArray().then(setNotes);

  // Subscribe to changes
  const subscription = db.notes.hook('creating', () => {
    db.notes.toArray().then(setNotes);
  });

  return () => subscription.unsubscribe();
}, [db]);

const handleSave = async (note: Note) => {
  if (!db) return;
  await db.notes.put(note);
};
```

3. **Update Todos Page** similarly

4. **Update PDFs Page** similarly

### 2.2 Dexie Live Queries

**Pattern for Real-Time UI Updates:**

```typescript
import { useLiveQuery } from 'dexie-react-hooks'

function TodoList() {
  const todos = useLiveQuery(() => db.todos.toArray())

  if (!todos) return <Loading />

  return <TodoListComponent todos={todos} />
}
```

**Install:**

```bash
npm install dexie-react-hooks
```

### 2.3 Migration Strategy

**Step 1:** Keep mock data as fallback during development
**Step 2:** Add feature flag: `USE_REAL_DB=true`
**Step 3:** Test each page individually
**Step 4:** Remove mock data once verified

---

## 📋 Phase 3: AI Features Integration (Week 2-3)

### 3.1 Initialize AI Engine

**Create:** `apps/web/src/lib/ai/init.ts`

```typescript
import { RAGEngine } from '@notechain/ai-engine';
import { EmbeddingService, LocalLLM } from '@notechain/ai-engine';

let ragEngine: RAGEngine | null = null;

export async function initAI() {
  if (ragEngine) return ragEngine;

  const embeddings = new EmbeddingService();
  const llm = new LocalLLM();

  ragEngine = new RAGEngine(embeddings, llm);
  await ragEngine.initialize();

  return ragEngine;
}

export function getRAGEngine() {
  if (!ragEngine) {
    throw new Error('AI not initialized. Call initAI() first.');
  }
  return ragEngine;
}
```

**Initialize in:** `apps/web/src/app/layout.tsx`

```typescript
useEffect(() => {
  initAI().catch(console.error);
}, []);
```

### 3.2 Add AI Components to NoteEditor

**Modify:** `apps/web/src/components/NoteEditor.tsx`

**Add:**

1. **NoteSummary** - Show AI-generated summary above editor
2. **AutoTags** - Display suggested tags
3. **RelatedNotes** - Sidebar with related content
4. **LinkSuggestions** - Inline link recommendations

**Implementation:**

```typescript
import { NoteSummary } from './NoteSummary'
import { AutoTags } from './AutoTags'
import { RelatedNotes } from './RelatedNotes'

export function NoteEditor({ note, ...props }) {
  const [aiSummary, setAiSummary] = useState(null)
  const [suggestedTags, setSuggestedTags] = useState([])

  useEffect(() => {
    if (!note.content) return

    // Generate AI summary
    generateSummary(note.content).then(setAiSummary)

    // Extract suggested tags
    extractTags(note.content).then(setSuggestedTags)
  }, [note.content])

  return (
    <div className="editor-container">
      <NoteSummary summary={aiSummary} />
      <AutoTags tags={suggestedTags} onAddTag={...} />
      <EditorContent editor={editor} />
      <RelatedNotes noteId={note.id} />
    </div>
  )
}
```

### 3.3 AI-Powered Inline Suggestions

**Add to NoteEditor:** Autocomplete with Tab key

**Research-Based Approach:**
Use `tiptap-inline-suggestion` pattern:

```typescript
import InlineSuggestion from '@sereneinserenade/tiptap-inline-suggestion';

const editor = useEditor({
  extensions: [
    StarterKit,
    InlineSuggestion.configure({
      fetchAutocompletion: async text => {
        const rag = getRAGEngine();
        const suggestion = await rag.complete(text);
        return suggestion;
      },
    }),
  ],
});
```

**CSS:**

```css
[data-inline-suggestion]::after {
  content: attr(data-inline-suggestion);
  color: #999;
  font-style: italic;
}
```

### 3.4 Context-Aware Suggestions

**Implementation:**

```typescript
const getSuggestions = async (noteContent: string) => {
  const rag = getRAGEngine();

  // Index current note
  await rag.indexContent(note.id, noteContent);

  // Get related content
  const context = await rag.getContext(noteContent);

  // Generate suggestions
  return await rag.generateSuggestions(context);
};
```

---

## 📋 Phase 4: Sync Engine (Week 3-4)

### 4.1 Supabase Repository Adapter

**Create:** `apps/web/src/lib/sync/supabaseAdapter.ts`

```typescript
import { SyncRepositoryAdapter } from '@notechain/sync-engine';
import { createClient } from '../supabase/client';

export class SupabaseAdapter implements SyncRepositoryAdapter {
  private supabase = createClient();

  async getBlob(blobId: string) {
    const { data, error } = await this.supabase
      .from('encrypted_blobs')
      .select('*')
      .eq('id', blobId)
      .single();

    if (error) throw error;
    return data;
  }

  async saveBlob(blobId: string, data: any) {
    const { error } = await this.supabase.from('encrypted_blobs').upsert({ id: blobId, ...data });

    if (error) throw error;
  }

  async getOperationsSince(timestamp: number) {
    const { data, error } = await this.supabase
      .from('sync_operations')
      .select('*')
      .gt('timestamp', timestamp)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return data;
  }

  async saveOperation(operation: any) {
    const { error } = await this.supabase.from('sync_operations').insert(operation);

    if (error) throw error;
  }
}
```

### 4.2 Initialize Sync Service

**Modify:** `apps/web/src/app/layout.tsx`

```typescript
import { SyncService } from '@notechain/sync-engine'
import { SupabaseAdapter } from '@/lib/sync/supabaseAdapter'

// Initialize sync service
const syncService = new SyncService(
  userId,
  sessionId,
  new SupabaseAdapter(),
  (local, remote) => {
    // Conflict resolution: last write wins
    return local.updatedAt > remote.updatedAt ? local : remote
  }
)

// Start sync
syncService.start()

// Provide via context
<SyncContext.Provider value={syncService}>
  {children}
</SyncContext.Provider>
```

### 4.3 Sync UI Components

**Create:** `apps/web/src/components/SyncStatus.tsx`

```typescript
export function SyncStatus() {
  const sync = useSync()
  const [status, setStatus] = useState('online')

  useEffect(() => {
    sync.on('status', setStatus)
  }, [sync])

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${
        status === 'syncing' ? 'bg-yellow-400 animate-pulse' :
        status === 'online' ? 'bg-green-400' :
        'bg-red-400'
      }`} />
      <span className="text-xs text-stone-500">
        {status === 'syncing' ? 'Syncing...' :
         status === 'online' ? 'Synced' :
         'Offline'}
      </span>
    </div>
  )
}
```

**Add to:** Header/navigation bar

### 4.4 Offline Support

**Service Worker for Background Sync:**

`apps/web/public/sw.js` (already exists, needs activation):

```javascript
self.addEventListener('sync', event => {
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncPendingOperations());
  }
});

async function syncPendingOperations() {
  const pending = await getPendingOperations();
  for (const op of pending) {
    await sendToServer(op);
    await markAsSynced(op.id);
  }
}
```

**Register in:** `apps/web/src/app/layout.tsx`

```typescript
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
}, []);
```

---

## 📋 Phase 5: Calendar Integration (Week 4)

### 5.1 Google Calendar OAuth

**Create:** `apps/web/src/app/auth/calendar/callback/page.tsx`

```typescript
export default function CalendarCallback() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  useEffect(() => {
    if (code) {
      exchangeCodeForToken(code).then(() => {
        window.close()
      })
    }
  }, [code])

  return <div>Connecting to Google Calendar...</div>
}
```

### 5.2 Calendar Sync Service

**Reuse:** `apps/web/src/lib/googleCalendar.ts` (already exists)

**Wire up in:** `apps/web/src/app/calendar/page.tsx`

```typescript
import { GoogleCalendarService } from '@/lib/googleCalendar'

export default function CalendarPage() {
  const [events, setEvents] = useState([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const calendar = new GoogleCalendarService()

    if (calendar.isAuthenticated()) {
      setIsConnected(true)
      calendar.listEvents().then(setEvents)
    }
  }, [])

  const handleConnect = () => {
    const calendar = new GoogleCalendarService()
    calendar.authenticate()
  }

  if (!isConnected) {
    return <ConnectCalendar onConnect={handleConnect} />
  }

  return <CalendarView events={events} />
}
```

### 5.3 Two-Way Sync

**Background sync when todo created:**

```typescript
const handleCreateTodo = async (todo: Todo) => {
  // Save to local DB
  await db.todos.add(todo);

  // Sync to calendar if due date exists
  if (todo.dueDate) {
    const calendar = new GoogleCalendarService();
    await calendar.createEvent({
      summary: todo.title,
      description: todo.description,
      start: { dateTime: todo.dueDate },
    });
  }
};
```

---

## 📋 Phase 6: Polish & Missing Components (Week 5-6)

### 6.1 Add Unused Components

**Components to Wire Up:**

| Component             | Where to Add        | Purpose                   |
| --------------------- | ------------------- | ------------------------- |
| `EncryptionStatus`    | Header/Notes page   | Show encryption indicator |
| `PrivacySettings`     | Settings page       | User privacy controls     |
| `SecurityAuditReport` | Settings > Security | Security dashboard        |
| `OnboardingTour`      | First login         | User onboarding           |
| `HelpCenter`          | Navigation          | In-app help               |
| `FeedbackModal`       | Footer/Settings     | User feedback collection  |
| `BetaBadge`           | Header              | Beta indicator            |
| `ProUpgradePrompt`    | Settings            | Premium upsell            |

### 6.2 Security Enhancements

**Add to Header:**

- Encryption status indicator
- Sync status
- User menu with security options

**Add to Settings:**

- Privacy settings panel
- Security audit panel
- Data export/delete options

### 6.3 Performance Optimization

**Code Splitting:**

```typescript
// Lazy load AI features
const NoteSummary = dynamic(() => import('./NoteSummary'), {
  loading: () => <Skeleton />
})
```

**Database Indexing:**

- Add Dexie indexes for frequently queried fields
- Use compound indexes for search

---

## 🚀 Implementation Checklist

### Week 1: Auth & Database

- [ ] Install @supabase/ssr
- [ ] Create client.ts and server.ts
- [ ] Create middleware.ts for auth protection
- [ ] Create login/signup pages
- [ ] Create auth callback route
- [ ] Set up Supabase project
- [ ] Add environment variables
- [ ] Test auth flow end-to-end

### Week 2: Database Integration

- [ ] Create DB context provider
- [ ] Update notes page to use real DB
- [ ] Update todos page to use real DB
- [ ] Update PDFs page to use real DB
- [ ] Add Dexie live queries
- [ ] Test data persistence
- [ ] Remove mock data

### Week 3: AI Features

- [ ] Create AI init.ts
- [ ] Initialize AI in layout
- [ ] Add NoteSummary to NoteEditor
- [ ] Add AutoTags component
- [ ] Add RelatedNotes sidebar
- [ ] Add inline suggestions
- [ ] Test AI features

### Week 4: Sync Engine

- [ ] Create SupabaseAdapter
- [ ] Initialize SyncService
- [ ] Create SyncStatus component
- [ ] Add to header
- [ ] Test sync functionality
- [ ] Add offline support

### Week 5: Calendar & Integrations

- [ ] Create calendar callback page
- [ ] Wire up Google Calendar
- [ ] Add two-way sync
- [ ] Add OAuth for Outlook/Apple
- [ ] Test calendar integration

### Week 6: Polish & Components

- [ ] Add EncryptionStatus
- [ ] Add PrivacySettings
- [ ] Add SecurityAuditReport
- [ ] Add OnboardingTour
- [ ] Add HelpCenter
- [ ] Add BetaBadge
- [ ] Final testing

---

## 🎯 Success Criteria

**Functional Requirements:**

- ✅ User can register/login
- ✅ Data persists between sessions
- ✅ Notes save to encrypted DB
- ✅ Todos sync with calendar
- ✅ AI suggestions appear in editor
- ✅ Data syncs across devices
- ✅ Works offline
- ✅ All pages accessible

**Technical Requirements:**

- ✅ Zero build errors
- ✅ All TypeScript types pass
- ✅ ESLint clean (no errors)
- ✅ Tests passing
- ✅ Security audit clean

---

## 📚 Resources

**Supabase Auth:**

- [Official Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- Use PKCE flow for security
- Cookie-based sessions
- Middleware for route protection

**Dexie/IndexedDB:**

- [Dexie React Hooks](https://dexie.org/docs/dexie-react-hooks)
- Use liveQuery for real-time updates
- Local-first, sync as enhancement

**TipTap AI:**

- [Inline Suggestions](https://github.com/sereneinserenade/tiptap-inline-suggestion)
- Add suggestions as decorations
- Tab key to accept

**Best Practices:**

- Keep local DB as source of truth
- Optimistic UI updates
- Background sync with service workers
- Conflict resolution: last write wins

---

## 💡 Pro Tips

1. **Start with Auth** - Everything else depends on it
2. **Incremental Migration** - Don't rewrite pages, just wire them up
3. **Feature Flags** - Use env vars to toggle features during dev
4. **Test Each Phase** - Verify before moving to next phase
5. **Keep Mock Data** - As fallback during development
6. **Use Existing Code** - Don't reinvent what's already built

**The key insight:** All the hard work is done. We're just connecting the dots!

---

_Ready to start? Begin with Phase 1: Authentication Foundation_
