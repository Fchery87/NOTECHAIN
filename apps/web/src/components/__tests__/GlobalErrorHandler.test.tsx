import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GlobalErrorHandler } from '../GlobalErrorHandler';

describe('GlobalErrorHandler', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders its children', () => {
    render(<GlobalErrorHandler>app content</GlobalErrorHandler>);

    expect(screen.getByText('app content')).toBeInTheDocument();
  });

  it('does not report an error when it starts up', () => {
    render(<GlobalErrorHandler>app content</GlobalErrorHandler>);

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('logs an uncaught error raised on the window', () => {
    render(<GlobalErrorHandler>app content</GlobalErrorHandler>);

    window.dispatchEvent(new ErrorEvent('error', { error: new Error('boom') }));

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      '[Error]',
      expect.objectContaining({ type: 'Error', message: 'boom' })
    );
  });

  it('removes the listeners it added when it unmounts', () => {
    const added = vi.spyOn(window, 'addEventListener');
    const removed = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<GlobalErrorHandler>app content</GlobalErrorHandler>);
    const listeners = ['error', 'unhandledrejection'].map(type => ({
      type,
      handler: added.mock.calls.find(([name]) => name === type)?.[1],
    }));
    unmount();

    for (const { type, handler } of listeners) {
      expect(handler).toBeTypeOf('function');
      expect(removed).toHaveBeenCalledWith(type, handler);
    }
    added.mockRestore();
    removed.mockRestore();
  });
});
