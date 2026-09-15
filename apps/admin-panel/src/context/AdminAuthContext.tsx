'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface AdminUserData {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
}

interface AdminAuthContextType {
  admin: AdminUserData | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAdmin = useCallback(async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null;
      if (!storedToken) {
        setAdmin(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      setToken(storedToken);
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.role !== 'admin') {
          // Reject non-admin sessions immediately
          localStorage.removeItem('chekup_admin_token');
          setAdmin(null);
          setToken(null);
        } else {
          setAdmin(data);
        }
      } else {
        localStorage.removeItem('chekup_admin_token');
        setAdmin(null);
        setToken(null);
      }
    } catch (e) {
      console.error('Failed to restore admin session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAdmin();
  }, [refreshAdmin]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Admin authentication failed');
    }

    if (data.user?.role !== 'admin') {
      throw new Error('Access Forbidden: Account is not an authorized administrator');
    }

    if (data.accessToken) {
      localStorage.setItem('chekup_admin_token', data.accessToken);
      setToken(data.accessToken);
      setAdmin(data.user);
    }
    return data;
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('chekup_admin_token');
    setAdmin(null);
    setToken(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        token,
        isLoading,
        isAuthenticated: !!admin,
        login,
        logout,
        refreshAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
