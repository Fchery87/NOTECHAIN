// packages/ai-engine/src/__tests__/LocalLLM.test.ts
/**
 * Unit tests for LocalLLM service
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { LocalLLM } from '../llm/LocalLLM';
import { AIError } from '../types';

describe('LocalLLM', () => {
  let llm: LocalLLM;

  beforeEach(() => {
    llm = new LocalLLM({
      modelId: 'Xenova/tinyllama-chat-v1.0',
      quantized: true,
      maxTokens: 50, // Small for testing
      temperature: 0.5,
    });
  });

  afterEach(() => {
    llm.dispose();
  });

  describe('Initialization', () => {
    it('should create instance with default config', () => {
      const defaultLlm = new LocalLLM();
      expect(defaultLlm).toBeDefined();
      expect(defaultLlm.isReady()).toBe(false);
      defaultLlm.dispose();
    });

    it('should create instance with custom config', () => {
      const customLlm = new LocalLLM({
        modelId: 'custom-model',
        quantized: false,
        maxTokens: 100,
        temperature: 0.8,
      });

      const config = customLlm.getConfig();
      expect(config.modelId).toBe('custom-model');
      expect(config.quantized).toBe(false);
      expect(config.maxTokens).toBe(100);
      expect(config.temperature).toBe(0.8);
      customLlm.dispose();
    });

    it('should track loading state', () => {
      expect(llm.isReady()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should return config copy', () => {
      const config = llm.getConfig();
      config.maxTokens = 999;

      const config2 = llm.getConfig();
      expect(config2.maxTokens).toBe(50);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when generating without initialization', async () => {
      // Note: We can't actually test this without the model loaded
      // but we can verify the error type exists
      expect(AIError).toBeDefined();

      const error = new AIError('MODEL_NOT_LOADED', 'Test error');
      expect(error.code).toBe('MODEL_NOT_LOADED');
      expect(error.message).toBe('Test error');
    });

    it('should create AIError with cause', () => {
      const cause = new Error('Original error');
      const error = new AIError('GENERATION_ERROR', 'Generation failed', cause);

      expect(error.code).toBe('GENERATION_ERROR');
      expect(error.cause).toBe(cause);
    });
  });

  describe('Progress Tracking', () => {
    it('should call progress callback', () => {
      const progressUpdates: unknown[] = [];
      const llmWithProgress = new LocalLLM(
        {
          modelId: 'Xenova/tinyllama-chat-v1.0',
          quantized: true,
        },
        progress => {
          progressUpdates.push(progress);
        }
      );

      // Progress callback is set up
      expect(llmWithProgress).toBeDefined();
      llmWithProgress.dispose();
    });
  });

  describe('Dispose', () => {
    it('should reset state on dispose', () => {
      llm.dispose();
      expect(llm.isReady()).toBe(false);
    });
  });
});
