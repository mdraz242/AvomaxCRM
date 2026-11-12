/**
 * Strips dangerous HTML/script characters from plain text inputs to mitigate XSS,
 * and escapes Supabase PostgREST filter special characters in search strings.
 */
export function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/[<>]/g, '').trim();
}

export function sanitizeSearchTerm(term) {
  if (typeof term !== 'string') return '';
  return term
    .replace(/[%_,()]/g, ' ')
    .replace(/[<>]/g, '')
    .trim();
}

export function sanitizeFileName(fileName) {
  if (typeof fileName !== 'string') return 'document';
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 150);
}

