import { NextRequest, NextResponse } from 'next/server';
import { generatePrdWithAi } from '@/lib/prdBuilder/ai/generatePrdWithAi';
import { isPrdAiConfigured } from '@/lib/prdBuilder/ai/providers';
import { checkPrdBuilderRateLimit } from '@/lib/prdBuilder/ai/rateLimit';
import { verifyResearchBriefToken } from '@/lib/prdBuilder/ai/researchToken';
import type { GeneratePrdRouteRequest } from '@/lib/prdBuilder/ai/types';
import { validateGeneratePrdRequest } from '@/lib/prdBuilder/ai/validation';
import { withRateLimit } from '@/lib/security/serverRateLimiter';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

async function handler(request: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_ENABLE_PRD_BUILDER_EXTERNAL_AI !== 'true') {
      return NextResponse.json({ error: 'PRD Builder external AI is disabled.' }, { status: 403 });
    }

    if (!isPrdAiConfigured()) {
      return NextResponse.json({ error: 'No PRD AI provider is configured.' }, { status: 503 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = (await request.json()) as GeneratePrdRouteRequest;
    const validationErrors = validateGeneratePrdRequest(body);

    if (validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors.join(' ') }, { status: 400 });
    }

    if (
      body.mode === 'ai-enhanced-with-research' &&
      (!body.researchBrief ||
        !verifyResearchBriefToken(user.id, body.researchBrief, body.researchBrief.token))
    ) {
      return NextResponse.json(
        { error: 'A server-verified research brief is required for AI + research mode.' },
        { status: 400 }
      );
    }

    const prdRateLimit = await checkPrdBuilderRateLimit(user.id, 'generate');
    if (!prdRateLimit.allowed) {
      return NextResponse.json(
        { error: 'PRD AI generation rate limit exceeded.' },
        {
          status: 429,
          headers: { 'Retry-After': String(prdRateLimit.retryAfterSeconds) },
        }
      );
    }

    const generationInput =
      body.mode === 'ai-enhanced' ? { ...body, researchBrief: undefined } : body;
    const result = await generatePrdWithAi(generationInput);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[PRD Builder] AI generation failed');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate an AI-enhanced PRD.',
      },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler, 'api');
