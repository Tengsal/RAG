'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { UserRole } from '@/lib/auth-api';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      // Direct unauthenticated users to the correct login page
      if (pathname.startsWith('/admin')) {
        router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
      } else {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // Role unauthorized: redirect user to chat, or admin to admin portal
      if (user.role === 'user') {
        router.replace('/chat');
      } else {
        router.replace('/admin');
      }
    }
  }, [isAuthenticated, user, isLoading, allowedRoles, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex flex-col items-center justify-center font-['Geist']">
        <div className="glass-card p-8 rounded-3xl border border-white/40 flex flex-col items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-full border-4 border-[#4441cc]/20 border-t-[#4441cc] animate-spin" />
          <p className="text-sm font-semibold text-[#1a1c1c]">Verifying ADTU AI Auth Session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
