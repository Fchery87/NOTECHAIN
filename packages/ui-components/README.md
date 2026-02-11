# @notechain/ui-components

Shared React components for NoteChain applications.

## Components

### Core

- `Button` - Styled button with variants
- `Input` - Text input with validation
- `Card` - Container with elevation
- `Modal` - Dialog overlay

### Notes

- `NoteEditor` - Rich text editor
- `NoteList` - List with search/filter
- `NoteCard` - Preview card

### Todos

- `TodoItem` - Task with checkbox
- `TodoList` - Grouped task list
- `PriorityBadge` - Priority indicator

### Layout

- `AppLayout` - Main app shell
- `Sidebar` - Navigation panel
- `Header` - Top bar

## Dependencies

| Dependency | Purpose    |
| ---------- | ---------- |
| react      | UI library |

## Usage

```tsx
import { Button, Card, NoteEditor } from '@notechain/ui-components';

function MyComponent() {
  return (
    <Card>
      <NoteEditor />
      <Button variant="primary">Save</Button>
    </Card>
  );
}
```
