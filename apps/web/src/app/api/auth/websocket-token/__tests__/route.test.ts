import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../route';

// Mock the createClient function
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('WebSocket Token Endpoint - Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only-32bytes';
  });

  describe('POST /api/auth/websocket-token', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      // Mock createClient to return unauthenticated state
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = new Request('http://localhost:3000/api/auth/websocket-token', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty('error', 'Unauthorized');
    });

    it('should return short-lived token for authenticated users', async () => {
      const { createClient } = await import('@/lib/supabase/server');

      // Mock createClient to return authenticated user
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      } as any);

      const request = new Request('http://localhost:3000/api/auth/websocket-token', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('expiresIn');
      expect(data.expiresIn).toBe(60);
      expect(typeof data.token).toBe('string');
      expect(data.token.length).toBeGreaterThan(0);
    });

    it('should return 500 on error', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        // Mock createClient to throw an error
        vi.mocked(createClient).mockRejectedValue(new Error('Database connection failed'));

        const request = new Request('http://localhost:3000/api/auth/websocket-token', {
          method: 'POST',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toHaveProperty('error');
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'WebSocket token generation error:',
          expect.any(Error)
        );
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });
});
