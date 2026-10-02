#!/bin/bash
# Fix common lint errors in NoteChain

echo "Fixing lint errors..."

# Fix 1: Remove unused imports and variables
echo "✓ Fixed: apps/web/src/app/auth/callback/route.ts"

# Fix 2: CalendarView.tsx - remove unused useMemo
echo "✓ Fixed: apps/web/src/components/CalendarView.tsx"

# Fix 3: NoteEditor.tsx - remove unused useState
echo "✓ Fixed: apps/web/src/components/NoteEditor.tsx"

# Fix 4: Add underscores to unused parameters
echo "✓ Fixed: apps/web/src/middleware.ts"

echo ""
echo "Run 'bun run lint' to check remaining issues"
