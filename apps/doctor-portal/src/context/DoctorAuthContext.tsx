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
  /** Whether the doctor offers video consultations (default: true) */
  offersVideo?: boolean;
  /** Whether the doctor offers audio-only consultations */
  offersAudio?: boolean;
  /** Whether the doctor offers in-clinic in-person visits */
  offersInClinic?: boolean;
  /** Practice or clinic facility name */
  facilityName?: string | null;
  /** Physical clinic address (only shown if in-clinic visits offered) */
  facilityAddress?: string | null;
  /** Whether the doctor accepts medical aid */
  acceptsMedicalAid?: boolean;
  /** Areas of expertise / consultation types */
  consultationTypes?: string[];
  /** Secondary specialties (selectable pills) */
  secondarySpecialties?: string[];
  /** Years of clinical experience */
  experienceYears?: number;
  /** Whether the doctor is board certified */
  isBoardCertified?: boolean;
  /** Board certification title or fellowship credential */
  boardCertificationTitle?: string;
  /** Holiday mode toggle */
  isOnHoliday?: boolean;
  /** Presence status ('active' | 'busy' | 'offline') */
  presenceStatus?: string;
  /** High resolution PNG signature URL */
  signatureUrl?: string | null;
  signatureUploadedAt?: string | null;
  /** Banking details for EFT settlements */
  bankName?: string | null;
  accountNumber?: string | null;
  branchCode?: string | null;
  accountType?: string | null;
  accountHolder?: string | null;
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
  toggleHolidayMode: (isOnHoliday: boolean) => Promise<any>;
  updatePresenceStatus: (status: string) => Promise<any>;
}

const DoctorAuthContext = createContext<DoctorAuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function mapDoctorProfile(raw: any): DoctorProfileData {
  return {
    id: raw.id,
    userId: raw.user_id,
    hpcsaNumber: raw.hpcsa_number,
    specialty: raw.specialty,
    secondarySpecialties: raw.secondary_specialties || [],
    ratePerHour: Number(raw.rate_per_hour || 0),
    ratingAvg: Number(raw.rating_avg || 0),
    bio: raw.bio || '',
    verificationStatus: raw.verification_status,
    verificationSource: raw.verification_source,
    ssoProvider: raw.sso_provider,
    ssoExternalId: raw.sso_external_id,
    documentsUrl: raw.documents_url || [],
    offersVideo: raw.offers_video !== false,
    offersAudio: raw.offers_audio === true,
    offersInClinic: raw.offers_in_clinic === true,
    facilityName: raw.facility_name || null,
    facilityAddress: raw.facility_address || null,
    acceptsMedicalAid: raw.accepts_medical_aid === true,
    consultationTypes: raw.consultation_types || [],
    experienceYears: raw.experience_years !== undefined ? Number(raw.experience_years) : 10,
    isBoardCertified: raw.is_board_certified !== false,
    boardCertificationTitle: raw.board_certification_title || 'Board Certified',
    isOnHoliday: raw.is_on_holiday === true,
    presenceStatus: raw.presence_status || 'active',
    signatureUrl: raw.signature_url || null,
    signatureUploadedAt: raw.signature_uploaded_at || null,
    bankName: raw.bank_name || null,
    accountNumber: raw.account_number || null,
    branchCode: raw.branch_code || null,
    accountType: raw.account_type || null,
    accountHolder: raw.account_holder || null,
  };
}

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
          setProfile(mapDoctorProfile(data.doctorProfile));
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
      if (data.user?.doctorProfile) {
        setProfile(mapDoctorProfile(data.user.doctorProfile));
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
        setProfile(mapDoctorProfile(data.doctorProfile));
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
        secondary_specialties: updated.secondarySpecialties,
        rate_per_hour: updated.ratePerHour,
        bio: updated.bio,
        documents_url: updated.documentsUrl,
        consultation_types: updated.consultationTypes,
        offers_video: updated.offersVideo,
        offers_audio: updated.offersAudio,
        offers_in_clinic: updated.offersInClinic,
        facility_name: updated.facilityName,
        facility_address: updated.facilityAddress,
        accepts_medical_aid: updated.acceptsMedicalAid,
        experience_years: updated.experienceYears,
        is_board_certified: updated.isBoardCertified,
        board_certification_title: updated.boardCertificationTitle,
        is_on_holiday: updated.isOnHoliday,
        signature_url: updated.signatureUrl,
        bank_name: updated.bankName,
        account_number: updated.accountNumber,
        branch_code: updated.branchCode,
        account_type: updated.accountType,
        account_holder: updated.accountHolder,
      }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update doctor profile');
    await refreshDoctor();
    return data;
  };

  const toggleHolidayMode = async (isOnHoliday: boolean) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE}/doctors/me/holiday-mode`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isOnHoliday }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update holiday mode');
    await refreshDoctor();
    return data;
  };

  const updatePresenceStatus = async (status: string) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE}/doctors/me/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update presence status');
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
        toggleHolidayMode,
        updatePresenceStatus,
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
