'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

export const dynamic = 'force-dynamic';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams ? searchParams.get('redirect') : null;

  const { register, user, isAuthenticated } = useAuth();

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // If already authenticated as user, route to chat; if admin, route to admin
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        router.replace('/admin');
      } else if (redirectParam) {
        router.replace(redirectParam);
      } else {
        router.replace('/chat');
      }
    }
  }, [isAuthenticated, user, redirectParam, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);
    const result = await register(name, email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.message || 'Registration failed. Email may already be registered.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c] font-['Geist'] flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Abstract Aurora Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#4441cc]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#9026c3]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Brand Header */}
      <Link href="/" className="mb-8 flex items-center gap-3 group">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4441cc] to-[#9026c3] flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
          <span className="material-symbols-outlined text-2xl">person_add</span>
        </div>
        <div>
          <span className="text-2xl font-bold text-[#4441cc] tracking-tighter block leading-none">
            ADTU KB AI
          </span>
          <span className="text-[10px] font-bold text-[#464554] tracking-widest uppercase">
            Student & Faculty Registration
          </span>
        </div>
      </Link>

      {/* Register Card */}
      <div className="w-full max-w-md animated-gradient-border p-[1px]">
        <div className="glass-card p-8 sm:p-10 rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/50 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-[#1a1c1c] tracking-tight">Create Student Account</h1>
            <p className="text-xs text-[#464554]">
              Register to access grounded AI Assistant & university Knowledge Base
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-700 flex items-start gap-2.5 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-base text-red-600 shrink-0 mt-0.5">
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Field */}
            <div>
              <label className="block text-xs font-bold text-[#1a1c1c] mb-1.5">Full Name</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#4441cc]">
                  person
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/80 border border-[#c7c4d7]/50 text-sm text-[#1a1c1c] placeholder:text-[#464554]/40 focus:outline-none focus:ring-2 focus:ring-[#4441cc]/40 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-[#1a1c1c] mb-1.5">
                University Email Address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#4441cc]">
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@adtu.ac.in"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/80 border border-[#c7c4d7]/50 text-sm text-[#1a1c1c] placeholder:text-[#464554]/40 focus:outline-none focus:ring-2 focus:ring-[#4441cc]/40 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-[#1a1c1c] mb-1.5">
                Password (min 6 chars)
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#4441cc]">
                  lock
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/80 border border-[#c7c4d7]/50 text-sm text-[#1a1c1c] placeholder:text-[#464554]/40 focus:outline-none focus:ring-2 focus:ring-[#4441cc]/40 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 px-6 rounded-full bg-[#4441cc] text-white font-semibold text-sm hover:bg-[#4441cc]/90 transition-all shadow-lg flex items-center justify-center gap-2 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Link to Login */}
          <div className="pt-4 border-t border-white/20 text-center text-xs text-[#464554]">
            Already have an account?{' '}
            <Link
              href={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login'}
              className="text-[#4441cc] font-bold hover:underline"
            >
              Sign in here
            </Link>
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-['Geist'] text-sm">Loading Registration...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
