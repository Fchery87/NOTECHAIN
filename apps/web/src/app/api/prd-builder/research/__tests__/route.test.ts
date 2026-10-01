import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetPrdBuilderRateLimitsForTests } from '@/lib/prdBuilder/ai/rateLimit';
import { POST } from '../route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
    },
  })),
}));

describe('POST /api/prd-builder/research', () => {
  beforeEach(async () => {
    await resetPrdBuilderRateLimitsForTests();
    process.env.NEXT_PUBLIC_ENABLE_PRD_BUILDER_WEB_RESEARCH = 'true';
    process.env.PRD_BUILDER_RESEARCH_PROVIDER = 'mock';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ENABLE_PRD_BUILDER_WEB_RESEARCH;
    delete process.env.PRD_BUILDER_RESEARCH_PROVIDER;
  });

  it('rejects requests when the feature flag is disabled', async () => {
    process.env.NEXT_PUBLIC_ENABLE_PRD_BUILDER_WEB_RESEARCH = 'false';

    const response = await POST(
      new Request('http://localhost/api/prd-builder/research', {
        method: 'POST',
        body: JSON.stringify({
          query: 'client portal research',
          consent: { webResearch: true, acceptedAt: '2026-06-12T00:00:00.000Z' },
        }),
      }) as never
    );

    expect(response.status).toBe(403);
  });

  it('rejects note content in research payloads', async () => {
    const response = await POST(
      new Request('http://localhost/api/prd-builder/research', {
        method: 'POST',
        body: JSON.stringify({
          query: 'client portal research',
          sourceNotes: [{ plainText: 'secret note' }],
          consent: { webResearch: true, acceptedAt: '2026-06-12T00:00:00.000Z' },
        }),
      }) as never
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('not note content');
  });

  it('returns a cited mock research brief when consent is valid', async () => {
    const response = await POST(
      new Request('http://localhost/api/prd-builder/research', {
        method: 'POST',
        body: JSON.stringify({
          query: 'client portal research',
          consent: { webResearch: true, acceptedAt: '2026-06-12T00:00:00.000Z' },
        }),
      }) as never
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.query).toBe('client portal research');
    expect(data.citations[0].url).toBe('https://example.com/prd-builder-research');
  });
});
