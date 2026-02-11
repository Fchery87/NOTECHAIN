/**
 * Bundle optimization utilities
 *
 * This module provides helpers for analyzing and optimizing the JavaScript bundle size.
 */

/**
 * Bundle analysis configuration
 */
export interface BundleAnalysisConfig {
  /** Enable bundle analyzer in development */
  enabled: boolean;
  /** Analyzer mode */
  mode: 'server' | 'static' | 'json';
  /** Report filename (for static/json modes) */
  reportFilename?: string;
  /** Open analyzer automatically */
  openAnalyzer: boolean;
  /** Generate stats file */
  generateStatsFile: boolean;
  /** Stats filename */
  statsFilename?: string;
}

/**
 * Default bundle analysis configuration
 */
export const defaultBundleConfig: BundleAnalysisConfig = {
  enabled: process.env.ANALYZE === 'true',
  mode: 'server',
  openAnalyzer: true,
  generateStatsFile: false,
};

/**
 * Bundle size thresholds (in KB)
 */
export const bundleThresholds = {
  /** Initial JS bundle should be under 200KB */
  initial: 200 * 1024,
  /** Lazy-loaded chunks should be under 500KB */
  lazyChunk: 500 * 1024,
  /** Total bundle should be under 2MB */
  total: 2 * 1024 * 1024,
} as const;

/**
 * Analyze bundle size and log warnings
 */
