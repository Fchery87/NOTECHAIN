import { describe, expect, it } from 'vitest';
import {
  buildPrdFilename,
  extractPlainText,
  createPrdBuilderSession,
  generatePrdMarkdown,
  getReadinessLabel,
  getReadinessScore,
  markdownToNoteHtml,
} from '../prdBuilder';

const sourceNotes = [
  {
    id: 'note-1',
    title: 'Marketplace Client Notes',
    content: `
      <h1>Local service marketplace</h1>
      <p>Customers need a faster way to find providers and submit booking requests.</p>
      <ul>
        <li>Users can browse service providers</li>
        <li>Providers need profiles</li>
        <li>Admin needs to approve providers</li>
      </ul>
      <p>MVP should focus on web first. Success criteria should include completed booking requests.</p>
    `,
    updatedAt: new Date('2026-06-10T00:00:00Z'),
  },
];

describe('prdBuilder', () => {
  it('creates a guided PRD session from selected notes', () => {
    const session = createPrdBuilderSession(sourceNotes, new Date('2026-06-10T00:00:00Z'));

    expect(session.brief.projectName).toContain('Marketplace');
    expect(session.brief.knownFeatures).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Users can browse service providers'),
        expect.stringContaining('Providers need profiles'),
      ])
    );
    expect(session.questions.length).toBeLessThanOrEqual(5);
    expect(getReadinessScore(session.readiness)).toBeGreaterThan(0);
    expect(getReadinessLabel(getReadinessScore(session.readiness))).toMatch(
      /Needs work|Good|Strong/
    );
  });

  it('generates writing-prds-style markdown with traceability', () => {
    const session = createPrdBuilderSession(sourceNotes, new Date('2026-06-10T00:00:00Z'));
    const markdown = generatePrdMarkdown({
      session,
      answers: [
        {
          questionId: 'out-of-scope',
          status: 'answered',
          answer: 'Native mobile apps and advanced analytics are out of scope for version one.',
        },
      ],
      generatedAt: new Date('2026-06-10T00:00:00Z'),
    });

    expect(markdown).toContain('# PRD:');
    expect(markdown).toContain('## 3. Problem Statement');
    expect(markdown).toContain('## 22. Sources and Traceability');
    expect(markdown).toContain('Marketplace Client Notes');
    expect(markdown).toContain('Native mobile apps and advanced analytics');
  });

  it('builds stable markdown filenames', () => {
    expect(buildPrdFilename('Local Service Marketplace', new Date('2026-06-10T12:00:00Z'))).toBe(
      'prd-local-service-marketplace-2026-06-10.md'
    );
  });

  it('converts markdown to safe note html', () => {
    const html = markdownToNoteHtml('# Title\n\n- <script>alert(1)</script>\n\nParagraph');

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });
});

describe('extractPlainText entity decoding and script stripping', () => {
  it('decodes an escaped ampersand only once', () => {
    expect(extractPlainText('<p>&amp;lt;b&amp;gt; &amp;amp;</p>')).toBe('&lt;b&gt; &amp;');
  });

  it('removes script and style blocks whose closing tag has trailing whitespace', () => {
    expect(extractPlainText('a<script>steal()</script >b')).toBe('a b');
    expect(extractPlainText('a<style>p{}</style\t\n>b')).toBe('a b');
  });

  it('removes script and style blocks whose closing tag carries attributes', () => {
    expect(extractPlainText('a<script>steal()</script\t\n bar>b')).toBe('a b');
    expect(extractPlainText('a<style>p{}</style x="1">b')).toBe('a b');
  });
});

describe('PRD front matter title escaping', () => {
  it('escapes backslashes and quotes so the title stays inside its YAML string', () => {
    const session = createPrdBuilderSession(sourceNotes, new Date('2026-06-10T00:00:00Z'));
    const markdown = generatePrdMarkdown({
      session: { ...session, brief: { ...session.brief, projectName: 'C:\\dir "x" \\' } },
      answers: [],
      generatedAt: new Date('2026-06-10T00:00:00Z'),
    });

    expect(markdown).toContain('title: "PRD - C:\\\\dir \\"x\\" \\\\"\n');
  });
});
