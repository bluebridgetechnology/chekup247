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
  Settings,
  Maximize2,
  Minimize2,
  Shield,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Camera,
  RefreshCw,
  ExternalLink,
  FileText,
  HeartHandshake,
  Lock,
  CreditCard,
  X,
  Check,
} from 'lucide-react';
import DailyIframe, { DailyCall, DailyEventObjectTrack } from '@daily-co/daily-js';
import { useAuth } from '../../../context/AuthContext';

interface ConsultationData {
  id: string;
  booking_id: string;
  video_room_id: string;
  room_url: string;
  started_at: string | null;
  ended_at: string | null;
  doctor_joined_at: string | null;
  patient_joined_at: string | null;
  booking?: {
    id: string;
    patient_id: string;
    doctor_id: string;
    status: string;
    price: number;
  };
  doctor?: {
    name: string;
    specialty: string;
  };
}

export default function PatientConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const bookingId = params?.bookingId as string;

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const WS_URL = API_BASE.replace(/\/api\/v1\/?$/, '');

  // UI States
  const [viewState, setViewState] = useState<'loading' | 'waiting_room' | 'in_call' | 'completed'>(
    'loading',
  );
  const [consultation, setConsultation] = useState<ConsultationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pre-call Hardware Preview State (PA-605)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Call Object & WebRTC State (PA-601)
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [isBlurActive, setIsBlurActive] = useState<boolean>(false);
  const [isDoctorPresent, setIsDoctorPresent] = useState<boolean>(false);
  const [doctorName, setDoctorName] = useState<string>('Consulting Doctor');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);
  const [availableDevices, setAvailableDevices] = useState<{
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
  }>({ audioInputs: [], videoInputs: [] });

  // Video track elements
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callContainerRef = useRef<HTMLDivElement | null>(null);

  // Countdown Timer State (PA-603)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(1800); // default 30 min
  const [timerWarning, setTimerWarning] = useState<'normal' | '5min' | '1min'>('normal');
  const [callDuration, setCallDuration] = useState<string>('00:00');
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Time Extension State (PA-701, PA-702)
  const [extensionRequest, setExtensionRequest] = useState<{
    extensionId: string;
    durationMinutes: number;
    amount: number;
    doctorName?: string;
  } | null>(null);
  const [consentCountdown, setConsentCountdown] = useState<number>(60);
  const [isSubmittingConsent, setIsSubmittingConsent] = useState<boolean>(false);
  const [savedCardInfo, setSavedCardInfo] = useState<{ brand: string; last4: string }>({
    brand: 'Visa',
    last4: '4081',
  });
  const [extensionSuccessBanner, setExtensionSuccessBanner] = useState<string | null>(null);

  // In-App Prescription Toast (PA-704)
  const [prescriptionToast, setPrescriptionToast] = useState<{
    prescriptionId: string;
    doctorName: string;
  } | null>(null);

  // Socket.io connection
  const socketRef = useRef<Socket | null>(null);

  // 1. Initial Load: Fetch Consultation details
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setViewState('loading');
        let data: ConsultationData | null = null;

        if (token && bookingId) {
          const res = await fetch(`${API_BASE}/consultations/${bookingId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            data = await res.json();
          }
        }

        // Fallback / mock for offline testing
        if (!data) {
          data = {
            id: 'cons-demo-1',
            booking_id: bookingId || 'demo-booking',
            video_room_id: `chekup-${(bookingId || 'demo').substring(0, 12)}`,
            room_url: `https://chekup247.daily.co/chekup-${(bookingId || 'demo').substring(0, 12)}`,
            started_at: null,
            ended_at: null,
            doctor_joined_at: null,
            patient_joined_at: null,
            doctor: {
              name: 'Dr. Thabo Mokoena',
              specialty: 'Family Medicine & General Practitioner',
            },
          };
        }

        if (isMounted) {
          setConsultation(data);
          if (data.doctor?.name) {
            setDoctorName(data.doctor.name);
          }
          if (data.ended_at) {
            setViewState('completed');
          } else {
            setViewState('waiting_room');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setViewState('waiting_room');
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [bookingId, token, API_BASE]);

  // 2. Hardware Pre-Check in Waiting Room (PA-605)
  useEffect(() => {
    if (viewState !== 'waiting_room') return;

    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animationFrameId: number;

    async function setupHardware() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setPreviewStream(stream);
          setHasCameraPermission(true);
          setHasMicPermission(true);

          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = stream;
          }

          // Microphone activity monitor
          try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 64;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateVolume = () => {
              if (!analyser) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
              animationFrameId = requestAnimationFrame(updateVolume);
            };
            updateVolume();
          } catch (audioErr) {
            console.warn('Audio metering unavailable:', audioErr);
          }
        } else {
          setHasCameraPermission(false);
          setHasMicPermission(false);
        }
      } catch (err) {
        console.warn('Camera/mic access error in waiting room:', err);
        setHasCameraPermission(false);
        setHasMicPermission(false);
      }
    }

    setupHardware();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [viewState]);

  // 3. WebSocket Setup: Connect to consultations namespace (BE-603)
  useEffect(() => {
    if (!bookingId) return;

    const socket = io(`${WS_URL}/consultations`, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_session', {
        bookingId,
        role: 'patient',
        userId: user?.id,
        userName: user?.fullName || 'Patient',
      });
    });

    socket.on('doctor_joined', (data) => {
      setIsDoctorPresent(true);
      if (data.userName) setDoctorName(data.userName);
    });

    socket.on('participant_left', (data) => {
      if (data.role === 'doctor') {
        setIsDoctorPresent(false);
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

    socket.on('consultation_ended', () => {
      setViewState('completed');
      if (callObject) {
        callObject.leave().catch(() => {});
        callObject.destroy().catch(() => {});
      }
    });

    // Time Extension Listeners (PA-701, PA-702)
    socket.on('extension_requested', (data: { extensionId: string; durationMinutes: number; amount: number; doctorName?: string }) => {
      setExtensionRequest(data);
      setConsentCountdown(60);
    });

    socket.on('extension_confirmed', (data: { extendedMinutes: number; newTotalDuration: number; remainingSeconds: number }) => {
      setExtensionRequest(null);
      if (typeof data.remainingSeconds === 'number') {
        setRemainingSeconds(data.remainingSeconds);
      }
      setExtensionSuccessBanner(`+${data.extendedMinutes} minutes added to your consultation!`);
      setTimeout(() => setExtensionSuccessBanner(null), 6000);
    });

    socket.on('extension_declined', () => {
      setExtensionRequest(null);
    });

    socket.on('extension_payment_failed', (data: { message?: string }) => {
      setExtensionRequest(null);
      alert(`Time extension payment failed: ${data?.message || 'Could not charge saved payment card.'}`);
    });

    // Real-Time Prescription Ready Listener (PA-704)
    socket.on('prescription_issued', (data: { prescriptionId: string; doctorName?: string }) => {
      setPrescriptionToast({
        prescriptionId: data.prescriptionId,
        doctorName: data.doctorName || doctorName || 'Your Doctor',
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [bookingId, user, WS_URL, callObject, doctorName]);

  // Handle Extension Consent response
  const handleConsentResponse = useCallback(async (approved: boolean) => {
    if (!extensionRequest || isSubmittingConsent) return;
    setIsSubmittingConsent(true);
    try {
      await fetch(`${API_BASE}/consultations/${bookingId}/extend/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          approved,
          extensionId: extensionRequest.extensionId,
        }),
      });
    } catch (err) {
      console.error('Failed to submit consent response:', err);
    } finally {
      setIsSubmittingConsent(false);
      setExtensionRequest(null);
    }
  }, [extensionRequest, isSubmittingConsent, API_BASE, bookingId, token]);

  // 60-Second Auto-Decline Countdown for Extension Consent
  useEffect(() => {
    if (!extensionRequest) return;
    const interval = setInterval(() => {
      setConsentCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleConsentResponse(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [extensionRequest, handleConsentResponse]);

  // 4. Timer Countdown Hook (PA-603)
  useEffect(() => {
    if (viewState !== 'in_call') return;

    timerIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = Math.max(0, prev - 1);
        if (next <= 60) {
          setTimerWarning('1min');
        } else if (next <= 300) {
          setTimerWarning('5min');
        } else {
          setTimerWarning('normal');
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [viewState]);

  // Format seconds to mm:ss
  const formatTimer = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 5. Join Consultation Call via Daily.co Custom Call Object (PA-601)
  const handleJoinCall = async () => {
    try {
      setViewState('loading');

      // Stop waiting room preview stream before joining Daily
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop());
        setPreviewStream(null);
      }

      // Call API join endpoint (BE-602)
      let roomUrl = consultation?.room_url || '';
      let meetingToken = '';

      try {
        const res = await fetch(`${API_BASE}/consultations/${bookingId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            role: 'patient',
            userName: user?.fullName || 'Patient',
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

      // Create Daily.co custom call object (PA-601: NOT plain iframe)
      const daily = DailyIframe.createCallObject({
        subscribeToTracksAutomatically: true,
      });
      setCallObject(daily);

      // Daily.co WebRTC Track Listeners
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
            setIsDoctorPresent(true);
          }
        } else if (evt.track.kind === 'audio' && !evt.participant?.local) {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = new MediaStream([evt.track]);
          }
        }
      });

      daily.on('participant-joined', (evt) => {
        if (evt?.participant && !evt.participant.local) {
          setIsDoctorPresent(true);
          if (evt.participant.user_name) {
            setDoctorName(evt.participant.user_name);
          }
        }
      });

      daily.on('participant-left', (evt) => {
        if (evt?.participant && !evt.participant.local) {
          setIsDoctorPresent(false);
        }
      });

      daily.on('left-meeting', () => {
        setViewState('completed');
      });

      daily.on('error', (evt) => {
        console.warn('Daily.co call error:', evt);
      });

      // Join the Daily room
      await daily.join({
        url: roomUrl,
        ...(meetingToken ? { token: meetingToken } : {}),
      });

      // Enumerate media devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAvailableDevices({
          audioInputs: devices.filter((d) => d.kind === 'audioinput'),
          videoInputs: devices.filter((d) => d.kind === 'videoinput'),
        });
      } catch (e) {
        console.warn('Could not enumerate devices:', e);
      }

      setViewState('in_call');
    } catch (err: any) {
      console.error('Failed to initialize Daily.co call:', err);
      // Fallback directly to in-call view for UI/demo testing
      setViewState('in_call');
    }
  };

  // Toggle Audio (Mic Mute)
  const toggleAudio = () => {
    const nextState = !isAudioMuted;
    setIsAudioMuted(nextState);
    if (callObject) {
      callObject.setLocalAudio(!nextState);
    }
  };

  // Toggle Video (Camera Off)
  const toggleVideo = () => {
    const nextState = !isVideoMuted;
    setIsVideoMuted(nextState);
    if (callObject) {
      callObject.setLocalVideo(!nextState);
    }
  };

  // Toggle Background Blur (PA-604: Native Daily.co video processor)
  const toggleBackgroundBlur = async () => {
    const nextState = !isBlurActive;
    setIsBlurActive(nextState);
    if (callObject) {
      try {
        await (callObject as any).updateInputSettings({
          video: {
            processor: nextState ? { type: 'background-blur' } : { type: 'none' },
          },
        });
      } catch (e) {
        console.warn('Background blur not supported on this device/browser:', e);
      }
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!callContainerRef.current) return;
    if (!document.fullscreenElement) {
      callContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Patient Leaves Call
  const handleLeaveCall = async () => {
    if (callObject) {
      try {
        await callObject.leave();
        await callObject.destroy();
      } catch (e) {}
    }
    setViewState('completed');
  };

  // ============================================================================
  // RENDER: Loading State
  // ============================================================================
  if (viewState === 'loading') {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
          color: '#ffffff',
          gap: '20px',
        }}
      >
        <Loader2 size={44} className="animate-spin" style={{ color: 'var(--color-brand-400)' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          Initializing Encrypted Consultation Room...
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Configuring secure audio/video channels & medical privacy compliance.
        </p>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Completion Screen (PA-606)
  // ============================================================================
  if (viewState === 'completed') {
    return (
      <div
        style={{
          minHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: '580px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '24px',
            padding: '44px 36px',
            textAlign: 'center',
            boxShadow: '0 20px 40px -12px rgba(15, 23, 42, 0.08)',
            border: '1px solid var(--color-slate-200)',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)',
            }}
          >
            <CheckCircle2 size={42} />
          </div>

          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--color-slate-900)',
              marginBottom: '10px',
            }}
          >
            Consultation Concluded
          </h1>
          <p style={{ color: 'var(--color-slate-600)', fontSize: '0.975rem', lineHeight: 1.6 }}>
            Thank you for consulting with <strong>{doctorName}</strong>. Your session has ended, and
            all clinical notes are stored securely in your medical file.
          </p>

          <div
            style={{
              background: '#f8fafc',
              borderRadius: '16px',
              padding: '20px',
              margin: '28px 0',
              textAlign: 'left',
              border: '1px solid var(--color-slate-200)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText size={22} style={{ color: 'var(--color-brand-600)' }} />
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                  E-Prescription & Notes
                </h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--color-slate-500)', marginTop: '2px' }}>
                  If your doctor issued a prescription, it will appear in your patient dashboard
                  with instant digital download and pharmacy routing.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                color: '#059669',
                background: '#ecfdf5',
                padding: '8px 12px',
                borderRadius: '8px',
              }}
            >
              <Shield size={16} />
              <span>Session encrypted and recorded under HPCSA telehealth guidelines.</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/prescriptions"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                background: 'var(--color-brand-600)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.95rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
              }}
            >
              <FileText size={18} />
              <span>View My Prescriptions</span>
            </Link>

            <Link
              href={`/bookings/${bookingId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                background: '#f1f5f9',
                color: 'var(--color-slate-800)',
                fontWeight: 700,
                fontSize: '0.95rem',
                textDecoration: 'none',
              }}
            >
              <span>Booking Summary</span>
            </Link>

            <Link
              href="/bookings"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                background: '#ffffff',
                color: 'var(--color-slate-700)',
                fontWeight: 700,
                fontSize: '0.95rem',
                textDecoration: 'none',
                border: '1px solid var(--color-slate-300)',
              }}
            >
              <span>Back to My Bookings</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Pre-Call Waiting Room Screen (PA-605)
  // ============================================================================
  if (viewState === 'waiting_room') {
    return (
      <div
        style={{
          minHeight: '90vh',
          background: 'linear-gradient(135deg, #090e17 0%, #0f172a 100%)',
          color: '#ffffff',
          padding: '32px 16px',
        }}
      >
        <div className="container" style={{ maxWidth: '960px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.4)',
                }}
              >
                +
              </div>
              <div>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  ChekUp<span style={{ color: '#2dd4bf' }}>247</span>
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Virtual Telehealth Consultation
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: '20px' }}>
              <Lock size={14} style={{ color: '#2dd4bf' }} />
              <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>End-to-End Encrypted</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
            {/* LEFT: Camera & Hardware Self-Check (PA-605) */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                borderRadius: '24px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={20} style={{ color: 'var(--color-brand-400)' }} />
                <span>Camera & Audio Hardware Check</span>
              </h3>

              {/* Video Preview Box */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16/9',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#020617',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)', // mirror preview
                    display: hasCameraPermission ? 'block' : 'none',
                  }}
                />

                {!hasCameraPermission && (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <VideoOff size={36} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
                      Camera feed unavailable or permissions requested.
                    </p>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      You can still proceed and grant permissions in-call.
                    </span>
                  </div>
                )}

                {/* Patient Name badge */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    background: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(8px)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <User size={14} style={{ color: '#2dd4bf' }} />
                  <span>{user?.fullName || 'You (Patient)'}</span>
                </div>
              </div>

              {/* Audio meter */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mic size={14} style={{ color: audioLevel > 5 ? '#10b981' : '#94a3b8' }} />
                    Microphone Input Level
                  </span>
                  <span>{audioLevel > 5 ? 'Detecting sound' : 'Speak to test'}</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    background: '#0f172a',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${audioLevel}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #10b981 0%, #2dd4bf 100%)',
                      transition: 'width 0.1s ease',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT: Doctor Details & Waiting Status */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                borderRadius: '24px',
                padding: '28px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {/* Waiting indicator with pulse */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    background: 'rgba(13, 148, 136, 0.2)',
                    border: '1px solid rgba(45, 212, 191, 0.3)',
                    color: '#2dd4bf',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '18px',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#2dd4bf',
                      boxShadow: '0 0 8px #2dd4bf',
                      display: 'inline-block',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                  <span>Waiting for Doctor to connect</span>
                </div>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '6px' }}>
                  {consultation?.doctor?.name || doctorName}
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.925rem', marginBottom: '20px' }}>
                  {consultation?.doctor?.specialty || 'General Practitioner'}
                </p>

                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                    <Clock size={16} style={{ color: '#2dd4bf' }} />
                    <span>Scheduled Session: 30 minutes</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#cbd5e1', marginTop: '10px' }}>
                    <Shield size={16} style={{ color: '#2dd4bf' }} />
                    <span>Protected 10-Minute Grace Period Active</span>
                  </div>
                </div>
              </div>

              {/* Enter Consultation CTA */}
              <div>
                <button
                  onClick={handleJoinCall}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #0d9488 0%, #0b7266 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(13, 148, 136, 0.4)',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <Video size={22} />
                  <span>Enter Consultation Room</span>
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: '10px' }}>
                  Click to establish your encrypted Daily.co video stream
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Full Active Consultation Call Screen (PA-601)
  // ============================================================================
  return (
    <div
      ref={callContainerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: isFullscreen ? '100vh' : 'calc(100vh - 72px)',
        minHeight: '620px',
        background: '#020617',
        color: '#ffffff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Audio element for remote participant */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* TOP HUD BAR: Logo Watermark (PA-602) & Countdown Timer (PA-603) */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        {/* Platform Logo Watermark Overlay (PA-602) */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(12px)',
            padding: '8px 16px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          }}
        >
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
          <div>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              ChekUp<span style={{ color: '#2dd4bf' }}>247</span>
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                color: '#94a3b8',
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Medical Telehealth
            </span>
          </div>
        </div>

        {/* Session Countdown Timer Component (PA-603) */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background:
              timerWarning === '1min'
                ? 'rgba(220, 38, 38, 0.85)'
                : timerWarning === '5min'
                ? 'rgba(217, 119, 6, 0.85)'
                : 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(12px)',
            padding: '8px 18px',
            borderRadius: '14px',
            border: `1px solid ${
              timerWarning === '1min'
                ? '#ef4444'
                : timerWarning === '5min'
                ? '#f59e0b'
                : 'rgba(255, 255, 255, 0.12)'
            }`,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            animation: timerWarning === '1min' ? 'pulse 1s infinite' : 'none',
          }}
        >
          <Clock
            size={18}
            style={{
              color: timerWarning === '1min' ? '#fee2e2' : timerWarning === '5min' ? '#fef3c7' : '#2dd4bf',
            }}
          />
          <div>
            <span
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                fontVariantNumeric: 'tabular-nums',
                color: '#ffffff',
              }}
            >
              {formatTimer(remainingSeconds)}
            </span>
            {timerWarning !== 'normal' && (
              <span
                style={{
                  display: 'block',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: timerWarning === '1min' ? '#fecaca' : '#fed7aa',
                }}
              >
                {timerWarning === '1min' ? 'Concluding Shortly' : '5 Minutes Remaining'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* PA-702: Dynamic Time Extension Banner */}
      {extensionSuccessBanner && (
        <div
          style={{
            position: 'absolute',
            top: '76px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
            color: '#ffffff',
            padding: '10px 24px',
            borderRadius: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 24px rgba(13, 148, 136, 0.4)',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          <Sparkles size={18} />
          <span>{extensionSuccessBanner}</span>
        </div>
      )}

      {/* PA-704: Real-Time In-App Prescription Toast Banner */}
      {prescriptionToast && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 45,
            background: '#ffffff',
            color: 'var(--color-slate-900)',
            padding: '14px 20px',
            borderRadius: '16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            border: '1px solid #14b8a6',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#ecfdf5',
              color: '#0d9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
              Prescription Ready
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {prescriptionToast.doctorName} has issued your official digital e-prescription.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
            <Link
              href="/prescriptions"
              target="_blank"
              style={{
                background: '#0d9488',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.825rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>View Now</span>
              <ExternalLink size={14} />
            </Link>
            <button
              onClick={() => setPrescriptionToast(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* PA-701: In-Call Floating Time Extension Consent Modal */}
      {extensionRequest && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '440px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.35)',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#f0fdfa',
                    color: '#0d9488',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Clock size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    Consultation Extension
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Requested by {extensionRequest.doctorName || doctorName}
                  </span>
                </div>
              </div>
              <div
                style={{
                  background: consentCountdown <= 15 ? '#fee2e2' : '#f1f5f9',
                  color: consentCountdown <= 15 ? '#dc2626' : '#475569',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Clock size={14} />
                <span>{consentCountdown}s</span>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
              Your doctor has suggested extending this consultation by{' '}
              <strong style={{ color: '#0f172a' }}>+{extensionRequest.durationMinutes} minutes</strong> to complete
              your clinical examination and discuss treatment.
            </p>

            {/* Pricing & Billing Details */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '20px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Extension Fee:</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0d9488' }}>
                  R {extensionRequest.amount.toFixed(2)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.8rem',
                  color: '#64748b',
                  borderTop: '1px dashed #cbd5e1',
                  paddingTop: '10px',
                }}
              >
                <CreditCard size={16} style={{ color: '#0d9488' }} />
                <span>
                  Billed automatically via saved card (<strong>{savedCardInfo.brand} •••• {savedCardInfo.last4}</strong>)
                </span>
              </div>
            </div>

            {/* Progress Bar for 60s countdown */}
            <div
              style={{
                height: '4px',
                background: '#e2e8f0',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: consentCountdown <= 15 ? '#dc2626' : '#0d9488',
                  width: `${(consentCountdown / 60) * 100}%`,
                  transition: 'width 1s linear',
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px' }}>
              <button
                onClick={() => handleConsentResponse(false)}
                disabled={isSubmittingConsent}
                style={{
                  padding: '12px 18px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Decline
              </button>
              <button
                onClick={() => handleConsentResponse(true)}
                disabled={isSubmittingConsent}
                style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)',
                  opacity: isSubmittingConsent ? 0.7 : 1,
                }}
              >
                {isSubmittingConsent ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Approve & Extend</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIDEO AREA (Doctor / Remote Feed) */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0f1d',
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
            display: isDoctorPresent ? 'block' : 'none',
          }}
        />

        {/* Remote participant placeholder if waiting */}
        {!isDoctorPresent && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                background: 'rgba(30, 41, 59, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                border: '2px solid rgba(45, 212, 191, 0.3)',
              }}
            >
              <User size={46} style={{ color: '#2dd4bf' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>
              Waiting for {doctorName} to connect...
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '380px' }}>
              Your doctor has been notified and will enter the consultation room momentarily.
            </p>
          </div>
        )}

        {/* Doctor Name Banner at Bottom-Left of Main Video */}
        {isDoctorPresent && (
          <div
            style={{
              position: 'absolute',
              bottom: '100px',
              left: '24px',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block',
              }}
            />
            <span>{doctorName}</span>
          </div>
        )}

        {/* PIP LOCAL VIDEO (Patient Camera Preview) */}
        <div
          style={{
            position: 'absolute',
            bottom: '100px',
            right: '24px',
            width: '240px',
            aspectRatio: '16/9',
            borderRadius: '16px',
            overflow: 'hidden',
            background: '#090d16',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
            zIndex: 15,
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
              transform: 'scaleX(-1)', // mirror local view
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
              <VideoOff size={24} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                Camera Off
              </span>
            </div>
          )}

          {/* Local Name Badge */}
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              background: 'rgba(0, 0, 0, 0.65)',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>You</span>
            {isAudioMuted && <MicOff size={12} style={{ color: '#ef4444' }} />}
            {isBlurActive && <Sparkles size={12} style={{ color: '#2dd4bf' }} />}
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROL TOOLBAR HUD */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          padding: '10px 20px',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Mute Mic Button */}
        <button
          onClick={toggleAudio}
          title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: isAudioMuted ? '#dc2626' : 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Video Toggle Button */}
        <button
          onClick={toggleVideo}
          title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: isVideoMuted ? '#dc2626' : 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        {/* Background Blur Toggle (PA-604) */}
        <button
          onClick={toggleBackgroundBlur}
          title={isBlurActive ? 'Disable Background Blur' : 'Enable Background Blur'}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: isBlurActive ? '#0d9488' : 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            boxShadow: isBlurActive ? '0 0 12px rgba(13, 148, 136, 0.6)' : 'none',
          }}
        >
          <Sparkles size={20} />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          style={{
            width: '48px',
            height: '48px',
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
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>

        {/* End / Leave Call Button */}
        <button
          onClick={handleLeaveCall}
          title="Leave Consultation"
          style={{
            padding: '0 20px',
            height: '48px',
            borderRadius: '24px',
            background: '#dc2626',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 6px 16px rgba(220, 38, 38, 0.4)',
            transition: 'all 0.15s ease',
          }}
        >
          <PhoneOff size={18} />
          <span>Leave Call</span>
        </button>
      </div>
    </div>
  );
}
