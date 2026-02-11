'use client';

import React, { useEffect, useRef, createContext, useContext, useCallback } from 'react';

/**
 * Focus management context
 */
interface FocusContextValue {
  /** Register a focusable element */
  registerFocusable: (id: string, element: HTMLElement) => void;
  /** Unregister a focusable element */
  unregisterFocusable: (id: string) => void;
  /** Focus an element by ID */
  focusElement: (id: string) => void;
  /** Focus the first focusable element */
  focusFirst: () => void;
  /** Focus the last focusable element */
  focusLast: () => void;
  /** Focus the next focusable element */
  focusNext: () => void;
  /** Focus the previous focusable element */
  focusPrevious: () => void;
}

const FocusContext = createContext<FocusContextValue | null>(null);

/**
 * Hook to use focus context
 */
export function useFocusManager() {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocusManager must be used within a FocusManager');
  }
  return context;
}

/**
 * FocusManager component - Manages focus within a container
 * Essential for modals, dialogs, and complex UI components
 *
 * @example
 * ```tsx
 * <FocusManager>
 *   <Modal>
 *     <input ref={registerFocusable('input1')} />
 *     <button ref={registerFocusable('button1')}>Submit</button>
 *   </Modal>
 * </FocusManager>
 * ```
 */
interface FocusManagerProps {
  children: React.ReactNode;
  /** Auto-focus first element on mount */
  autoFocus?: boolean;
  /** Return focus to previous element on unmount */
  restoreFocus?: boolean;
  /** Trap focus within container */
  trapFocus?: boolean;
  /** Container className */
  className?: string;
  /** Callback when focus leaves the container */
  onFocusLeave?: () => void;
}

export function FocusManager({
  children,
  autoFocus = false,
  restoreFocus = true,
  trapFocus = false,
  className = '',
  onFocusLeave,
}: FocusManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const focusableElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const currentIndexRef = useRef<number>(-1);

  // Store previous focus on mount
  useEffect(() => {
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    return () => {
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [restoreFocus]);

  // Auto-focus first element
  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        focusFirst();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Trap focus
  useEffect(() => {
    if (!trapFocus) return;

    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusables = Array.from(focusableElementsRef.current.values());
      if (focusables.length === 0) return;

      const firstElement = focusables[0];
      const lastElement = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
          currentIndexRef.current = focusables.length - 1;
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
          currentIndexRef.current = 0;
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [trapFocus]);

  const registerFocusable = useCallback((id: string, element: HTMLElement) => {
    focusableElementsRef.current.set(id, element);
    // Update current index if this is the currently focused element
    if (document.activeElement === element) {
      currentIndexRef.current = Array.from(focusableElementsRef.current.keys()).indexOf(id);
    }
  }, []);

  const unregisterFocusable = useCallback((id: string) => {
    focusableElementsRef.current.delete(id);
  }, []);

  const focusElement = useCallback((id: string) => {
    const element = focusableElementsRef.current.get(id);
    if (element) {
      element.focus();
      const keys = Array.from(focusableElementsRef.current.keys());
      currentIndexRef.current = keys.indexOf(id);
    }
  }, []);

  const focusFirst = useCallback(() => {
    const focusables = Array.from(focusableElementsRef.current.values());
    if (focusables.length > 0) {
      focusables[0].focus();
      currentIndexRef.current = 0;
    }
  }, []);

  const focusLast = useCallback(() => {
    const focusables = Array.from(focusableElementsRef.current.values());
    if (focusables.length > 0) {
      focusables[focusables.length - 1].focus();
      currentIndexRef.current = focusables.length - 1;
    }
  }, []);

  const focusNext = useCallback(() => {
    const focusables = Array.from(focusableElementsRef.current.values());
    if (focusables.length === 0) return;

    const nextIndex = (currentIndexRef.current + 1) % focusables.length;
    focusables[nextIndex].focus();
    currentIndexRef.current = nextIndex;
  }, []);

  const focusPrevious = useCallback(() => {
    const focusables = Array.from(focusableElementsRef.current.values());
    if (focusables.length === 0) return;

    const prevIndex =
      currentIndexRef.current <= 0 ? focusables.length - 1 : currentIndexRef.current - 1;
    focusables[prevIndex].focus();
    currentIndexRef.current = prevIndex;
  }, []);

  // Handle focus leaving the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onFocusLeave) return;

    const handleFocusOut = (e: FocusEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!container.contains(relatedTarget)) {
        onFocusLeave();
      }
    };

    container.addEventListener('focusout', handleFocusOut);
    return () => container.removeEventListener('focusout', handleFocusOut);
  }, [onFocusLeave]);

  const value: FocusContextValue = {
    registerFocusable,
    unregisterFocusable,
    focusElement,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
  };

  return (
    <FocusContext.Provider value={value}>
      <div ref={containerRef} className={className}>
        {children}
      </div>
    </FocusContext.Provider>
  );
}

/**
 * Hook to register an element as focusable
 */
export function useFocusable(id: string) {
  const focusManager = useFocusManager();
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (element) {
      focusManager.registerFocusable(id, element);
      return () => focusManager.unregisterFocusable(id);
    }
  }, [id, focusManager]);

  return elementRef;
}

/**
 * FocusTrap - Simplified focus trap for modals/dialogs
 */
interface FocusTrapProps {
  children: React.ReactNode;
  isActive: boolean;
  onEscape?: () => void;
  className?: string;
}

export function FocusTrap({ children, isActive, onEscape, className = '' }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    // Find all focusable elements
    const getFocusableElements = () => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1);
    };

    // Focus first element
    const focusables = getFocusableElements();
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key !== 'Tab') return;

      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onEscape]);

  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

export default FocusManager;