export function analyzeBundleSize(stats: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  // Calculate total size from webpack stats
  const assets = stats.assets as Array<{ name: string; size: number }> | undefined;
  if (!assets) return;

  const jsAssets = assets.filter(asset => asset.name.endsWith('.js'));
  const totalSize = jsAssets.reduce((sum, asset) => sum + asset.size, 0);

  // Check thresholds
  if (totalSize > bundleThresholds.total) {
    console.warn(
      `⚠️ Total bundle size (${formatBytes(totalSize)}) exceeds threshold (${formatBytes(bundleThresholds.total)})`
    );
  }

  // Log individual chunks
  jsAssets.forEach(asset => {
    const isInitial = !asset.name.includes('dynamic') && !asset.name.includes('lazy');
    const threshold = isInitial ? bundleThresholds.initial : bundleThresholds.lazyChunk;

    if (asset.size > threshold) {
      console.warn(
        `⚠️ Chunk ${asset.name} (${formatBytes(asset.size)}) exceeds threshold (${formatBytes(threshold)})`
      );
    }
  });

  // Log summary
  console.log(`📦 Bundle Analysis:`);
  console.log(`   Total JS: ${formatBytes(totalSize)}`);
  console.log(`   Chunks: ${jsAssets.length}`);
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Performance budget configuration
 */
export interface PerformanceBudget {
  /** JavaScript size limit (bytes) */
  javascript: number;
  /** CSS size limit (bytes) */
  css: number;
  /** Image size limit (bytes) */
  images: number;
  /** Font size limit (bytes) */
  fonts: number;
}

/**
 * Default performance budgets
 */
export const defaultPerformanceBudget: PerformanceBudget = {
  javascript: 200 * 1024, // 200KB
  css: 50 * 1024, // 50KB
  images: 500 * 1024, // 500KB
  fonts: 100 * 1024, // 100KB
};

/**
 * Check if performance budget is exceeded
 */
export function checkPerformanceBudget(
  stats: Record<string, unknown>,
  budget: PerformanceBudget = defaultPerformanceBudget
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  const assets = stats.assets as Array<{ name: string; size: number }> | undefined;
  if (!assets) {
    return { passed: true, violations };
  }

  // Check JavaScript
  const jsSize = assets.filter(a => a.name.endsWith('.js')).reduce((sum, a) => sum + a.size, 0);
  if (jsSize > budget.javascript) {
    violations.push(`JavaScript: ${formatBytes(jsSize)} / ${formatBytes(budget.javascript)}`);
  }

  // Check CSS
  const cssSize = assets.filter(a => a.name.endsWith('.css')).reduce((sum, a) => sum + a.size, 0);
  if (cssSize > budget.css) {
    violations.push(`CSS: ${formatBytes(cssSize)} / ${formatBytes(budget.css)}`);
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Module dependency analyzer
 */
export interface DependencyInfo {
  name: string;
  size: number;
  reason: string;
  dependencies?: DependencyInfo[];
}

/**
 * Analyze module dependencies
 */
export function analyzeDependencies(
  modules: Array<{ name: string; size: number; reasons?: Array<{ moduleName?: string }> }>
): DependencyInfo[] {
  const dependencyMap = new Map<string, DependencyInfo>();

  modules.forEach(module => {
    const name = module.name;
    const size = module.size;
    const reason = module.reasons?.[0]?.moduleName || 'entry';

    if (!dependencyMap.has(name)) {
      dependencyMap.set(name, {
        name,
        size,
        reason,
      });
    }
  });

  return Array.from(dependencyMap.values()).sort((a, b) => b.size - a.size);
}

/**
 * Tree-shaking report
 */
export interface TreeShakingReport {
  /** Modules that were tree-shaken */
  shaken: string[];
  /** Modules that couldn't be tree-shaken */
  preserved: string[];
  /** Size saved by tree-shaking (bytes) */
  bytesSaved: number;
}

/**
 * Generate tree-shaking report
 */
export function generateTreeShakingReport(stats: Record<string, unknown>): TreeShakingReport {
  const modules = stats.modules as
    | Array<{
        name: string;
        size: number;
        usedExports?: string[];
        providedExports?: string[];
      }>
    | undefined;

  if (!modules) {
    return { shaken: [], preserved: [], bytesSaved: 0 };
  }

  const shaken: string[] = [];
  const preserved: string[] = [];
  let bytesSaved = 0;

  modules.forEach(module => {
    const { usedExports, providedExports, size } = module;

    if (providedExports && usedExports) {
      const unusedExports = providedExports.filter(exp => !usedExports.includes(exp));

      if (unusedExports.length > 0) {
        shaken.push(module.name);
        // Estimate savings (rough approximation)
        bytesSaved += (unusedExports.length / providedExports.length) * size;
      } else if (providedExports.length > 0) {
        preserved.push(module.name);
      }
    }
  });

  return { shaken, preserved, bytesSaved };
}

/**
 * Chunk optimization recommendations
 */
export interface ChunkRecommendation {
  type: 'warning' | 'error' | 'info';
  message: string;
  suggestion: string;
}

/**
 * Generate chunk optimization recommendations
 */
export function generateChunkRecommendations(
  stats: Record<string, unknown>
): ChunkRecommendation[] {
  const recommendations: ChunkRecommendation[] = [];
  const chunks = stats.chunks as
    | Array<{
        names: string[];
        size: number;
        modules: Array<{ name: string; size: number }>;
      }>
    | undefined;

  if (!chunks) return recommendations;

  chunks.forEach(chunk => {
    // Check for duplicate dependencies
    const moduleNames = chunk.modules.map(m => m.name);
    const duplicates = moduleNames.filter((name, index) => moduleNames.indexOf(name) !== index);

    if (duplicates.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `Chunk ${chunk.names.join(', ')} has duplicate modules`,
        suggestion: 'Consider using module federation or shared chunks',
      });
    }

    // Check for large chunks
    if (chunk.size > bundleThresholds.lazyChunk) {
      recommendations.push({
        type: 'warning',
        message: `Chunk ${chunk.names.join(', ')} is large (${formatBytes(chunk.size)})`,
        suggestion: 'Split into smaller chunks or use dynamic imports',
      });
    }
  });

  return recommendations;
}

/**
 * Bundle optimizer class for programmatic access
 */
export class BundleOptimizer {
  private config: BundleAnalysisConfig;
  private budget: PerformanceBudget;

  constructor(config: Partial<BundleAnalysisConfig> = {}, budget: Partial<PerformanceBudget> = {}) {
    this.config = { ...defaultBundleConfig, ...config };
    this.budget = { ...defaultPerformanceBudget, ...budget };
  }

  /**
   * Analyze bundle and return report
   */
  analyze(stats: Record<string, unknown>): {
    size: string;
    budgetCheck: ReturnType<typeof checkPerformanceBudget>;
    recommendations: ChunkRecommendation[];
    treeShaking: TreeShakingReport;
  } {
    return {
      size: formatBytes(
        (stats.assets as Array<{ size: number }> | undefined)?.reduce(
          (sum, a) => sum + a.size,
          0
        ) || 0
      ),
      budgetCheck: checkPerformanceBudget(stats, this.budget),
      recommendations: generateChunkRecommendations(stats),
      treeShaking: generateTreeShakingReport(stats),
    };
  }

  /**
   * Check if analysis is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

export default {
  analyzeBundleSize,
  checkPerformanceBudget,
  generateTreeShakingReport,
  generateChunkRecommendations,
  BundleOptimizer,
};
