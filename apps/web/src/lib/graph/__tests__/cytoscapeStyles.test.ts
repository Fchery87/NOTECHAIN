import { describe, it, expect } from 'vitest';
import { getCytoscapeStyles } from '../cytoscapeStyles';

describe('cytoscapeStyles', () => {
  describe('getCytoscapeStyles', () => {
    it('should return an array of style definitions', () => {
      const styles = getCytoscapeStyles();
      expect(Array.isArray(styles)).toBe(true);
      expect(styles.length).toBeGreaterThan(0);
    });

    it('should have node styles', () => {
      const styles = getCytoscapeStyles();
      const nodeSelector = styles.find((s: any) => s.selector === 'node');
      expect(nodeSelector).toBeDefined();
      expect(nodeSelector.style).toBeDefined();
    });

    it('should have edge styles', () => {
      const styles = getCytoscapeStyles();
      const edgeSelector = styles.find((s: any) => s.selector === 'edge');
      expect(edgeSelector).toBeDefined();
      expect(edgeSelector.style).toBeDefined();
    });

    it('should have note node styles', () => {
      const styles = getCytoscapeStyles();
      const noteSelector = styles.find((s: any) => s.selector === 'node[type="note"]');
      expect(noteSelector).toBeDefined();
      expect(noteSelector.style.shape).toBe('ellipse');
    });

    it('should have tag node styles', () => {
      const styles = getCytoscapeStyles();
      const tagSelector = styles.find((s: any) => s.selector === 'node[type="tag"]');
      expect(tagSelector).toBeDefined();
      expect(tagSelector.style.shape).toBe('round-rectangle');
      expect(tagSelector.style['background-color']).toBe('#f59e0b');
    });

    it('should have selected node styles', () => {
      const styles = getCytoscapeStyles();
      const selectedSelector = styles.find((s: any) => s.selector === 'node:selected');
      expect(selectedSelector).toBeDefined();
      expect(selectedSelector.style['border-color']).toBe('#f59e0b');
      expect(selectedSelector.style['border-width']).toBeGreaterThan(0);
    });
  });
});
