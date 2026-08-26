'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  totalDocsCount: number;
}

export function AdminSidebar({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  totalDocsCount,
}: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const navItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: 'space_dashboard' },
    { id: 'documents', label: 'Document Repository', icon: 'folder_open', count: totalDocsCount },
    { id: 'pipeline', label: 'Ingestion & Vector Pipeline', icon: 'account_tree' },
    { id: 'analytics', label: 'RAG Confidence & Usage', icon: 'analytics' },
    { id: 'settings', label: 'System Settings', icon: 'tune' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 flex flex-col justify-between p-6 transition-transform duration-300 ease-in-out glass-card border-r border-white/20 bg-[#f9f9f9]/80 backdrop-blur-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4441cc] to-[#9026c3] flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
              </div>
              <div>
                <h1 className="font-bold text-lg text-[#1a1c1c] tracking-tight leading-none">
                  ADTU KB AI
                </h1>
                <span className="text-[10px] font-bold text-[#4441cc] tracking-widest uppercase">
                  Admin Console
                </span>
              </div>
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-[#464554] hover:text-[#1a1c1c] p-1 rounded-lg hover:bg-black/5"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#4441cc] text-white shadow-md shadow-[#4441cc]/20'
                      : 'text-[#464554] hover:bg-white/60 hover:text-[#1a1c1c]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-xl ${
                        isActive ? 'text-white' : 'text-[#4441cc]'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#4441cc]/10 text-[#4441cc]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom System Health & Admin Info */}
        <div className="space-y-4 pt-6 border-t border-white/20">
          {/* System Health Card */}
          <div className="p-4 rounded-2xl bg-white/60 border border-white/30 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#1a1c1c] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Milvus Vector DB
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Connected
              </span>
            </div>
            <p className="text-[11px] text-[#464554]">HNSW Index • 1,240 Chunks Active</p>
          </div>

          {/* User Badge */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/40 border border-white/30">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#9026c3] to-[#0055a9] text-white font-bold flex items-center justify-center text-sm shadow-sm">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-[#1a1c1c] truncate">
                {user?.name || 'SysAdmin User'}
              </h4>
              <p className="text-[10px] text-[#464554] truncate">
                {user?.email || 'admin@adtu.ac.in'}
              </p>
            </div>
            <button
              onClick={() => logout()}
              title="Logout Session"
              className="text-[#464554] hover:text-red-600 p-1.5 rounded-xl hover:bg-white/60 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
