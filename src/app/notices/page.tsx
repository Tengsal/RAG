'use client';

import Link from 'next/link';
import { useListNotices } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { NoticeCard } from '@/components/notice-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Home, Pin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NoticesPage() {
  const { data: notices, isLoading } = useListNotices();

  const pinnedNotices = notices?.filter((n) => n.isPinned) || [];
  const regularNotices = notices?.filter((n) => !n.isPinned) || [];

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">Notices & Deadlines</h1>
              <p className="text-xs text-muted-foreground">
                {notices?.length || 0} active notices
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : notices && notices.length > 0 ? (
          <>
            {/* Pinned Notices */}
            {pinnedNotices.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Pin className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">Pinned</h2>
                </div>
                <div className="space-y-4">
                  {pinnedNotices.map((notice) => (
                    <NoticeCard key={notice.id} notice={notice} />
                  ))}
                </div>
              </section>
            )}

            {/* Regular Notices */}
            {regularNotices.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-foreground mb-4">All Notices</h2>
                <div className="space-y-4">
                  {regularNotices.map((notice) => (
                    <NoticeCard key={notice.id} notice={notice} />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No notices available</h3>
            <p className="text-sm text-muted-foreground">
              Check back later for important updates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
