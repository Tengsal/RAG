'use client';

import { Suspense } from 'react';
import { ChatContent } from '@/components/chat-content';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground">Loading Chat...</div>}>
      <ChatContent />
    </Suspense>
  );
}
