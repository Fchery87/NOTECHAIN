import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CommandPalette from '../CommandPalette';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/lib/sync/useNotesSync', () => ({
  useNotesSync: () => ({
    isEncryptionReady: true,
    loadCachedNotes: async () => [
      {
        id: 'n1',
        title: 'Q4 roadmap sync',
        content: '<p>Ship encrypted search first.</p>',
        updatedAt: new Date('2026-10-01'),
      },
      {
        id: 'n2',
        title: 'Interview debrief',
        content: '<p>Strong on <strong>systems</strong> thinking.</p>',
        updatedAt: new Date('2026-10-02'),
      },
    ],
  }),
}));

describe('CommandPalette', () => {
  beforeEach(() => {
    push.mockClear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('starts a new note when C is pressed outside a text field', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'c' });
    expect(push).toHaveBeenCalledWith('/notes?new=1');
  });

  it('jumps to a page with G then its key', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'g' });
    fireEvent.keyDown(window, { key: 't' });
    expect(push).toHaveBeenCalledWith('/tasks');
  });

  it('ignores single-key shortcuts while typing', () => {
    render(
      <>
        <input aria-label="field" />
        <CommandPalette />
      </>
    );
    fireEvent.keyDown(screen.getByLabelText('field'), { key: 'c' });
    expect(push).not.toHaveBeenCalled();
  });

  it('finds a note by its body text and opens it with Enter', async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    const input = screen.getByPlaceholderText('Search notes or jump to…');
    await screen.findByText('Q4 roadmap sync');
    fireEvent.change(input, { target: { value: 'systems' } });

    await waitFor(() => expect(screen.queryByText('Q4 roadmap sync')).toBeNull());
    expect(screen.getByText('Interview debrief')).toBeTruthy();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/notes?id=n2');
  });

  it('moves the selection with the arrow keys', async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    const input = screen.getByPlaceholderText('Search notes or jump to…');
    fireEvent.change(input, { target: { value: 'tasks' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/tasks');
  });
});
