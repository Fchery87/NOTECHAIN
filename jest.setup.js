/* global process, jest */

// Jest setup file
// Add any global test setup here

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Global test timeout
jest.setTimeout(10000);
