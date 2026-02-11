# Knowledge Graph Visualization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Create an interactive visual knowledge graph using Cytoscape.js to visualize note relationships, backlinks, tags, and clusters.

**Architecture:** Build a React component `KnowledgeGraphView` that takes graph data from the existing `KnowledgeGraphGenerator` and renders it using Cytoscape.js. Include interactive features like node click to open notes, filtering by type, and zoom controls.

**Tech Stack:** React, TypeScript, Cytoscape.js (MIT licensed), TipTap Editor, Tailwind CSS (Warm Editorial Minimalism), existing NoteChain graph generation infrastructure

**Test Framework:** Vitest + React Testing Library

---

## Prerequisites

**Step 0.1: Verify KnowledgeGraphGenerator exists**

Run: `ls -la apps/web/src/lib/ai/notes/KnowledgeGraphGenerator.ts`
Expected: File exists

**Step 0.2: Check types**

Run: `ls -la apps/web/src/lib/ai/notes/types.ts`
Expected: File exists with KnowledgeGraph types

**Step 0.3: Verify tests pass**

Run: `bun test` from project root

---

## Task 1: Install Cytoscape.js Dependencies

**Files:**

- Modify: `apps/web/package.json`

**Step 1.1: Install Cytoscape.js**

```bash
cd apps/web
bun add cytoscape
bun add -D @types/cytoscape
```

**Step 1.2: Verify installation**

Run: `bun run build`
Expected: Build succeeds

**Step 1.3: Commit**

```bash
git add apps/web/package.json bun.lockb
git commit -m "deps: install cytoscape.js for knowledge graph visualization"
```

---

## Task 2: Create Cytoscape Graph Styles

**Files:**

- Create: `apps/web/src/lib/graph/cytoscapeStyles.ts`
- Test: `apps/web/src/lib/graph/__tests__/cytoscapeStyles.test.ts`

**Step 2.1: Create directory**

```bash
mkdir -p apps/web/src/lib/graph/__tests__
```

**Step 2.2: Write test**

Create `apps/web/src/lib/graph/__tests__/cytoscapeStyles.test.ts` with tests for node styles, edge styles, note styles, tag styles, and selected styles.

**Step 2.3: Write implementation**

Create `apps/web/src/lib/graph/cytoscapeStyles.ts` with styles following Warm Editorial Minimalism (stone colors, amber accents).

**Step 2.4: Commit**

```bash
git add apps/web/src/lib/graph/
git commit -m "feat(graph): add Cytoscape styles for knowledge graph visualization"
```

---

## Task 3: Create Graph Layout Utilities

**Files:**

- Create: `apps/web/src/lib/graph/layouts.ts`
- Test: `apps/web/src/lib/graph/__tests__/layouts.test.ts`

**Step 3.1: Write test**

Create `apps/web/src/lib/graph/__tests__/layouts.test.ts` with tests for each layout type.

**Step 3.2: Write implementation**

Create `apps/web/src/lib/graph/layouts.ts` with LayoutType enum and getLayoutOptions function supporting: FORCE_DIRECTED, CIRCLE, GRID, BREADTHFIRST, CONCENTRIC.

**Step 3.3: Commit**

```bash
git add apps/web/src/lib/graph/
git commit -m "feat(graph): add graph layout utilities"
```

---

## Task 4: Create Graph Data Transformer

**Files:**

- Create: `apps/web/src/lib/graph/transformData.ts`
- Test: `apps/web/src/lib/graph/__tests__/transformData.test.ts`

**Step 4.1: Write test**

Create test for transformGraphData function.

**Step 4.2: Write implementation**

Create `transformGraphData` to convert KnowledgeGraph to Cytoscape format, with filter functions.

**Step 4.3: Commit**

```bash
git add apps/web/src/lib/graph/
git commit -m "feat(graph): add graph data transformer"
```

---

## Task 5: Create KnowledgeGraphView Component

**Files:**

- Create: `apps/web/src/components/KnowledgeGraphView.tsx`
- Test: `apps/web/src/components/__tests__/KnowledgeGraphView.test.tsx`

**Step 5.1: Write test**

Create test for KnowledgeGraphView component with mocked cytoscape.

**Step 5.2: Write implementation**

Create KnowledgeGraphView component with:

- Cytoscape initialization
- Layout controls
- Zoom controls
- Node type filters
- Click handlers

**Step 5.3: Commit**

```bash
git add apps/web/src/components/
git commit -m "feat(graph): add KnowledgeGraphView component with Cytoscape"
```

---

## Task 6: Create Knowledge Graph Page

**Files:**

- Create: `apps/web/src/app/graph/page.tsx`
- Test: `apps/web/src/app/graph/page.test.tsx`

**Step 6.1: Create directory**

```bash
mkdir -p apps/web/src/app/graph
```

**Step 6.2: Write test**

Create test for GraphPage.

**Step 6.3: Write implementation**

Create page that loads notes, generates graph, and renders KnowledgeGraphView.

**Step 6.4: Commit**

```bash
git add apps/web/src/app/graph/
git commit -m "feat(graph): add knowledge graph page"
```

---

## Task 7: Add Navigation Link

**Files:**

- Modify: Find navigation component

**Step 7.1: Find navigation**

Run: `find apps/web/src -name "*Nav*" -o -name "*Sidebar*" | grep -E "\.(tsx|ts)$"`

**Step 7.2: Add link**

Add link to /graph page in navigation.

**Step 7.3: Commit**

```bash
git add [navigation path]
git commit -m "feat(graph): add knowledge graph navigation link"
```

---

## Task 8: Create Documentation

**Files:**

- Create: `docs/features/knowledge-graph.md`

**Step 8.1: Create docs**

Create documentation covering features, usage, node types, edge types, and technical implementation.

**Step 8.2: Commit**

```bash
git add docs/features/knowledge-graph.md
git commit -m "docs(graph): add knowledge graph documentation"
```

---

## Summary

**Total Tasks:** 8
**Estimated Time:** 3 weeks

**Dependencies:**

- Cytoscape.js (MIT licensed)
- Existing KnowledgeGraphGenerator infrastructure

**Files Created:**

- cytoscapeStyles.ts (+ test)
- layouts.ts (+ test)
- transformData.ts (+ test)
- KnowledgeGraphView.tsx (+ test)
- graph/page.tsx (+ test)
- Navigation update
- Documentation

Ready for subagent-driven development!
