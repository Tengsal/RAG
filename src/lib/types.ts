export interface Category {
  id: number;
  name: string;
  icon: string;
  description: string;
  documentCount: number;
}

export interface Document {
  id: number;
  categoryId: number;
  categoryName?: string | null;
  title: string;
  description?: string | null;
  pageCount: number;
  createdAt: string;
}

export interface Notice {
  id: number;
  title: string;
  content: string;
  priority: 'urgent' | 'high' | 'normal';
  isPinned: boolean;
  categoryId?: number | null;
  categoryName?: string | null;
  deadline?: string | null;
  publishedAt: string;
  createdAt: string;
}

export interface Conversation {
  id: number;
  title: string;
  categoryId?: number | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  messages?: Message[];
}

// ---- ADTU RAG backend contract (POST /ask) ----
export type RagStatus = 'ANSWER' | 'CLARIFY' | 'REFUSE';

export interface RagSource {
  source: string;
  page: number;
  score: number;
  // Full chunk text + corpus folder, shipped by the backend for the
  // client-side Evidence Explorer (no extra model calls involved).
  text?: string;
  category?: string;
}

export interface RagResponse {
  status: RagStatus;
  query: string;
  intent: string;
  entities: {
    programs?: string[];
    semesters?: string[];
    years?: string[];
    [key: string]: unknown;
  };
  confidence_score: number;
  confidence_label: 'HIGH' | 'MEDIUM' | 'LOW';
  answer: string | null;
  clarification_question: string | null;
  // REFUSE responses return follow_ups: null (not []) — tolerate both
  follow_ups: string[] | null;
  sources: RagSource[];
}

export interface MessageSource {
  id?: number;
  documentId?: number;
  documentName: string;
  pageNumber: number;
  lineStart?: number | null;
  lineEnd?: number | null;
  snippet?: string | null;
  // Full chunk text + corpus folder for the Evidence Explorer sheet.
  text?: string | null;
  category?: string | null;
  retrievalScore: number;
}

export type MessageConfidence = 'high' | 'medium' | 'low' | null;

export interface Message {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  confidence?: MessageConfidence;
  sources?: MessageSource[] | null;
  followUpQuestions?: string[] | null;
  clarificationOptions?: string[] | null;
  // RAG metadata — in-memory only for v1 (not persisted in the messages table)
  status?: RagStatus;
  intent?: string;
  confidenceScore?: number | null;
  createdAt: string;
}

export interface Bookmark {
  id: number;
  conversationId: number;
  conversationTitle: string;
  createdAt: string;
}

export interface DashboardData {
  totalConversations: number;
  totalMessages: number;
  totalDocuments: number;
  recentConversations: Conversation[];
  categoryBreakdown: Category[];
  pinnedNotices: Notice[];
}
