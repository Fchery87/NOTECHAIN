export function noteHref(noteId: string) {
  return `/notes?id=${encodeURIComponent(noteId)}`;
}

export function notePlainText(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
