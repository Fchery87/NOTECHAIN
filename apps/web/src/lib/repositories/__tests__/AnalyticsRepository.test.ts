// apps/web/src/lib/repositories/__tests__/AnalyticsRepository.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { AnalyticsRepository, createAnalyticsRepository } from '../AnalyticsRepository';

// Mock encryption functions
const mockEncryptionKey = new Uint8Array(32);

// Helper to create mock chain
const createMockChain = () => {
  const chain: Record<string, any> = {};

  chain.select = mock(() => chain);
  chain.eq = mock(() => chain);
  chain.in = mock(() => chain);
  chain.gte = mock(() => chain);
  chain.lte = mock(() => chain);
  chain.order = mock(() => chain);
  chain.single = mock(async () => ({ data: null, error: null }));
  chain.maybeSingle = mock(async () => ({ data: null, error: null }));

  // Final resolver - this should resolve the chain
  let resolver: (value: any) => void;
  chain.promise = new Promise(resolve => {
    resolver = resolve;
  });

  // Make the chain thenable
  chain.then = (onFulfilled: any) => {
    return chain.promise.then(onFulfilled);
  };

  chain.resolve = (data: any, error: any = null) => {
    resolver({ data, error });
  };

  return chain;
};

// Mock decryptData to return the "encrypted" data (for testing purposes)
mock.module('@notechain/core-crypto', () => ({
  decryptData: mock(async (data: any) => data.ciphertext),
}));

describe('AnalyticsRepository', () => {
  let repository: AnalyticsRepository;
  let mockChain: ReturnType<typeof createMockChain>;
  let mockFrom: any;

  beforeEach(() => {
    mockChain = createMockChain();
    mockFrom = mock(() => mockChain);

    const mockSupabase = { from: mockFrom };
    repository = new AnalyticsRepository('test-user', mockEncryptionKey, mockSupabase as any);
  });

  describe('constructor', () => {
    test('should create repository with provided client', () => {
      expect(repository).toBeInstanceOf(AnalyticsRepository);
    });
  });

  describe('createAnalyticsRepository factory', () => {
    test('should create AnalyticsRepository instance', () => {
      const mockSupabase = { from: mockFrom };
      const repo = createAnalyticsRepository('test-user', mockEncryptionKey, mockSupabase as any);
      expect(repo).toBeInstanceOf(AnalyticsRepository);
    });
  });

  describe('getTodosInRange', () => {
    test('should query encrypted_blobs with correct filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockChain.resolve([]);

      const result = await repository.getTodosInRange(startDate, endDate);

      expect(mockFrom).toHaveBeenCalledWith('encrypted_blobs');
      expect(result).toEqual([]);
    });

    test('should return empty array when no todos found', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockChain.resolve([]);

      const result = await repository.getTodosInRange(startDate, endDate);

      expect(result).toEqual([]);
    });

    test('should throw error when query fails', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockChain.resolve(null, { message: 'Database error' });

      expect(repository.getTodosInRange(startDate, endDate)).rejects.toEqual({
        message: 'Database error',
      });
    });
  });

  describe('getNotesInRange', () => {
    test('should query encrypted_blobs for notes', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockChain.resolve([]);

      const result = await repository.getNotesInRange(startDate, endDate);

      expect(mockFrom).toHaveBeenCalledWith('encrypted_blobs');
      expect(result).toEqual([]);
    });
  });

  describe('getCompletedTodosCount', () => {
    test('should return 0 when no todos in range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockChain.resolve([]);

      const result = await repository.getCompletedTodosCount(startDate, endDate);

      expect(result).toBe(0);
    });
  });

  describe('getTaskVolumeByDay', () => {
    test('should return volume data for specified number of days', async () => {
      mockChain.resolve([]);

      const result = await repository.getTaskVolumeByDay(7);

      // Should have 8 entries (7 days + today)
      expect(result.length).toBe(8);
    });

    test('should initialize all days with zero count', async () => {
      mockChain.resolve([]);

      const result = await repository.getTaskVolumeByDay(3);

      expect(result.every(item => item.count === 0)).toBe(true);
    });

    test('should sort results by date ascending', async () => {
      mockChain.resolve([]);

      const result = await repository.getTaskVolumeByDay(5);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].date.getTime()).toBeGreaterThanOrEqual(result[i - 1].date.getTime());
      }
    });
  });

  describe('getPeakProductivityData', () => {
    test('should return hourly data for all 24 hours', async () => {
      mockChain.resolve([]);

      const result = await repository.getPeakProductivityData(7);

      expect(result.length).toBe(24);
      expect(result[0].hour).toBe(0);
      expect(result[23].hour).toBe(23);
    });

    test('should initialize all hours with zero count', async () => {
      mockChain.resolve([]);

      const result = await repository.getPeakProductivityData(7);

      expect(result.every(item => item.count === 0)).toBe(true);
    });

    test('should sort results by hour ascending', async () => {
      mockChain.resolve([]);

      const result = await repository.getPeakProductivityData(7);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].hour).toBeGreaterThan(result[i - 1].hour);
      }
    });
  });

  describe('getActivitySummary', () => {
    test('should return summary with zeros when no activity', async () => {
      mockChain.resolve([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await repository.getActivitySummary(startDate, endDate);

      expect(result.totalTodos).toBe(0);
      expect(result.completedTodos).toBe(0);
      expect(result.totalNotes).toBe(0);
      expect(result.completionRate).toBe(0);
    });
  });
});
