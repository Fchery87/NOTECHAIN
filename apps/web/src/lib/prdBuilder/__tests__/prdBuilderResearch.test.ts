import { describe, expect, it } from 'vitest';
import { buildSuggestedResearchQuery, generatePrdMarkdown } from '../prdBuilder';

describe('PRD Builder research helpers', () => {
  it('builds a compact suggested research query from a brief', () => {
    const query = buildSuggestedResearchQuery({
      projectName: 'Client Portal',
      summary: 'A workflow for healthcare client onboarding and status tracking.',
      targetUsers: ['Client admins', 'Providers'],
      knownFeatures: [],
      assumptions: [],
      unknowns: [],
      sourceTitles: [],
    });

    expect(query).toContain('Client Portal');
    expect(query.length).toBeLessThanOrEqual(240);
  });

  it('includes external research citations in deterministic fallback Markdown when provided', () => {
    const markdown = generatePrdMarkdown({
      session: {
        sourceNotes: [{ id: 'note-1', title: 'Discovery', content: '<p>Build portal</p>' }],
        brief: {
          projectName: 'Client Portal',
          summary: 'Portal summary.',
          targetUsers: ['Admins'],
          knownFeatures: ['Invite clients'],
          assumptions: [],
          unknowns: [],
          sourceTitles: ['Discovery'],
        },
        readiness: [],
        questions: [],
        createdAt: new Date('2026-06-12T00:00:00.000Z'),
      },
      answers: [],
      researchBrief: {
        query: 'client portal research',
        summary: 'Portals should show onboarding status.',
        citations: [
          {
            id: 'research-1',
            title: 'Portal research',
            url: 'https://example.com/research',
            snippet: 'Status visibility matters.',
            retrievedAt: '2026-06-12T00:00:00.000Z',
          },
        ],
        warnings: [],
        generatedAt: '2026-06-12T00:00:00.000Z',
      },
    });

    expect(markdown).toContain('Portals should show onboarding status.');
    expect(markdown).toContain('Portal research — https://example.com/research');
  });
});
