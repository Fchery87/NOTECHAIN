import { buildPrdSystemPrompt, buildPrdUserPrompt } from './prompt';
import { sanitizeResearchQuery } from './sanitize';
import { summarizePromptInjectionWarnings } from './security';
import { buildAiResult } from './traceability';
import type {
  GeneratePrdAiInput,
  GeneratePrdAiResult,
  PrdAiProvider,
  ResearchBrief,
  ResearchInput,
  ResearchProvider,
} from './types';

const DEFAULT_TIMEOUT_MS = 45_000;

function providerConfigured(value: string | undefined): boolean {
  return Boolean(value && value !== 'none');
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

class MockPrdAiProvider implements PrdAiProvider {
  readonly provider = 'mock';
  readonly model = 'mock-prd-builder';

  async generatePrd(input: GeneratePrdAiInput): Promise<GeneratePrdAiResult> {
    const warnings = summarizePromptInjectionWarnings(input.sourceNotes);
    const researchLine = input.researchBrief
      ? `\n- External research included from query: ${input.researchBrief.query}`
      : '';

    return buildAiResult(
      `${input.deterministicMarkdown.trim()}\n\n## AI Enhancement Summary\n\n- Mock AI provider validated the external AI path.${researchLine}\n`,
      input,
      this.provider,
      this.model,
      warnings
    );
  }
}

class OpenAiPrdProvider implements PrdAiProvider {
  readonly provider = 'openai';
  readonly model = process.env.PRD_BUILDER_AI_MODEL || 'gpt-4o-mini';

  async generatePrd(input: GeneratePrdAiInput): Promise<GeneratePrdAiResult> {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');

    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: buildPrdSystemPrompt() },
          { role: 'user', content: buildPrdUserPrompt(input) },
        ],
      }),
    });

    if (!response.ok) throw new Error(`OpenAI PRD generation failed: ${response.status}`);

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const markdown = data.choices?.[0]?.message?.content;
    if (!markdown) throw new Error('OpenAI returned an empty PRD response');

    return buildAiResult(
      markdown,
      input,
      this.provider,
      this.model,
      summarizePromptInjectionWarnings(input.sourceNotes)
    );
  }
}

class AnthropicPrdProvider implements PrdAiProvider {
  readonly provider = 'anthropic';
  readonly model = process.env.PRD_BUILDER_AI_MODEL || 'claude-3-5-sonnet-latest';

