'use client';

import { Suspense } from 'react';
import { ChatContent } from '@/components/chat-content';
import { AuthGuard } from '@/components/auth-guard';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  return (
    <AuthGuard allowedRoles={['user', 'admin']}>
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground font-['Geist'] text-sm">Loading Chat...</div>}>
        <ChatContent />
      </Suspense>
    </AuthGuard>
  );
}
