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

export interface MessageSource {
  id: number;
  documentId: number;
  documentName: string;
  pageNumber: number;
  lineStart?: number | null;
  lineEnd?: number | null;
  snippet: string;
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
