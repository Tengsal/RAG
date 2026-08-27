import { RagResponse, RagSource, Message, MessageSource } from '@/lib/types';

// Server-side only: the RAG backend is called from the Next.js route handlers
// (no CORS, and the URL stays out of the client bundle).
const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8000';

export async function askRag(query: string): Promise<RagResponse> {
  const res = await fetch(`${RAG_API_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`RAG backend responded ${res.status}`);
  }

  return res.json();
}

function basename(path: string): string {
  return path.split('/').pop() || path;
}

// Backend sources only carry {source, page, score} — fill the remaining
// MessageSource fields so the payload stays compatible with the jsonb shape
// persisted in the messages table.
export function mapRagSources(sources: RagSource[]): MessageSource[] {
  return sources.map((s, idx) => ({
    id: idx + 1,
    documentId: 0,
    documentName: basename(s.source),
    pageNumber: s.page,
    lineStart: null,
    lineEnd: null,
    snippet: '',
    retrievalScore: s.score,
  }));
}

// The backend answer may still carry the LLM's "Answer:" / "Reasoning:" format
// scaffolding. Strip it so the UI shows the clean answer only; if the pattern
// does not match, the text passes through unchanged.
function cleanAnswerText(raw: string): string {
  let text = raw.trim();
  const answerMatch = text.match(/^Answer\s*:\s*/i);
  if (answerMatch) {
    text = text.slice(answerMatch[0].length);
  }
  const reasoningIdx = text.search(/\n+Reasoning\s*:/i);
  if (reasoningIdx !== -1) {
    text = text.slice(0, reasoningIdx);
  }
  return text.trim();
}

// Map the full /ask response onto the existing Message shape so the current
// UI (message-card) can render every backend capability without new components.
export function mapRagToMessage(
  res: RagResponse,
  conversationId: number,
  id: number
): Message {
  const confidence: Message['confidence'] =
    res.confidence_label === 'HIGH' ? 'high' : res.confidence_label === 'MEDIUM' ? 'medium' : 'low';

  const content = cleanAnswerText(res.answer ?? res.clarification_question ?? '');

  return {
    id,
    conversationId,
    role: 'assistant',
    content,
    confidence,
    status: res.status,
    intent: res.intent,
    confidenceScore: res.confidence_score,
    sources: res.sources.length > 0 ? mapRagSources(res.sources) : null,
    followUpQuestions:
      (res.follow_ups ?? []).length > 0 ? res.follow_ups!.map((q) => q.trim()) : null,
    clarificationOptions:
      res.status === 'CLARIFY' && res.clarification_question
        ? [res.clarification_question]
        : null,
    createdAt: new Date().toISOString(),
  };
}
