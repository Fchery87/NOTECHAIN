'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Type definitions for Performance API types that might not be in all TypeScript versions
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
}

/**
 * Web Vitals metrics
 */
export interface WebVitalsMetrics {
  /** Largest Contentful Paint (ms) */
  lcp?: number;
  /** First Input Delay (ms) */
  fid?: number;
  /** Cumulative Layout Shift */
  cls?: number;
  /** First Contentful Paint (ms) */
  fcp?: number;
  /** Time to First Byte (ms) */
  ttfb?: number;
  /** Interaction to Next Paint (ms) */
  inp?: number;
}

/**
 * Performance monitor options
 */
interface UsePerformanceMonitorOptions {
  /** Whether to enable monitoring */
  enabled?: boolean;
  /** Callback when metrics are collected */
  onMetrics?: (metrics: WebVitalsMetrics) => void;
  /** Threshold for LCP warning (ms) */
  lcpThreshold?: number;
  /** Threshold for FID warning (ms) */
  fidThreshold?: number;
  /** Threshold for CLS warning */
  clsThreshold?: number;
}

/**
 * Performance monitor return value
 */
interface UsePerformanceMonitorReturn {
  /** Collected metrics */
  metrics: WebVitalsMetrics;
  /** Whether monitoring is supported */
  isSupported: boolean;
  /** Manually collect metrics */
  collectMetrics: () => void;
  /** Clear collected metrics */
  clearMetrics: () => void;
}

/**
 * usePerformanceMonitor hook - Monitor Core Web Vitals and performance metrics
 *
 * @example
 * ```tsx
 * function App() {
 *   const { metrics } = usePerformanceMonitor({
 *     enabled: process.env.NODE_ENV === 'production',
 *     onMetrics: (m) => {
 *       analytics.track('web_vitals', m);
 *     }
 *   });
 *
 *   return <div>LCP: {metrics.lcp}ms</div>;
 * }
 * ```
 */
export function usePerformanceMonitor({
  enabled = true,
  onMetrics,
  lcpThreshold = 2500,
  fidThreshold = 100,
  clsThreshold = 0.1,
}: UsePerformanceMonitorOptions = {}): UsePerformanceMonitorReturn {
  const [metrics, setMetrics] = useState<WebVitalsMetrics>({});
  const observersRef = useRef<PerformanceObserver[]>([]);
  const isSupportedRef = useRef(typeof window !== 'undefined' && 'performance' in window);

  const clearMetrics = useCallback(() => {
    setMetrics({});
  }, []);

  const collectMetrics = useCallback(() => {
    if (!isSupportedRef.current || !enabled) return;

    // Get navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      setMetrics(prev => ({
        ...prev,
        ttfb: navigation.responseStart - navigation.startTime,
      }));
    }

    // Get paint timing
    const paints = performance.getEntriesByType('paint');
    paints.forEach(paint => {
      if (paint.name === 'first-contentful-paint') {
        setMetrics(prev => ({ ...prev, fcp: paint.startTime }));
      }
    });
  }, [enabled]);

  useEffect(() => {
    if (!isSupportedRef.current || !enabled) return;

    // LCP Observer
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          const lcp = lastEntry.startTime;

          setMetrics(prev => {
            const newMetrics = { ...prev, lcp };
            onMetrics?.(newMetrics);
            return newMetrics;
          });

          if (lcp > lcpThreshold) {
            console.warn(
              `LCP exceeds threshold: ${lcp.toFixed(0)}ms (threshold: ${lcpThreshold}ms)`
            );
          }
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] as const });
        observersRef.current.push(lcpObserver);
      } catch {
        // LCP not supported
      }

      // FID Observer
      try {
        const fidObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'first-input') {
              const fid = (entry as PerformanceEventTiming).processingStart - entry.startTime;

              setMetrics(prev => {
                const newMetrics = { ...prev, fid };
                onMetrics?.(newMetrics);
                return newMetrics;
              });

              if (fid > fidThreshold) {
                console.warn(
                  `FID exceeds threshold: ${fid.toFixed(0)}ms (threshold: ${fidThreshold}ms)`
                );
              }
            }
          });
        });

        fidObserver.observe({ entryTypes: ['first-input'] as const });
        observersRef.current.push(fidObserver);
      } catch {
        // FID not supported
      }

      // CLS Observer
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!(entry as LayoutShift).hadRecentInput) {
              clsValue += (entry as LayoutShift).value;
            }
          });

          setMetrics(prev => {
            const newMetrics = { ...prev, cls: clsValue };
            onMetrics?.(newMetrics);
            return newMetrics;
          });

          if (clsValue > clsThreshold) {
            console.warn(
              `CLS exceeds threshold: ${clsValue.toFixed(3)} (threshold: ${clsThreshold})`
            );
          }
        });

        clsObserver.observe({ entryTypes: ['layout-shift'] as const });
        observersRef.current.push(clsObserver);
      } catch {
        // CLS not supported
      }
    }

    // Collect initial metrics
    collectMetrics();

    return () => {
      observersRef.current.forEach(observer => observer.disconnect());
      observersRef.current = [];
    };
  }, [enabled, onMetrics, lcpThreshold, fidThreshold, clsThreshold, collectMetrics]);

  return {
    metrics,
    isSupported: isSupportedRef.current,
    collectMetrics,
    clearMetrics,
  };
}

