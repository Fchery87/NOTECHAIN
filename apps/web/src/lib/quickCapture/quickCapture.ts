export interface QuickCaptureInput {
  title?: string | null;
  text?: string | null;
  url?: string | null;
}

export interface QuickCaptureDraft {
  title: string;
  content: string;
}

function clean(value: string | null | undefined): string {
  return (value || '').trim();
}

export function createQuickCaptureDraft(input: QuickCaptureInput): QuickCaptureDraft {
  const title = clean(input.title) || 'Inbox Capture';
  const text = clean(input.text);
  const url = clean(input.url);
  const capturedAt = new Date().toISOString();

  const contentParts = ['_Captured to NoteChain Inbox_', '', `Captured: ${capturedAt}`];

  if (text) {
    contentParts.push('', text);
  }

  if (url) {
    contentParts.push('', `Source: ${url}`);
  }

  return {
    title,
    content: contentParts.join('\n'),
  };
}

export function quickCaptureSearchParams(searchParams: URLSearchParams): QuickCaptureInput {
  return {
    title: searchParams.get('title'),
    text: searchParams.get('text'),
    url: searchParams.get('url'),
  };
}
