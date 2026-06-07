# Knowledge Map

Visualize and act on your encrypted context network.

## Overview

The **Knowledge Map** is the user-facing exploration view for NoteChain's **Context Graph**: the typed, source-cited relationship layer across notes, meetings, transcript segments, tasks, calendar events, people, shared spaces, projects, decisions, tags, and attachments.

The map remains a user-facing canvas for exploration, but the underlying Context Graph should also power semantic search, related context, meeting preparation, cited AI answers, action-item provenance, decision history, and cross-meeting intelligence.

See also:

- `CONTEXT.md`
- `docs/adr/ADR-context-graph-product-substrate.md`
- `docs/plans/2026-06-06-notechain-feature-review-and-june-2026-standards.md`

## Product Direction

Knowledge Map value must come from actionability and provenance, not visual novelty. A Context Graph edge should answer:

- What relationship exists?
- Why does the system believe it exists?
- Which note, transcript segment, calendar event, attachment, or prior edge supports it?
- What can the user do next?

Near-term graph work should prioritize typed entities, typed edges, citations, and search/AI usage before adding more layouts or animations.

## Features

### Interactive Graph Visualization

- **Clickable nodes**: Click any note or tag to open it directly
- **Drag & drop**: Rearrange nodes to customize your view
- **Zoom & pan**: Navigate large graphs with smooth zooming and panning controls
- **Hover effects**: Preview connections and node details on hover

### Multiple Layout Types

Choose the layout that best represents your data:

- **Force-directed**: Organic, physics-based layout (default)
- **Circle**: Radial arrangement of nodes
- **Grid**: Organized grid layout
- **Hierarchical**: Tree-like structure showing parent-child relationships
- **Concentric**: Rings of nodes based on centrality

### Node Filtering

Filter the graph to focus on specific content:

- **Notes**: Show/hide note nodes
- **Tags**: Show/hide tag nodes
- **Meetings**: Show/hide meeting and transcript-derived nodes (planned)
- **Tasks**: Show/hide task and action-item nodes (planned)
- **Calendar Events**: Show/hide time-context nodes (planned)
- **People / Shared Spaces**: Show/hide collaboration and ownership nodes (planned)
- **Combined view**: See multiple entity types and their relationships

### Visual Connection Types

Different relationship types are shown with distinct visual styles:

- **Backlinks** (solid lines): Notes that reference each other
- **Tag Links** (dashed lines): Notes connected through shared tags
- **Similarity** (dotted lines): AI-detected semantic similarities between notes

Planned typed edges include:

- **Mentions**: A note or transcript references a person, project, topic, or artifact
- **Created From**: A task, decision, or summary came from a note or transcript segment
- **Decided In**: A decision was made in a meeting or note
- **Assigned To**: A task/action item belongs to a person
- **Due On**: A task is tied to a calendar date/event
- **Follows Up**: A task or meeting follows from previous context
- **Blocks / Blocked By**: A task or decision is constrained by another item
- **Cites**: An AI answer or summary uses a source artifact
- **Supersedes / Contradicts**: Knowledge changes or conflicts over time

## Node Types

### Notes

- **Shape**: Circles
- **Size**: Scaled by importance (number of backlinks)
- **Label**: Note title
- **Action**: Click to open the note

### Tags