/**
 * usePerformanceMark hook - Add performance marks and measures
 */
export function usePerformanceMark(name: string) {
  const markName = useRef(`${name}-${Date.now()}`);

  useEffect(() => {
    if (typeof window === 'undefined' || !('performance' in window)) return;

    performance.mark(`${markName.current}-start`);

    return () => {
      performance.mark(`${markName.current}-end`);
      performance.measure(markName.current, `${markName.current}-start`, `${markName.current}-end`);
    };
  }, [name]);

  const measure = useCallback(() => {
    if (typeof window === 'undefined' || !('performance' in window)) return null;

    performance.mark(`${markName.current}-checkpoint`);
    const measures = performance.getEntriesByName(markName.current);
    return measures[measures.length - 1]?.duration ?? null;
  }, []);

  return { measure };
}

/**
 * useLongTaskObserver hook - Detect long tasks that block main thread
 */
export function useLongTaskObserver(onLongTask: (entry: PerformanceEntry) => void, threshold = 50) {
  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.duration > threshold) {
            onLongTask(entry);
          }
        });
      });

      observer.observe({ entryTypes: ['longtask'] as const });

      return () => observer.disconnect();
    } catch {
      // Long tasks not supported
    }
  }, [onLongTask, threshold]);
}

/**
 * useResourceTiming hook - Monitor resource loading performance
 */
export function useResourceTiming(
  resourceType: string,
  onResourceLoad: (entries: PerformanceResourceTiming[]) => void
) {
  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver(list => {
      const entries = list.getEntries() as PerformanceResourceTiming[];
      const filtered = entries.filter(entry => entry.initiatorType === resourceType);

      if (filtered.length > 0) {
        onResourceLoad(filtered);
      }
    });

    observer.observe({ entryTypes: ['resource'] as const });

    return () => observer.disconnect();
  }, [resourceType, onResourceLoad]);
}

/**
 * useNetworkStatus hook - Monitor network connection status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connectionInfo, setConnectionInfo] = useState<{
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  }>({});

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get connection info if available
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (connection) {
      const updateConnectionInfo = () => {
        setConnectionInfo({
          effectiveType: (connection as { effectiveType?: string }).effectiveType,
          downlink: (connection as { downlink?: number }).downlink,
          rtt: (connection as { rtt?: number }).rtt,
          saveData: (connection as { saveData?: boolean }).saveData,
        });
      };

      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', updateConnectionInfo);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionInfo };
}

export default usePerformanceMonitor;
