import { describe, it, expect } from 'vitest';
import { LayoutType, getLayoutOptions, getRecommendedLayout } from '../layouts';

describe('layouts', () => {
  describe('LayoutType enum', () => {
    it('should have FORCE_DIRECTED layout type', () => {
      expect(LayoutType.FORCE_DIRECTED).toBe('FORCE_DIRECTED');
    });

    it('should have CIRCLE layout type', () => {
      expect(LayoutType.CIRCLE).toBe('CIRCLE');
    });

    it('should have GRID layout type', () => {
      expect(LayoutType.GRID).toBe('GRID');
    });

    it('should have BREADTHFIRST layout type', () => {
      expect(LayoutType.BREADTHFIRST).toBe('BREADTHFIRST');
    });

    it('should have CONCENTRIC layout type', () => {
      expect(LayoutType.CONCENTRIC).toBe('CONCENTRIC');
    });
  });

  describe('getLayoutOptions', () => {
    it('should return cose layout for FORCE_DIRECTED', () => {
      const options = getLayoutOptions(LayoutType.FORCE_DIRECTED);
      expect(options.name).toBe('cose');
      expect(options.animate).toBe(true);
      expect(options.animationDuration).toBe(500);
    });

    it('should return circle layout for CIRCLE', () => {
      const options = getLayoutOptions(LayoutType.CIRCLE);
      expect(options.name).toBe('circle');
      expect(options.animate).toBe(true);
      expect(options.animationDuration).toBe(500);
    });

    it('should return grid layout for GRID', () => {
      const options = getLayoutOptions(LayoutType.GRID);
      expect(options.name).toBe('grid');
      expect(options.animate).toBe(true);
      expect(options.animationDuration).toBe(500);
    });

    it('should return breadthfirst layout for BREADTHFIRST', () => {
      const options = getLayoutOptions(LayoutType.BREADTHFIRST);
      expect(options.name).toBe('breadthfirst');
      expect(options.animate).toBe(true);
      expect(options.animationDuration).toBe(500);
    });

    it('should return concentric layout for CONCENTRIC', () => {
      const options = getLayoutOptions(LayoutType.CONCENTRIC);
      expect(options.name).toBe('concentric');
      expect(options.animate).toBe(true);
      expect(options.animationDuration).toBe(500);
    });

    it('should allow custom options to override defaults', () => {
      const customOptions = {
        animationDuration: 1000,
        padding: 50,
      };
      const options = getLayoutOptions(LayoutType.GRID, customOptions);
      expect(options.name).toBe('grid');
      expect(options.animate).toBe(true);
      expect(options.animationDuration).toBe(1000);
      expect(options.padding).toBe(50);
    });

    it('should have layout-specific options for cose', () => {
      const options = getLayoutOptions(LayoutType.FORCE_DIRECTED);
      expect(options.name).toBe('cose');
      expect(options.componentSpacing).toBeDefined();
      expect(options.nodeRepulsion).toBeDefined();
      expect(options.edgeElasticity).toBeDefined();
      expect(options.gravity).toBeDefined();
      expect(options.numIter).toBeDefined();
    });

    it('should have layout-specific options for circle', () => {
      const options = getLayoutOptions(LayoutType.CIRCLE);
      expect(options.name).toBe('circle');
      expect(options.padding).toBeDefined();
      expect(options.avoidOverlap).toBe(true);
    });

    it('should have layout-specific options for grid', () => {
      const options = getLayoutOptions(LayoutType.GRID);
      expect(options.name).toBe('grid');
      expect(options.padding).toBeDefined();
      expect(options.avoidOverlap).toBe(true);
    });

    it('should have layout-specific options for breadthfirst', () => {
      const options = getLayoutOptions(LayoutType.BREADTHFIRST);
      expect(options.name).toBe('breadthfirst');
      expect(options.directed).toBe(true);
      expect(options.padding).toBeDefined();
    });

    it('should have layout-specific options for concentric', () => {
      const options = getLayoutOptions(LayoutType.CONCENTRIC);
      expect(options.name).toBe('concentric');
      expect(options.padding).toBeDefined();
      expect(options.concentric).toBeDefined();
      expect(options.levelWidth).toBeDefined();
    });
  });

  describe('getRecommendedLayout', () => {
    it('should recommend FORCE_DIRECTED for small graphs (1-20 nodes)', () => {
      expect(getRecommendedLayout(1)).toBe(LayoutType.FORCE_DIRECTED);
      expect(getRecommendedLayout(10)).toBe(LayoutType.FORCE_DIRECTED);
      expect(getRecommendedLayout(20)).toBe(LayoutType.FORCE_DIRECTED);
    });

    it('should recommend CIRCLE for medium-small graphs (21-50 nodes)', () => {
      expect(getRecommendedLayout(21)).toBe(LayoutType.CIRCLE);
      expect(getRecommendedLayout(35)).toBe(LayoutType.CIRCLE);
      expect(getRecommendedLayout(50)).toBe(LayoutType.CIRCLE);
    });

    it('should recommend GRID for medium graphs (51-100 nodes)', () => {
      expect(getRecommendedLayout(51)).toBe(LayoutType.GRID);
      expect(getRecommendedLayout(75)).toBe(LayoutType.GRID);
      expect(getRecommendedLayout(100)).toBe(LayoutType.GRID);
    });

    it('should recommend CONCENTRIC for large graphs (101+ nodes)', () => {
      expect(getRecommendedLayout(101)).toBe(LayoutType.CONCENTRIC);
      expect(getRecommendedLayout(200)).toBe(LayoutType.CONCENTRIC);
      expect(getRecommendedLayout(1000)).toBe(LayoutType.CONCENTRIC);
    });

    it('should default to FORCE_DIRECTED for zero or negative node counts', () => {
      expect(getRecommendedLayout(0)).toBe(LayoutType.FORCE_DIRECTED);
      expect(getRecommendedLayout(-5)).toBe(LayoutType.FORCE_DIRECTED);
    });
  });
});
