'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useGetConversation,
  useCreateConversation,
  useSendMessage,
  useGetRecentConversations,
  useListCategories,
  useDeleteConversation,
  useGetDashboard,
  useListDocuments,
} from '@/lib/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCard } from '@/components/message-card';
import { AILoadingIndicator } from '@/components/ai-loading-indicator';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';

const repositoryNavItems = [
  { label: 'Admissions & Rules', category: '1', icon: 'school' },
  { label: 'Fees & Financial Aid', category: '2', icon: 'payments' },
  { label: 'Course Curriculum', category: '3', icon: 'description' },
  { label: 'Exam Timetables', category: '4', icon: 'assignment' },
  { label: 'Faculty Directory', category: '5', icon: 'group' },
  { label: 'Campus Regulations', category: '6', icon: 'apartment' },
];

const quickPrompts = [
  { label: 'BCA Admission Cutoff', icon: 'school', query: 'What is the cutoff and eligibility for BCA admission?' },
  { label: 'Semester 5 Syllabus', icon: 'menu_book', query: 'Show me the course syllabus for Semester 5' },
  { label: 'Hostel Fees & Rent', icon: 'payments', query: 'What are the hostel room rent and mess fee details?' },
  { label: 'Exam Schedule 2026', icon: 'calendar_month', query: 'When is the Spring 2026 final exam schedule released?' },
  { label: 'Scholarships & Aid', icon: 'award', query: 'How do I apply for merit financial scholarship?' },
  { label: 'Faculty Office Hours', icon: 'groups', query: 'Who is the Head of Department for Computer Science?' },
];

const placeholderSuggestions = [
  'Ask about admissions, cutoffs, or application dates...',
  'Ask about Semester 5 curriculum and course credits...',
  'Ask about tuition fee installment policies & deadlines...',
  'Ask about faculty directory and office hours...',
  'Ask about hostel room allotment & mess charges...',
];

