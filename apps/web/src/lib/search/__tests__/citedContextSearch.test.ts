import { beforeEach, describe, expect, it, vi } from 'vitest';

const searchMocks = vi.hoisted(() => ({
  searchCitedContext: vi.fn(),
}));

vi.mock('../../graph/contextGraphQuery', () => ({
  createContextGraphQuery: () => ({
    searchCitedContext: searchMocks.searchCitedContext,
  }),
}));

import { searchCitedContext } from '../citedContextSearch';

describe('searchCitedContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates cited context retrieval to the local context graph query seam', async () => {
    searchMocks.searchCitedContext.mockResolvedValue([
      {
        id: 'meeting:meeting-1',
        type: 'meeting',
        title: 'Launch Review',
        content: 'The launch review covered encrypted follow-ups.',
        score: 75,
        highlights: ['launch'],
        updatedAt: new Date('2026-06-06T10:00:00Z'),
        citation: {
          type: 'meeting',
          id: 'meeting-1',
          label: 'Launch Review',
          href: '/meetings/meeting-1',
          meetingId: 'meeting-1',
        },
      },
    ]);

    const results = await searchCitedContext({ query: 'launch', types: ['meeting'] });

    expect(searchMocks.searchCitedContext).toHaveBeenCalledWith({
      query: 'launch',
      types: ['meeting'],
    });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: 'meeting',
      citation: {
        type: 'meeting',
        id: 'meeting-1',
        href: '/meetings/meeting-1',
      },
    });
  });
});
