'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserResponseDTO,
  registerUser,
  loginUser,
  loginAdminUser,
  fetchCurrentUser,
  logoutUser,
} from '@/lib/auth-api';

const TOKEN_KEY = 'adtu_rag_token';

interface AuthContextType {
  user: UserResponseDTO | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginAdmin: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponseDTO | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
      if (!storedToken) {
        setToken(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      const res = await fetchCurrentUser(storedToken);
      if (res.success && res.user) {
        setToken(storedToken);
        setUser(res.user);
      } else {
        if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('[AuthContext] initAuth error:', err);
      if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // User Login Handler
  const handleLogin = async (email: string, password: string) => {
    try {
      const res = await loginUser({ email, password });
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, res.token);
        return { success: true };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error during login' };
    }
  };

  // Admin Portal Login Handler
  const handleLoginAdmin = async (email: string, password: string) => {
    try {
      const res = await loginAdminUser({ email, password });
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, res.token);
        return { success: true };
      }
      return { success: false, message: res.message || 'Admin login failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error during admin login' };
    }
  };

  // Student/User Registration Handler
  const handleRegister = async (name: string, email: string, password: string) => {
    try {
      const res = await registerUser({ name, email, password });
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, res.token);
        return { success: true };
      }
      return { success: false, message: res.message || 'Registration failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error during registration' };
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await logoutUser(token);
      } catch (err) {
        console.error('[AuthContext] logout error:', err);
      }
    }
    if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login: handleLogin,
        loginAdmin: handleLoginAdmin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