export function ChatContent({ conversationId }: { conversationId?: number | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams ? searchParams.get('q') : null;

  const [message, setMessage] = useState(initialQuery || '');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conversation, isLoading: conversationLoading } = useGetConversation(
    conversationId || null
  );

  const { data: recentConversations } = useGetRecentConversations();
  const { data: dashboard } = useGetDashboard();
  const { data: documents } = useListDocuments();

  const createConversation = useCreateConversation();
  const sendMessageMutation = useSendMessage();
  const deleteConversation = useDeleteConversation();

  // Rotate search box placeholder
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderSuggestions.length);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  useEffect(() => {
    if (initialQuery && !conversationId) {
      handleSendMessage(initialQuery);
    }
  }, []);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    try {
      if (!conversationId) {
        const newConv = await createConversation.mutateAsync({
          data: { title: content.slice(0, 50) + (content.length > 50 ? '...' : '') },
        });

        await sendMessageMutation.mutateAsync({
          conversationId: newConv.id,
          data: { content },
        });

        router.push(`/chat/${newConv.id}`);
        queryClient.invalidateQueries({ queryKey: ['/api/conversations/recent'] });
      } else {
        await sendMessageMutation.mutateAsync({
          conversationId,
          data: { content },
        });
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}`] });
      }

      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleDeleteConversation = async (id: number) => {
    if (!confirm('Delete this conversation?')) return;

    try {
      await deleteConversation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations/recent'] });

      if (conversationId === id) {
        router.push('/chat');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const hasMessages = conversation?.messages && conversation.messages.length > 0;
  const filteredConversations = recentConversations?.filter((c) =>
    c.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] font-sans h-[100dvh] flex overflow-hidden selection:bg-[#4441cc]/20 relative">
      {/* 1. Left Navigation Sidebar Panel (275px, ChatGPT/Claude style) */}
      <aside
        className={`fixed lg:static left-0 top-0 h-full bg-[#f3f3f4]/95 backdrop-blur-2xl border-r border-[#c7c4d7]/70 flex flex-col transition-all duration-300 z-30 ${
          leftSidebarOpen ? 'w-[275px]' : 'w-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[#c7c4d7]/60 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#4441cc] rounded-xl flex items-center justify-center text-white shadow-md shadow-[#4441cc]/20">
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                sparkles
              </span>
            </div>
            <span className="text-base font-bold font-['Geist'] text-[#1a1c1c]">
              Academic AI
            </span>
          </Link>
          <button
            onClick={() => setLeftSidebarOpen(false)}
            className="p-1 text-[#464554] hover:text-[#4441cc] rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 space-y-2">
          <button
            onClick={() => router.push('/chat')}
            className="w-full py-2.5 bg-[#2f3131] hover:bg-[#1a1c1c] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>New Chat</span>
          </button>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#464554] text-base">
              search
            </span>
            <input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search chat history..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-xl border border-[#c7c4d7]/70 focus:outline-none focus:border-[#4441cc] font-medium"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-4 py-2">
            {/* Repositories - Compact Navigation List */}
            <div>
              <p className="px-2 text-[10px] font-bold text-[#464554]/60 uppercase tracking-widest mb-1.5">
                Repositories
              </p>
              <div className="space-y-0.5">
                {repositoryNavItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => router.push(`/documents?category=${item.category}`)}
                    className="w-full py-1.5 px-2 rounded-xl text-xs font-semibold text-[#464554] hover:text-[#1a1c1c] hover:bg-white border border-transparent hover:border-[#c7c4d7]/60 transition-all flex items-center gap-2.5"
                  >
                    <span className="material-symbols-outlined text-base text-[#4441cc]">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Conversations - Grouped Timestamps (Today, Previous 7 Days) */}
            <div>
              <p className="px-2 text-[10px] font-bold text-[#464554]/60 uppercase tracking-widest mb-1.5">
                Today
              </p>
              <div className="space-y-0.5">
                {filteredConversations?.slice(0, 4).map((conv) => (
                  <div key={conv.id} className="group relative">
                    <button
                      onClick={() => router.push(`/chat/${conv.id}`)}
                      className={`w-full text-left py-1.5 px-2.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${
                        conversationId === conv.id
                          ? 'bg-[#dae2fd] text-[#4441cc] font-bold border-l-3 border-[#4441cc]'
                          : 'text-[#464554] hover:bg-white hover:text-[#1a1c1c]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base text-[#4441cc]">chat_bubble_outline</span>
                      <span className="truncate flex-1">{conv.title}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteConversation(conv.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#464554] hover:text-[#ba1a1a]"
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                    </button>
                  </div>
                ))}
              </div>

              {filteredConversations && filteredConversations.length > 4 && (
                <>
                  <p className="px-2 text-[10px] font-bold text-[#464554]/60 uppercase tracking-widest mt-3 mb-1.5">
                    Previous 7 Days
                  </p>
                  <div className="space-y-0.5">
                    {filteredConversations.slice(4).map((conv) => (
                      <div key={conv.id} className="group relative">
                        <button
                          onClick={() => router.push(`/chat/${conv.id}`)}
                          className={`w-full text-left py-1.5 px-2.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${
                            conversationId === conv.id
                              ? 'bg-[#dae2fd] text-[#4441cc] font-bold border-l-3 border-[#4441cc]'
                              : 'text-[#464554] hover:bg-white hover:text-[#1a1c1c]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base text-[#4441cc]">chat_bubble_outline</span>
                          <span className="truncate flex-1">{conv.title}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-[#c7c4d7]/60 flex items-center justify-between text-xs font-semibold">
          <Link href="/" className="text-[#464554] hover:text-[#4441cc] flex items-center gap-1">
            <span className="material-symbols-outlined text-base">home</span> Landing
          </Link>
          <Link href="/documents" className="text-[#464554] hover:text-[#4441cc] flex items-center gap-1">
            <span className="material-symbols-outlined text-base">menu_book</span> Docs
          </Link>
        </div>
      </aside>

      {/* 2. Center Primary Conversation Canvas */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#f9f9f9]">
        {/* Workspace Top Header */}
        <header className="px-5 py-3 flex items-center justify-between border-b border-[#c7c4d7]/60 bg-[#f9f9f9]/85 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {!leftSidebarOpen && (
              <button
                onClick={() => setLeftSidebarOpen(true)}
                className="p-1 text-[#464554] hover:text-[#4441cc] rounded-lg"
              >
                <span className="material-symbols-outlined text-xl">chevron_right</span>
              </button>
            )}
            <span className="text-sm font-bold font-['Geist'] text-[#1a1c1c]">
              Academic Intelligence Workspace
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!rightSidebarOpen && (
              <button
                onClick={() => setRightSidebarOpen(true)}
                className="p-1 text-[#464554] hover:text-[#4441cc] rounded-lg"
              >
                <span className="material-symbols-outlined text-xl">info</span>
              </button>
            )}
          </div>
        </header>

        {/* Conversation Canvas - Natural tight vertical layout */}
        <ScrollArea className="flex-1 px-6 sm:px-10 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {conversationLoading ? (
              <div className="space-y-4 py-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-2xl bg-[#dae2fd]/40" />
                ))}
              </div>
            ) : hasMessages ? (
              <div className="space-y-5">
                {conversation.messages!.map((msg) => (
                  <MessageCard
                    key={msg.id}
                    message={msg}
                    onFollowUpClick={(q) => handleSendMessage(q)}
                    onClarificationClick={(opt) => handleSendMessage(opt)}
                  />
                ))}
              </div>
            ) : (
              /* Tight Welcome Layout: Heading → Suggestions → Search */
              <div className="flex flex-col items-center justify-center min-h-[55vh] text-center space-y-4 py-4">
                <div className="space-y-1.5">
                  <h2 className="text-3xl sm:text-4xl font-extrabold font-['Geist'] text-[#1a1c1c] tracking-tight">
                    How can I help you today?
                  </h2>
                  <p className="text-xs sm:text-sm text-[#464554] max-w-md mx-auto font-normal">
                    Verified answers from university documents & circulars.
                  </p>
                </div>

                {/* Quick Prompts Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full max-w-2xl pt-1">
                  {quickPrompts.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip.query)}
                      className="p-3 rounded-2xl bg-white border border-[#c7c4d7]/70 hover:border-[#4441cc] text-left transition-all duration-200 shadow-xs hover:shadow-md group flex items-start gap-2"
                    >
                      <span className="material-symbols-outlined text-base text-[#4441cc] group-hover:scale-110 transition-transform mt-0.5">
                        {chip.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-[#1a1c1c] block group-hover:text-[#4441cc] transition-colors leading-tight">
                          {chip.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sendMessageMutation.isPending && <AILoadingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Upgraded Hero Search Bar (Height 68-72px, Focal Point) */}
        <div className="p-4 sm:p-5 bg-gradient-to-t from-[#f9f9f9] via-[#f9f9f9]/90 to-transparent z-20">
          <div className="max-w-3xl mx-auto">
            <div className="glass-card animated-gradient-border flex items-center px-4 py-2.5 shadow-2xl h-[70px] rounded-3xl">
              <div className="pr-3 text-[#4441cc] flex items-center">
                <span className="material-symbols-outlined text-[26px]">search_spark</span>
              </div>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(message)}
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-base text-[#1a1c1c] placeholder:text-[#464554]/50 font-medium"
                placeholder={placeholderSuggestions[placeholderIndex]}
                type="text"
                disabled={sendMessageMutation.isPending}
              />

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-[#e8e8e8] text-[10px] font-mono text-[#464554] font-bold">
                  ↵ Enter
                </span>
                <button
                  onClick={() => handleSendMessage(message)}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="bg-[#4441cc] text-white h-11 w-11 rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Right Sidebar - Compact Widgets (Recently Indexed, Notices, Trending) */}
      <aside
        className={`fixed lg:static right-0 top-0 h-full bg-[#f3f3f4]/95 backdrop-blur-2xl border-l border-[#c7c4d7]/70 flex flex-col transition-all duration-300 z-30 ${
          rightSidebarOpen ? 'w-[285px]' : 'w-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="p-4 border-b border-[#c7c4d7]/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4441cc] text-lg">auto_stories</span>
            <h3 className="font-bold text-xs text-[#1a1c1c]">Knowledge Context</h3>
          </div>
          <button
            onClick={() => setRightSidebarOpen(false)}
            className="p-1 text-[#464554] hover:text-[#4441cc] rounded-lg"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>

        <ScrollArea className="flex-1 p-3.5 space-y-4">
          {/* Recently Indexed Documents Widget */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#464554]/60 uppercase tracking-widest block px-1">
              Recently Indexed Documents
            </span>
            <div className="space-y-1.5">
              {documents?.slice(0, 3).map((doc) => (
                <div key={doc.id} className="p-2.5 rounded-xl bg-white border border-[#c7c4d7]/50 hover:border-[#4441cc] transition-colors cursor-pointer space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#4441cc]/10 text-[#4441cc]">
                      PDF
                    </span>
                    <span className="text-[10px] text-[#464554]/60 font-semibold">2h ago</span>
                  </div>
                  <p className="text-xs font-bold text-[#1a1c1c] truncate">{doc.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Latest Circulars Widget */}
          {dashboard?.pinnedNotices && (
            <div className="space-y-2 pt-2 border-t border-[#c7c4d7]/40">
              <span className="text-[10px] font-bold text-[#464554]/60 uppercase tracking-widest block px-1">
                Latest University Circulars
              </span>
              <div className="space-y-1.5">
                {dashboard.pinnedNotices.slice(0, 2).map((notice) => (
                  <div key={notice.id} className="p-2.5 rounded-xl bg-white border border-[#c7c4d7]/50 hover:border-[#4441cc] transition-colors cursor-pointer space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ba1a1a]/10 text-[#ba1a1a]">
                        {notice.priority}
                      </span>
                      <span className="text-[10px] text-[#464554]/60 font-semibold">Today</span>
                    </div>
                    <p className="text-xs font-bold text-[#1a1c1c] line-clamp-1">{notice.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </aside>
    </div>
  );
}