- **Shape**: Rounded rectangles
- **Color**: Amber (#f59e0b)
- **Label**: Tag name
- **Action**: Click to filter notes by this tag

### Planned Context Nodes

- **Meetings**: Link transcripts, decisions, risks, and follow-up tasks
- **Transcript Segments**: Provide citation-level provenance for AI outputs
- **Tasks / Action Items**: Connect execution work back to source conversations or notes
- **Calendar Events**: Provide time context for prep, deadlines, and follow-up
- **People**: Represent speakers, assignees, collaborators, and owners
- **Shared Spaces**: Represent authorization and collaboration boundaries
- **Decisions**: Capture source-cited choices and their history
- **Attachments / OCR Documents**: Bring PDFs and extracted content into the graph

## Node Colors (by Age)

Nodes are colored based on when they were last modified:

| Color      | Age       | Visual                 |
| ---------- | --------- | ---------------------- |
| **Green**  | < 7 days  | Fresh, recently active |
| **Amber**  | < 30 days | Recently updated       |
| **Purple** | < 90 days | Moderately old         |
| **Gray**   | > 90 days | Older content          |

This color coding helps you identify:

- What's currently active in your thinking
- Notes that might need review
- Stale content that could be updated

## Usage

### Accessing the Knowledge Map

1. Navigate to the main navigation menu
2. Click "Knowledge Map"
3. The map loads with your notes and their connections

### Interacting with the Knowledge Map

#### Navigation

- **Scroll/Pinch**: Zoom in and out
- **Click + Drag**: Pan around the canvas
- **Double-click**: Reset zoom to fit all nodes

#### Node Interaction

- **Click a note**: Opens the note viewer/editor
- **Click a tag**: Filters to show only notes with that tag
- **Drag a node**: Reposition it manually
- **Hover**: See connection highlights and quick info

#### Layout Controls

Use the layout selector to change how nodes are arranged:

1. Open the layout dropdown (top-right)
2. Select your preferred layout
3. The graph animates to the new arrangement

#### Filtering

Toggle visibility of node types:

- Use the filter panel to show/hide notes
- Show/hide tags independently
- Combine filters to focus on specific content

## Technical Implementation

### Components

#### `KnowledgeGraphView`

The main container component that:

- Manages graph state and data flow
- Handles user interactions
- Coordinates between controls and visualization

#### `KnowledgeGraphGenerator`

The core graph engine that:

- Transforms note/tag data into graph format
- Calculates node sizes based on importance
- Determines edge connections
- Applies layout algorithms

### Libraries

#### Cytoscape.js

- **Purpose**: Graph theory library for visualization
- **Features used**:
  - Force-directed and preset layouts
  - Event handling for interactions
  - Canvas-based rendering
  - Animation support

### Data Flow

Current visualization flow:

```
Notes & Tags (Database)
    ↓
KnowledgeGraphGenerator
    ↓
Graph Data Structure (Nodes + Edges)
    ↓
Cytoscape.js Renderer
    ↓
Interactive Visualization
```

Target context-graph flow:

```
Notes + Meetings + Transcript Segments + Tasks + Calendar Events + People + Shared Spaces + Attachments
    ↓
Entity Extraction + Provenance Capture + Permission Filtering
    ↓
Typed Context Graph (Nodes + Edges + Source Citations)
    ↓
Search / Related Context / Meeting Prep / AI Answers / Knowledge Map
```

### Node Sizing Algorithm

Node size is calculated based on:

1. **Backlink count**: More backlinks = larger node
2. **Recency bonus**: Recent notes get slight size boost
3. **Base size**: Minimum size for visibility

Formula:

```
size = baseSize + (backlinkCount × scaleFactor) + recencyBonus
```

### Edge Detection

Edges are created through multiple strategies:

1. **Explicit backlinks**: Parsing `[[Note Title]]` syntax
2. **Tag relationships**: Notes sharing common tags
3. **AI similarity**: Vector similarity between note embeddings

## Performance

### Optimizations

- **Node limit**: Maximum 200 nodes displayed at once
- **Virtualization**: Off-screen nodes are not rendered
- **Debounced updates**: Layout changes are batched
- **Smooth animations**: 60fps animations using requestAnimationFrame

### Recommended Usage

For optimal performance:

- Use filters to reduce node count on large knowledge bases
- Prefer "Circle" or "Grid" layouts for 100+ nodes
- Avoid rapid layout switching

### Browser Support

**Minimum Requirements:**

- Modern browsers (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)
- Canvas API support
- WebGL recommended for large graphs

**Known Limitations:**

- Mobile: Touch interactions supported, but limited to ~50 nodes
- IE11: Not supported (uses modern JavaScript features)

## Future Enhancements

### Planned Features

#### Date Range Filtering

- Filter nodes by creation/update date
- Show only notes from specific time periods
- "Time machine" view to see graph evolution

#### Graph Search

- Search for nodes within the graph
- Highlight matching nodes
- Filter graph to show only search results

#### Export Options

- Save graph as PNG/SVG image
- Export graph data as JSON
- Generate shareable graph links

#### Analytics

- Graph statistics (density, centrality)
- "Orphan" note detection
- Connection suggestions
- Knowledge gaps identification

#### Advanced Layouts

- Topic clustering
- Timeline view
- Geographic layout (for location-tagged notes)

### Potential Integrations

- **AI Assistant**: "Show me related notes to my current topic"
- **Daily Notes**: Visual trail of daily note connections
- **Shared Graphs**: View collaborative knowledge networks

## Troubleshooting

### Graph Not Loading

- Check browser console for errors
- Ensure Canvas is not blocked by extensions
- Try refreshing the page

### Slow Performance

- Reduce visible nodes using filters
- Switch to simpler layout (Grid/Circle)
- Close other browser tabs

### Missing Connections

- Ensure notes use proper `[[backlink]]` syntax
- Check that tags are properly assigned
- Similarity detection requires note embeddings

## Keyboard Shortcuts

| Shortcut | Action                          |
| -------- | ------------------------------- |
| `Space`  | Pause/resume physics simulation |
| `R`      | Reset view to fit all nodes     |
| `F`      | Toggle fullscreen mode          |
| `Esc`    | Close any open panels           |

---

_The Knowledge Map is continuously evolving. Share your feedback to help us improve this feature._