  async generatePrd(input: GeneratePrdAiInput): Promise<GeneratePrdAiResult> {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not configured');

    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 8000,
        temperature: 0.2,
        system: buildPrdSystemPrompt(),
        messages: [{ role: 'user', content: buildPrdUserPrompt(input) }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic PRD generation failed: ${response.status}`);

    const data = (await response.json()) as { content?: Array<{ text?: string }> };
    const markdown = data.content
      ?.map(part => part.text ?? '')
      .join('\n')
      .trim();
    if (!markdown) throw new Error('Anthropic returned an empty PRD response');

    return buildAiResult(
      markdown,
      input,
      this.provider,
      this.model,
      summarizePromptInjectionWarnings(input.sourceNotes)
    );
  }
}

class GeminiPrdProvider implements PrdAiProvider {
  readonly provider = 'gemini';
  readonly model = process.env.PRD_BUILDER_AI_MODEL || 'gemini-1.5-flash';

  async generatePrd(input: GeneratePrdAiInput): Promise<GeneratePrdAiResult> {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildPrdSystemPrompt() }] },
        contents: [{ role: 'user', parts: [{ text: buildPrdUserPrompt(input) }] }],
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (!response.ok) throw new Error(`Gemini PRD generation failed: ${response.status}`);

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const markdown = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text ?? '')
      .join('\n')
      .trim();
    if (!markdown) throw new Error('Gemini returned an empty PRD response');

    return buildAiResult(
      markdown,
      input,
      this.provider,
      this.model,
      summarizePromptInjectionWarnings(input.sourceNotes)
    );
  }
}

class MockResearchProvider implements ResearchProvider {
  readonly provider = 'mock';

  async search(input: ResearchInput): Promise<ResearchBrief> {
    const query = sanitizeResearchQuery(input.query);
    const now = new Date().toISOString();

    return {
      query,
      summary:
        'Mock research provider validated the optional research path. Replace with a configured research provider for live citations.',
      citations: [
        {
          id: 'research-1',
          title: 'Mock research citation',
          url: 'https://example.com/prd-builder-research',
          snippet: `Placeholder citation for query: ${query}`,
          retrievedAt: now,
        },
      ],
      warnings: [],
      generatedAt: now,
    };
  }
}

class TavilyResearchProvider implements ResearchProvider {
  readonly provider = 'tavily';

  async search(input: ResearchInput): Promise<ResearchBrief> {
    if (!process.env.TAVILY_API_KEY) throw new Error('TAVILY_API_KEY is not configured');

    const query = sanitizeResearchQuery(input.query);
    const response = await fetchWithTimeout('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, max_results: 5 }),
    });

    if (!response.ok) throw new Error(`Tavily research failed: ${response.status}`);

    const data = (await response.json()) as {
      answer?: string;
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };
    const now = new Date().toISOString();

    return {
      query,
      summary: data.answer || 'Research results returned without a synthesized answer.',
      citations: (data.results ?? []).slice(0, 5).map((result, index) => ({
        id: `research-${index + 1}`,
        title: result.title || `Research result ${index + 1}`,
        url: result.url || '',
        snippet: result.content || '',
        retrievedAt: now,
      })),
      warnings: [],
      generatedAt: now,
    };
  }
}

class ExaResearchProvider implements ResearchProvider {
  readonly provider = 'exa';

  async search(input: ResearchInput): Promise<ResearchBrief> {
    if (!process.env.EXA_API_KEY) throw new Error('EXA_API_KEY is not configured');

    const query = sanitizeResearchQuery(input.query);
    const response = await fetchWithTimeout('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.EXA_API_KEY,
      },
      body: JSON.stringify({ query, numResults: 5, contents: { text: true } }),
    });

    if (!response.ok) throw new Error(`Exa research failed: ${response.status}`);

    const data = (await response.json()) as {
      results?: Array<{ title?: string; url?: string; text?: string }>;
    };
    const now = new Date().toISOString();
    const citations = (data.results ?? []).slice(0, 5).map((result, index) => ({
      id: `research-${index + 1}`,
      title: result.title || `Research result ${index + 1}`,
      url: result.url || '',
      snippet: result.text?.slice(0, 500) || '',
      retrievedAt: now,
    }));

    return {
      query,
      summary: citations
        .map(citation => citation.snippet)
        .filter(Boolean)
        .join('\n\n')
        .slice(0, 1500),
      citations,
      warnings: [],
      generatedAt: now,
    };
  }
}

export function getPrdAiProvider(): PrdAiProvider {
  const provider = process.env.PRD_BUILDER_AI_PROVIDER ?? 'none';

  switch (provider) {
    case 'mock':
      return new MockPrdAiProvider();
    case 'openai':
      return new OpenAiPrdProvider();
    case 'anthropic':
      return new AnthropicPrdProvider();
    case 'gemini':
      return new GeminiPrdProvider();
    default:
      throw new Error('No PRD AI provider configured');
  }
}

export function getResearchProvider(): ResearchProvider {
  const provider = process.env.PRD_BUILDER_RESEARCH_PROVIDER ?? 'none';

  switch (provider) {
    case 'mock':
      return new MockResearchProvider();
    case 'tavily':
      return new TavilyResearchProvider();
    case 'exa':
      return new ExaResearchProvider();
    default:
      throw new Error('No PRD research provider configured');
  }
}

export function isPrdAiConfigured(): boolean {
  return providerConfigured(process.env.PRD_BUILDER_AI_PROVIDER);
}

export function isResearchConfigured(): boolean {
  return providerConfigured(process.env.PRD_BUILDER_RESEARCH_PROVIDER);
}
