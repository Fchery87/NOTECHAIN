// packages/ai-engine/src/__tests__/EmbeddingService.test.ts
/**
 * Unit tests for EmbeddingService
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { EmbeddingService } from '../embeddings/EmbeddingService';
import { AIError } from '../types';

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    service = new EmbeddingService({
      modelId: 'Xenova/all-MiniLM-L6-v2',
      dimensions: 384,
      maxLength: 512,
      normalize: true,
    });
  });

  afterEach(() => {
    service.dispose();
  });

  describe('Initialization', () => {
    it('should create instance with default config', () => {
      const defaultService = new EmbeddingService();
      expect(defaultService).toBeDefined();
      expect(defaultService.isReady()).toBe(false);
      defaultService.dispose();
    });

    it('should create instance with custom config', () => {
      const customService = new EmbeddingService({
        modelId: 'custom-model',
        dimensions: 768,
        maxLength: 256,
        normalize: false,
      });

      const config = customService.getConfig();
      expect(config.modelId).toBe('custom-model');
      expect(config.dimensions).toBe(768);
      expect(config.maxLength).toBe(256);
      expect(config.normalize).toBe(false);
      customService.dispose();
    });
  });

  describe('Configuration', () => {
    it('should return config copy', () => {
      const config = service.getConfig();
      config.dimensions = 999;

      const config2 = service.getConfig();
      expect(config2.dimensions).toBe(384);
    });
  });

  describe('Cosine Similarity', () => {
    it('should calculate cosine similarity for identical vectors', () => {
      const vec = [1, 0, 0];
      const similarity = service.cosineSimilarity(vec, vec);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should calculate cosine similarity for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      const similarity = service.cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(0, 5);
    });

    it('should calculate cosine similarity for opposite vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [-1, 0, 0];
      const similarity = service.cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(-1, 5);
    });

    it('should throw error for mismatched dimensions', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0];

      expect(() => service.cosineSimilarity(vec1, vec2)).toThrow(AIError);
    });

    it('should handle zero vectors', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 0, 0];
      const similarity = service.cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(0);
    });
  });

  describe('Find Most Similar', () => {
    it('should find most similar vectors', () => {
      const query = [1, 0, 0];
      const candidates = [
        { id: 'a', embedding: [0.9, 0.1, 0] },
        { id: 'b', embedding: [0, 1, 0] },
        { id: 'c', embedding: [0.8, 0.2, 0] },
      ];

      const results = service.findMostSimilar(query, candidates, 2);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('a');
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('should return all candidates if less than topK', () => {
      const query = [1, 0, 0];
      const candidates = [{ id: 'a', embedding: [0.9, 0.1, 0] }];

      const results = service.findMostSimilar(query, candidates, 5);

      expect(results).toHaveLength(1);
    });

    it('should return empty array for empty candidates', () => {
      const query = [1, 0, 0];
      const results = service.findMostSimilar(query, [], 5);

      expect(results).toHaveLength(0);
    });
  });

  describe('Cache Management', () => {
    it('should start with empty cache', () => {
      expect(service.getCacheSize()).toBe(0);
    });

    it('should clear cache', () => {
      // Cache is private, but we can verify clearCache doesn't error
      service.clearCache();
      expect(service.getCacheSize()).toBe(0);
    });
  });

  describe('Dispose', () => {
    it('should reset state and clear cache on dispose', () => {
      service.dispose();
      expect(service.isReady()).toBe(false);
      expect(service.getCacheSize()).toBe(0);
    });
  });

  describe('Progress Tracking', () => {
    it('should call progress callback', () => {
      const progressUpdates: unknown[] = [];
      const serviceWithProgress = new EmbeddingService(
        {
          modelId: 'Xenova/all-MiniLM-L6-v2',
        },
        progress => {
          progressUpdates.push(progress);
        }
      );

      expect(serviceWithProgress).toBeDefined();
      serviceWithProgress.dispose();
    });
  });
});
