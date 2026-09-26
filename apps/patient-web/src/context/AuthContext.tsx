'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  phone?: string;
  isEmailVerified: boolean;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  genotype?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  notificationPreferences?: {
    channels: string[];
    remindersEnabled: boolean;
  };
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<any>;
  register: (data: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    date_of_birth?: string;
    id_number?: string;
    gender?: string;
    province?: string;
    languages_spoken?: string[];
  }) => Promise<any>;
  verifyEmail: (token: string) => Promise<any>;
  verifyOtp: (email: string, otp: string) => Promise<any>;
  resendOtp: (email: string) => Promise<any>;
  expressPatient: (data: { full_name: string; email: string; phone: string }) => Promise<any>;

  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: {
    full_name?: string;
    phone?: string;
    date_of_birth?: string;
    avatar_url?: string;
    blood_group?: string;
    genotype?: string;
    allergies?: string;
    chronic_conditions?: string;
  }) => Promise<any>;
  updatePreferences: (channels: string[], remindersEnabled?: boolean) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session from localStorage and fetch current profile
  const refreshUser = useCallback(async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('chekup_token') : null;
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      setToken(storedToken);
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        // Token expired or invalid
        localStorage.removeItem('chekup_token');
        setUser(null);
        setToken(null);
      }
    } catch (e) {
      console.error('Failed to restore session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string, rememberMe = true) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, remember_me: rememberMe }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed. Please verify credentials.');
    }

    if (data.accessToken) {
      localStorage.setItem('chekup_token', data.accessToken);
      setToken(data.accessToken);
      setUser(data.user);
    }
    return data;
  };

  const register = async (dto: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    date_of_birth?: string;
    id_number?: string;
    gender?: string;
    province?: string;
    languages_spoken?: string[];
  }) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed.');
    }

    if (data.accessToken) {
      localStorage.setItem('chekup_token', data.accessToken);
      setToken(data.accessToken);
      setUser(data.user);
    }
    return data;
  };

  const expressPatient = async (dto: { full_name: string; email: string; phone: string }) => {
    const res = await fetch(`${API_BASE}/auth/express-patient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Express booking account initialization failed.');
    }

    if (data.accessToken) {
      localStorage.setItem('chekup_token', data.accessToken);
      setToken(data.accessToken);
      setUser(data.user);
    }
    return data;
  };

  const verifyOtp = async (email: string, otp: string) => {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Verification failed. Please check your 6-digit code.');
    }

    if (data.accessToken) {
      localStorage.setItem('chekup_token', data.accessToken);
      setToken(data.accessToken);
      setUser(data.user);
    }
    return data;
  };

  const resendOtp = async (email: string) => {
    const res = await fetch(`${API_BASE}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to resend code.');
    }
    return data;
  };

  const verifyEmail = async (verificationToken: string) => {
    const res = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: verificationToken }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Verification failed. Token may be invalid or expired.');
    }

    if (data.accessToken) {
      localStorage.setItem('chekup_token', data.accessToken);
      setToken(data.accessToken);
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('chekup_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (dto: {
    full_name?: string;
    phone?: string;
    date_of_birth?: string;
    avatar_url?: string;
    blood_group?: string;
    genotype?: string;
    allergies?: string;
    chronic_conditions?: string;
  }) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dto),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update profile');
    setUser(data);
    return data;
  };

  const updatePreferences = async (channels: string[], remindersEnabled = true) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE}/auth/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channels, remindersEnabled }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update preferences');
    if (user) {
      setUser({ ...user, notificationPreferences: data });
    }
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        verifyEmail,
        verifyOtp,
        resendOtp,
        expressPatient,
        logout,
        refreshUser,
        updateProfile,
        updatePreferences,
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
