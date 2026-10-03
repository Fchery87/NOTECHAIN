import { htmlToPlainText } from '@notechain/ui-components';

export function noteHref(noteId: string) {
  return `/notes?id=${encodeURIComponent(noteId)}`;
}

export const notePlainText = htmlToPlainText;
