import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardData, Category, Document, Notice, Conversation, Message, Bookmark } from '@/lib/types';

// Fetch helper
async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error ${res.status}: ${errorText}`);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json();
}

// React Query Hooks
export function useGetDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    queryFn: () => fetcher<DashboardData>('/api/dashboard'),
  });
}

export function useListCategories() {
  return useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: () => fetcher<Category[]>('/api/categories'),
  });
}

export function useListDocuments(params?: { categoryId?: number; search?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.categoryId) queryParams.set('categoryId', params.categoryId.toString());
  if (params?.search) queryParams.set('search', params.search);

  const url = `/api/documents${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return useQuery<Document[]>({
    queryKey: [url],
    queryFn: () => fetcher<Document[]>(url),
  });
}

export function useListNotices() {
  return useQuery<Notice[]>({
    queryKey: ['/api/notices'],
    queryFn: () => fetcher<Notice[]>('/api/notices'),
  });
}

export function useGetPinnedNotices() {
  return useQuery<Notice[]>({
    queryKey: ['/api/notices/pinned'],
    queryFn: () => fetcher<Notice[]>('/api/notices/pinned'),
  });
}

export function useListBookmarks() {
  return useQuery<Bookmark[]>({
    queryKey: ['/api/bookmarks'],
    queryFn: () => fetcher<Bookmark[]>('/api/bookmarks'),
  });
}

export function useDeleteBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      fetcher(`/api/bookmarks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
    },
  });
}

export function useCreateBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId }: { conversationId: number }) =>
      fetcher<Bookmark>('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
    },
  });
}

export function useGetRecentConversations() {
  return useQuery<Conversation[]>({
    queryKey: ['/api/conversations/recent'],
    queryFn: () => fetcher<Conversation[]>('/api/conversations/recent'),
  });
}

export function useGetConversation(id: number | null) {
  return useQuery<Conversation>({
    queryKey: [`/api/conversations/${id}`],
    queryFn: () => fetcher<Conversation>(`/api/conversations/${id}`),
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data }: { data: { title: string; categoryId?: number } }) =>
      fetcher<Conversation>('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations/recent'] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, data }: { conversationId: number; data: { content: string } }) =>
      fetcher<Message>(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_: unknown, variables: { conversationId: number; data: { content: string } }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${variables.conversationId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations/recent'] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      fetcher(`/api/conversations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations/recent'] });
    },
  });
}
