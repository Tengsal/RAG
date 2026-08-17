'use client';

import { Suspense } from 'react';
import { ChatContent } from '@/components/chat-content';

export const dynamic = 'force-dynamic';

export default function SingleChatPage({ params }: { params: { id: string } }) {
  const conversationId = parseInt(params.id);
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground">Loading Conversation...</div>}>
      <ChatContent conversationId={conversationId} />
    </Suspense>
  );
}
