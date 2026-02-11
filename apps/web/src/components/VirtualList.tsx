'use client';

import React, { useRef, useEffect, useCallback, useState, memo } from 'react';

/**
 * Virtual list item renderer props
 */
interface VirtualItemProps<T> {
  item: T;
  index: number;
  style: React.CSSProperties;
}

/**
 * Virtual list props
 */
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (props: VirtualItemProps<T>) => React.ReactNode;
  overscan?: number;
  className?: string;
  containerHeight?: number | string;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  keyExtractor?: (item: T, index: number) => string;
  emptyComponent?: React.ReactNode;
  headerComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
  'aria-label'?: string;
}

/**
 * VirtualList component - Efficiently renders large lists with virtual scrolling
 * Only renders visible items + overscan for smooth scrolling
 *
 * @example
 * ```tsx
 * <VirtualList
 *   items={todos}
 *   itemHeight={80}
 *   renderItem={({ item, style }) => (
 *     <TodoItem todo={item} style={style} />
 *   )}
 *   onEndReached={loadMore}
 * />
 * ```
 */
export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 5,
  className = '',
  containerHeight = '100%',
  onEndReached,
  onEndReachedThreshold = 100,
  keyExtractor,
  emptyComponent,
  headerComponent,
  footerComponent,
  'aria-label': ariaLabel = 'Virtual list',
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerClientHeight, setContainerClientHeight] = useState(0);
  const endReachedCalledRef = useRef(false);

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerClientHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length, startIndex + visibleCount);
  const visibleItems = items.slice(startIndex, endIndex);

  // Handle scroll events
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const newScrollTop = target.scrollTop;
      setScrollTop(newScrollTop);

      // Check if we've reached the end
      if (onEndReached) {
        const scrollBottom = newScrollTop + target.clientHeight;
        const threshold = totalHeight - onEndReachedThreshold;

        if (scrollBottom >= threshold && !endReachedCalledRef.current) {
          endReachedCalledRef.current = true;
          onEndReached();
        } else if (scrollBottom < threshold) {
          endReachedCalledRef.current = false;
        }
      }
    },
    [onEndReached, onEndReachedThreshold, totalHeight]
  );

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

    return () => resizeObserver.disconnect();
  }, []);

  // Reset end reached flag when items change
  useEffect(() => {
    endReachedCalledRef.current = false;
  }, [items.length]);

  if (items.length === 0 && emptyComponent) {
    return (
      <div
        ref={containerRef}
        className={`overflow-auto ${className}`}
        style={{ height: containerHeight }}
      >
        {headerComponent}
        {emptyComponent}
        {footerComponent}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      role="list"
      aria-label={ariaLabel}
      aria-rowcount={items.length}
    >
      {headerComponent}

      {/* Spacer for total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => {
          const actualIndex = startIndex + index;
          const key = keyExtractor ? keyExtractor(item, actualIndex) : actualIndex;
          const style: React.CSSProperties = {
            position: 'absolute',
            top: actualIndex * itemHeight,
            height: itemHeight,
            left: 0,
            right: 0,
          };

          return (
            <div key={key} role="listitem" aria-rowindex={actualIndex + 1}>
              {renderItem({ item, index: actualIndex, style })}
            </div>
          );
        })}
      </div>

      {footerComponent}
    </div>
  );
}

/**
 * VirtualGrid - Virtual scrolling for grid layouts
 */
interface VirtualGridProps<T> {
  items: T[];
  columnCount: number;
  itemHeight: number;
  renderItem: (props: VirtualItemProps<T>) => React.ReactNode;
  gap?: number;
  overscan?: number;
  className?: string;
  containerHeight?: number | string;
  keyExtractor?: (item: T, index: number) => string;
}

export function VirtualGrid<T>({
  items,
  columnCount,
  itemHeight,
  renderItem,
  gap = 16,
  overscan = 2,
  className = '',
  containerHeight = '100%',
  keyExtractor,
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerClientHeight, setContainerClientHeight] = useState(0);

  const rowCount = Math.ceil(items.length / columnCount);
  const rowHeight = itemHeight + gap;
  const totalHeight = rowCount * rowHeight;

  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleRowCount = Math.ceil(containerClientHeight / rowHeight) + overscan * 2;
  const endRow = Math.min(rowCount, startRow + visibleRowCount);

  const startIndex = startRow * columnCount;
  const endIndex = Math.min(items.length, endRow * columnCount);
  const visibleItems = items.slice(startIndex, endIndex);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerClientHeight(container.clientHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          display: 'grid',
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
          gap,
        }}
      >
        {visibleItems.map((item, index) => {
          const actualIndex = startIndex + index;
          const key = keyExtractor ? keyExtractor(item, actualIndex) : actualIndex;
          const row = Math.floor(actualIndex / columnCount);
          const style: React.CSSProperties = {
            gridRow: row + 1,
            height: itemHeight,
          };

          return (
            <div key={key} style={style}>
              {renderItem({ item, index: actualIndex, style: {} })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Memoized virtual list item wrapper for performance
 */
export const MemoizedVirtualItem = memo(function MemoizedVirtualItem<T>({
  item,
  index,
  style,
  renderItem,
}: VirtualItemProps<T> & { renderItem: (props: VirtualItemProps<T>) => React.ReactNode }) {
  return <>{renderItem({ item, index, style })}</>;
});

export default VirtualList;
