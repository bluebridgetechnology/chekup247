'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface DoctorProfileData {
  id: string;
  userId: string;
  hpcsaNumber: string;
  specialty: string;
  ratePerHour: number;
  ratingAvg: number;
  bio: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationSource: 'platform' | 'locumstaff';
  ssoProvider?: string | null;
  ssoExternalId?: string | null;
  documentsUrl: string[];
}

export interface DoctorUserData {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  phone?: string;
  isEmailVerified: boolean;
  avatarUrl?: string | null;
  doctorProfile?: DoctorProfileData | null;
}

interface DoctorAuthContextType {
  doctor: DoctorUserData | null;
  profile: DoctorProfileData | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPendingVerification: boolean;
  login: (email: string, password: string) => Promise<any>;
  onboard: (data: any) => Promise<any>;
  handleSsoCallback: (code: string, codeVerifier?: string, state?: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshDoctor: () => Promise<void>;
  updateProfile: (data: Partial<DoctorProfileData>) => Promise<any>;
}

const DoctorAuthContext = createContext<DoctorAuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function DoctorAuthProvider({ children }: { children: React.ReactNode }) {
  const [doctor, setDoctor] = useState<DoctorUserData | null>(null);
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDoctor = useCallback(async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('chekup_doctor_token') : null;
      if (!storedToken) {
        setDoctor(null);
        setProfile(null);
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
        setDoctor(data);
        if (data.doctorProfile) {
          setProfile({
            id: data.doctorProfile.id,
            userId: data.doctorProfile.user_id,
            hpcsaNumber: data.doctorProfile.hpcsa_number,
            specialty: data.doctorProfile.specialty,
            ratePerHour: Number(data.doctorProfile.rate_per_hour),
            ratingAvg: Number(data.doctorProfile.rating_avg || 0),
            bio: data.doctorProfile.bio,
            verificationStatus: data.doctorProfile.verification_status,
            verificationSource: data.doctorProfile.verification_source,
            ssoProvider: data.doctorProfile.sso_provider,
            ssoExternalId: data.doctorProfile.sso_external_id,
            documentsUrl: data.doctorProfile.documents_url || [],
          });
        }
      } else {
        localStorage.removeItem('chekup_doctor_token');
        setDoctor(null);
        setProfile(null);
        setToken(null);
      }
    } catch (err) {
      console.error('Error fetching doctor session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDoctor();
  }, [refreshDoctor]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Doctor login failed');

    if (data.accessToken) {
      localStorage.setItem('chekup_doctor_token', data.accessToken);
      setToken(data.accessToken);
      setDoctor(data.user);
      if (data.user.doctorProfile) {
        setProfile({
          id: data.user.doctorProfile.id,
          userId: data.user.doctorProfile.user_id,
          hpcsaNumber: data.user.doctorProfile.hpcsa_number,
          specialty: data.user.doctorProfile.specialty,
          ratePerHour: Number(data.user.doctorProfile.rate_per_hour),
          ratingAvg: Number(data.user.doctorProfile.rating_avg || 0),
          bio: data.user.doctorProfile.bio,
          verificationStatus: data.user.doctorProfile.verification_status,
          verificationSource: data.user.doctorProfile.verification_source,
          ssoProvider: data.user.doctorProfile.sso_provider,
          ssoExternalId: data.user.doctorProfile.sso_external_id,
          documentsUrl: data.user.doctorProfile.documents_url || [],
        });
      }
    }
    return data;
  };

  const onboard = async (onboardData: any) => {
    const res = await fetch(`${API_BASE}/doctors/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(onboardData),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Onboarding registration failed');

    if (data.accessToken) {
      localStorage.setItem('chekup_doctor_token', data.accessToken);
      setToken(data.accessToken);
      if (data.doctorProfile) {
        setProfile({
          id: data.doctorProfile.id,
          userId: data.doctorProfile.user_id,
          hpcsaNumber: data.doctorProfile.hpcsa_number,
          specialty: data.doctorProfile.specialty,
          ratePerHour: Number(data.doctorProfile.rate_per_hour),
          ratingAvg: Number(data.doctorProfile.rating_avg || 0),
          bio: data.doctorProfile.bio,
          verificationStatus: data.doctorProfile.verification_status,
          verificationSource: data.doctorProfile.verification_source,
          ssoProvider: data.doctorProfile.sso_provider,
          ssoExternalId: data.doctorProfile.sso_external_id,
          documentsUrl: data.doctorProfile.documents_url || [],
        });
      }
      await refreshDoctor();
    }
    return data;
  };

  const handleSsoCallback = async (code: string, codeVerifier?: string, state?: string) => {
    const res = await fetch(`${API_BASE}/auth/sso/locumstaff/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: codeVerifier, state }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'LocumStaff SSO token exchange failed');

    if (data.accessToken) {
      localStorage.setItem('chekup_doctor_token', data.accessToken);
      setToken(data.accessToken);
      await refreshDoctor();
    }
    return data;
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('chekup_doctor_token');
    setDoctor(null);
    setProfile(null);
    setToken(null);
  };

  const updateProfile = async (updated: Partial<DoctorProfileData>) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE}/doctors/me/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        specialty: updated.specialty,
        rate_per_hour: updated.ratePerHour,
        bio: updated.bio,
        documents_url: updated.documentsUrl,
      }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update doctor profile');
    await refreshDoctor();
    return data;
  };

  const isPendingVerification = profile?.verificationStatus === 'pending';

  return (
    <DoctorAuthContext.Provider
      value={{
        doctor,
        profile,
        token,
        isLoading,
        isAuthenticated: !!doctor,
        isPendingVerification,
        login,
        onboard,
        handleSsoCallback,
        logout,
        refreshDoctor,
        updateProfile,
      }}
    >
      {children}
    </DoctorAuthContext.Provider>
  );
}

export function useDoctorAuth() {
  const context = useContext(DoctorAuthContext);
  if (!context) {
    throw new Error('useDoctorAuth must be used within DoctorAuthProvider');
  }
  return context;
}
