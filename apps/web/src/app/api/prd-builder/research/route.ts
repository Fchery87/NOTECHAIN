import { NextRequest, NextResponse } from 'next/server';
import { isResearchConfigured } from '@/lib/prdBuilder/ai/providers';
import { checkPrdBuilderRateLimit } from '@/lib/prdBuilder/ai/rateLimit';
import { runPrdResearch } from '@/lib/prdBuilder/ai/research';
import { signResearchBrief } from '@/lib/prdBuilder/ai/researchToken';
import { sanitizeResearchQuery } from '@/lib/prdBuilder/ai/sanitize';
import type { ResearchRouteRequest } from '@/lib/prdBuilder/ai/types';
import { validateResearchRequest } from '@/lib/prdBuilder/ai/validation';
import { withRateLimit } from '@/lib/security/serverRateLimiter';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

async function handler(request: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_ENABLE_PRD_BUILDER_WEB_RESEARCH !== 'true') {
      return NextResponse.json({ error: 'PRD Builder web research is disabled.' }, { status: 403 });
    }

    if (!isResearchConfigured()) {
      return NextResponse.json(
        { error: 'No PRD research provider is configured.' },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = (await request.json()) as ResearchRouteRequest;
    const validationErrors = validateResearchRequest(body);

    if (validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors.join(' ') }, { status: 400 });
    }

    const prdRateLimit = await checkPrdBuilderRateLimit(user.id, 'research');
    if (!prdRateLimit.allowed) {
      return NextResponse.json(
        { error: 'PRD research rate limit exceeded.' },
        {
          status: 429,
          headers: { 'Retry-After': String(prdRateLimit.retryAfterSeconds) },
        }
      );
    }

    const result = await runPrdResearch({
      query: sanitizeResearchQuery(body.query),
      consent: body.consent,
    });

    return NextResponse.json({ ...result, token: signResearchBrief(user.id, result) });
  } catch (error) {
    console.error('[PRD Builder] Research failed');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to run PRD research.',
      },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler, 'api');
