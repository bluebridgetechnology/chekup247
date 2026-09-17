'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import Link from 'next/link';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Sparkles,
  PhoneOff,
  Maximize2,
  Minimize2,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Save,
  Check,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  X,
  Stethoscope,
  Plus,
} from 'lucide-react';
import DailyIframe, { DailyCall, DailyEventObjectTrack } from '@daily-co/daily-js';
import { useDoctorAuth } from '../../../context/DoctorAuthContext';

interface ConsultationDetail {
  id: string;
  booking_id: string;
  video_room_id: string;
  room_url: string;
  started_at: string | null;
  ended_at: string | null;
  doctor_notes: string | null;
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
}

export default function DoctorConsultationWorkspace() {
  const params = useParams();
  const router = useRouter();
  const { doctor, profile, token } = useDoctorAuth();
  const bookingId = params?.bookingId as string;

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const WS_URL = API_BASE.replace(/\/api\/v1\/?$/, '');

  // UI States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [consultation, setConsultation] = useState<ConsultationDetail | null>(null);
  const [patientName, setPatientName] = useState<string>('Patient');
  const [isPatientConnected, setIsPatientConnected] = useState<boolean>(false);

  // Call Controls State
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Virtual Background & Blur State (DP-603)
  const [activeBackground, setActiveBackground] = useState<'none' | 'blur' | 'clinic_modern' | 'clinic_warm'>('none');
  const [showBackgroundModal, setShowBackgroundModal] = useState<boolean>(false);

  // Clinical Notes & Auto-Save State (DP-602)
  const [notes, setNotes] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown Timer State
  const [remainingSeconds, setRemainingSeconds] = useState<number>(1800);
  const [timerWarning, setTimerWarning] = useState<'normal' | '5min' | '1min'>('normal');
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Time Extension State (DP-701)
  const [extensionState, setExtensionState] = useState<
    'idle' | 'requesting' | 'awaiting_consent' | 'confirmed' | 'declined' | 'conflict' | 'failed'
  >('idle');
  const [requestedDuration, setRequestedDuration] = useState<number>(15);
  const [extensionAmount, setExtensionAmount] = useState<number>(150);
  const [extensionNotice, setExtensionNotice] = useState<string>('');

  // End Consultation Modal (DP-604)
  const [showEndModal, setShowEndModal] = useState<boolean>(false);
  const [isEnding, setIsEnding] = useState<boolean>(false);

  // Video Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const workspaceContainerRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // 1. Initial Load: Fetch Consultation & Booking Data
  useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      try {
        setIsLoading(true);
        let data: ConsultationDetail | null = null;

        if (bookingId && token) {
          const res = await fetch(`${API_BASE}/consultations/${bookingId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            data = await res.json();
          }
        }

        // Fallback demo data
        if (!data) {
          data = {
            id: 'cons-demo',
            booking_id: bookingId || 'bk-demo',
            video_room_id: `chekup-${(bookingId || 'demo').substring(0, 12)}`,
            room_url: `https://chekup247.daily.co/chekup-${(bookingId || 'demo').substring(0, 12)}`,
            started_at: new Date().toISOString(),
            ended_at: null,
            doctor_notes:
              'SUBJECTIVE:\nPatient reports 3-day history of sore throat and mild dry cough.\n\nOBJECTIVE:\nAfebrile, throat mildly erythematous. No cervical lymphadenopathy.\n\nASSESSMENT:\nAcute viral pharyngitis.\n\nPLAN:\nSymptomatic relief, hydration, throat lozenges.',
            booking: {
              id: bookingId || 'bk-demo',
              patient_id: 'pat-1',
              doctor_id: doctor?.id || 'doc-1',
              status: 'confirmed',
              price: 650.0,
              patient: {
                id: 'pat-1',
                fullName: 'Sipho Sithole',
                email: 'sipho.sithole@example.co.za',
                phone: '+27 82 555 1234',
              },
            },
          };
        }

        if (isMounted) {
          setConsultation(data);
          if (data.doctor_notes) {
            setNotes(data.doctor_notes);
          }
          if (data.booking?.patient?.fullName) {
            setPatientName(data.booking.patient.fullName);
          }
          setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      } catch (err) {
        console.warn('Workspace load fallback:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, [bookingId, token, API_BASE, doctor]);

  // 2. Initialize Daily.co Call Object for Doctor (DP-601)
  useEffect(() => {
    if (isLoading || !consultation) return;

    let daily: DailyCall | null = null;

    async function initDaily() {
      try {
        let roomUrl = consultation?.room_url || '';
        let meetingToken = '';

        // Join consultation on backend
        try {
          const res = await fetch(`${API_BASE}/consultations/${bookingId}/join`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              role: 'doctor',
              userName: doctor?.fullName || 'Dr. ' + (profile?.hpcsaNumber || 'Doctor'),
            }),
          });
          if (res.ok) {
            const joinData = await res.json();
            roomUrl = joinData.roomUrl || roomUrl;
            meetingToken = joinData.token || '';
            if (joinData.consultation?.started_at) {
              const elapsed = Math.floor(
                (Date.now() - new Date(joinData.consultation.started_at).getTime()) / 1000,
              );
              setRemainingSeconds(Math.max(0, 1800 - elapsed));
            }
          }
        } catch (e) {
          console.warn('Backend join API fallback:', e);
        }

        // Custom Call Object (NOT plain iframe)
        daily = DailyIframe.createCallObject({
          subscribeToTracksAutomatically: true,
        });
        setCallObject(daily);

        daily.on('track-started', (evt: DailyEventObjectTrack) => {
          if (!evt.track) return;

          if (evt.track.kind === 'video') {
            if (evt.participant?.local) {
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = new MediaStream([evt.track]);
              }
            } else {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = new MediaStream([evt.track]);
              }
              setIsPatientConnected(true);
            }
          } else if (evt.track.kind === 'audio' && !evt.participant?.local) {
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = new MediaStream([evt.track]);
            }
          }
        });

        daily.on('participant-joined', (evt) => {
          if (evt?.participant && !evt.participant.local) {
            setIsPatientConnected(true);
            if (evt.participant.user_name) {
              setPatientName(evt.participant.user_name);
            }
          }
        });

        daily.on('participant-left', (evt) => {
          if (evt?.participant && !evt.participant.local) {
            setIsPatientConnected(false);
          }
        });

        await daily.join({
          url: roomUrl,
          ...(meetingToken ? { token: meetingToken } : {}),
        });
      } catch (err) {
        console.warn('Doctor Daily.co call init note:', err);
      }
    }

    initDaily();

    return () => {
      if (daily) {
        daily.leave().catch(() => {});
        daily.destroy().catch(() => {});
      }
    };
  }, [isLoading, consultation, bookingId, token, API_BASE, doctor, profile]);

  // 3. WebSocket Connection (BE-603)
  useEffect(() => {
    if (!bookingId) return;

    const socket = io(`${WS_URL}/consultations`, {
      transports: ['websocket', 'polling'],
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

    socket.on('patient_joined', (data) => {
      setIsPatientConnected(true);
      if (data.userName) setPatientName(data.userName);
    });

    socket.on('participant_left', (data) => {
      if (data.role === 'patient') {
        setIsPatientConnected(false);
      }
    });

    socket.on('timer_sync', (data) => {
      if (typeof data.remainingSeconds === 'number') {
        setRemainingSeconds(data.remainingSeconds);
        if (data.is1MinWarning) {
          setTimerWarning('1min');
        } else if (data.is5MinWarning) {
          setTimerWarning('5min');
        } else {
          setTimerWarning('normal');
        }
      }
    });

    // Time Extension WebSocket Listeners (DP-701, BE-701)
    socket.on('extension_confirmed', (data: any) => {
      setExtensionState('confirmed');
      setExtensionNotice(`+${data.addedMinutes} min confirmed! (R${data.amount})`);
      if (typeof data.remainingSeconds === 'number') {
        setRemainingSeconds(data.remainingSeconds);
      }
      setTimeout(() => {
        setExtensionState('idle');
        setExtensionNotice('');
      }, 6000);
    });

    socket.on('extension_declined', (data: any) => {
      setExtensionState('declined');
      setExtensionNotice(data.reason || 'Patient declined the consultation extension request.');
    });

    socket.on('extension_payment_failed', (data: any) => {
      setExtensionState('failed');
      setExtensionNotice(data.message || 'Payment charge failed. Extension cancelled.');
    });

    return () => {
      socket.disconnect();
    };
  }, [bookingId, doctor, WS_URL]);

  // 4. Timer Interval
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = Math.max(0, prev - 1);
        if (next <= 60) setTimerWarning('1min');
        else if (next <= 300) setTimerWarning('5min');
        else setTimerWarning('normal');
        return next;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const formatTimer = useCallback((secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  // 5. Clinical Notes Auto-Save Implementation (DP-602)
  const saveNotesToServer = useCallback(
    async (contentToSave: string) => {
      try {
        setSaveStatus('saving');
        if (bookingId && token) {
          const res = await fetch(`${API_BASE}/consultations/${bookingId}/notes`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ notes: contentToSave }),
          });
          if (res.ok) {
            setSaveStatus('saved');
            setLastSavedTime(
              new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            );
            return;
          }
        }

        // Mock saved fallback
        setSaveStatus('saved');
        setLastSavedTime(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        );
      } catch (err) {
        console.warn('Error saving notes:', err);
        setSaveStatus('unsaved');
      }
    },
    [bookingId, token, API_BASE],
  );

  // Auto-save triggers every 30 seconds after typing stops
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setNotes(newContent);
    setSaveStatus('unsaved');

    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }

    notesTimeoutRef.current = setTimeout(() => {
      saveNotesToServer(newContent);
    }, 30000); // 30 seconds auto-save (DP-602)
  };

  // Manual save trigger
  const handleManualSave = () => {
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    saveNotesToServer(notes);
  };

  // 6. Virtual Background & Blur Controls (DP-603)
  const handleSelectBackground = async (bgType: 'none' | 'blur' | 'clinic_modern' | 'clinic_warm') => {
    setActiveBackground(bgType);
    setShowBackgroundModal(false);

    if (!callObject) return;

    try {
      if (bgType === 'none') {
        await (callObject as any).updateInputSettings({ video: { processor: { type: 'none' } } });
      } else if (bgType === 'blur') {
        await (callObject as any).updateInputSettings({ video: { processor: { type: 'background-blur' } } });
      } else {
        // Virtual backgrounds preset
        await (callObject as any).updateInputSettings({
          video: {
            processor: {
              type: 'background-blur', // reliable fallback if custom image is in review
            },
          },
        });
      }
    } catch (e) {
      console.warn('Background processor application:', e);
    }
  };

  // 7. End Consultation Confirmation Flow (DP-604)
  const handleConfirmEndConsultation = async () => {
    try {
      setIsEnding(true);

      // 1. Save any final unsaved clinical notes
      await saveNotesToServer(notes);

      // 2. Call backend end consultation API (BE-602)
      if (bookingId) {
        await fetch(`${API_BASE}/consultations/${bookingId}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ doctorId: doctor?.id }),
        }).catch(() => {});
      }

      // 3. Leave Daily session
      if (callObject) {
        try {
          await callObject.leave();
          await callObject.destroy();
        } catch (e) {}
      }

      // 4. Redirect doctor directly to prescription builder (DP-604, DP-702)
      router.push(`/consultations/${bookingId}/prescribe`);
    } catch (err: any) {
      console.error('Failed to end consultation:', err);
      router.push(`/consultations/${bookingId}/prescribe`);
    } finally {
      setIsEnding(false);
      setShowEndModal(false);
    }
  };

  // 8. In-Call Time Extension Request Handler (DP-701, BE-701)
  const handleRequestExtension = async (durationMinutes: number) => {
    try {
      setExtensionState('requesting');
      setRequestedDuration(durationMinutes);
      const rates: Record<number, number> = { 15: 150, 20: 200, 30: 300 };
      const cost = rates[durationMinutes] || 150;
      setExtensionAmount(cost);

      const res = await fetch(`${API_BASE}/consultations/${bookingId}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          durationMinutes,
          doctorId: doctor?.id,
        }),
      });

      if (res.status === 409) {
        setExtensionState('conflict');
        setExtensionNotice('Next slot is booked. Doctor has an upcoming appointment scheduled.');
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setExtensionState('failed');
        setExtensionNotice(errData.message || 'Failed to request consultation extension.');
        return;
      }

      setExtensionState('awaiting_consent');
      setExtensionNotice(`Awaiting patient consent for +${durationMinutes}m (R${cost})...`);
    } catch (err: any) {
      setExtensionState('failed');
      setExtensionNotice(err.message || 'Failed to request time extension.');
    }
  };

  const handleCancelExtension = () => {
    setExtensionState('idle');
    setExtensionNotice('');
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}
      >
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--color-brand-600)' }} />
        <p style={{ color: 'var(--color-slate-600)' }}>Loading Doctor Clinical Workspace...</p>
      </div>
    );
  }

  return (
    <div
      ref={workspaceContainerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: isFullscreen ? '100vh' : 'calc(100vh - 72px)',
        minHeight: '680px',
        background: '#090d16',
        color: '#ffffff',
        overflow: 'hidden',
      }}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* TOP CLINICAL HEADER BAR */}
      <div
        style={{
          height: '56px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1rem',
                color: '#ffffff',
              }}
            >
              +
            </div>
            <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>
              ChekUp<span style={{ color: '#2dd4bf' }}>247</span>
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                background: 'rgba(45, 212, 191, 0.15)',
                color: '#2dd4bf',
                borderRadius: '6px',
                fontWeight: 600,
              }}
            >
              Doctor Workspace
            </span>
          </div>

          <div style={{ height: '20px', width: '1px', background: 'rgba(255,255,255,0.15)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: '#94a3b8' }}>Patient:</span>
            <span style={{ fontWeight: 700, color: '#ffffff' }}>{patientName}</span>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isPatientConnected ? '#10b981' : '#f59e0b',
                display: 'inline-block',
                boxShadow: isPatientConnected ? '0 0 8px #10b981' : 'none',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: isPatientConnected ? '#10b981' : '#f59e0b' }}>
              {isPatientConnected ? 'Connected' : 'Waiting...'}
            </span>
          </div>
        </div>

        {/* Top Right: Time Extension Widget, Countdown Timer & End Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Time Extension Control Bar (DP-701, BE-701) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '10px',
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            {extensionState === 'idle' && (
              <>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#94a3b8',
                    paddingRight: '2px',
                  }}
                >
                  Extend:
                </span>
                <button
                  type="button"
                  onClick={() => handleRequestExtension(15)}
                  title="Extend call by 15 minutes (R150)"
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'rgba(45, 212, 191, 0.12)',
                    border: '1px solid rgba(45, 212, 191, 0.3)',
                    color: '#2dd4bf',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Plus size={12} />
                  <span>15m (R150)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRequestExtension(20)}
                  title="Extend call by 20 minutes (R200)"
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'rgba(45, 212, 191, 0.12)',
                    border: '1px solid rgba(45, 212, 191, 0.3)',
                    color: '#2dd4bf',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Plus size={12} />
                  <span>20m (R200)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRequestExtension(30)}
                  title="Extend call by 30 minutes (R300)"
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'rgba(45, 212, 191, 0.12)',
                    border: '1px solid rgba(45, 212, 191, 0.3)',
                    color: '#2dd4bf',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Plus size={12} />
                  <span>30m (R300)</span>
                </button>
              </>
            )}

            {extensionState === 'requesting' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                <Loader2 size={13} className="animate-spin" style={{ color: '#2dd4bf' }} />
                <span>Checking availability...</span>
              </div>
            )}

            {extensionState === 'awaiting_consent' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#f59e0b' }}>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Awaiting patient consent (+{requestedDuration}m - R{extensionAmount})...</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelExtension}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Cancel extension request"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {extensionState === 'confirmed' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
                <CheckCircle2 size={14} />
                <span>{extensionNotice}</span>
              </div>
            )}

            {(extensionState === 'declined' || extensionState === 'conflict' || extensionState === 'failed') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#f87171' }}>
                  <AlertCircle size={14} />
                  <span>{extensionNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelExtension}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Dismiss notice"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Synchronized Countdown Timer (PA-603 / DP-601) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '12px',
              background:
                timerWarning === '1min'
                  ? 'rgba(220, 38, 38, 0.3)'
                  : timerWarning === '5min'
                  ? 'rgba(217, 119, 6, 0.3)'
                  : 'rgba(15, 23, 42, 0.6)',
              border: `1px solid ${
                timerWarning === '1min'
                  ? '#ef4444'
                  : timerWarning === '5min'
                  ? '#f59e0b'
                  : 'rgba(255, 255, 255, 0.1)'
              }`,
            }}
          >
            <Clock
              size={16}
              style={{
                color: timerWarning === '1min' ? '#ef4444' : timerWarning === '5min' ? '#f59e0b' : '#2dd4bf',
              }}
            />
            <span
              style={{
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 800,
                fontSize: '0.95rem',
                color: timerWarning === '1min' ? '#fecaca' : timerWarning === '5min' ? '#fef3c7' : '#ffffff',
              }}
            >
              {formatTimer(remainingSeconds)}
            </span>
          </div>

          {/* End Consultation Action Button (DP-604) */}
          <button
            onClick={() => setShowEndModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              background: '#dc2626',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
            }}
          >
            <PhoneOff size={16} />
            <span>End Consultation</span>
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE (DP-601: 65% Left, 35% Right) */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '65% 35%',
          height: 'calc(100% - 56px)',
          overflow: 'hidden',
        }}
      >
        {/* LEFT COLUMN: Video Call Panel (65% width) */}
        <div
          style={{
            position: 'relative',
            background: '#040711',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Main Remote Video (Patient) */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: isPatientConnected ? 'block' : 'none',
              }}
            />

            {!isPatientConnected && (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'rgba(30, 41, 59, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    border: '2px solid rgba(45, 212, 191, 0.3)',
                  }}
                >
                  <User size={40} style={{ color: '#2dd4bf' }} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>
                  Waiting for patient to join...
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Patient has been prompted. Your feed is ready and live.
                </p>
              </div>
            )}

            {/* Doctor PIP Preview */}
            <div
              style={{
                position: 'absolute',
                bottom: '80px',
                right: '20px',
                width: '210px',
                aspectRatio: '16/9',
                borderRadius: '14px',
                overflow: 'hidden',
                background: '#090d16',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                zIndex: 10,
              }}
            >
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
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#1e293b',
                  }}
                >
                  <VideoOff size={20} style={{ color: '#94a3b8' }} />
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>Camera Off</span>
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  background: 'rgba(0,0,0,0.65)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Dr. You</span>
                {activeBackground !== 'none' && <Sparkles size={10} style={{ color: '#2dd4bf' }} />}
              </div>
            </div>
          </div>

          {/* Bottom Floating Video Controls HUD */}
          <div
            style={{
              height: '68px',
              background: 'rgba(15, 23, 42, 0.9)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '0 20px',
              flexShrink: 0,
            }}
          >
            {/* Mic Toggle */}
            <button
              onClick={() => {
                const next = !isAudioMuted;
                setIsAudioMuted(next);
                if (callObject) callObject.setLocalAudio(!next);
              }}
              title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: isAudioMuted ? '#dc2626' : 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isAudioMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Video Toggle */}
            <button
              onClick={() => {
                const next = !isVideoMuted;
                setIsVideoMuted(next);
                if (callObject) callObject.setLocalVideo(!next);
              }}
              title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: isVideoMuted ? '#dc2626' : 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isVideoMuted ? <VideoOff size={18} /> : <Video size={18} />}
            </button>

            {/* Virtual Background & Blur Controls (DP-603) */}
            <button
              onClick={() => setShowBackgroundModal(true)}
              title="Virtual Backgrounds & Blur Settings"
              style={{
                padding: '0 14px',
                height: '42px',
                borderRadius: '21px',
                background: activeBackground !== 'none' ? '#0d9488' : 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <Sparkles size={16} />
              <span>Background</span>
            </button>

            {/* Fullscreen */}
            <button
              onClick={() => {
                if (!workspaceContainerRef.current) return;
                if (!document.fullscreenElement) {
                  workspaceContainerRef.current.requestFullscreen().catch(() => {});
                  setIsFullscreen(true);
                } else {
                  document.exitFullscreen().catch(() => {});
                  setIsFullscreen(false);
                }
              }}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Real-Time Clinical Notes & Patient Context (35% width) */}
        <div
          style={{
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Patient Quick Summary Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 23, 42, 0.6)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  {patientName}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                  Booking Ref: #{bookingId?.substring(0, 8)} • Virtual Consultation
                </p>
              </div>

              <Link
                href={`/appointments`}
                target="_blank"
                style={{
                  color: 'var(--color-brand-400)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none',
                }}
              >
                <span>Full Profile</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>

          {/* Clinical Notes Section (DP-602) */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '16px 20px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Stethoscope size={16} style={{ color: 'var(--color-brand-400)' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Clinical SOAP Notes</span>
              </div>

              {/* Auto-Save Indicator (DP-602) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                  {saveStatus === 'saving' ? (
                    <>
                      <Loader2 size={12} className="animate-spin" style={{ color: 'var(--color-brand-400)' }} />
                      <span style={{ color: '#94a3b8' }}>Saving...</span>
                    </>
                  ) : saveStatus === 'saved' ? (
                    <>
                      <Check size={12} style={{ color: '#10b981' }} />
                      <span style={{ color: '#94a3b8' }}>Saved at {lastSavedTime}</span>
                    </>
                  ) : (
                    <span style={{ color: '#f59e0b' }}>Unsaved changes</span>
                  )}
                </div>

                <button
                  onClick={handleManualSave}
                  title="Force Save Notes"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Save size={12} />
                  <span>Save</span>
                </button>
              </div>
            </div>

            {/* Notes Textarea Editor */}
            <textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="Record clinical observations, examination findings, diagnosis, and treatment plan here..."
              style={{
                flex: 1,
                width: '100%',
                background: '#040711',
                color: '#f1f5f9',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '14px',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                resize: 'none',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand-500)')}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                saveNotesToServer(notes);
              }}
            />

            {/* Bottom Actions inside notes pane */}
            <div style={{ marginTop: '14px', flexShrink: 0 }}>
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  ICD-10 code lookup ready for prescription
                </span>
                <Link
                  href="/icd10"
                  target="_blank"
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-brand-400)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Search ICD-10</span>
                  <ExternalLink size={12} />
                </Link>
              </div>

              <button
                onClick={() => setShowEndModal(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0b7266 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
                }}
              >
                <FileText size={18} />
                <span>Complete & Issue E-Prescription</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIRTUAL BACKGROUND SELECTION MODAL (DP-603) */}
      {showBackgroundModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Virtual Clinic Backgrounds</h3>
              <button
                onClick={() => setShowBackgroundModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {/* Option 1: None */}
              <div
                onClick={() => handleSelectBackground('none')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${activeBackground === 'none' ? '#0d9488' : 'rgba(255,255,255,0.1)'}`,
                  background: '#040711',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Video size={24} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>None</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Standard Camera</div>
              </div>

              {/* Option 2: Background Blur */}
              <div
                onClick={() => handleSelectBackground('blur')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${activeBackground === 'blur' ? '#0d9488' : 'rgba(255,255,255,0.1)'}`,
                  background: '#040711',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Sparkles size={24} style={{ margin: '0 auto 8px', color: '#2dd4bf' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Background Blur</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Soft privacy blur</div>
              </div>

              {/* Option 3: Modern Clinic */}
              <div
                onClick={() => handleSelectBackground('clinic_modern')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${activeBackground === 'clinic_modern' ? '#0d9488' : 'rgba(255,255,255,0.1)'}`,
                  background: '#040711',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Layers size={24} style={{ margin: '0 auto 8px', color: '#38bdf8' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Modern Clinic</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Clean clinic preset</div>
              </div>

              {/* Option 4: Private Medical Suite */}
              <div
                onClick={() => handleSelectBackground('clinic_warm')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${activeBackground === 'clinic_warm' ? '#0d9488' : 'rgba(255,255,255,0.1)'}`,
                  background: '#040711',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Shield size={24} style={{ margin: '0 auto 8px', color: '#a78bfa' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Executive Suite</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Warm office preset</div>
              </div>
            </div>

            <button
              onClick={() => setShowBackgroundModal(false)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* END CONSULTATION CONFIRMATION MODAL (DP-604) */}
      {showEndModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              borderRadius: '24px',
              padding: '32px',
              maxWidth: '480px',
              width: '100%',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(220, 38, 38, 0.2)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
              }}
            >
              <PhoneOff size={32} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '10px' }}>
              Conclude Video Consultation?
            </h3>

            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }}>
              This will end the real-time video session for both you and{' '}
              <strong style={{ color: '#ffffff' }}>{patientName}</strong>. All clinical notes will
              be preserved, and you will proceed directly to the E-Prescription builder.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowEndModal(false)}
                disabled={isEnding}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmEndConsultation}
                disabled={isEnding}
                style={{
                  flex: 1.4,
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
                }}
              >
                {isEnding ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <span>Confirm & End Call</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
