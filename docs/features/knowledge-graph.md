# Knowledge Graph

Visualize and explore your notes as an interconnected network.

## Overview

The Knowledge Graph provides an interactive visualization of your notes and their relationships. It transforms your NoteChain into a visual network, making it easy to discover connections, explore topics, and understand the structure of your knowledge base.

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
- **Combined view**: See both notes and their tags

### Visual Connection Types

Different relationship types are shown with distinct visual styles:

- **Backlinks** (solid lines): Notes that reference each other
- **Tag Links** (dashed lines): Notes connected through shared tags
- **Similarity** (dotted lines): AI-detected semantic similarities between notes

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

### Accessing the Knowledge Graph

1. Navigate to the main navigation menu
2. Click "Knowledge Graph" (or use the graph icon)
3. The graph loads with your notes and their connections

### Interacting with the Graph

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

_The Knowledge Graph is continuously evolving. Share your feedback to help us improve this feature._
