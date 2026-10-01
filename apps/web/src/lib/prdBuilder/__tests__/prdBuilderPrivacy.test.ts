import { describe, expect, it } from 'vitest';
import { sanitizeResearchQuery, hasUnexpectedResearchPayloadKeys } from '../ai/sanitize';
import { validateGeneratePrdRequest, validateResearchRequest } from '../ai/validation';

describe('PRD Builder privacy validation', () => {
  it('requires explicit external AI consent', () => {
    const errors = validateGeneratePrdRequest({
      mode: 'ai-enhanced',
      brief: {},
      sourceNotes: [{ id: 'note-1', title: 'Note', plainText: 'content' }],
      answers: [],
      deterministicMarkdown: '# PRD',
      consent: { acceptedAt: new Date().toISOString() },
    });

    expect(errors).toContain('External AI consent is required.');
  });

  it('requires separate web research consent for AI + research mode', () => {
    const errors = validateGeneratePrdRequest({
      mode: 'ai-enhanced-with-research',
      brief: {},
      sourceNotes: [{ id: 'note-1', title: 'Note', plainText: 'content' }],
      answers: [],
      deterministicMarkdown: '# PRD',
      consent: { externalAi: true, acceptedAt: new Date().toISOString() },
    });

    expect(errors).toContain('Web research consent is required for AI + research mode.');
  });

  it('rejects research briefs outside AI + research mode', () => {
    const errors = validateGeneratePrdRequest({
      mode: 'ai-enhanced',
      brief: {
        projectName: 'Client Portal',
        summary: 'Summary',
        targetUsers: [],
        knownFeatures: [],
        assumptions: [],
        unknowns: [],
        sourceTitles: [],
      },
      sourceNotes: [{ id: 'note-1', title: 'Note', plainText: 'content' }],
      answers: [],
      deterministicMarkdown: '# PRD',
      consent: { externalAi: true, acceptedAt: new Date().toISOString() },
      researchBrief: {
        query: 'forged',
        summary: 'forged',
        citations: [],
        warnings: [],
        generatedAt: new Date().toISOString(),
      },
    });

    expect(errors).toContain('Research briefs are only accepted in AI + research mode.');
  });

  it('requires a completed research brief for AI + research mode', () => {
    const errors = validateGeneratePrdRequest({
      mode: 'ai-enhanced-with-research',
      brief: {},
      sourceNotes: [{ id: 'note-1', title: 'Note', plainText: 'content' }],
      answers: [],
      deterministicMarkdown: '# PRD',
      consent: {
        externalAi: true,
        webResearch: true,
        acceptedAt: new Date().toISOString(),
      },
    });

    expect(errors).toContain(
      'A completed fresh research brief is required for AI + research mode.'
    );
  });

  it('rejects note content in research requests', () => {
    expect(hasUnexpectedResearchPayloadKeys({ query: 'market research', sourceNotes: [] })).toBe(
      true
    );
    expect(
      validateResearchRequest({
        query: 'market research',
        sourceNotes: [{ plainText: 'secret note' }],
        consent: { webResearch: true, acceptedAt: new Date().toISOString() },
      })
    ).toContain('Research requests may only include a query and consent, not note content.');
  });

  it('sanitizes research queries before external provider calls', () => {
    const sanitized = sanitizeResearchQuery(
      'Client portal for jane@example.com id 123e4567-e89b-12d3-a456-426614174000 <test>'
    );

    expect(sanitized).not.toContain('jane@example.com');
    expect(sanitized).not.toContain('123e4567-e89b-12d3-a456-426614174000');
    expect(sanitized).not.toContain('<');
  });
});
