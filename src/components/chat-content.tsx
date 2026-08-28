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
import { useAuth } from '@/context/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const { user, logout } = useAuth();

  const [message, setMessage] = useState(initialQuery || '');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

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

    // Echo the user message immediately; it stays visible until the
    // conversation query refetch returns the persisted messages.
    setPendingUserMessage(content);

    try {
      if (!conversationId) {
        const newConv = await createConversation.mutateAsync({
          data: { title: content.slice(0, 50) + (content.length > 50 ? '...' : '') },
        });

        await sendMessageMutation.mutateAsync({
          conversationId: newConv.id,
          data: { content },
        });

        await queryClient.invalidateQueries({ queryKey: ['/api/conversations/recent'] });
        setPendingUserMessage(null);

        router.push(`/chat/${newConv.id}`);
      } else {
        await sendMessageMutation.mutateAsync({
          conversationId,
          data: { content },
        });
        await queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}`] });
        setPendingUserMessage(null);
      }

      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      // Don't lose the user's text if the send failed
      setPendingUserMessage(null);
      setMessage(content);
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

  const handlePinConversation = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleShareConversation = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(`${window.location.origin}/chat/${id}`);
      alert('Conversation link copied to clipboard!');
    }
  };

  const handleRenameConversation = (id: number, currentTitle: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newTitle = prompt('Rename conversation:', currentTitle);
    if (newTitle && newTitle.trim()) {
      queryClient.setQueryData(['/api/conversations/recent'], (old: any) =>
        old?.map((c: any) => (c.id === id ? { ...c, title: newTitle.trim() } : c))
      );
    }
  };

  const hasMessages = conversation?.messages && conversation.messages.length > 0;

  const fallbackConversations = [
    { id: 1, title: 'Computer Science Eligibility & Fees' },
    { id: 2, title: 'BCA Admission & Cutoff Criteria' },
  ];

  const conversationsToDisplay = (recentConversations && recentConversations.length > 0)
    ? recentConversations.filter((c) => c.title.toLowerCase().includes(searchFilter.toLowerCase()))
    : fallbackConversations.filter((c) => c.title.toLowerCase().includes(searchFilter.toLowerCase()));

  const renderConversationRow = (conv: { id: number; title: string }) => {
    const isPinned = pinnedIds.includes(conv.id);
    const isSelected = conversationId === conv.id;
    const isMenuOpen = openMenuId === conv.id;

    return (
      <div
        key={conv.id}
        className={`relative flex items-center w-full rounded-xl transition-all ${
          isSelected
            ? 'bg-[#dae2fd] text-[#4441cc] border-l-[3px] border-[#4441cc] shadow-xs'
            : 'text-[#464554] hover:bg-white hover:text-[#1a1c1c]'
        }`}
      >
        {/* Area 1: Left Chat Icon */}
        <span className="material-symbols-outlined text-base text-[#4441cc] shrink-0 pl-2.5 py-2">
          {isPinned ? 'push_pin' : 'chat_bubble_outline'}
        </span>

        {/* Area 2: Flexible Truncated Title */}
        <button
          onClick={() => router.push(`/chat/${conv.id}`)}
          className="flex-1 min-w-0 text-left py-2 px-2 text-xs font-semibold truncate cursor-pointer focus:outline-none"
          title={conv.title}
        >
          {conv.title}
        </button>

        {/* Area 3: Fixed-width Action Button (⋮) - ALWAYS VISIBLE INSIDE THE PURPLE ROW */}
        <div className="shrink-0 pr-1.5 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteConversation(conv.id);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors cursor-pointer"
            title="Delete chat"
            aria-label={`Delete ${conv.title}`}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm4 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setOpenMenuId(isMenuOpen ? null : conv.id);
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isSelected
                ? 'text-[#4441cc] hover:bg-[#4441cc]/20'
                : 'text-[#464554] hover:bg-[#c7c4d7]/40 hover:text-[#1a1c1c]'
            }`}
            title="Options"
            aria-label="Options"
          >
            {/* Vertical 3-Dots Icon (⋮) */}
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {/* Floating Context Menu */}
          {isMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-1 w-44 bg-[#2b2d2d] text-white border border-[#464554]/60 shadow-2xl rounded-2xl p-1.5 space-y-0.5 z-50 font-sans animate-in fade-in-0 zoom-in-95 duration-100"
            >
              <button
                onClick={(e) => {
                  setOpenMenuId(null);
                  handleShareConversation(conv.id, e);
                }}
                className="w-full px-2.5 py-2 text-xs font-medium rounded-xl hover:bg-white/10 text-[#f0f1f1] cursor-pointer flex items-center gap-2.5 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-base text-[#c2c1ff]">upload</span>
                <span>Share</span>
              </button>
              <button
                onClick={(e) => {
                  setOpenMenuId(null);
                  handleRenameConversation(conv.id, conv.title, e);
                }}
                className="w-full px-2.5 py-2 text-xs font-medium rounded-xl hover:bg-white/10 text-[#f0f1f1] cursor-pointer flex items-center gap-2.5 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-base text-[#c2c1ff]">edit</span>
                <span>Rename</span>
              </button>
              <button
                onClick={(e) => {
                  setOpenMenuId(null);
                  handlePinConversation(conv.id, e);
                }}
                className="w-full px-2.5 py-2 text-xs font-medium rounded-xl hover:bg-white/10 text-[#f0f1f1] cursor-pointer flex items-center gap-2.5 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-base text-[#c2c1ff]">push_pin</span>
                <span>{isPinned ? 'Unpin Chat' : 'Pin Chat'}</span>
              </button>
              <button
                onClick={(e) => {
                  setOpenMenuId(null);
                  alert('Chat moved to archive.');
                }}
                className="w-full px-2.5 py-2 text-xs font-medium rounded-xl hover:bg-white/10 text-[#f0f1f1] cursor-pointer flex items-center gap-2.5 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-base text-[#c2c1ff]">archive</span>
                <span>Archive</span>
              </button>

              <div className="bg-white/10 my-1 h-px" />

              <button
                onClick={(e) => {
                  setOpenMenuId(null);
                  handleDeleteConversation(conv.id);
                }}
                className="w-full px-2.5 py-2 text-xs font-medium rounded-xl hover:bg-[#ffdad6]/20 text-[#ff8a8a] cursor-pointer flex items-center gap-2.5 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-base text-[#ff8a8a]">delete</span>
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] font-sans h-[100dvh] flex overflow-hidden selection:bg-[#4441cc]/20 relative">
      {/* Mobile Backdrop Overlay when sidebar is open on small screens */}
      {leftSidebarOpen && (
        <div
          onClick={() => setLeftSidebarOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-xs lg:hidden z-20 cursor-pointer"
        />
      )}

      {/* 1. Left Navigation Sidebar Panel (275px, ChatGPT/Claude style) */}
      <aside
        className={`fixed lg:static left-0 top-0 h-full bg-[#f3f3f4]/95 backdrop-blur-2xl border-r border-[#c7c4d7]/70 flex flex-col transition-all duration-300 z-30 overflow-hidden ${
          leftSidebarOpen ? 'w-[275px] opacity-100' : 'w-0 opacity-0 pointer-events-none border-none'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[#c7c4d7]/60 flex items-center justify-between min-w-[275px]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4441cc] via-[#4d4ad5] to-[#7c3aed] flex items-center justify-center text-white shadow-md shadow-[#4441cc]/25 shrink-0 overflow-hidden select-none group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
              </svg>
            </div>
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold font-['Geist'] text-[#1a1c1c] tracking-tight">
                  ADTU KB
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-[#4441cc]/10 text-[#4441cc] text-[9px] font-bold uppercase tracking-wider">
                  AI
                </span>
              </div>
              <span className="text-[10px] font-medium text-[#464554]/70 tracking-tight">
                Assam Down Town Univ.
              </span>
            </div>
          </Link>
          <button
            onClick={() => setLeftSidebarOpen(false)}
            className="p-1.5 text-[#464554] hover:text-[#4441cc] hover:bg-[#c7c4d7]/30 rounded-lg transition-all cursor-pointer"
            title="Collapse Sidebar"
          >
            <span className="material-symbols-outlined text-lg leading-none">chevron_left</span>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 space-y-2 min-w-[275px]">
          <button
            onClick={() => router.push('/chat')}
            className="w-full py-2.5 bg-[#1a1c1c] hover:bg-[#4441cc] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95 group cursor-pointer"
          >
            <span className="material-symbols-outlined text-base group-hover:rotate-90 transition-transform">add</span>
            <span>New Chat</span>
          </button>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#464554]/70 text-base pointer-events-none">
              search
            </span>
            <input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search chat history..."
              className="w-full pl-9 pr-7 py-1.5 text-xs bg-white rounded-xl border border-[#c7c4d7]/70 focus:outline-none focus:border-[#4441cc] focus:ring-1 focus:ring-[#4441cc] font-medium transition-all"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#464554] hover:text-[#1a1c1c] text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 px-3 min-w-[275px]">
          <div className="space-y-4 py-2">
            {/* Repositories - Compact Navigation List */}
            <div>
              <p className="px-2 text-[10px] font-bold text-[#464554]/60 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                <span>Knowledge Modules</span>
                <span className="text-[9px] font-semibold text-[#4441cc] bg-[#dae2fd]/60 px-1.5 py-0.5 rounded-full">
                  6 Categories
                </span>
              </p>
              <div className="space-y-0.5">
                {repositoryNavItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => router.push(`/documents?category=${item.category}`)}
                    className="w-full py-1.5 px-2 rounded-xl text-xs font-semibold text-[#464554] hover:text-[#1a1c1c] hover:bg-white border border-transparent hover:border-[#c7c4d7]/60 transition-all flex items-center gap-2.5 group cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base text-[#4441cc] group-hover:scale-110 transition-transform">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Conversations - Grouped Timestamps */}
            <div>
              <p className="px-2 text-[10px] font-bold text-[#464554]/60 uppercase tracking-widest mb-1.5">
                Chat History
              </p>
              <div className="space-y-0.5">
                {conversationsToDisplay.slice(0, 5).map(renderConversationRow)}

                {conversationsToDisplay.length === 0 && (
                  <p className="text-[11px] text-[#464554]/60 italic px-2 py-1">
                    No matching conversations found.
                  </p>
                )}
              </div>

              {conversationsToDisplay.length > 5 && (
                <>
                  <p className="px-2 text-[10px] font-bold text-[#464554]/60 uppercase tracking-widest mt-3 mb-1.5">
                    Earlier
                  </p>
                  <div className="space-y-0.5">
                    {conversationsToDisplay.slice(5).map(renderConversationRow)}
                  </div>
                </>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-[#c7c4d7]/60 space-y-2 bg-white/40 min-w-[275px]">
          {user && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/60 border border-white/40">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#4441cc] text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#1a1c1c] truncate">{user.name}</p>
                  <p className="text-[10px] text-[#464554] truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="p-1 text-[#464554] hover:text-red-600 rounded transition-colors"
                title="Logout"
              >
                <span className="material-symbols-outlined text-base">logout</span>
              </button>
            </div>
          )}
          <div className="flex items-center justify-between text-xs font-semibold">
            <Link href="/" className="text-[#464554] hover:text-[#4441cc] flex items-center gap-1.5 transition-colors">
              <span className="material-symbols-outlined text-base">home</span> Home
            </Link>
            <Link href="/documents" className="text-[#464554] hover:text-[#4441cc] flex items-center gap-1.5 transition-colors">
              <span className="material-symbols-outlined text-base">menu_book</span> Docs
            </Link>
          </div>
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
                className="p-1.5 text-[#464554] hover:text-[#4441cc] hover:bg-[#c7c4d7]/30 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                title="Open Sidebar"
              >
                <span className="material-symbols-outlined text-xl leading-none">chevron_right</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-['Geist'] text-[#1a1c1c]">
                ADTU Knowledge Base
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold bg-[#4441cc]/10 text-[#4441cc] px-2 py-0.5 rounded-full">
                Assam Down Town University
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/40 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-[#1a1c1c]">{user.name}</span>
                <span className="text-[10px] text-[#4441cc] font-semibold">({user.role})</span>
              </div>
            )}
            {!rightSidebarOpen && (
              <button
                onClick={() => setRightSidebarOpen(true)}
                className="p-1.5 text-[#464554] hover:text-[#4441cc] hover:bg-[#c7c4d7]/30 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                title="Open Knowledge Context"
              >
                <span className="material-symbols-outlined text-xl leading-none">info</span>
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
                {conversation.messages!.map((msg, idx) => {
                  // The assistant's answer belongs to the user question
                  // directly before it — that's what the Evidence Explorer
                  // highlights against.
                  const previous = idx > 0 ? conversation.messages![idx - 1] : undefined;
                  const query = previous && previous.role === 'user' ? previous.content : undefined;
                  return (
                    <MessageCard
                      key={msg.id}
                      message={msg}
                      query={query}
                      onFollowUpClick={(q) => handleSendMessage(q)}
                      onClarificationClick={(opt) => handleSendMessage(opt)}
                    />
                  );
                })}
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

            {pendingUserMessage && (
              <MessageCard
                message={{
                  id: -1,
                  conversationId: conversationId ?? 0,
                  role: 'user',
                  content: pendingUserMessage,
                  createdAt: new Date().toISOString(),
                }}
              />
            )}
            {sendMessageMutation.isPending && <AILoadingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Upgraded Hero Search Bar (Height 68-72px, Focal Point) */}
        <div className="p-4 sm:p-5 bg-gradient-to-t from-[#f9f9f9] via-[#f9f9f9]/90 to-transparent z-20">
          <div className="max-w-3xl mx-auto">
            <div className="glass-card animated-gradient-border flex items-center px-5 py-2.5 shadow-2xl h-[70px] rounded-3xl">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(message)}
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-base text-[#1a1c1c] placeholder:text-[#464554]/50 font-medium"
                placeholder={placeholderSuggestions[placeholderIndex]}
                type="text"
                disabled={sendMessageMutation.isPending}
              />

              <div className="flex items-center shrink-0">
                <button
                  onClick={() => handleSendMessage(message)}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="bg-[#4441cc] text-white h-11 w-11 rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 cursor-pointer"
                  title="Send message"
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
        className={`fixed lg:static right-0 top-0 h-full bg-[#f3f3f4]/95 backdrop-blur-2xl border-l border-[#c7c4d7]/70 flex flex-col transition-all duration-300 z-30 overflow-hidden ${
          rightSidebarOpen ? 'w-[285px] opacity-100' : 'w-0 opacity-0 pointer-events-none border-none'
        }`}
      >
        <div className="p-4 border-b border-[#c7c4d7]/60 flex items-center justify-between min-w-[285px]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4441cc] text-lg">auto_stories</span>
            <h3 className="font-bold text-xs text-[#1a1c1c]">Knowledge Context</h3>
          </div>
          <button
            onClick={() => setRightSidebarOpen(false)}
            className="p-1.5 text-[#464554] hover:text-[#4441cc] hover:bg-[#c7c4d7]/30 rounded-lg transition-all cursor-pointer"
            title="Collapse Panel"
          >
            <span className="material-symbols-outlined text-lg leading-none">chevron_right</span>
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
