// Client-side keyword highlighting for the Evidence Explorer sheet.
// Pure keyword overlap on the chunk text the backend already ships —
// deliberately no model pass, so it costs ~0 ms and can never reorder
// or change the evidence.

const STOPWORDS = new Set([
  'the', 'is', 'of', 'what', 'who', 'are', 'was', 'for', 'and', 'to', 'in',
]);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tokens from the user's question worth highlighting: case-folded, split on
 * non-word chars, minus stopwords and very short tokens (≤3 chars) that would
 * light up the whole document (e.g. "fee", "bsc" stay; "hi", "of" drop).
 */
export function queryHighlightTerms(query: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const raw of query.toLowerCase().split(/\W+/)) {
    const token = raw.trim();
    if (!token || token.length <= 3 || STOPWORDS.has(token) || seen.has(token)) {
      continue;
    }
    seen.add(token);
    terms.push(token);
  }
  return terms;
}

export interface HighlightSegment {
  text: string;
  isMatch: boolean;
}

/**
 * Splits chunk text on ONE escaped alternation regex with a capture group.
 * JS String.split keeps captured matches at odd indices, so segments are
 * mapped: even index = plain text, odd index = a query-term match.
 */
export function splitHighlightedText(
  text: string,
  terms: string[]
): HighlightSegment[] {
  if (!terms.length) {
    return [{ text, isMatch: false }];
  }
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  return text.split(pattern).map((part, idx) => ({
    text: part,
    isMatch: idx % 2 === 1,
  }));
}
