'use client';

import React from 'react';

interface AdminHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenUploadModal: () => void;
  onToggleSidebar: () => void;
  unreadCount?: number;
}

export function AdminHeader({
  searchQuery,
  setSearchQuery,
  onOpenUploadModal,
  onToggleSidebar,
  unreadCount = 3,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full glass-card border-b border-white/20 bg-[#f9f9f9]/70 backdrop-blur-xl px-6 py-4 mb-8">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button & Search Input */}
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-2xl bg-white/60 text-[#1a1c1c] border border-white/40 hover:bg-white transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#4441cc]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge base documents, policies, curricula..."
              className="w-full pl-12 pr-4 py-2.5 rounded-full bg-white/70 border border-white/50 text-sm text-[#1a1c1c] placeholder-[#464554]/70 focus:outline-none focus:ring-2 focus:ring-[#4441cc]/40 shadow-inner transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#464554] hover:text-[#1a1c1c]"
              >
                <span className="material-symbols-outlined text-sm">cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Status Badge, Notifications, Upload CTA */}
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>RAG Core Online</span>
          </div>

          {/* Notifications Button */}
          <button
            className="relative p-2.5 rounded-full bg-white/70 border border-white/50 text-[#464554] hover:text-[#4441cc] hover:bg-white transition-all shadow-sm"
            title="Ingestion Alerts"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#ba1a1a] text-white font-bold text-[10px] rounded-full flex items-center justify-center border border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Upload Document CTA Button */}
          <button
            onClick={onOpenUploadModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#4441cc] to-[#5e5ce6] text-white font-semibold text-xs sm:text-sm hover:shadow-[0_0_20px_rgba(68,65,204,0.3)] hover:scale-105 active:scale-95 transition-all shadow-md"
          >
            <span className="material-symbols-outlined text-lg">cloud_upload</span>
            <span>Upload Document</span>
          </button>
        </div>
      </div>
    </header>
  );
}
