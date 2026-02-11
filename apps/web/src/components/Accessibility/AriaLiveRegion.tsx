'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

type AriaLivePriority = 'polite' | 'assertive' | 'off';

interface AriaLiveMessage {
  id: string;
  message: string;
  priority: AriaLivePriority;
  timestamp: number;
}

/**
 * AriaLiveRegion component - Announces messages to screen readers
 * Essential for dynamic content updates (WCAG 4.1.3 Status Messages)
 *
 * @example
 * ```tsx
 * // In your layout or app root
 * <AriaLiveRegion />
 *
 * // In your component
 * const { announce } = useAnnouncer();
 *
 * useEffect(() => {
 *   if (saveSuccess) {
 *     announce('Note saved successfully', 'polite');
 *   }
 * }, [saveSuccess]);
 * ```
 */
interface AriaLiveRegionProps {
  /** Maximum number of messages to keep in history */
  maxHistory?: number;
}

export function AriaLiveRegion({ maxHistory = 10 }: AriaLiveRegionProps) {
  const [messages, setMessages] = useState<AriaLiveMessage[]>([]);
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(0);

  // Global announcement function
  useEffect(() => {
    const handleAnnounce = (
      event: CustomEvent<{ message: string; priority: AriaLivePriority }>
    ) => {
      const { message, priority } = event.detail;
      const id = `msg-${++messageIdRef.current}`;

      setMessages(prev => {
        const newMessages = [...prev, { id, message, priority, timestamp: Date.now() }];
        return newMessages.slice(-maxHistory);
      });

      // Clear message after it's been announced (for polite messages)
      if (priority === 'polite') {
        setTimeout(() => {
          setMessages(prev => prev.filter(m => m.id !== id));
        }, 1000);
      }
    };

    window.addEventListener('announce', handleAnnounce as EventListener);
    return () => window.removeEventListener('announce', handleAnnounce as EventListener);
  }, [maxHistory]);

  // Get messages by priority
  const politeMessages = messages.filter(m => m.priority === 'polite');
  const assertiveMessages = messages.filter(m => m.priority === 'assertive');

  return (
    <>
      {/* Polite announcements - won't interrupt screen reader */}
      <div ref={politeRef} aria-live="polite" aria-atomic="true" className="sr-only">
        {politeMessages.map(m => (
          <span key={m.id}>{m.message}</span>
        ))}
      </div>

      {/* Assertive announcements - will interrupt screen reader */}
      <div ref={assertiveRef} aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertiveMessages.map(m => (
          <span key={m.id}>{m.message}</span>
        ))}
      </div>
    </>
  );
}

/**
 * Hook to announce messages to screen readers
 */
export function useAnnouncer() {
  const announce = useCallback((message: string, priority: AriaLivePriority = 'polite') => {
    const event = new CustomEvent('announce', {
      detail: { message, priority },
    });
    window.dispatchEvent(event);
  }, []);

  return { announce };
}

/**
 * Announce component - Declarative way to announce messages
 */
interface AnnounceProps {
  message: string;
  priority?: AriaLivePriority;
  trigger: unknown;
}

export function Announce({ message, priority = 'polite', trigger }: AnnounceProps) {
  const { announce } = useAnnouncer();
  const previousTriggerRef = useRef(trigger);

  useEffect(() => {
    if (trigger !== previousTriggerRef.current) {
      announce(message, priority);
      previousTriggerRef.current = trigger;
    }
  }, [trigger, message, priority, announce]);

  return null;
}

/**
 * LiveRegion component - Inline live region for component-level announcements
 */
interface LiveRegionProps {
  children: React.ReactNode;
  'aria-live'?: AriaLivePriority;
  'aria-atomic'?: boolean;
  'aria-relevant'?: 'additions' | 'removals' | 'text' | 'all' | 'additions text';
  className?: string;
}

export function LiveRegion({
  children,
  'aria-live': ariaLive = 'polite',
  'aria-atomic': ariaAtomic = true,
  'aria-relevant': ariaRelevant,
  className = '',
}: LiveRegionProps) {
  return (
    <div
      aria-live={ariaLive}
      aria-atomic={ariaAtomic}
      aria-relevant={ariaRelevant}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * StatusAnnouncer - Announces status changes
 */
interface StatusAnnouncerProps {
  status: string;
  description?: string;
  className?: string;
}

export function StatusAnnouncer({ status, description, className = '' }: StatusAnnouncerProps) {
  const { announce } = useAnnouncer();
  const prevStatusRef = useRef(status);

  useEffect(() => {
    if (status !== prevStatusRef.current) {
      const message = description ? `${status}: ${description}` : status;
      announce(message, 'polite');
      prevStatusRef.current = status;
    }
  }, [status, description, announce]);

  return (
    <div role="status" aria-live="polite" className={`sr-only ${className}`}>
      {status}
      {description && <span className="sr-only">{description}</span>}
    </div>
  );
}

/**
 * LoadingAnnouncer - Announces loading states
 */
interface LoadingAnnouncerProps {
  isLoading: boolean;
  loadingText?: string;
  loadedText?: string;
  itemName?: string;
}

export function LoadingAnnouncer({
  isLoading,
  loadingText,
  loadedText,
  itemName = 'content',
}: LoadingAnnouncerProps) {
  const { announce } = useAnnouncer();
  const wasLoadingRef = useRef(isLoading);

  useEffect(() => {
    if (isLoading && !wasLoadingRef.current) {
      announce(loadingText || `Loading ${itemName}`, 'polite');
    } else if (!isLoading && wasLoadingRef.current) {
      announce(loadedText || `${itemName} loaded`, 'polite');
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, loadingText, loadedText, itemName, announce]);

  return null;
}

export default AriaLiveRegion;
