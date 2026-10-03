const TAG_START = /[A-Za-z/!]/;

/**
 * Plain text from note HTML. A single linear pass: tags become a space so
 * adjacent blocks don't run together, and a `<` that doesn't open a tag is
 * kept as text. Regex tag-stripping backtracks quadratically on input like
 * "<<<<<<".
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  const parts: string[] = [];
  let textStart = 0;
  let noMoreClosers = false;
  let i = 0;

  while (i < html.length) {
    if (!noMoreClosers && html[i] === '<' && TAG_START.test(html[i + 1] ?? '')) {
      const close = html.indexOf('>', i + 1);
      if (close === -1) {
        noMoreClosers = true;
      } else {
        parts.push(html.slice(textStart, i), ' ');
        i = close + 1;
        textStart = i;
        continue;
      }
    }
    i += 1;
  }
  parts.push(html.slice(textStart));

  return parts
    .join('')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
