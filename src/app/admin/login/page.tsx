'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

export const dynamic = 'force-dynamic';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams ? searchParams.get('redirect') : null;

  const { loginAdmin, user, isAuthenticated } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Route authenticated users appropriately
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        router.replace(redirectParam || '/admin');
      } else {
        // If normal user stumbles into /admin/login while logged in, redirect to chat
        router.replace('/chat');
      }
    }
  }, [isAuthenticated, user, redirectParam, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter administrator email and password');
      return;
    }

    setIsSubmitting(true);
    const result = await loginAdmin(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(
        result.message || 'Invalid administrator credentials or account not authorized for Administration Portal'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c] font-['Geist'] flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Abstract Royal Purple Aurora Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#9026c3]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#4441cc]/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Brand Header */}
      <Link href="/" className="mb-8 flex items-center gap-3 group">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#9026c3] to-[#4441cc] flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
          <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
        </div>
        <div>
          <span className="text-2xl font-bold text-[#9026c3] tracking-tighter block leading-none">
            ADTU KB AI
          </span>
          <span className="text-[10px] font-bold text-[#4441cc] tracking-widest uppercase">
            Administration Portal
          </span>
        </div>
      </Link>

      {/* Admin Login Card */}
      <div className="w-full max-w-md animated-gradient-border p-[1px]">
        <div className="glass-card p-8 sm:p-10 rounded-3xl bg-white/75 backdrop-blur-2xl border border-white/50 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#9026c3]/10 text-[#9026c3] border border-[#9026c3]/20 text-[11px] font-bold uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-sm">lock</span>
              <span>Internal Admin Portal</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1a1c1c] tracking-tight">Admin Authentication</h1>
            <p className="text-xs text-[#464554]">
              Sign in with your seeded administrator credentials to manage vector knowledge base & RAG pipeline
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-700 flex items-start gap-2.5 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-base text-red-600 shrink-0 mt-0.5">
                gpp_bad
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Admin Email Field */}
            <div>
              <label className="block text-xs font-bold text-[#1a1c1c] mb-1.5">
                Administrator Email Address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#9026c3]">
                  admin_panel_settings
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@adtu.ac.in"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/80 border border-[#c7c4d7]/50 text-sm text-[#1a1c1c] placeholder:text-[#464554]/40 focus:outline-none focus:ring-2 focus:ring-[#9026c3]/40 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-[#1a1c1c] mb-1.5">Admin Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#9026c3]">
                  key
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/80 border border-[#c7c4d7]/50 text-sm text-[#1a1c1c] placeholder:text-[#464554]/40 focus:outline-none focus:ring-2 focus:ring-[#9026c3]/40 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#9026c3] to-[#4441cc] text-white font-semibold text-sm hover:shadow-[0_0_25px_rgba(144,38,195,0.3)] transition-all shadow-lg flex items-center justify-center gap-2 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Authenticating Admin...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin Console</span>
                  <span className="material-symbols-outlined text-sm">shield</span>
                </>
              )}
            </button>
          </form>

          {/* Secure Notice (No Register Link!) */}
          <div className="pt-4 border-t border-white/20 text-center text-[11px] text-[#464554] font-medium">
            Protected System • Admin registration is disabled. Administrator accounts are pre-seeded by system security policy.
          </div>
        </div>
      </div>

      {/* Back to Home Link */}
      <Link
        href="/"
        className="mt-6 text-xs text-[#464554] hover:text-[#4441cc] transition-colors flex items-center gap-1 font-semibold"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        <span>Back to Public Home</span>
      </Link>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-['Geist'] text-sm">Loading Admin Login...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}
