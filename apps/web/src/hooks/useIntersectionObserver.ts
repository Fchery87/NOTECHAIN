'use client';

import { useEffect, useRef, useState, RefObject } from 'react';

/**
 * Intersection Observer options
 */
interface UseIntersectionObserverOptions {
  /** Margin around the root element */
  rootMargin?: string;
  /** Threshold at which the callback is triggered */
  threshold?: number | number[];
  /** Element to use as viewport. Null means browser viewport */
  root?: Element | null;
  /** Trigger once or on every intersection change */
  triggerOnce?: boolean;
}

/**
 * Return type for useIntersectionObserver
 */
interface UseIntersectionObserverReturn {
  /** Ref to attach to the target element */
  ref: RefObject<HTMLElement | null>;
  /** Whether the element is currently intersecting */
  isIntersecting: boolean;
  /** Intersection ratio (0-1) */
  intersectionRatio: number;
  /** Time at which intersection occurred */
  time: number;
}

/**
 * useIntersectionObserver hook - Detects when elements enter/exit viewport
 * Useful for lazy loading images, infinite scrolling, and animations
 *
 * @example
 * ```tsx
 * function LazyImage({ src, alt }) {
 *   const { ref, isIntersecting } = useIntersectionObserver({
 *     triggerOnce: true,
 *     rootMargin: '200px'
 *   });
 *
 *   return (
 *     <div ref={ref}>
 *       {isIntersecting && <img src={src} alt={alt} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntersectionObserver({
  rootMargin = '0px',
  threshold = 0,
  root = null,
  triggerOnce = false,
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverReturn {
  const elementRef = useRef<HTMLElement>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // If triggerOnce is true and we've already triggered, don't observe
    if (triggerOnce && hasTriggeredRef.current) return;

    // Check for IntersectionObserver support
    if (!('IntersectionObserver' in window)) {
      // Fallback: assume visible
      setEntry({
        isIntersecting: true,
        intersectionRatio: 1,
        time: Date.now(),
        boundingClientRect: element.getBoundingClientRect(),
        intersectionRect: element.getBoundingClientRect(),
        rootBounds: null,
        target: element,
      } as IntersectionObserverEntry);
      return;
    }

    const observer = new IntersectionObserver(
      ([observedEntry]) => {
        setEntry(observedEntry);

        if (triggerOnce && observedEntry.isIntersecting) {
          hasTriggeredRef.current = true;
          observer.unobserve(element);
        }
      },
      {
        root,
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [rootMargin, threshold, root, triggerOnce]);

  return {
    ref: elementRef,
    isIntersecting: entry?.isIntersecting ?? false,
    intersectionRatio: entry?.intersectionRatio ?? 0,
    time: entry?.time ?? 0,
  };
}

/**
 * useInfiniteScroll hook - Simplified infinite scrolling
 */
interface UseInfiniteScrollOptions {
  /** Callback when end is reached */
  onLoadMore: () => void;
  /** Whether more items are available */
  hasMore: boolean;
  /** Whether currently loading */
  isLoading: boolean;
  /** Distance from bottom to trigger load (px) */
  threshold?: number;
  /** Delay before triggering next load (ms) */
  delay?: number;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 100,
  delay = 0,
}: UseInfiniteScrollOptions): RefObject<HTMLDivElement | null> {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          timeoutRef.current = setTimeout(() => {
            onLoadMore();
          }, delay);
        }
      },
      {
        rootMargin: `${threshold}px`,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onLoadMore, hasMore, isLoading, threshold, delay]);

  return sentinelRef;
}

/**
 * useLazyLoad hook - Lazy load images or components
 */
interface UseLazyLoadOptions extends UseIntersectionObserverOptions {
  /** Preload distance in pixels */
  preloadDistance?: number;
}

export function useLazyLoad(options: UseLazyLoadOptions = {}) {
  const { preloadDistance = 200, ...observerOptions } = options;

  return useIntersectionObserver({
    ...observerOptions,
    rootMargin: `${preloadDistance}px`,
    triggerOnce: true,
  });
}

/**
 * useVisibility hook - Track element visibility percentage
 */
export function useVisibility(thresholds: number[] = [0, 0.25, 0.5, 0.75, 1]) {
  const elementRef = useRef<HTMLElement>(null);
  const [visibility, setVisibility] = useState(0);
  const [isFullyVisible, setIsFullyVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (!('IntersectionObserver' in window)) {
      setVisibility(1);
      setIsFullyVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisibility(entry.intersectionRatio);
        setIsFullyVisible(entry.intersectionRatio >= 1);
      },
      {
        threshold: thresholds,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [thresholds]);

  return {
    ref: elementRef,
    visibility,
    isFullyVisible,
    isPartiallyVisible: visibility > 0,
  };
}

/**
 * useScrollSpy hook - Track which section is currently visible
 */
interface UseScrollSpyOptions {
  /** Section IDs to track */
  sectionIds: string[];
  /** Offset from top (px) */
  offset?: number;
  /** Threshold for visibility */
  threshold?: number;
}

export function useScrollSpy({ sectionIds, offset = 0, threshold = 0.5 }: UseScrollSpyOptions) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const observersRef = useRef<IntersectionObserver[]>([]);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setActiveId(sectionIds[0] || null);
      return;
    }

    // Cleanup previous observers
    observersRef.current.forEach(observer => observer.disconnect());
    observersRef.current = [];

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          setActiveId(entry.target.id);
        }
      });
    };

    sectionIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        const observer = new IntersectionObserver(handleIntersection, {
          rootMargin: `${-offset}px 0px ${-offset}px 0px`,
          threshold,
        });
        observer.observe(element);
        observersRef.current.push(observer);
      }
    });

    return () => {
      observersRef.current.forEach(observer => observer.disconnect());
    };
  }, [sectionIds, offset, threshold]);

  return activeId;
}

export default useIntersectionObserver;
