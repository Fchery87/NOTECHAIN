'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Virtual scroll item
 */
interface VirtualItem<T> {
  /** Item data */
  data: T;
  /** Index in original array */
  index: number;
  /** Style for positioning */
  style: React.CSSProperties;
  /** Whether item is in view */
  isInView: boolean;
}

/**
 * Virtual scroll options
 */
interface UseVirtualScrollOptions<T> {
  /** Items to render */
  items: T[];
  /** Height of each item in pixels */
  itemHeight: number;
  /** Number of items to render outside viewport (overscan) */
  overscan?: number;
  /** Container height (defaults to 100%) */
  containerHeight?: number | string;
  /** Callback when end is reached */
  onEndReached?: () => void;
  /** Distance from bottom to trigger onEndReached (px) */
  onEndReachedThreshold?: number;
}

/**
 * Virtual scroll return value
 */
interface UseVirtualScrollReturn<T> {
  /** Ref for the scroll container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Visible items to render */
  virtualItems: VirtualItem<T>[];
  /** Total height of all items */
  totalHeight: number;
  /** Scroll to specific index */
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  /** Scroll to offset */
  scrollToOffset: (offset: number, behavior?: ScrollBehavior) => void;
  /** Current scroll top */
  scrollTop: number;
  /** Whether user is currently scrolling */
  isScrolling: boolean;
}

/**
 * useVirtualScroll hook - Efficiently render large lists
 * Only renders visible items + overscan for smooth scrolling
 *
 * @example
 * ```tsx
 * function TodoList({ todos }) {
 *   const { containerRef, virtualItems, totalHeight } = useVirtualScroll({
 *     items: todos,
 *     itemHeight: 80,
 *     overscan: 5
 *   });
 *
 *   return (
 *     <div ref={containerRef} style={{ height: '500px', overflow: 'auto' }}>
 *       <div style={{ height: totalHeight, position: 'relative' }}>
 *         {virtualItems.map(({ data, style }) => (
 *           <div key={data.id} style={style}>
 *             <TodoItem todo={data} />
 *           </div>
 *         ))}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useVirtualScroll<T>({
  items,
  itemHeight,
  overscan = 5,
  containerHeight: _containerHeight = '100%',
  onEndReached,
  onEndReachedThreshold = 100,
}: UseVirtualScrollOptions<T>): UseVirtualScrollReturn<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerClientHeight, setContainerClientHeight] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const endReachedCalledRef = useRef(false);

  // Calculate visible range
  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

  const virtualItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerClientHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);

    return items.slice(startIndex, endIndex).map((item, index) => {
      const actualIndex = startIndex + index;
      return {
        data: item,
        index: actualIndex,
        style: {
          position: 'absolute' as const,
          top: actualIndex * itemHeight,
          height: itemHeight,
          left: 0,
          right: 0,
        },
        isInView:
          actualIndex >= Math.floor(scrollTop / itemHeight) &&
          actualIndex < Math.ceil((scrollTop + containerClientHeight) / itemHeight),
      };
    });
  }, [items, scrollTop, itemHeight, containerClientHeight, overscan]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const newScrollTop = container.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set new timeout to detect scroll end
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    // Check if end reached
    if (onEndReached) {
      const scrollBottom = newScrollTop + container.clientHeight;
      const threshold = totalHeight - onEndReachedThreshold;

      if (scrollBottom >= threshold && !endReachedCalledRef.current) {
        endReachedCalledRef.current = true;
        onEndReached();
      } else if (scrollBottom < threshold) {
        endReachedCalledRef.current = false;
      }
    }
  }, [onEndReached, totalHeight, onEndReachedThreshold]);

  // Update container height on mount and resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerClientHeight(container.clientHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Reset end reached flag when items change
  useEffect(() => {
    endReachedCalledRef.current = false;
  }, [items.length]);

  // Scroll to index
  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const container = containerRef.current;
      if (!container) return;

      const offset = Math.max(0, index * itemHeight);
      container.scrollTo({ top: offset, behavior });
    },
    [itemHeight]
  );

  // Scroll to offset
  const scrollToOffset = useCallback((offset: number, behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({ top: offset, behavior });
  }, []);

  return {
    containerRef,
    virtualItems,
    totalHeight,
    scrollToIndex,
    scrollToOffset,
    scrollTop,
    isScrolling,
  };
}

/**
 * useVirtualizedList hook - Alternative API with more control
 */
interface UseVirtualizedListOptions<T> extends UseVirtualScrollOptions<T> {
  /** Key extractor for items */
  keyExtractor: (item: T, index: number) => string;
  /** Whether to measure items dynamically */
  dynamicHeight?: boolean;
}

export function useVirtualizedList<T>({
  items,
  itemHeight,
  keyExtractor,
  dynamicHeight = false,
  ...options
}: UseVirtualizedListOptions<T>) {
  const virtualScroll = useVirtualScroll({ items, itemHeight, ...options });
  const itemSizesRef = useRef<Map<string, number>>(new Map());

  const getItemHeight = useCallback(
    (item: T, index: number) => {
      if (!dynamicHeight) return itemHeight;

      const key = keyExtractor(item, index);
      return itemSizesRef.current.get(key) ?? itemHeight;
    },
    [dynamicHeight, itemHeight, keyExtractor]
  );

  const setItemHeight = useCallback(
    (item: T, index: number, height: number) => {
      if (!dynamicHeight) return;

      const key = keyExtractor(item, index);
      itemSizesRef.current.set(key, height);
    },
    [dynamicHeight, keyExtractor]
  );

  return {
    ...virtualScroll,
    getItemHeight,
    setItemHeight,
  };
}

/**
 * useWindowVirtualizer hook - Virtual scroll for window scrolling
 */
interface UseWindowVirtualizerOptions<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
}

export function useWindowVirtualizer<T>({
  items,
  itemHeight,
  overscan = 5,
}: UseWindowVirtualizerOptions<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [windowHeight, setWindowHeight] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollTop(window.scrollY);
    };

    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };

    handleScroll();
    handleResize();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const virtualItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(windowHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);

    return items.slice(startIndex, endIndex).map((item, index) => {
      const actualIndex = startIndex + index;
      return {
        data: item,
        index: actualIndex,
        style: {
          position: 'absolute' as const,
          top: actualIndex * itemHeight,
          height: itemHeight,
          left: 0,
          right: 0,
        },
      };
    });
  }, [items, scrollTop, itemHeight, windowHeight, overscan]);

  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

  return {
    virtualItems,
    totalHeight,
    scrollTop,
  };
}

export default useVirtualScroll;
