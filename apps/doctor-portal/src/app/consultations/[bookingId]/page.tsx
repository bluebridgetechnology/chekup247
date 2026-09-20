'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Maximize2,
  Minimize2,
  Clock,
  User,
  Shield,
  CheckCircle2,
  Loader2,
  FileText,
  Save,
  Check,
  ChevronRight,
  ChevronDown,
  X,
  Stethoscope,
  Plus,
  Search,
  Activity,
  Heart,
  Calendar,
  Pill,
  Thermometer,
  Weight,
  Lock,
  Eye,
  MoreHorizontal,
  Share2,
  HelpCircle,
  ArrowRight,
  FileDown,
  ChevronLeft,
  Settings,
  Bell,
  PanelRightClose,
  PanelRightOpen,
  ClipboardList,
  AlertCircle,
  Sparkles,
  TimerReset,
} from 'lucide-react';
import DailyIframe, { DailyCall, DailyEventObjectTrack } from '@daily-co/daily-js';
import { io, Socket } from 'socket.io-client';
import { useDoctorAuth } from '../../../context/DoctorAuthContext';
import { toastSuccess, toastError, errorMessage } from '../../../lib/toast';
import { ChekupCrossLogo } from '../../../components/common/ChekupCrossLogo';

interface ConsultationDetail {
  id: string;
  booking_id: string;
  video_room_id: string;
  room_url: string;
  started_at: string | null;
  ended_at: string | null;
  doctor_notes: string | null;
  patient_notes?: string | null;
  booking?: {
    id: string;
    patient_id: string;
    doctor_id: string;
    status: string;
    price: number;
    patient?: {
      id: string;
      fullName: string;
      email: string;
      phone?: string;
    };
  };
  patient?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string | null;
  };
  patientMedicalProfile?: {
    blood_group?: string | null;
    genotype?: string | null;
    allergies?: string | null;
    chronic_conditions?: string | null;
  } | null;
  patientDocuments?: Array<{
    id: string;
    title: string;
    original_filename: string;
    category: string;
    downloadUrl?: string | null;
    file_size?: number;
    created_at?: string;
  }>;
}

interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface DiagnosisItem {
  id: string;
  code: string;
  name: string;
  isPrimary: boolean;
}

