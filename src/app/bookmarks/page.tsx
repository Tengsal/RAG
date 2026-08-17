'use client';

import Link from 'next/link';
import { useListBookmarks, useDeleteBookmark } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bookmark, Home, Trash2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

export const dynamic = 'force-dynamic';

export default function BookmarksPage() {
  const { data: bookmarks, isLoading } = useListBookmarks();
  const deleteBookmark = useDeleteBookmark();
  const queryClient = useQueryClient();

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this bookmark?')) return;
    
    try {
      await deleteBookmark.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">Bookmarks</h1>
              <p className="text-xs text-muted-foreground">
                {bookmarks?.length || 0} saved conversations
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Link>
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : bookmarks && bookmarks.length > 0 ? (
          <div className="space-y-3">
            {bookmarks.map((bookmark) => (
              <Card
                key={bookmark.id}
                className="p-5 rounded-2xl border-card-border hover:border-primary/50 transition-all duration-200 group"
                data-testid={`card-bookmark-${bookmark.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/chat/${bookmark.conversationId}`}>
                      <h3 className="font-semibold text-foreground mb-1 hover:text-primary transition-colors cursor-pointer">
                        {bookmark.conversationTitle}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Bookmarked {formatDistanceToNow(new Date(bookmark.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link href={`/chat/${bookmark.conversationId}`}>
                        Open
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(bookmark.id)}
                      disabled={deleteBookmark.isPending}
                      data-testid={`button-delete-bookmark-${bookmark.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No bookmarks yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Save important conversations to access them quickly later.
            </p>
            <Button asChild>
              <Link href="/chat">Start a Conversation</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
