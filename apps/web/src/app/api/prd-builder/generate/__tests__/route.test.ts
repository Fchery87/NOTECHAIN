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

const validBody = {
  mode: 'ai-enhanced',
  consent: { externalAi: true, acceptedAt: '2026-06-12T00:00:00.000Z' },
  brief: {
    projectName: 'Client Portal',
    summary: 'A portal.',
    targetUsers: ['Admins'],
    knownFeatures: ['Invite clients'],
    assumptions: [],
    unknowns: [],
    sourceTitles: ['Discovery'],
  },
  sourceNotes: [{ id: 'note-1', title: 'Discovery', plainText: 'Build a portal.' }],
  answers: [],
  deterministicMarkdown: '# PRD: Client Portal\n\n## 1. Summary\n\nDraft',
};

describe('POST /api/prd-builder/generate', () => {
  beforeEach(async () => {
    await resetPrdBuilderRateLimitsForTests();
    process.env.NEXT_PUBLIC_ENABLE_PRD_BUILDER_EXTERNAL_AI = 'true';
    process.env.PRD_BUILDER_AI_PROVIDER = 'mock';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ENABLE_PRD_BUILDER_EXTERNAL_AI;
    delete process.env.PRD_BUILDER_AI_PROVIDER;
  });

  it('rejects requests when the feature flag is disabled', async () => {
    process.env.NEXT_PUBLIC_ENABLE_PRD_BUILDER_EXTERNAL_AI = 'false';

    const response = await POST(
      new Request('http://localhost/api/prd-builder/generate', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }) as never
    );

    expect(response.status).toBe(403);
  });

  it('rejects missing external AI consent', async () => {
    const response = await POST(
      new Request('http://localhost/api/prd-builder/generate', {
        method: 'POST',
        body: JSON.stringify({ ...validBody, consent: { acceptedAt: 'now' } }),
      }) as never
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('External AI consent is required');
  });

  it('returns mock AI-enhanced Markdown when consent and config are valid', async () => {
    const response = await POST(
      new Request('http://localhost/api/prd-builder/generate', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }) as never
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.provider).toBe('mock');
    expect(data.markdown).toContain('AI Enhancement Summary');
    expect(data.traceability.sourceNoteIds).toEqual(['note-1']);
  });
});
