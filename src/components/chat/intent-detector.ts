export type QueryIntent = "sql" | "document" | "both";

export interface IntentResult {
  intent: QueryIntent;
  confidence: number; // 0-1
}

/**
 * Detects whether a user query is asking about SQL/table data, documents, or both.
 * Uses heuristic pattern matching for fast, latency-free classification.
 */
export function detectQueryIntent(query: string): IntentResult {
  const q = query.toLowerCase();

  // Document-related patterns
  const docPatterns = [
    /\b(document|report|file|pdf|policy|manual|guide|handbook|memo)\b/,
    /\b(says?|mentions?|states?|written|describes?|explains?)\b/,
    /\b(summarize|summary|extract|quote)\b.*\b(doc|document|report|file)\b/,
    /what does.*(say|mention|state)/,
    /according to/,
    /in the (document|report|file|pdf)/,
    /\b(read|contents? of|text in)\b/,
  ];

  // SQL/data patterns
  const sqlPatterns = [
    /\b(how many|count|total|sum|average|avg|max|min)\b/,
    /\b(sales|revenue|orders|customers|users|transactions|products|items)\b/,
    /\b(by|per|group|breakdown|grouped)\b/,
    /\b(trend|over time|monthly|daily|weekly|yearly|quarterly)\b/,
    /\b(top|bottom|highest|lowest|most|least)\b\s*\d*/,
    /compare.*\b(to|with|against)\b/,
    /\b(table|column|row|query|sql|database|data)\b/,
    /\b(filter|where|sort|order by)\b/,
    /\b(percentage|percent|ratio|rate)\b/,
  ];

  const docScore = docPatterns.filter((p) => p.test(q)).length;
  const sqlScore = sqlPatterns.filter((p) => p.test(q)).length;

  if (docScore > 0 && sqlScore === 0) {
    return { intent: "document", confidence: Math.min(docScore / 3, 1) };
  }
  if (sqlScore > 0 && docScore === 0) {
    return { intent: "sql", confidence: Math.min(sqlScore / 3, 1) };
  }
  if (docScore > 0 && sqlScore > 0) {
    return { intent: "both", confidence: 0.7 };
  }

  // Default to both for ambiguous queries - let the LLM decide what's relevant
  return { intent: "both", confidence: 0.5 };
}