export default function DoctorConsultationWorkspace() {
  const params = useParams();
  const router = useRouter();
  const { doctor, profile, token } = useDoctorAuth();
  const bookingId = (params?.bookingId as string) || 'demo-booking-1';

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  // --------------------------------------------------------------------------
  // UI & Lifecycle States
  // --------------------------------------------------------------------------
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [consultation, setConsultation] = useState<ConsultationDetail | null>(null);
  const [isConsultationEnded, setIsConsultationEnded] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [tabletDrawerOpen, setTabletDrawerOpen] = useState<boolean>(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'video' | 'patient' | 'notes' | 'prescription'>('video');

  // Video & Controls State
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [isPatientConnected, setIsPatientConnected] = useState<boolean>(true);

  // Timer State (starts from 0 or calculated from consultation.started_at)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Time Extension Modal & Socket State
  const [showExtendModal, setShowExtendModal] = useState<boolean>(false);
  const [extensionDuration, setExtensionDuration] = useState<10 | 20 | 30>(10);
  const [extensionIsFree, setExtensionIsFree] = useState<boolean>(false);
  const [extensionReason, setExtensionReason] = useState<string>('');
  const [extensionStatus, setExtensionStatus] = useState<'idle' | 'submitting' | 'waiting_patient' | 'confirmed' | 'declined' | 'error'>('idle');
  const [extensionMessage, setExtensionMessage] = useState<string | null>(null);
  const [extensionSuccessBanner, setExtensionSuccessBanner] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Clinical Panel Tabs: 'notes' | 'diagnosis' | 'prescription' | 'followup'
  const [activeClinicalTab, setActiveClinicalTab] = useState<'notes' | 'diagnosis' | 'prescription' | 'followup'>('notes');

  // Clinical Notes Fields (dynamically populated from real consultation)
  const [chiefComplaint, setChiefComplaint] = useState<string>('');
  const [hpi, setHpi] = useState<string>('');
  const [assessment, setAssessment] = useState<string>('');
  const [plan, setPlan] = useState<string>('');
  const [patientInstructions, setPatientInstructions] = useState<string>('');

  // Autosave State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Diagnosis Tab State (starts clean)
  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);
  const [diagnosisQuery, setDiagnosisQuery] = useState<string>('');
  const [icdCodeInput, setIcdCodeInput] = useState<string>('');
  const [showIcdSuggestions, setShowIcdSuggestions] = useState<boolean>(false);

  // Prescription Tab State (starts clean)
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [isAddingMedication, setIsAddingMedication] = useState<boolean>(false);
  const [newMedName, setNewMedName] = useState<string>('');
  const [newMedDosage, setNewMedDosage] = useState<string>('');
  const [newMedFrequency, setNewMedFrequency] = useState<string>('');
  const [newMedDuration, setNewMedDuration] = useState<string>('');
  const [newMedInstructions, setNewMedInstructions] = useState<string>('');

  // Follow-up Tab State
  const [followupRequired, setFollowupRequired] = useState<boolean>(false);
  const [followupDate, setFollowupDate] = useState<string>('');
  const [followupType, setFollowupType] = useState<'routine' | 'specialist' | 'medication' | 'other'>('routine');
  const [followupInstructions, setFollowupInstructions] = useState<string>('');
  const [referralNote, setReferralNote] = useState<string>('');

  // Modals
  const [showEndModal, setShowEndModal] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [checklist, setChecklist] = useState({
    notes: true,
    diagnosis: true,
    prescription: true,
    followup: true,
  });

  // Video Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const workspaceContainerRef = useRef<HTMLDivElement | null>(null);

  // Common ICD-10 List for Quick Lookup
  const COMMON_ICD10 = [
    { code: 'G44.2', name: 'Tension-type headache' },
    { code: 'G43.0', name: 'Migraine without aura' },
    { code: 'R51', name: 'Headache, unspecified' },
    { code: 'R53.83', name: 'Other fatigue' },
    { code: 'I10', name: 'Essential (primary) hypertension' },
    { code: 'J06.9', name: 'Acute upper respiratory infection, unspecified' },
    { code: 'E11.9', name: 'Type 2 diabetes mellitus without complications' },
    { code: 'K21.9', name: 'Gastro-oesophageal reflux disease [GERD]' },
  ];

  // --------------------------------------------------------------------------
  // Timer Effect (Seconds counting up)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --------------------------------------------------------------------------
  // Autosave Handler
  // --------------------------------------------------------------------------
  const triggerAutoSave = useCallback(() => {
    setSaveStatus('unsaved');
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        if (bookingId && token) {
          await fetch(`${API_BASE}/consultations/${bookingId}/notes`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              notes: JSON.stringify({ chiefComplaint, hpi, assessment, plan, patientInstructions }),
              patientNotes: patientInstructions,
            }),
          }).catch(() => {});
        }
        setSaveStatus('saved');
        const now = new Date();
        setLastSavedTime(
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        );
      } catch (e) {
        setSaveStatus('saved');
      }
    }, 2000);
  }, [bookingId, token, API_BASE, chiefComplaint, hpi, assessment, plan, patientInstructions]);

  // --------------------------------------------------------------------------
  // Initial Load & Daily.co WebRTC Initialization
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    let dailyCall: DailyCall | null = null;

    async function initWorkspace() {
      try {
        if (bookingId && token) {
          const res = await fetch(`${API_BASE}/consultations/${bookingId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok && isMounted) {
            const data = await res.json();
            setConsultation(data);
            if (data?.started_at) {
              const startedMs = new Date(data.started_at).getTime();
              const diffSec = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
              setElapsedSeconds(diffSec);
            }
            if (data?.doctor_notes) {
              try {
                const parsed = JSON.parse(data.doctor_notes);
                if (parsed.chiefComplaint) setChiefComplaint(parsed.chiefComplaint);
                if (parsed.hpi) setHpi(parsed.hpi);
                if (parsed.assessment) setAssessment(parsed.assessment);
                if (parsed.plan) setPlan(parsed.plan);
                if (parsed.patientInstructions) setPatientInstructions(parsed.patientInstructions);
              } catch {
                setChiefComplaint(data.doctor_notes);
              }
            }
            if (data?.patient_notes) {
              setPatientInstructions(data.patient_notes);
            }
            if (data?.room_url) {
              dailyCall = DailyIframe.createCallObject({
                videoSource: true,
                audioSource: true,
                subscribeToTracksAutomatically: true,
              });

              dailyCall.on('track-started', (ev: DailyEventObjectTrack) => {
                if (!isMounted) return;
                if (ev.participant && !ev.participant.local) {
                  setIsPatientConnected(true);
                  if (ev.track.kind === 'video' && remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = new MediaStream([ev.track]);
                  }
                  if (ev.track.kind === 'audio' && remoteAudioRef.current) {
                    remoteAudioRef.current.srcObject = new MediaStream([ev.track]);
                  }
                } else if (ev.participant?.local) {
                  if (ev.track.kind === 'video' && localVideoRef.current) {
                    localVideoRef.current.srcObject = new MediaStream([ev.track]);
                  }
                }
              });

              dailyCall.on('participant-left', (ev) => {
                if (!isMounted) return;
                if (ev.participant && !ev.participant.local) {
                  setIsPatientConnected(false);
                }
              });

              await dailyCall.join({ url: data.room_url });
              if (isMounted) setCallObject(dailyCall);
            }
          }
        }
      } catch (err) {
        console.warn('Daily.co / API initialization fallback:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initWorkspace();

    return () => {
      isMounted = false;
      if (dailyCall) {
        dailyCall.leave().catch(() => {});
        dailyCall.destroy().catch(() => {});
      }
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [bookingId, token, API_BASE]);

  // --------------------------------------------------------------------------
  // WebSocket Consultation Sync & Extension Events
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!bookingId) return;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || (API_BASE ? API_BASE.replace(/\/api\/v1\/?$/, '') : 'http://localhost:4000');
    const socket = io(`${wsUrl}/consultations`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_session', {
        bookingId,
        role: 'doctor',
        userId: doctor?.id,
        userName: doctor?.fullName || 'Doctor',
      });
    });

    socket.on('extension_confirmed', (data: { addedMinutes: number; newDurationSeconds: number; remainingSeconds: number; amount: number }) => {
      setExtensionStatus('confirmed');
      setExtensionSuccessBanner(`Patient approved consultation extension! +${data.addedMinutes} minutes added.`);
      setTimeout(() => {
        setShowExtendModal(false);
        setExtensionStatus('idle');
      }, 2000);
      setTimeout(() => {
        setExtensionSuccessBanner(null);
      }, 6000);
    });

    socket.on('extension_declined', () => {
      setExtensionStatus('declined');
      setExtensionMessage('The patient declined the consultation extension request.');
    });

    socket.on('extension_payment_failed', (data: { message: string }) => {
      setExtensionStatus('error');
      setExtensionMessage(`Extension payment could not be processed: ${data.message}`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [bookingId, doctor?.id, doctor?.fullName, API_BASE]);

  const handleRequestExtension = async () => {
    if (!bookingId) return;
    setExtensionStatus('submitting');
    setExtensionMessage(null);

    try {
      const res = await fetch(`${API_BASE}/consultations/${bookingId}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          durationMinutes: extensionDuration,
          isFree: extensionIsFree,
          reason: extensionReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setExtensionStatus('error');
        setExtensionMessage(data.message || 'Cannot extend consultation: Schedule overlap detected with another booking or blackout period.');
        return;
      }

      setExtensionStatus('waiting_patient');
      setExtensionMessage(`Extension prompt sent to patient (+${extensionDuration} mins, ${extensionIsFree ? 'Free / Complimentary' : 'Standard Rate'}). Waiting for patient consent...`);
      toastSuccess('Extension offered', `Waiting for the patient to consent to +${extensionDuration} minutes.`);
    } catch (err: any) {
      setExtensionStatus('error');
      const msg = errorMessage(err, 'Network error while requesting consultation extension.');
      setExtensionMessage(msg);
      toastError('Could not request extension', msg);
    }
  };

  // --------------------------------------------------------------------------
  // Call Controls Handlers
  // --------------------------------------------------------------------------
  const toggleMic = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    if (callObject) {
      callObject.setLocalAudio(!next);
    }
  };

  const toggleVideo = () => {
    const next = !isVideoMuted;
    setIsVideoMuted(next);
    if (callObject) {
      callObject.setLocalVideo(!next);
    }
  };

  const toggleSpeaker = () => {
    const next = !isSpeakerMuted;
    setIsSpeakerMuted(next);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = next;
    }
  };

  const toggleScreenShare = async () => {
    if (!callObject) {
      setIsSharingScreen(!isSharingScreen);
      return;
    }
    try {
      if (isSharingScreen) {
        await callObject.stopScreenShare();
        setIsSharingScreen(false);
      } else {
        await callObject.startScreenShare();
        setIsSharingScreen(true);
      }
    } catch (err) {
      console.warn('Screen share toggle note:', err);
      setIsSharingScreen(!isSharingScreen);
    }
  };

  const toggleFullscreen = () => {
    if (!workspaceContainerRef.current) return;
    if (!document.fullscreenElement) {
      workspaceContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // --------------------------------------------------------------------------
  // Diagnosis & Prescription Handlers
  // --------------------------------------------------------------------------
  const handleAddDiagnosis = (code?: string, name?: string) => {
    const c = code || icdCodeInput.trim() || 'R51';
    const n = name || diagnosisQuery.trim() || 'Headache, unspecified';
    if (!n) return;
    setDiagnoses((prev) => [
      ...prev,
      {
        id: `diag-${Date.now()}`,
        code: c,
        name: n,
        isPrimary: prev.length === 0,
      },
    ]);
    setDiagnosisQuery('');
    setIcdCodeInput('');
    setShowIcdSuggestions(false);
    triggerAutoSave();
  };

  const handleRemoveDiagnosis = (id: string) => {
    setDiagnoses((prev) => prev.filter((d) => d.id !== id));
    triggerAutoSave();
  };

  const handleAddMedication = () => {
    if (!newMedName.trim()) return;
    setMedications((prev) => [
      ...prev,
      {
        id: `med-${Date.now()}`,
        name: newMedName.trim(),
        dosage: newMedDosage.trim() || '500 mg',
        frequency: newMedFrequency.trim() || 'Every 8 hours',
        duration: newMedDuration.trim() || '5 days',
        instructions: newMedInstructions.trim() || 'Take with food as directed',
      },
    ]);
    setNewMedName('');
    setNewMedDosage('');
    setNewMedFrequency('');
    setNewMedDuration('');
    setNewMedInstructions('');
    setIsAddingMedication(false);
    triggerAutoSave();
  };

  const handleRemoveMedication = (id: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
    triggerAutoSave();
  };

  const handleConfirmEndConsultation = async () => {
    try {
      setShowEndModal(false);
      if (callObject) {
        await callObject.leave().catch(() => {});
        await callObject.destroy().catch(() => {});
      }
      if (bookingId && token) {
        await fetch(`${API_BASE}/consultations/${bookingId}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ doctorNotes: assessment + '\n' + plan }),
        }).catch(() => {});
      }
      setIsConsultationEnded(true);
      toastSuccess('Consultation ended', 'You can now issue a prescription or clinical note.');
    } catch (e) {
      setIsConsultationEnded(true);
      toastError('Ended with a warning', errorMessage(e, 'The call closed but the server may not have recorded the end cleanly.'));
    }
  };

  // --------------------------------------------------------------------------
  // Loading Screen
  // --------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          backgroundColor: '#1F130E',
          color: '#FAF6EE',
        }}
      >
        <ChekupCrossLogo size={44} />
        <Loader2 size={36} className="animate-spin" style={{ color: '#DFAB62' }} />
        <p style={{ color: '#F0E5D3', fontSize: '0.95rem', fontWeight: 600 }}>
          Connecting to Chekup247 Clinical Consultation Room...
        </p>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // After Consultation Screen (Post-Encounter)
  // --------------------------------------------------------------------------
  if (isConsultationEnded) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100vw',
          backgroundColor: '#FAF6EE',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          color: '#2A170F',
        }}
      >
        <div
          style={{
            maxWidth: '640px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid rgba(223, 171, 98, 0.25)',
            boxShadow: '0 20px 50px rgba(42, 23, 15, 0.08)',
            padding: '36px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '2px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <CheckCircle2 size={34} />
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#2A170F',
              marginBottom: '8px',
              letterSpacing: '-0.02em',
            }}
          >
            Consultation Complete
          </h2>
          <p style={{ color: '#6B5E55', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '28px' }}>
            The clinical consultation with <strong>Dr. Sarah Van Der Merwe</strong> has been successfully completed and documented.
          </p>

          <div
            style={{
              backgroundColor: '#FAF6EE',
              borderRadius: '14px',
              border: '1px solid rgba(223, 171, 98, 0.2)',
              padding: '18px 22px',
              textAlign: 'left',
              marginBottom: '28px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '16px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#8C7768', fontWeight: 700 }}>
                Duration
              </span>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#2A170F', marginTop: '3px' }}>
                14 minutes
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#8C7768', fontWeight: 700 }}>
                Encounter Date
              </span>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#2A170F', marginTop: '3px' }}>
                18 September 2026
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#8C7768', fontWeight: 700 }}>
                Primary Diagnosis
              </span>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#2A170F', marginTop: '3px' }}>
                {diagnoses[0]?.name || 'Tension headache'} ({diagnoses[0]?.code || 'G44.2'})
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#8C7768', fontWeight: 700 }}>
                Prescription
              </span>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#2A170F', marginTop: '3px' }}>
                {medications.length} items issued
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => setShowSummaryModal(true)}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: '9999px',
                backgroundColor: '#E2B467',
                color: '#2A170F',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(226, 180, 103, 0.3)',
              }}
            >
              <FileText size={16} />
              <span>View Consultation Notes & Care Plan</span>
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link
                href={`/consultations/${bookingId}/prescribe`}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: '9999px',
                  backgroundColor: '#FFFFFF',
                  color: '#2A170F',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: '1.5px solid rgba(223, 171, 98, 0.35)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Pill size={15} color="#DFAB62" />
                <span>View Prescription</span>
              </Link>
              <Link
                href="/appointments"
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: '9999px',
                  backgroundColor: '#2A170F',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>Back to Appointments</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Main Active Consultation Workspace
  // --------------------------------------------------------------------------
  return (
    <div
      ref={workspaceContainerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#FAF6EE',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
        color: '#2A170F',
      }}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* ====================================================================
          1. APPLICATION HEADER (Edge-to-Edge Dark Chocolate)
          ==================================================================== */}
      <header
        style={{
          height: '64px',
          backgroundColor: '#1F130E',
          borderBottom: '1px solid rgba(223, 171, 98, 0.16)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
          zIndex: 30,
        }}
      >
        {/* LEFT: Chekup247 Logo + "Consultation Room" */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
            title="Chekup247"
          >
            <ChekupCrossLogo size={26} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                }}
              >
                Chekup
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  color: '#DFAB62',
                  letterSpacing: '-0.02em',
                }}
              >
                247
              </span>
            </div>
          </Link>

          <span
            style={{
              color: 'rgba(223, 171, 98, 0.25)',
              fontSize: '1.1rem',
              fontWeight: 300,
              userSelect: 'none',
            }}
          >
            |
          </span>

          <span
            style={{
              fontSize: '0.85rem',
              color: '#D5C7B8',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            Consultation Room
          </span>
        </div>

        {/* CENTER: ● LIVE Consultation in progress + 14:32 Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#22C55E',
                boxShadow: '0 0 8px #22C55E',
              }}
            />
            <span
              style={{
                fontSize: '0.725rem',
                fontWeight: 800,
                color: '#4ADE80',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              LIVE
            </span>
            <span
              style={{
                fontSize: '0.825rem',
                fontWeight: 500,
                color: '#FAF6EE',
                paddingLeft: '4px',
              }}
            >
              Consultation in progress
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#D5C7B8',
              fontSize: '0.85rem',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <Clock size={15} style={{ color: '#DFAB62' }} />
            <span>{formatElapsed(elapsedSeconds)}</span>

            {/* In-Call Extend Consultation Button */}
            <button
              type="button"
              onClick={() => {
                setShowExtendModal(true);
                setExtensionStatus('idle');
                setExtensionMessage(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(223, 171, 98, 0.18)',
                border: '1px solid rgba(223, 171, 98, 0.4)',
                color: '#DFAB62',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                marginLeft: '8px',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(223, 171, 98, 0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(223, 171, 98, 0.18)')}
              title="Offer Consultation Time Extension (+10, +20, +30 min)"
            >
              <Plus size={13} color="#DFAB62" />
              <span>Extend Call</span>
            </button>
          </div>
        </div>

        {/* RIGHT: Notifications, Doctor Identity & Destructive End Consultation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Notification Bell */}
          <div
            style={{
              position: 'relative',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '1px solid rgba(223, 171, 98, 0.2)',
            }}
            title="Notifications"
          >
            <Bell size={16} color="#FAF6EE" />
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '7px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#EF4444',
              }}
            />
          </div>

          {/* Authenticated Doctor Profile Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '3px 12px 3px 4px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(223, 171, 98, 0.2)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-gold-pale, #F0E5D3)',
                color: 'var(--color-chocolate-base, #2A170F)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 800,
                border: '1.5px solid #DFAB62',
              }}
            >
              {doctor?.fullName
                ? doctor.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()
                : 'DR'}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#FFFFFF' }}>
                {doctor?.fullName ? `Dr. ${doctor.fullName}` : 'Dr. ChekUp247 Practitioner'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#DFAB62', fontWeight: 500 }}>
                {profile?.specialty || 'General Practitioner'}
              </div>
            </div>
          </div>

          {/* Destructive End Consultation Button */}
          <button
            onClick={() => setShowEndModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 16px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(220, 38, 38, 0.12)',
              border: '1.5px solid rgba(239, 68, 68, 0.45)',
              color: '#F87171',
              fontWeight: 700,
              fontSize: '0.825rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.25)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.12)';
              e.currentTarget.style.color = '#F87171';
            }}
          >
            <PhoneOff size={14} />
            <span>End Consultation</span>
          </button>
        </div>
      </header>

      {/* ====================================================================
          2. MAIN CLINICAL CONSULTATION BODY (3-PART DESKTOP LAYOUT)
          ==================================================================== */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          height: 'calc(100vh - 64px)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* ------------------------------------------------------------------
            LEFT NAVIGATION SIDEBAR (Collapsible, Matches Visual Reference)
            ------------------------------------------------------------------ */}
        <aside
          className="consultation-desktop-sidebar"
          style={{
            width: sidebarCollapsed ? '64px' : '220px',
            transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            backgroundColor: '#FAF6EE',
            borderRight: '1px solid rgba(223, 171, 98, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: sidebarCollapsed ? '16px 8px' : '16px 14px',
            flexShrink: 0,
            zIndex: 10,
            overflowY: 'auto',
          }}
        >
          {/* Top Menu Items */}
          <div>
            <div style={{ display: 'flex', justifyContent: sidebarCollapsed ? 'center' : 'flex-end', marginBottom: '12px' }}>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#8C7768',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Dashboard */}
              <Link
                href="/"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  color: '#6B5E55',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                }}
                title="Dashboard"
              >
                <Activity size={18} />
                {!sidebarCollapsed && <span>Dashboard</span>}
              </Link>

              {/* Appointments */}
              <Link
                href="/appointments"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  color: '#6B5E55',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                }}
                title="Appointments"
              >
                <Calendar size={18} />
                {!sidebarCollapsed && <span>Appointments</span>}
              </Link>

              {/* Calendar & Availability */}
              <Link
                href="/calendar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  color: '#6B5E55',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                }}
                title="Calendar & Slots"
              >
                <Clock size={18} />
                {!sidebarCollapsed && <span>Calendar & Slots</span>}
              </Link>

              {/* Section: CLINICAL PRACTICE */}
              {!sidebarCollapsed ? (
                <div
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: '#8C7768',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginTop: '16px',
                    marginBottom: '4px',
                    paddingLeft: '12px',
                  }}
                >
                  Clinical Practice
                </div>
              ) : (
                <div style={{ height: '1px', backgroundColor: 'rgba(223, 171, 98, 0.2)', margin: '12px 0' }} />
              )}

              <Link
                href="/prescriptions"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  color: '#6B5E55',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                }}
                title="Prescriptions"
              >
                <Pill size={18} />
                {!sidebarCollapsed && <span>E-Prescriptions</span>}
              </Link>

              <Link
                href="/earnings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  color: '#6B5E55',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                }}
                title="Earnings & Payouts"
              >
                <FileText size={18} />
                {!sidebarCollapsed && <span>Earnings & Payouts</span>}
              </Link>

              {/* Section: ACCOUNT */}
              {!sidebarCollapsed ? (
                <div
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: '#8C7768',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginTop: '16px',
                    marginBottom: '4px',
                    paddingLeft: '12px',
                  }}
                >
                  Account
                </div>
              ) : (
                <div style={{ height: '1px', backgroundColor: 'rgba(223, 171, 98, 0.2)', margin: '12px 0' }} />
              )}

              <Link
                href="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  color: '#6B5E55',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                }}
                title="Profile & Settings"
              >
                <Settings size={18} />
                {!sidebarCollapsed && <span>Profile & Settings</span>}
              </Link>

              <Link
                href="/appointments"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  color: '#6B5E55',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                }}
                title="Notifications"
              >
                <Bell size={18} />
                {!sidebarCollapsed && <span>Notifications</span>}
              </Link>
            </nav>
          </div>

          {/* Bottom Support Card */}
          {!sidebarCollapsed && (
            <div
              style={{
                backgroundColor: 'rgba(223, 171, 98, 0.15)',
                borderRadius: '14px',
                padding: '14px',
                marginTop: '16px',
                border: '1px solid rgba(223, 171, 98, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <HelpCircle size={18} color="#B88647" />
                <span style={{ fontWeight: 800, fontSize: '0.825rem', color: '#2A170F' }}>Need help?</span>
              </div>
              <p style={{ fontSize: '0.725rem', color: '#6B5E55', margin: '0 0 10px', lineHeight: 1.3 }}>
                Our support team is here for you 24/7.
              </p>
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid rgba(223, 171, 98, 0.4)',
                  borderRadius: '9999px',
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#2A170F',
                  cursor: 'pointer',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                <span>Contact Support</span>
                <ArrowRight size={12} />
              </button>
            </div>
          )}
        </aside>

        {/* ------------------------------------------------------------------
            CENTER / MAIN WORKSPACE: VIDEO HUD + CONSULTATION SUMMARY (65–70%)
            ------------------------------------------------------------------ */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '20px',
            backgroundColor: '#FAF6EE',
            gap: '18px',
            minWidth: 0,
          }}
        >
          {/* Tablet "Patient Details" Drawer Button */}
          <div className="tablet-toggle-bar" style={{ display: 'none', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setTabletDrawerOpen(!tabletDrawerOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '9999px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid rgba(223, 171, 98, 0.4)',
                color: '#2A170F',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <FileText size={15} color="#DFAB62" />
              <span>{tabletDrawerOpen ? 'Hide Patient Details' : 'Patient Details & Notes'}</span>
            </button>
          </div>

          {/* ================================================================
              VIDEO HUD CONTAINER
              ================================================================ */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: '18px',
              overflow: 'hidden',
              backgroundColor: '#150B07',
              border: '1px solid rgba(223, 171, 98, 0.25)',
              boxShadow: '0 12px 36px rgba(30, 16, 10, 0.22)',
              minHeight: '440px',
              maxHeight: '560px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Real Doctor Video Feed / Fallback Frame */}
            {/* Fallback Frame when remote video track is pending */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: isPatientConnected && remoteVideoRef.current?.srcObject ? 'none' : 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                backgroundColor: '#1E120B',
              }}
            >
              <div
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(223, 171, 98, 0.15)',
                  border: '2px solid var(--color-gold-base, #DFAB62)',
                  color: '#DFAB62',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {consultation?.booking?.patient?.fullName
                  ? consultation.booking.patient.fullName
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()
                  : 'PT'}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FAF6EE' }}>
                  {consultation?.booking?.patient?.fullName || 'Patient'}
                </div>
                <div style={{ fontSize: '0.825rem', color: '#DFAB62', marginTop: '4px' }}>
                  {isPatientConnected ? 'Connected • Live in Consultation' : 'Waiting for patient to connect to room...'}
                </div>
              </div>
            </div>

            {/* Remote Video Stream if Connected via Daily.co */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: isPatientConnected && remoteVideoRef.current?.srcObject ? 'block' : 'none',
              }}
            />

            {/* Camera Off Placeholder */}
            {isVideoMuted && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  color: '#FAF6EE',
                }}
              >
                <div
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(223, 171, 98, 0.15)',
                    border: '1.5px solid #DFAB62',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <VideoOff size={32} color="#DFAB62" />
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#F0E5D3' }}>
                  Camera is turned off
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------
                TOP-LEFT: Connection Status Badges
                -------------------------------------------------------------- */}
            <div
              style={{
                position: 'absolute',
                top: '18px',
                left: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                zIndex: 20,
              }}
            >
              {/* Excellent connection */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(20, 12, 8, 0.75)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(223, 171, 98, 0.25)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#FAF6EE',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#22C55E',
                    boxShadow: '0 0 6px #22C55E',
                  }}
                />
                <span>Excellent connection</span>
              </div>

              {/* Secure connection */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(20, 12, 8, 0.75)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(223, 171, 98, 0.25)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#FAF6EE',
                }}
              >
                <Lock size={12} color="#DFAB62" />
                <span>Secure connection</span>
              </div>
            </div>

            {/* --------------------------------------------------------------
                BOTTOM-RIGHT: Floating Patient Self-View (PiP)
                -------------------------------------------------------------- */}
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                width: '136px',
                height: '92px',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#2A170F',
                border: '1.5px solid rgba(223, 171, 98, 0.45)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
                zIndex: 20,
              }}
            >
              {/* Doctor Local Self-View PiP */}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                  display: isVideoMuted ? 'none' : 'block',
                }}
              />

              {isVideoMuted && (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1F130E',
                  }}
                >
                  <User size={26} color="#DFAB62" />
                </div>
              )}

              {/* Doctor Badge Overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  right: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(20, 12, 8, 0.78)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1 }}>
                    {doctor?.fullName ? `Dr. ${doctor.fullName}` : 'You (Doctor)'}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#DFAB62', fontWeight: 500 }}>
                    Practitioner
                  </div>
                </div>
                <Video size={12} color="#4ADE80" />
              </div>
            </div>

            {/* --------------------------------------------------------------
                BOTTOM-CENTER: Floating Video Control Bar
                -------------------------------------------------------------- */}
            <div
              style={{
                position: 'absolute',
                bottom: '18px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 16px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(26, 15, 10, 0.88)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(223, 171, 98, 0.3)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
                zIndex: 25,
              }}
            >
              {/* Mic Toggle */}
              <button
                onClick={toggleMic}
                title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: isAudioMuted ? '1.5px solid #EF4444' : '1px solid rgba(223, 171, 98, 0.25)',
                  backgroundColor: isAudioMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  color: isAudioMuted ? '#EF4444' : '#FAF6EE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                {isAudioMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Camera Toggle */}
              <button
                onClick={toggleVideo}
                title={isVideoMuted ? 'Turn On Camera' : 'Turn Off Camera'}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: isVideoMuted ? '1.5px solid #EF4444' : '1px solid rgba(223, 171, 98, 0.25)',
                  backgroundColor: isVideoMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  color: isVideoMuted ? '#EF4444' : '#FAF6EE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                {isVideoMuted ? <VideoOff size={18} /> : <Video size={18} />}
              </button>

              {/* Speaker Toggle */}
              <button
                onClick={toggleSpeaker}
                title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: isSpeakerMuted ? '1.5px solid #EF4444' : '1px solid rgba(223, 171, 98, 0.25)',
                  backgroundColor: isSpeakerMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  color: isSpeakerMuted ? '#EF4444' : '#FAF6EE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                {isSpeakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              {/* Share Screen */}
              <button
                onClick={toggleScreenShare}
                title={isSharingScreen ? 'Stop Screen Sharing' : 'Share Screen'}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: isSharingScreen ? '1.5px solid #DFAB62' : '1px solid rgba(223, 171, 98, 0.25)',
                  backgroundColor: isSharingScreen ? 'rgba(223, 171, 98, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  color: isSharingScreen ? '#DFAB62' : '#FAF6EE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                <Share2 size={18} />
              </button>

              {/* Offer Time Extension Button in Floating Bar */}
              <button
                onClick={() => {
                  setShowExtendModal(true);
                  setExtensionStatus('idle');
                  setExtensionMessage(null);
                }}
                title="Offer Consultation Time Extension"
                style={{
                  height: '42px',
                  padding: '0 14px',
                  borderRadius: '9999px',
                  border: '1.5px solid rgba(223, 171, 98, 0.45)',
                  backgroundColor: 'rgba(223, 171, 98, 0.2)',
                  color: '#DFAB62',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(223, 171, 98, 0.35)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(223, 171, 98, 0.2)')}
              >
                <TimerReset size={16} color="#DFAB62" />
                <span>+ Extend</span>
              </button>

              {/* More Options (...) */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  title="More Call Settings"
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    border: '1px solid rgba(223, 171, 98, 0.25)',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#FAF6EE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <MoreHorizontal size={18} />
                </button>

                {showMoreMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '52px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '200px',
                      backgroundColor: '#2A170F',
                      border: '1px solid rgba(223, 171, 98, 0.3)',
                      borderRadius: '14px',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
                      padding: '6px',
                      zIndex: 35,
                    }}
                  >
                    <button
                      onClick={() => {
                        toggleFullscreen();
                        setShowMoreMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'none',
                        border: 'none',
                        color: '#FAF6EE',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderRadius: '8px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(223, 171, 98, 0.15)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {isFullscreen ? <Minimize2 size={14} color="#DFAB62" /> : <Maximize2 size={14} color="#DFAB62" />}
                      <span>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* End Call Destructive Button */}
              <button
                onClick={() => setShowEndModal(true)}
                title="End Consultation Call"
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
                  transition: 'all 0.2s ease',
                  marginLeft: '4px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#B91C1C')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#DC2626')}
              >
                <PhoneOff size={20} />
              </button>
            </div>
          </div>

          {/* ================================================================
              CONSULTATION SUMMARY CARD (Directly Under Video)
              ================================================================ */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid rgba(223, 171, 98, 0.25)',
              padding: '18px 22px',
              boxShadow: '0 4px 16px rgba(42, 23, 15, 0.04)',
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#FAF6EE',
                    border: '1px solid rgba(223, 171, 98, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={18} color="#B88647" />
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#2A170F',
                      margin: 0,
                    }}
                  >
                    Consultation Summary
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6B5E55' }}>
                    Review and finalise your consultation before ending.
                  </p>
                </div>
              </div>

              {/* Preview Summary Button */}
              <button
                onClick={() => setShowSummaryModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '9999px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #DFAB62',
                  color: '#2A170F',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF6EE')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <Eye size={14} color="#B88647" />
                <span>Preview Summary</span>
              </button>
            </div>

            {/* 6 Structured Quick Tiles (2 columns x 3 rows) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '10px',
              }}
            >
              {/* Tile 1: Reason for consultation */}
              <div
                onClick={() => setActiveClinicalTab('notes')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#FAF6EE',
                  border: '1px solid rgba(223, 171, 98, 0.15)',
                  cursor: 'pointer',
                  transition: 'background-color 0.18s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileText size={14} color="#B88647" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2A170F' }}>
                      Reason for consultation
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#6B5E55' }}>
                      Persistent headaches and fatigue
                    </div>
                  </div>
                </div>
                <ChevronRight size={14} color="#8C7768" />
              </div>

              {/* Tile 2: Prescription */}
              <div
                onClick={() => setActiveClinicalTab('prescription')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#FAF6EE',
                  border: '1px solid rgba(223, 171, 98, 0.15)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Pill size={14} color="#B88647" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2A170F' }}>
                      Prescription
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#6B5E55' }}>
                      {medications.length > 0 ? `${medications.length} active medications` : 'Not yet added'}
                    </div>
                  </div>
                </div>
                <ChevronRight size={14} color="#8C7768" />
              </div>

              {/* Tile 3: Diagnosis */}
              <div
                onClick={() => setActiveClinicalTab('diagnosis')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#FAF6EE',
                  border: '1px solid rgba(223, 171, 98, 0.15)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Stethoscope size={14} color="#B88647" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2A170F' }}>
                      Diagnosis
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#6B5E55' }}>
                      {diagnoses.length > 0 ? `${diagnoses[0].name} (${diagnoses[0].code})` : 'Not yet added'}
                    </div>
                  </div>
                </div>
                <ChevronRight size={14} color="#8C7768" />
              </div>

              {/* Tile 4: Follow-up */}
              <div
                onClick={() => setActiveClinicalTab('followup')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#FAF6EE',
                  border: '1px solid rgba(223, 171, 98, 0.15)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Calendar size={14} color="#B88647" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2A170F' }}>
                      Follow-up
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#6B5E55' }}>
                      {followupRequired ? `Routine review (${followupDate})` : 'No follow-up required'}
                    </div>
                  </div>
                </div>
                <ChevronRight size={14} color="#8C7768" />
              </div>

              {/* Tile 5: Treatment */}
              <div
                onClick={() => setActiveClinicalTab('notes')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#FAF6EE',
                  border: '1px solid rgba(223, 171, 98, 0.15)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Activity size={14} color="#B88647" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2A170F' }}>
                      Treatment
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#6B5E55' }}>
                      Analgesics & Ergonomic guidance
                    </div>
                  </div>
                </div>
                <ChevronRight size={14} color="#8C7768" />
              </div>

              {/* Tile 6: Patient instructions */}
              <div
                onClick={() => setActiveClinicalTab('notes')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#FAF6EE',
                  border: '1px solid rgba(223, 171, 98, 0.15)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Lock size={14} color="#B88647" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2A170F' }}>
                      Patient instructions
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#6B5E55' }}>
                      Hydration & Screen breaks documented
                    </div>
                  </div>
                </div>
                <ChevronRight size={14} color="#8C7768" />
              </div>
            </div>
          </div>
        </main>

        {/* ------------------------------------------------------------------
            RIGHT CLINICAL PANEL (30–35% Width, Independently Scrollable)
            ------------------------------------------------------------------ */}
        <aside
          className={`clinical-panel-drawer ${tabletDrawerOpen ? 'drawer-open' : ''}`}
          style={{
            width: '410px',
            backgroundColor: '#FFFFFF',
            borderLeft: '1px solid rgba(223, 171, 98, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            flexShrink: 0,
            overflowY: 'auto',
            zIndex: 15,
            padding: '20px',
            gap: '18px',
          }}
        >
          {/* Top Section: Patient Identity & Summary */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8C7768', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  PATIENT RECORD
                </span>
                <h2
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#2A170F',
                    margin: '2px 0 4px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {consultation?.patient?.fullName || consultation?.booking?.patient?.fullName || 'Patient'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#6B5E55' }}>
                  {consultation?.patient?.phone ? <span>{consultation.patient.phone}</span> : null}
                  {consultation?.patient?.email ? (
                    <>
                      <span>•</span>
                      <span>{consultation.patient.email}</span>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Patient Summary Icons & Text */}
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8C7768', textTransform: 'uppercase' }}>
                  Clinical Profile
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#6B5E55' }}>
                    <Shield size={12} color="#10B981" />
                    <span>
                      {consultation?.patientMedicalProfile?.allergies
                        ? `Allergies: ${consultation.patientMedicalProfile.allergies}`
                        : 'No known allergies'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#2A170F', fontWeight: 700 }}>
                    <Heart size={12} color="#DC2626" />
                    <span>Blood Group: {consultation?.patientMedicalProfile?.blood_group || 'Not recorded'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#8E5A1C', fontWeight: 700 }}>
                    <Activity size={12} color="#B88647" />
                    <span>Genotype: {consultation?.patientMedicalProfile?.genotype || 'Not recorded'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Consultation */}
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: '#FAF6EE',
                border: '1px solid rgba(223, 171, 98, 0.2)',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#B88647', textTransform: 'uppercase' }}>
                Today's Consultation
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2A170F', marginTop: '2px' }}>
                General Medicine
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6B5E55', marginTop: '3px' }}>
                <strong>Reason for visit:</strong> Persistent headaches and fatigue
              </div>
            </div>
          </div>

          {/* Vitals Section (4 Compact Clinical Tiles) */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase', marginBottom: '8px' }}>
              Vitals
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
              }}
            >
              {/* BP */}
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '10px',
                  backgroundColor: '#FAF6EE',
                  border: '1px solid rgba(223, 171, 98, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Heart size={16} color="#DC2626" />
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#8C7768', fontWeight: 600 }}>Blood Pressure</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2A170F' }}>118 / 76 mmHg</div>
                </div>
              </div>

              {/* Heart Rate */}
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '10px',
                  backgroundColor: '#FAF6EE',
                  border: '1px solid rgba(223, 171, 98, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Activity size={16} color="#10B981" />
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#8C7768', fontWeight: 600 }}>Heart Rate</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2A170F' }}>72 bpm</div>
                </div>
              </div>

              {/* Temperature */}
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '10px',
                  backgroundColor: '#FAF6EE',
                  border: '1px solid rgba(223, 171, 98, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Thermometer size={16} color="#F59E0B" />
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#8C7768', fontWeight: 600 }}>Temperature</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2A170F' }}>36.7°C</div>
                </div>
              </div>

              {/* Weight */}
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '10px',
                  backgroundColor: '#FAF6EE',
                  border: '1px solid rgba(223, 171, 98, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Weight size={16} color="#B88647" />
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#8C7768', fontWeight: 600 }}>Weight</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2A170F' }}>68 kg</div>
                </div>
              </div>
            </div>
          </div>

          {/* Patient Uploaded Test Reports & Documents Section */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: '#FAF6EE',
              border: '1px solid rgba(223, 171, 98, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={15} color="#B88647" />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase' }}>
                  Patient Test Reports & Records
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#8C7768', fontWeight: 600 }}>
                {consultation?.patientDocuments?.length || 0} file{(consultation?.patientDocuments?.length || 0) === 1 ? '' : 's'}
              </span>
            </div>

            {consultation?.patientDocuments && consultation.patientDocuments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                {consultation.patientDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid rgba(223, 171, 98, 0.2)',
                      gap: '8px',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: '#F3EAD8',
                            color: '#8C7768',
                            textTransform: 'uppercase',
                          }}
                        >
                          {doc.category.replace('_', ' ')}
                        </span>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#2A170F',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={doc.title || doc.original_filename}
                        >
                          {doc.title || doc.original_filename}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#8C7768', marginTop: '2px' }}>
                        {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB • ` : ''}
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                    {doc.downloadUrl ? (
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#E2B467',
                          color: '#2A170F',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          flexShrink: 0,
                        }}
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.72rem', color: '#8C7768', fontStyle: 'italic', padding: '4px 0' }}>
                No external lab reports or test files uploaded by patient.
              </div>
            )}
          </div>

          {/* Clinical Notes & Tabs Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#2A170F',
                  margin: 0,
                }}
              >
                Clinical Notes
              </h3>

              {/* Autosave Status Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: saveStatus === 'saving' ? '#DFAB62' : '#10B981',
                  }}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <Loader2 size={11} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={12} />
                      <span>Saved just now</span>
                    </>
                  )}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#8C7768' }}>Last saved {lastSavedTime}</span>
              </div>
            </div>

            {/* Segmented Tab Bar */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#FAF6EE',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid rgba(223, 171, 98, 0.2)',
              }}
            >
              {[
                { id: 'notes', label: 'Notes' },
                { id: 'diagnosis', label: 'Diagnosis' },
                { id: 'prescription', label: 'Prescription' },
                { id: 'followup', label: 'Follow-up' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveClinicalTab(tab.id as any)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    fontSize: '0.78rem',
                    fontWeight: activeClinicalTab === tab.id ? 800 : 600,
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: activeClinicalTab === tab.id ? '#EADECC' : 'transparent',
                    color: activeClinicalTab === tab.id ? '#2A170F' : '#6B5E55',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ================================================================
              TAB CONTENT 1: NOTES (Chief Complaint, HPI, Assessment, Plan)
              ================================================================ */}
          {activeClinicalTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Chief Complaint */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8C7768', textTransform: 'uppercase' }}>
                    Chief Complaint
                  </label>
                  <span style={{ fontSize: '0.68rem', color: '#8C7768' }}>{chiefComplaint.length}/500</span>
                </div>
                <textarea
                  value={chiefComplaint}
                  maxLength={500}
                  onChange={(e) => {
                    setChiefComplaint(e.target.value);
                    triggerAutoSave();
                  }}
                  placeholder="Document the patient's primary concern..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(223, 171, 98, 0.25)',
                    backgroundColor: '#FAF6EE',
                    fontSize: '0.8rem',
                    fontFamily: 'inherit',
                    color: '#2A170F',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* History of Present Illness */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8C7768', textTransform: 'uppercase' }}>
                    History of Present Illness
                  </label>
                  <span style={{ fontSize: '0.68rem', color: '#8C7768' }}>{hpi.length}/1000</span>
                </div>
                <textarea
                  value={hpi}
                  maxLength={1000}
                  onChange={(e) => {
                    setHpi(e.target.value);
                    triggerAutoSave();
                  }}
                  placeholder="Record relevant history, symptoms and duration..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(223, 171, 98, 0.25)',
                    backgroundColor: '#FAF6EE',
                    fontSize: '0.8rem',
                    fontFamily: 'inherit',
                    color: '#2A170F',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Assessment */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8C7768', textTransform: 'uppercase' }}>
                    Assessment
                  </label>
                  <span style={{ fontSize: '0.68rem', color: '#8C7768' }}>{assessment.length}/1000</span>
                </div>
                <textarea
                  value={assessment}
                  maxLength={1000}
                  onChange={(e) => {
                    setAssessment(e.target.value);
                    triggerAutoSave();
                  }}
                  placeholder="Clinical assessment..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(223, 171, 98, 0.25)',
                    backgroundColor: '#FAF6EE',
                    fontSize: '0.8rem',
                    fontFamily: 'inherit',
                    color: '#2A170F',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Plan */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8C7768', textTransform: 'uppercase' }}>
                    Plan
                  </label>
                  <span style={{ fontSize: '0.68rem', color: '#8C7768' }}>{plan.length}/1000</span>
                </div>
                <textarea
                  value={plan}
                  maxLength={1000}
                  onChange={(e) => {
                    setPlan(e.target.value);
                    triggerAutoSave();
                  }}
                  placeholder="Treatment plan and recommendations..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(223, 171, 98, 0.25)',
                    backgroundColor: '#FAF6EE',
                    fontSize: '0.8rem',
                    fontFamily: 'inherit',
                    color: '#2A170F',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Privacy Indicator Toggle Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  backgroundColor: '#FAF6EE',
                  border: '1px solid rgba(223, 171, 98, 0.2)',
                  fontSize: '0.72rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#B88647',
                    fontWeight: 700,
                  }}
                >
                  <Lock size={12} />
                  <span>Clinical notes — visible to care team</span>
                </div>
              </div>

              {/* Patient Instructions & Health Note Section */}
              <div style={{ borderTop: '1px solid rgba(223, 171, 98, 0.2)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase' }}>
                    Patient Instructions & Health Note
                  </label>
                  <span style={{ fontSize: '0.68rem', color: '#8C7768' }}>{patientInstructions.length}/1000</span>
                </div>
                <p style={{ fontSize: '0.68rem', color: '#8C7768', margin: '0 0 6px 0', lineHeight: 1.35 }}>
                  This guidance is shared directly with the patient under their <strong>Health Notes</strong> section. Prescriptions are kept distinct and managed in the Prescriptions tab.
                </p>
                <textarea
                  value={patientInstructions}
                  maxLength={1000}
                  onChange={(e) => {
                    setPatientInstructions(e.target.value);
                    triggerAutoSave();
                  }}
                  placeholder="Enter lifestyle guidance, dietary recommendations, warning signs, or next steps for the patient..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(223, 171, 98, 0.25)',
                    backgroundColor: '#FAF6EE',
                    fontSize: '0.8rem',
                    fontFamily: 'inherit',
                    color: '#2A170F',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    triggerAutoSave();
                  }}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '8px 14px',
                    borderRadius: '9999px',
                    backgroundColor: '#E2B467',
                    color: '#2A170F',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Save size={14} />
                  <span>Save Health Note</span>
                </button>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB CONTENT 2: DIAGNOSIS (ICD-10 Search & List)
              ================================================================ */}
          {activeClinicalTab === 'diagnosis' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8C7768', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Primary Diagnosis
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={diagnosisQuery}
                    onChange={(e) => {
                      setDiagnosisQuery(e.target.value);
                      setShowIcdSuggestions(true);
                    }}
                    onFocus={() => setShowIcdSuggestions(true)}
                    placeholder="Search diagnosis or ICD-10..."
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      borderRadius: '8px',
                      border: '1px solid rgba(223, 171, 98, 0.3)',
                      backgroundColor: '#FAF6EE',
                      fontSize: '0.825rem',
                      color: '#2A170F',
                      outline: 'none',
                    }}
                  />
                  <Search size={14} color="#8C7768" style={{ position: 'absolute', left: '10px', top: '10px' }} />

                  {/* Suggestions Popover */}
                  {showIcdSuggestions && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid rgba(223, 171, 98, 0.3)',
                        borderRadius: '10px',
                        boxShadow: '0 8px 24px rgba(42, 23, 15, 0.12)',
                        zIndex: 40,
                        maxHeight: '180px',
                        overflowY: 'auto',
                        padding: '4px',
                      }}
                    >
                      {COMMON_ICD10.filter(
                        (i) =>
                          !diagnosisQuery ||
                          i.name.toLowerCase().includes(diagnosisQuery.toLowerCase()) ||
                          i.code.toLowerCase().includes(diagnosisQuery.toLowerCase()),
                      ).map((item) => (
                        <div
                          key={item.code}
                          onClick={() => handleAddDiagnosis(item.code, item.name)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF6EE')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <span style={{ fontWeight: 600, color: '#2A170F' }}>{item.name}</span>
                          <span style={{ fontSize: '0.72rem', color: '#B88647', fontWeight: 700 }}>{item.code}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Added Diagnoses List */}
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8C7768', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  Confirmed Diagnoses
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {diagnoses.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        backgroundColor: '#FAF6EE',
                        border: '1px solid rgba(223, 171, 98, 0.2)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#2A170F' }}>
                          {d.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#B88647', fontWeight: 600 }}>
                          ICD-10: {d.code} {d.isPrimary && '• Primary'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveDiagnosis(d.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#8C7768',
                          padding: '4px',
                        }}
                        title="Remove diagnosis"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB CONTENT 3: PRESCRIPTION (Clinical Meds & e-Script)
              ================================================================ */}
          {activeClinicalTab === 'prescription' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase' }}>
                  Active Medications ({medications.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingMedication(!isAddingMedication)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    backgroundColor: '#FAF6EE',
                    border: '1px solid rgba(223, 171, 98, 0.4)',
                    color: '#2A170F',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={12} color="#DFAB62" />
                  <span>Add Medication</span>
                </button>
              </div>

              {/* Inline Add Medication Form */}
              {isAddingMedication && (
                <div
                  style={{
                    backgroundColor: '#FAF6EE',
                    borderRadius: '12px',
                    padding: '12px',
                    border: '1px solid rgba(223, 171, 98, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Medication Name (e.g. Paracetamol)"
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(223, 171, 98, 0.3)',
                      fontSize: '0.8rem',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Dosage (500 mg)"
                      value={newMedDosage}
                      onChange={(e) => setNewMedDosage(e.target.value)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(223, 171, 98, 0.3)',
                        fontSize: '0.75rem',
                        outline: 'none',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Frequency (Q8H)"
                      value={newMedFrequency}
                      onChange={(e) => setNewMedFrequency(e.target.value)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(223, 171, 98, 0.3)',
                        fontSize: '0.75rem',
                        outline: 'none',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Duration (3 days)"
                      value={newMedDuration}
                      onChange={(e) => setNewMedDuration(e.target.value)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(223, 171, 98, 0.3)',
                        fontSize: '0.75rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Instructions (e.g. Take with water after meals)"
                    value={newMedInstructions}
                    onChange={(e) => setNewMedInstructions(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(223, 171, 98, 0.3)',
                      fontSize: '0.75rem',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setIsAddingMedication(false)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '9999px',
                        border: 'none',
                        background: 'none',
                        color: '#6B5E55',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddMedication}
                      style={{
                        padding: '5px 14px',
                        borderRadius: '9999px',
                        backgroundColor: '#DFAB62',
                        color: '#2A170F',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Save Medication
                    </button>
                  </div>
                </div>
              )}

              {/* Medication Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {medications.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: '#FAF6EE',
                      border: '1px solid rgba(223, 171, 98, 0.2)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2A170F' }}>
                        {m.name} — {m.dosage}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#B88647', fontWeight: 600, marginTop: '2px' }}>
                        {m.frequency} • {m.duration}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#6B5E55', marginTop: '3px' }}>
                        {m.instructions}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMedication(m.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C7768', padding: '2px' }}
                      title="Remove medication"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Bottom Prescription Actions */}
              <div style={{ borderTop: '1px solid rgba(223, 171, 98, 0.2)', paddingTop: '12px', display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(true)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '9999px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid rgba(223, 171, 98, 0.4)',
                    color: '#2A170F',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Review Prescription
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerAutoSave();
                    setActiveClinicalTab('notes');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '9999px',
                    backgroundColor: '#E2B467',
                    color: '#2A170F',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Create Prescription
                </button>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB CONTENT 4: FOLLOW-UP & CARE PLAN
              ================================================================ */}
          {activeClinicalTab === 'followup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8C7768', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  Follow-up required?
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setFollowupRequired(true)}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      borderRadius: '8px',
                      border: followupRequired ? '1.5px solid #DFAB62' : '1px solid rgba(223, 171, 98, 0.2)',
                      backgroundColor: followupRequired ? '#FAF6EE' : '#FFFFFF',
                      fontWeight: followupRequired ? 800 : 600,
                      color: '#2A170F',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowupRequired(false)}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      borderRadius: '8px',
                      border: !followupRequired ? '1.5px solid #DFAB62' : '1px solid rgba(223, 171, 98, 0.2)',
                      backgroundColor: !followupRequired ? '#FAF6EE' : '#FFFFFF',
                      fontWeight: !followupRequired ? 800 : 600,
                      color: '#2A170F',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    No
                  </button>
                </div>
              </div>

              {followupRequired && (
                <>
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8C7768', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Recommended Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={followupDate}
                      onChange={(e) => {
                        setFollowupDate(e.target.value);
                        triggerAutoSave();
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(223, 171, 98, 0.25)',
                        backgroundColor: '#FAF6EE',
                        fontSize: '0.8rem',
                        color: '#2A170F',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8C7768', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                      Follow-up Type
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                      {[
                        { id: 'routine', label: 'Routine review' },
                        { id: 'specialist', label: 'Specialist referral' },
                        { id: 'medication', label: 'Medication review' },
                        { id: 'other', label: 'Other' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setFollowupType(t.id as any)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: followupType === t.id ? '1.5px solid #DFAB62' : '1px solid rgba(223, 171, 98, 0.2)',
                            backgroundColor: followupType === t.id ? '#FAF6EE' : '#FFFFFF',
                            fontSize: '0.725rem',
                            fontWeight: followupType === t.id ? 700 : 500,
                            color: '#2A170F',
                            cursor: 'pointer',
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8C7768', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Doctor Instructions
                    </label>
                    <textarea
                      value={followupInstructions}
                      onChange={(e) => {
                        setFollowupInstructions(e.target.value);
                        triggerAutoSave();
                      }}
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(223, 171, 98, 0.25)',
                        backgroundColor: '#FAF6EE',
                        fontSize: '0.8rem',
                        color: '#2A170F',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8C7768', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Specialist Referral (Optional)
                    </label>
                    <input
                      type="text"
                      value={referralNote}
                      onChange={(e) => {
                        setReferralNote(e.target.value);
                        triggerAutoSave();
                      }}
                      placeholder="e.g. Dr. M. Patel - Neurologist"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(223, 171, 98, 0.25)',
                        backgroundColor: '#FAF6EE',
                        fontSize: '0.8rem',
                        color: '#2A170F',
                        outline: 'none',
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ====================================================================
          3. END CONSULTATION VERIFICATION MODAL
          ==================================================================== */}
      {showEndModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(30, 16, 10, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid rgba(223, 171, 98, 0.3)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              color: '#2A170F',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(220, 38, 38, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                }}
              >
                <PhoneOff size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#2A170F' }}>
                  End this consultation?
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6B5E55' }}>
                  Before ending, make sure your clinical notes, diagnosis and prescription are complete.
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div
              style={{
                backgroundColor: '#FAF6EE',
                borderRadius: '12px',
                padding: '12px 16px',
                margin: '16px 0 24px',
                border: '1px solid rgba(223, 171, 98, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={checklist.notes}
                  onChange={(e) => setChecklist({ ...checklist, notes: e.target.checked })}
                  style={{ accentColor: '#DFAB62' }}
                />
                <span>Clinical notes documented (Assessment & Plan)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={checklist.diagnosis}
                  onChange={(e) => setChecklist({ ...checklist, diagnosis: e.target.checked })}
                  style={{ accentColor: '#DFAB62' }}
                />
                <span>Diagnosis confirmed ({diagnoses.length > 0 ? diagnoses[0].name : 'ICD-10 coded'})</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={checklist.prescription}
                  onChange={(e) => setChecklist({ ...checklist, prescription: e.target.checked })}
                  style={{ accentColor: '#DFAB62' }}
                />
                <span>Prescription reviewed ({medications.length} items)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={checklist.followup}
                  onChange={(e) => setChecklist({ ...checklist, followup: e.target.checked })}
                  style={{ accentColor: '#DFAB62' }}
                />
                <span>Follow-up & patient guidance saved</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '9999px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid rgba(223, 171, 98, 0.3)',
                  color: '#2A170F',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Continue Consultation
              </button>
              <button
                type="button"
                onClick={handleConfirmEndConsultation}
                style={{
                  padding: '9px 20px',
                  borderRadius: '9999px',
                  backgroundColor: '#DC2626',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
                }}
              >
                End Consultation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          4. PREVIEW CONSULTATION SUMMARY MODAL
          ==================================================================== */}
      {showSummaryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(30, 16, 10, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid rgba(223, 171, 98, 0.3)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              color: '#2A170F',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(223, 171, 98, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FAF6EE',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ChekupCrossLogo size={24} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#2A170F' }}>
                  Clinical Encounter Summary
                </h3>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B5E55' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(223, 171, 98, 0.15)' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#8C7768', textTransform: 'uppercase', fontWeight: 700 }}>Patient</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2A170F' }}>
                    {consultation?.booking?.patient?.fullName || 'Patient'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#8C7768', textTransform: 'uppercase', fontWeight: 700 }}>Doctor</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2A170F' }}>
                    {doctor?.fullName ? `Dr. ${doctor.fullName}` : 'Dr. ChekUp247 Practitioner'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#8C7768', textTransform: 'uppercase', fontWeight: 700 }}>Date</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#2A170F' }}>
                    {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Diagnoses */}
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.85rem', fontWeight: 800, color: '#2A170F' }}>Diagnoses</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {diagnoses.map((d) => (
                    <span
                      key={d.id}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        backgroundColor: '#FAF6EE',
                        border: '1px solid rgba(223, 171, 98, 0.3)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#2A170F',
                      }}
                    >
                      {d.name} ({d.code})
                    </span>
                  ))}
                </div>
              </div>

              {/* Assessment & Plan */}
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.85rem', fontWeight: 800, color: '#2A170F' }}>Clinical Assessment</h4>
                <p style={{ margin: 0, fontSize: '0.825rem', color: '#4A3528', lineHeight: 1.5, backgroundColor: '#FAF6EE', padding: '10px 12px', borderRadius: '8px' }}>
                  {assessment}
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.85rem', fontWeight: 800, color: '#2A170F' }}>Treatment Plan & Prescriptions</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {medications.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#FAF6EE',
                        fontSize: '0.8rem',
                        border: '1px solid rgba(223, 171, 98, 0.2)',
                      }}
                    >
                      <strong>{m.name} {m.dosage}</strong> — {m.frequency} for {m.duration}. <em>{m.instructions}</em>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patient Instructions */}
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.85rem', fontWeight: 800, color: '#2A170F' }}>Patient Instructions</h4>
                <p style={{ margin: 0, fontSize: '0.825rem', color: '#4A3528', lineHeight: 1.5, backgroundColor: '#FAF6EE', padding: '10px 12px', borderRadius: '8px' }}>
                  {patientInstructions}
                </p>
              </div>

              {/* Follow-up */}
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.85rem', fontWeight: 800, color: '#2A170F' }}>Follow-up Schedule</h4>
                <div style={{ fontSize: '0.825rem', color: '#4A3528' }}>
                  {followupRequired ? `Scheduled on ${followupDate} (${followupType}). ${followupInstructions}` : 'No follow-up required.'}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(223, 171, 98, 0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#FAF6EE',
              }}
            >
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '9999px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid rgba(223, 171, 98, 0.3)',
                  color: '#2A170F',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <FileDown size={14} />
                <span>Print / Save PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  backgroundColor: '#E2B467',
                  border: 'none',
                  color: '#2A170F',
                  fontWeight: 700,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          DOCTOR EXTEND CONSULTATION TIME MODAL (Req 2, Req 3, Req 4)
          ==================================================================== */}
      {showExtendModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: '#FAF6EE',
              borderRadius: '24px',
              border: '1.5px solid rgba(223,171,98,0.4)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(223, 171, 98, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(223, 171, 98, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TimerReset size={20} color="#B88647" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2A170F' }}>
                    Extend Consultation Time
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#6B5E55' }}>
                    Requires real-time patient consent during this active call
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowExtendModal(false);
                  setExtensionStatus('idle');
                  setExtensionMessage(null);
                }}
                disabled={extensionStatus === 'submitting'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B5E55' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Notice Banner if message exists */}
              {extensionMessage && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor:
                      extensionStatus === 'confirmed'
                        ? '#ecfdf5'
                        : extensionStatus === 'error' || extensionStatus === 'declined'
                        ? '#fef2f2'
                        : '#fffbeb',
                    border: `1.5px solid ${
                      extensionStatus === 'confirmed'
                        ? '#a7f3d0'
                        : extensionStatus === 'error' || extensionStatus === 'declined'
                        ? '#fecaca'
                        : '#fde68a'
                    }`,
                    color:
                      extensionStatus === 'confirmed'
                        ? '#065f46'
                        : extensionStatus === 'error' || extensionStatus === 'declined'
                        ? '#991b1b'
                        : '#92400e',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    lineHeight: 1.4,
                  }}
                >
                  {extensionMessage}
                </div>
              )}

              {/* Step 1: Duration Selector */}
              <div>
                <label className="portal-label" style={{ marginBottom: '8px' }}>
                  Select Additional Duration
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {([10, 20, 30] as const).map((mins) => {
                    const isSelected = extensionDuration === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setExtensionDuration(mins)}
                        disabled={extensionStatus === 'submitting' || extensionStatus === 'waiting_patient'}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '12px',
                          border: isSelected
                            ? '2px solid var(--color-gold-base, #DFAB62)'
                            : '1.5px solid rgba(223, 171, 98, 0.25)',
                          backgroundColor: isSelected ? 'var(--color-gold-pale, #F0E5D3)' : '#FFFFFF',
                          color: '#2A170F',
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        +{mins} mins
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Rate Type (Free vs Paid) */}
              <div>
                <label className="portal-label" style={{ marginBottom: '8px' }}>
                  Pricing & Settlement Rate
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setExtensionIsFree(false)}
                    disabled={extensionStatus === 'submitting' || extensionStatus === 'waiting_patient'}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: !extensionIsFree
                        ? '2px solid var(--color-gold-base, #DFAB62)'
                        : '1.5px solid rgba(223, 171, 98, 0.25)',
                      backgroundColor: !extensionIsFree ? 'var(--color-gold-pale, #F0E5D3)' : '#FFFFFF',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2A170F' }}>
                      Paid (My Rate)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B5E55', marginTop: '2px' }}>
                      Priced from your hourly rate; patient pays via secure link
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExtensionIsFree(true)}
                    disabled={extensionStatus === 'submitting' || extensionStatus === 'waiting_patient'}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: extensionIsFree
                        ? '2px solid #22c55e'
                        : '1.5px solid rgba(223, 171, 98, 0.25)',
                      backgroundColor: extensionIsFree ? '#ecfdf5' : '#FFFFFF',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: extensionIsFree ? '#15803d' : '#2A170F' }}>
                      Complimentary (Free)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B5E55', marginTop: '2px' }}>
                      No charge to patient, consent required
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 3: Clinical Reason */}
              <div>
                <label className="portal-label" style={{ marginBottom: '6px' }}>
                  Clinical Rationale (Optional)
                </label>
                <input
                  type="text"
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="e.g. In-depth treatment review and lifestyle counseling"
                  disabled={extensionStatus === 'submitting' || extensionStatus === 'waiting_patient'}
                  className="portal-input"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              {/* Step 4: HPCSA / Platform Policy Note */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(223, 171, 98, 0.1)',
                  fontSize: '0.75rem',
                  color: '#6B5E55',
                  lineHeight: 1.4,
                }}
              >
                Schedule collision check enforced: This extension will automatically fail if it overlaps with an upcoming patient booking or your personal blackout times. Patient consent is strictly restricted to active call duration.
              </div>
            </div>

            {/* Footer Actions */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(223, 171, 98, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowExtendModal(false);
                  setExtensionStatus('idle');
                  setExtensionMessage(null);
                }}
                disabled={extensionStatus === 'submitting'}
                style={{
                  padding: '9px 18px',
                  borderRadius: '9999px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(223, 171, 98, 0.4)',
                  color: '#6B5E55',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRequestExtension}
                disabled={extensionStatus === 'submitting' || extensionStatus === 'waiting_patient'}
                style={{
                  padding: '9px 24px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-gold-base, #DFAB62)',
                  border: 'none',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor:
                    extensionStatus === 'submitting' || extensionStatus === 'waiting_patient'
                      ? 'not-allowed'
                      : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(42, 23, 15, 0.15)',
                }}
              >
                {extensionStatus === 'submitting' || extensionStatus === 'waiting_patient' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <TimerReset size={16} />
                )}
                <span>
                  {extensionStatus === 'submitting'
                    ? 'Checking Schedule & Sending...'
                    : extensionStatus === 'waiting_patient'
                    ? 'Awaiting Patient Consent...'
                    : `Send Request (+${extensionDuration}m)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Embedded Responsive CSS for Consultation Workspace */}
      <style>{`
        @media (max-width: 1024px) {
          .consultation-desktop-sidebar {
            display: none !important;
          }
          .tablet-toggle-bar {
            display: flex !important;
          }
          .clinical-panel-drawer {
            position: fixed !important;
            top: 64px;
            right: 0;
            bottom: 0;
            width: 380px !important;
            transform: translateX(100%);
            transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: -8px 0 24px rgba(42, 23, 15, 0.15);
          }
          .clinical-panel-drawer.drawer-open {
            transform: translateX(0) !important;
          }
        }
        @media (max-width: 768px) {
          .clinical-panel-drawer {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
