'use client';

import { Suspense } from 'react';
import { ChatContent } from '@/components/chat-content';
import { AuthGuard } from '@/components/auth-guard';

export const dynamic = 'force-dynamic';

export default function SingleChatPage({ params }: { params: { id: string } }) {
  const conversationId = parseInt(params.id);
  return (
    <AuthGuard allowedRoles={['user', 'admin']}>
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground font-['Geist'] text-sm">Loading Conversation...</div>}>
        <ChatContent conversationId={conversationId} />
      </Suspense>
    </AuthGuard>
  );
}
