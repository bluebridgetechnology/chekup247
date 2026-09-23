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
  Loader2,
  FileText,
  Check,
  Stethoscope,
  Share2,
  Download,
  ArrowRight,
  Sparkles,
  Image as ImageIcon,
  Sliders,
  CheckCircle2,
  SwitchCamera,
  Layers,
  X,
  AlertCircle,
  Camera,
  AlertTriangle,
  CreditCard,
  TimerReset,
  Star,
} from 'lucide-react';
import DailyIframe, { DailyCall, DailyEventObjectTrack } from '@daily-co/daily-js';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';
import { ChekupCrossLogo } from '../../../components/common/ChekupCrossLogo';
import { ReviewModal } from '../../../components/ReviewModal';
import { useWakeLock } from '../../../lib/hooks/useWakeLock';

// ============================================================================
// Types & Interfaces
// ============================================================================
interface ConsultationData {
  id: string;
  booking_id: string;
  video_room_id: string;
  room_url: string | null;
  started_at: string | null;
  ended_at: string | null;
  doctor_joined_at: string | null;
  patient_joined_at: string | null;
  doctor_notes: string | null;
  booking?: {
    id: string;
    patient_id: string;
    doctor_id: string;
    status: string;
    price: number;
    consultation_mode?: 'video' | 'audio' | 'in_clinic';
  };
  doctor?: {
    name: string;
    specialty: string;
    photoUrl?: string;
  };
}

interface JoinResponse {
  consultation: ConsultationData;
  roomUrl: string;
  token: string;
  startedAt: string | null;
  isFirstParticipant: boolean;
}

interface ExtensionRequest {
  bookingId: string;
  extensionId: string;
  durationMinutes: number;
  amount: number;
  doctorName?: string;
  timestamp: string;
  isFree?: boolean;
}

interface TimerSyncPayload {
  startedAt: string;
  durationSeconds: number;
  remainingSeconds: number;
  is5MinWarning: boolean;
  is1MinWarning: boolean;
}

export type BackgroundEffectType = 'none' | 'blur-light' | 'blur-heavy' | 'virtual-image';

interface VirtualBackgroundPreset {
  id: string;
  name: string;
  category: string;
  previewUrl: string;
}

// ============================================================================
// Virtual Background Presets
// ============================================================================
const VIRTUAL_BACKGROUND_PRESETS: VirtualBackgroundPreset[] = [
  {
    id: 'clinic-suite',
    name: 'Medical Suite',
    category: 'Clinical',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%231E293B"/><stop offset="100%" stop-color="%230F172A"/></linearGradient></defs><rect width="320" height="180" fill="url(%23g1)"/><rect x="20" y="25" width="80" height="110" rx="4" fill="%2338BDF8" fill-opacity="0.15" stroke="%2338BDF8" stroke-opacity="0.2" stroke-width="2"/><rect x="220" y="40" width="80" height="50" rx="4" fill="%23334155" stroke="%2364748B" stroke-width="1.5"/><circle cx="260" cy="65" r="12" fill="%230EA5E9" fill-opacity="0.2"/><rect x="0" y="145" width="320" height="35" fill="%23182234"/><text x="160" y="168" fill="%2394A3B8" font-size="10" font-family="sans-serif" text-anchor="middle">Chekup247 Clinical Suite</text></svg>',
  },
  {
    id: 'modern-office',
    name: 'Modern Clinic Office',
    category: 'Professional',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><defs><linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%232A170F"/><stop offset="100%" stop-color="%231E100A"/></linearGradient></defs><rect width="320" height="180" fill="url(%23bg2)"/><rect x="30" y="30" width="110" height="90" rx="8" fill="%233E2114" stroke="%23DFAB62" stroke-opacity="0.3"/><circle cx="250" cy="50" r="28" fill="%23DFAB62" fill-opacity="0.15"/><rect x="0" y="145" width="320" height="35" fill="%23170B06"/><text x="160" y="168" fill="%23DFAB62" font-size="10" font-family="sans-serif" text-anchor="middle">Private Doctor Consultation</text></svg>',
  },
  {
    id: 'warm-interior',
    name: 'Warm Living Room',
    category: 'Home',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><defs><linearGradient id="bg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="%233F2E23"/><stop offset="100%" stop-color="%2322150D"/></linearGradient><radialGradient id="lamp" cx="80%" cy="30%" r="50%"><stop offset="0%" stop-color="%23FDE68A" stop-opacity="0.5"/><stop offset="100%" stop-color="%23D97706" stop-opacity="0"/></radialGradient></defs><rect width="320" height="180" fill="url(%23bg3)"/><circle cx="260" cy="55" r="70" fill="url(%23lamp)"/><rect x="0" y="140" width="320" height="40" fill="%231B0F09"/><text x="160" y="168" fill="%23FDE68A" font-size="10" font-family="sans-serif" text-anchor="middle">Warm Cozy Interior</text></svg>',
  },
  {
    id: 'studio-bokeh',
    name: 'Studio Soft Bokeh',
    category: 'Minimalist',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><defs><linearGradient id="bg4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%231E1B4B"/><stop offset="100%" stop-color="%23312E81"/></linearGradient></defs><rect width="320" height="180" fill="url(%23bg4)"/><circle cx="60" cy="50" r="35" fill="%23818CF8" fill-opacity="0.25"/><circle cx="240" cy="70" r="45" fill="%23C084FC" fill-opacity="0.2"/><circle cx="160" cy="120" r="55" fill="%2338BDF8" fill-opacity="0.18"/><text x="160" y="168" fill="%23C7D2FE" font-size="10" font-family="sans-serif" text-anchor="middle">Soft Blur Studio</text></svg>',
  },
];

export default function PatientConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const bookingId = params?.bookingId as string;

  const rawApiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const API_BASE = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase.replace(/\/+$/, '')}/api/v1`;
  const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace('/api/v1', '');

  // --------------------------------------------------------------------------
  // Core Lifecycle & State
  // --------------------------------------------------------------------------
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<ConsultationData | null>(null);
  const [doctorName, setDoctorName] = useState<string>('Doctor');
  const [doctorSpecialty, setDoctorSpecialty] = useState<string>('General Practitioner');
  const [isConsultationEnded, setIsConsultationEnded] = useState<boolean>(false);
  // Post-call review prompt
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [reviewInitialRating, setReviewInitialRating] = useState<number>(5);
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);
  const [showEndModal, setShowEndModal] = useState<boolean>(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [isEndingCall, setIsEndingCall] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // WebRTC & Daily.co State
  // --------------------------------------------------------------------------
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isDoctorConnected, setIsDoctorConnected] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [consultationMode, setConsultationMode] = useState<'video' | 'audio' | 'in_clinic'>('video');
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  useWakeLock(!!callObject && !isConsultationEnded);

  // Real Hardware Stream & Audio Metering
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [micVolumeLevel, setMicVolumeLevel] = useState<number>(0);
  const [isPatientSpeaking, setIsPatientSpeaking] = useState<boolean>(false);

  // Background Effects
  const [activeEffect, setActiveEffect] = useState<BackgroundEffectType>('none');
  const [selectedBgPreset, setSelectedBgPreset] = useState<string>('clinic-suite');
  const [customBgImage, setCustomBgImage] = useState<string | null>(null);
  const [showEffectsDrawer, setShowEffectsDrawer] = useState<boolean>(false);

  // Timer State (driven by server started_at and durationSeconds)
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number>(1800); // 30 min default
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [timerWarning, setTimerWarning] = useState<'normal' | 'warning_5min' | 'critical_1min'>('normal');

  // Doctor Time Extension Request State
  const [pendingExtension, setPendingExtension] = useState<ExtensionRequest | null>(null);
  const [isProcessingExtension, setIsProcessingExtension] = useState<boolean>(false);
  const [extensionNotice, setExtensionNotice] = useState<string | null>(null);
  // Set while the patient has been redirected to the payment gateway (new tab) and
  // we are waiting for the webhook-driven extension_confirmed event to land.
  const [awaitingExtensionPayment, setAwaitingExtensionPayment] = useState<{
    reference: string;
    authorizationUrl: string;
    amount: number;
    durationMinutes: number;
  } | null>(null);

  // Media Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // --------------------------------------------------------------------------
  // Timer Effect: Compute elapsed from server started_at in real time
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!startedAt) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - startedAt.getTime()) / 1000));
      setElapsedSeconds(elapsed);

      const remaining = Math.max(0, totalDurationSeconds - elapsed);
      if (remaining <= 60 && remaining > 0) {
        setTimerWarning('critical_1min');
      } else if (remaining <= 300) {
        setTimerWarning('warning_5min');
      } else {
        setTimerWarning('normal');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt, totalDurationSeconds]);

  const formatElapsed = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

  // --------------------------------------------------------------------------
  // Real Camera & Microphone Initialization
  // --------------------------------------------------------------------------
  const startRealMedia = useCallback(async (deviceId?: string) => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setHasCameraPermission(false);
        return null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setHasCameraPermission(true);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      if (!deviceId && videoDevices.length > 0) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }

      // Web Audio API: Real Microphone Volume Metering
      try {
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
        }

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.4;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            const normalized = Math.min(100, Math.round((avg / 128) * 100));
            setMicVolumeLevel(normalized);
            setIsPatientSpeaking(normalized > 14);
            animFrameRef.current = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        }
      } catch (audioErr) {
        console.warn('Web Audio mic visualizer fallback:', audioErr);
      }

      return stream;
    } catch (err) {
      console.warn('Camera/mic access info:', err);
      setHasCameraPermission(false);
      return null;
    }
  }, []);

  // --------------------------------------------------------------------------
  // Apply Background Effect via Daily.co processor
  // --------------------------------------------------------------------------
  const applyBackgroundEffect = useCallback(
    async (effect: BackgroundEffectType, presetId?: string, customImg?: string) => {
      setActiveEffect(effect);
      const chosenPreset = presetId || selectedBgPreset;
      const chosenCustom = customImg !== undefined ? customImg : customBgImage;

      if (callObject) {
        try {
          if (effect === 'blur-light') {
            await callObject.updateInputSettings({
              video: { processor: { type: 'background-blur', config: { strength: 0.4 } } },
            });
          } else if (effect === 'blur-heavy') {
            await callObject.updateInputSettings({
              video: { processor: { type: 'background-blur', config: { strength: 0.8 } } },
            });
          } else if (effect === 'virtual-image') {
            const preset = VIRTUAL_BACKGROUND_PRESETS.find((p) => p.id === chosenPreset);
            const url = chosenCustom || preset?.previewUrl || '';
            await callObject.updateInputSettings({
              video: { processor: { type: 'background-image', config: { url } } },
            });
          } else {
            await callObject.updateInputSettings({
              video: { processor: { type: 'none' } },
            });
          }
        } catch (err) {
          console.warn('Daily background processor fallback:', err);
        }
      }
    },
    [callObject, selectedBgPreset, customBgImage],
  );

  // --------------------------------------------------------------------------
  // WebSocket Connection for Real-Time Events
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!bookingId) return;

    const socket = io(`${WS_BASE}/consultations`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WS] Connected to consultation namespace');
      // Join the consultation room
      socket.emit('join_session', {
        bookingId,
        role: 'patient',
        userId: user?.id,
        userName: user?.fullName || 'Patient',
      });
    });

    // Doctor presence events
    socket.on('doctor_joined', (data: { userName?: string }) => {
      setIsDoctorConnected(true);
      if (data.userName) setDoctorName(data.userName);
    });

    socket.on('participant_left', (data: { role: string }) => {
      if (data.role === 'doctor') {
        setIsDoctorConnected(false);
      }
    });

    // Timer synchronization from server
    socket.on('timer_sync', (data: TimerSyncPayload) => {
      if (data.startedAt) {
        setStartedAt(new Date(data.startedAt));
      }
      if (data.durationSeconds) {
        setTotalDurationSeconds(data.durationSeconds);
      }
    });

    // Doctor-initiated time extension request
    socket.on('extension_requested', (data: ExtensionRequest) => {
      setPendingExtension(data);
    });

    // Extension confirmed (timer updated)
    socket.on('extension_confirmed', (data: {
      addedMinutes: number;
      newDurationSeconds: number;
      remainingSeconds: number;
      amount: number;
    }) => {
      setTotalDurationSeconds(data.newDurationSeconds);
      setPendingExtension(null);
      setIsProcessingExtension(false);
      setAwaitingExtensionPayment(null);
      setExtensionNotice(`+${data.addedMinutes} minutes added to your consultation`);
      setTimeout(() => setExtensionNotice(null), 6000);
    });

    // Extension declined confirmation
    socket.on('extension_declined', () => {
      setPendingExtension(null);
      setIsProcessingExtension(false);
    });

    // Extension payment failed
    socket.on('extension_payment_failed', (data: { message: string }) => {
      setIsProcessingExtension(false);
      setExtensionNotice(`Payment failed: ${data.message}`);
      setTimeout(() => setExtensionNotice(null), 6000);
    });

    // Doctor ends consultation
    socket.on('consultation_ended', () => {
      cleanupAndEnd();
    });

    // Prescription issued notification
    socket.on('prescription_issued', (data: { prescriptionId: string; doctorName: string }) => {
      setExtensionNotice(`Prescription issued by ${data.doctorName}`);
      setTimeout(() => setExtensionNotice(null), 6000);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, user?.id, user?.fullName, WS_BASE]);

  // --------------------------------------------------------------------------
  // Join Consultation & Daily.co WebRTC Session
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    let dailyCall: DailyCall | null = null;

    async function initSession() {
      try {
        // Start real hardware camera and mic immediately
        await startRealMedia();

        if (!bookingId) {
          setLoadError('No booking ID provided');
          setIsLoading(false);
          return;
        }

        // Step 1: Join the consultation via API to get room URL + meeting token
        const joinRes = await fetch(`${API_BASE}/consultations/${bookingId}/join`, {
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

        if (!joinRes.ok) {
          // Fallback: try GET to at least get consultation details
          const detailRes = await fetch(`${API_BASE}/consultations/${bookingId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (detailRes.ok && isMounted) {
            const data = await detailRes.json();
            setConsultation(data);
            if (data.doctor) {
              setDoctorName(data.doctor.name || 'Doctor');
              setDoctorSpecialty(data.doctor.specialty || 'General Practitioner');
            }
            if (data.started_at) {
              setStartedAt(new Date(data.started_at));
            }
          } else if (isMounted) {
            setLoadError('Unable to join consultation. Please check your booking.');
          }

          if (isMounted) setIsLoading(false);
          return;
        }

        if (!isMounted) return;

        const joinData: JoinResponse = await joinRes.json();
        setConsultation(joinData.consultation);
        const bookingMode = joinData.consultation?.booking?.consultation_mode;
        if (bookingMode === 'audio' || bookingMode === 'in_clinic' || bookingMode === 'video') {
          setConsultationMode(bookingMode);
          if (bookingMode !== 'video') setIsVideoMuted(true);
        }

        // Set doctor info from API response
        if (joinData.consultation.doctor) {
          setDoctorName(joinData.consultation.doctor.name || 'Doctor');
          setDoctorSpecialty(joinData.consultation.doctor.specialty || 'General Practitioner');
        }

        // Set server-authoritative started_at timestamp
        if (joinData.startedAt) {
          setStartedAt(new Date(joinData.startedAt));
        }

        // Step 2: Create Daily.co call object and join with meeting token
        if (joinData.roomUrl) {
          dailyCall = DailyIframe.createCallObject({
            videoSource: bookingMode === 'video',
            audioSource: true,
            subscribeToTracksAutomatically: true,
          });

          // Handle remote participant tracks (doctor video/audio)
          dailyCall.on('track-started', (ev: DailyEventObjectTrack) => {
            if (!isMounted) return;
            if (ev.participant && !ev.participant.local) {
              setIsDoctorConnected(true);
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
              setIsDoctorConnected(false);
            }
          });

          // Join with the secure meeting token from the backend
          await dailyCall.join({
            url: joinData.roomUrl,
            token: joinData.token,
          });

          if (isMounted) setCallObject(dailyCall);
        }
      } catch (err: any) {
        console.warn('Consultation session initialization:', err);
        if (isMounted) setLoadError(err.message || 'Failed to connect');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initSession();

    return () => {
      isMounted = false;
      if (dailyCall) {
        dailyCall.leave().catch(() => {});
        dailyCall.destroy().catch(() => {});
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [bookingId, token, API_BASE, startRealMedia, user?.fullName]);

  // --------------------------------------------------------------------------
  // Call Controls
  // --------------------------------------------------------------------------
  const toggleMic = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !next; });
    }
    if (callObject) callObject.setLocalAudio(!next);
  };

  const toggleVideo = () => {
    const next = !isVideoMuted;
    setIsVideoMuted(next);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = !next; });
    }
    if (callObject) callObject.setLocalVideo(!next);
  };

  const toggleSpeaker = () => {
    const next = !isSpeakerMuted;
    setIsSpeakerMuted(next);
    if (remoteAudioRef.current) remoteAudioRef.current.muted = next;
  };

  const toggleScreenShare = async () => {
    if (!callObject) { setIsSharingScreen(!isSharingScreen); return; }
    try {
      if (isSharingScreen) { await callObject.stopScreenShare(); setIsSharingScreen(false); }
      else { await callObject.startScreenShare(); setIsSharingScreen(true); }
    } catch { setIsSharingScreen(!isSharingScreen); }
  };

  const toggleFullscreen = () => {
    if (!workspaceRef.current) return;
    if (!document.fullscreenElement) {
      workspaceRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleSwitchCamera = async () => {
    if (availableCameras.length <= 1) return;
    const idx = availableCameras.findIndex((c) => c.deviceId === selectedCameraId);
    const next = availableCameras[(idx + 1) % availableCameras.length];
    setSelectedCameraId(next.deviceId);
    await startRealMedia(next.deviceId);
  };

  const handleUploadCustomBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setCustomBgImage(dataUrl);
      applyBackgroundEffect('virtual-image', undefined, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // --------------------------------------------------------------------------
  // Extension Consent Handling
  //
  // Paid extensions redirect to the payment gateway in a NEW TAB (no stored card).
  // To survive mobile popup-blockers, the tab must be opened SYNCHRONOUSLY inside
  // the click gesture — we open a blank tab up-front, then point it at the
  // Paystack URL once the async consent call returns. The call itself is never
  // torn down here; the timer only bumps when the webhook fires extension_confirmed.
  // --------------------------------------------------------------------------
  const handleExtensionConsent = async (approved: boolean) => {
    if (!pendingExtension || isProcessingExtension) return;
    setIsProcessingExtension(true);

    // Decline: no payment tab needed.
    if (!approved) {
      try {
        await fetch(`${API_BASE}/consultations/${bookingId}/extend/consent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            extensionId: pendingExtension.extensionId,
            approved: false,
            patientId: user?.id,
          }),
        });
      } catch { /* best-effort */ }
      setPendingExtension(null);
      setIsProcessingExtension(false);
      return;
    }

    // Approve. Pre-open a blank tab NOW (inside the user gesture) so mobile browsers
    // treat it as user-initiated and don't block it. We only navigate it if a paid
    // redirect is actually required.
    const isPaid = !(pendingExtension.isFree || Number(pendingExtension.amount) <= 0);
    let paymentTab: Window | null = null;
    if (isPaid) {
      paymentTab = window.open('', '_blank');
      if (paymentTab) {
        // Friendly interstitial while the checkout URL is fetched.
        paymentTab.document.write(
          '<title>Redirecting to payment…</title><body style="font-family:system-ui;background:#1E100A;color:#FAF6EE;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p>Preparing secure payment…</p></body>',
        );
      }
    }

    try {
      const res = await fetch(`${API_BASE}/consultations/${bookingId}/extend/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          extensionId: pendingExtension.extensionId,
          approved: true,
          patientId: user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (paymentTab) paymentTab.close();
        setExtensionNotice(data.message || 'Could not start the extension. Please try again.');
        setTimeout(() => setExtensionNotice(null), 6000);
        setIsProcessingExtension(false);
        return;
      }

      if (data.requires_payment && data.authorization_url) {
        // Send the pre-opened tab to Paystack; move UI into the waiting state.
        if (paymentTab) {
          paymentTab.location.href = data.authorization_url;
        } else {
          // Popup was blocked despite the gesture — fall back to same-tab is unsafe
          // (kills the call), so surface the link for the patient to open manually.
          window.open(data.authorization_url, '_blank');
        }
        setAwaitingExtensionPayment({
          reference: data.reference,
          authorizationUrl: data.authorization_url,
          amount: Number(data.amount ?? pendingExtension.amount),
          durationMinutes: pendingExtension.durationMinutes,
        });
        setPendingExtension(null);
        setIsProcessingExtension(false);
        return;
      }

      // Complimentary extension finalized inline — extension_confirmed will land shortly.
      if (paymentTab) paymentTab.close();
      setPendingExtension(null);
      setIsProcessingExtension(false);
    } catch (err: any) {
      if (paymentTab) paymentTab.close();
      setExtensionNotice(err.message || 'Extension request failed');
      setTimeout(() => setExtensionNotice(null), 6000);
      setIsProcessingExtension(false);
    }
  };

  // --------------------------------------------------------------------------
  // End / Leave Consultation
  // --------------------------------------------------------------------------
  const cleanupAndEnd = useCallback(async () => {
    try {
      if (callObject) {
        await callObject.leave().catch(() => {});
        await callObject.destroy().catch(() => {});
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    } catch { /* ignore */ }
    setPendingExtension(null);
    setIsConsultationEnded(true);
  }, [callObject]);

  const handleConfirmLeaveConsultation = async () => {
    setShowEndModal(false);
    setIsEndingCall(true);

    try {
      // Notify the backend that the patient is leaving
      await fetch(`${API_BASE}/consultations/${bookingId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      }).catch(() => {});

      await cleanupAndEnd();
    } catch {
      setIsConsultationEnded(true);
    }
  };

  const handleDownloadPrescription = () => {
    setDownloadNotice('Official e-prescription & clinical summary downloaded.');
    setTimeout(() => setDownloadNotice(null), 4500);
  };

  // --------------------------------------------------------------------------
  // Loading Screen
  // --------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', backgroundColor: '#1E100A', color: '#FAF6EE', fontFamily: 'var(--font-sans)' }}>
        <ChekupCrossLogo size={48} />
        <Loader2 size={36} className="animate-spin" style={{ color: '#E2B467' }} />
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 6px', color: '#FAF6EE' }}>
            Entering Private Consultation Room
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#D5C7B8', margin: 0 }}>
            Securing HD video link for booking #{bookingId}...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Error Screen
  // --------------------------------------------------------------------------
  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', backgroundColor: '#1E100A', color: '#FAF6EE', fontFamily: 'var(--font-sans)', padding: '24px' }}>
        <AlertCircle size={48} color="#EF4444" />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#FAF6EE' }}>
          Connection Issue
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#D5C7B8', margin: 0, textAlign: 'center', maxWidth: '400px' }}>
          {loadError}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 24px', borderRadius: '9999px', backgroundColor: '#E2B467', color: '#2A170F', fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}
          >
            Retry Connection
          </button>
          <Link
            href="/appointments"
            style={{ padding: '10px 24px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#FAF6EE', fontWeight: 700, fontSize: '0.875rem', border: '1px solid rgba(223,171,98,0.3)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
          >
            Back to Appointments
          </Link>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Post-Consultation Summary Screen
  // --------------------------------------------------------------------------
  if (isConsultationEnded) {
    return (
      <div style={{ minHeight: '100vh', width: '100vw', backgroundColor: '#FAF6EE', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', color: '#2A170F', fontFamily: 'var(--font-sans)' }}>
        <div style={{ maxWidth: '560px', width: '100%', backgroundColor: '#FFFFFF', borderRadius: '24px', border: '1px solid rgba(223,171,98,0.3)', boxShadow: '0 24px 60px rgba(42,23,15,0.1)', padding: '40px', textAlign: 'center' }}>
          <div style={{ width: '68px', height: '68px', borderRadius: '50%', backgroundColor: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#16A34A' }}>
            <CheckCircle2 size={38} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: '#2A170F', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Consultation Completed
          </h2>
          <p style={{ color: '#6B5E55', fontSize: '0.925rem', margin: '0 0 24px', lineHeight: 1.5 }}>
            Thank you for consulting with <strong>{doctorName}</strong>. Your care plan and prescription are ready.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', backgroundColor: '#FAF6EE', borderRadius: '16px', padding: '16px', marginBottom: '28px', textAlign: 'left', border: '1px solid rgba(223,171,98,0.2)' }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#8C7768', fontWeight: 700 }}>Duration</span>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#2A170F', marginTop: '2px' }}>{formatElapsed(elapsedSeconds)}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#8C7768', fontWeight: 700 }}>Reference</span>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#2A170F', marginTop: '2px' }}>#{bookingId?.substring(0, 8).toUpperCase()}</div>
            </div>
          </div>

          {/* Post-call review prompt — leave a rating for the doctor */}
          {!reviewSubmitted ? (
            <div style={{ backgroundColor: '#FFFDF9', border: '1px solid rgba(223,171,98,0.35)', borderRadius: '16px', padding: '18px 16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#2A170F', marginBottom: '4px' }}>
                How was your consultation?
              </div>
              <p style={{ fontSize: '0.8rem', color: '#6B5E55', margin: '0 0 12px', lineHeight: 1.45 }}>
                Leave a quick review for <strong>{doctorName}</strong> — it helps other patients.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                    onClick={() => {
                      setReviewInitialRating(n);
                      setShowReviewModal(true);
                    }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                  >
                    <Star size={30} color="#DFAB62" fill="rgba(223,171,98,0.18)" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setReviewInitialRating(5);
                  setShowReviewModal(true);
                }}
                style={{ marginTop: '10px', background: 'transparent', border: 'none', color: '#B88647', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Write a review →
              </button>
            </div>
          ) : (
            <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: '16px', padding: '14px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#16A34A', fontWeight: 700, fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} /> <span>Thanks for reviewing {doctorName}!</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={handleDownloadPrescription} style={{ width: '100%', padding: '14px 24px', borderRadius: '9999px', backgroundColor: '#E2B467', color: '#2A170F', fontWeight: 800, fontSize: '0.925rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', boxShadow: '0 6px 20px rgba(226,180,103,0.35)' }}>
              <Download size={18} />
              <span>Download e-Prescription & Care Plan</span>
            </button>
            <Link href="/appointments" style={{ width: '100%', padding: '13px 24px', borderRadius: '9999px', backgroundColor: '#2A170F', color: '#FAF6EE', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxSizing: 'border-box' }}>
              <span>Return to My Appointments</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {downloadNotice && (
            <div style={{ marginTop: '16px', fontSize: '0.825rem', color: '#16A34A', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Check size={14} /> <span>{downloadNotice}</span>
            </div>
          )}
        </div>

        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          bookingId={bookingId || ''}
          doctorName={doctorName}
          doctorSpecialty={doctorSpecialty}
          token={token}
          initialRating={reviewInitialRating}
          onReviewSubmitted={() => {
            setReviewSubmitted(true);
            setShowReviewModal(false);
          }}
        />
      </div>
    );
  }

  const currentBgPreset = VIRTUAL_BACKGROUND_PRESETS.find((p) => p.id === selectedBgPreset);
  const activeBgSource = customBgImage || currentBgPreset?.previewUrl;

  // Timer display color based on warning state
  const timerColor = timerWarning === 'critical_1min' ? '#EF4444' : timerWarning === 'warning_5min' ? '#F59E0B' : '#FAF6EE';
  const timerBorder = timerWarning === 'critical_1min' ? '1px solid rgba(239,68,68,0.5)' : timerWarning === 'warning_5min' ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(223,171,98,0.22)';

  // --------------------------------------------------------------------------
  // Main Patient Video-First Consultation Experience
  // --------------------------------------------------------------------------
  return (
    <div ref={workspaceRef} style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#120A06', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)', color: '#FAF6EE', userSelect: 'none' }}>
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadCustomBg} />

      {/* ====================================================================
          TOP HUD: 5 KEY METADATA ITEMS
          1. Doctor  2. Live Status  3. Timer  4. Topic/Booking  5. Patient
          ==================================================================== */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 30, background: 'linear-gradient(180deg, rgba(18,10,6,0.88) 0%, rgba(18,10,6,0.35) 60%, transparent 100%)', pointerEvents: 'none' }}>
        {/* LEFT: Doctor + Topic */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', pointerEvents: 'auto' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginRight: '6px' }} title="Chekup247">
            <ChekupCrossLogo size={24} />
          </Link>

          {/* 1. Consulting Doctor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 14px 5px 6px', borderRadius: '9999px', backgroundColor: 'rgba(30,16,10,0.75)', backdropFilter: 'blur(16px)', border: '1px solid rgba(223,171,98,0.3)', boxShadow: '0 4px 18px rgba(0,0,0,0.3)' }}>
            <img src="/images/doctor_sarah_profile.jpg" alt={doctorName} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #DFAB62' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/doctor_sarah_avatar.jpg'; }} />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF' }}>{doctorName}</div>
              <div style={{ fontSize: '0.7rem', color: '#DFAB62', fontWeight: 600 }}>{doctorSpecialty}</div>
            </div>
            {isDoctorConnected && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E', boxShadow: '0 0 6px #22C55E', marginLeft: '2px' }} />}
          </div>

          {/* 4. Topic / Booking */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '9999px', backgroundColor: 'rgba(30,16,10,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(223,171,98,0.2)', fontSize: '0.78rem', color: '#D5C7B8', fontWeight: 600 }}>
            <Stethoscope size={14} color="#DFAB62" />
            <span>{consultation?.booking?.status === 'confirmed' ? 'General Medicine' : 'Consultation'}</span>
            <span style={{ color: 'rgba(223,171,98,0.4)' }}>•</span>
            <span style={{ color: '#FAF6EE', fontWeight: 700 }}>#{bookingId?.substring(0, 8).toUpperCase()}</span>
          </div>
        </div>

        {/* CENTER: Live Status + Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', pointerEvents: 'auto' }}>
          {/* 2. Live Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '9999px', backgroundColor: 'rgba(20,12,8,0.78)', backdropFilter: 'blur(16px)', border: '1px solid rgba(34,197,94,0.35)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E', boxShadow: '0 0 10px #22C55E' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4ADE80', letterSpacing: '0.06em', textTransform: 'uppercase' }}>LIVE</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#FAF6EE' }}>
              <Shield size={12} color="#DFAB62" />
              <span>Encrypted</span>
            </div>
          </div>

          {/* 3. Timer (server-synchronized) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '9999px', backgroundColor: 'rgba(20,12,8,0.78)', backdropFilter: 'blur(16px)', border: timerBorder, fontSize: '0.85rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: timerColor, transition: 'all 0.3s ease' }}>
            <Clock size={14} color={timerWarning === 'critical_1min' ? '#EF4444' : '#DFAB62'} />
            <span>{formatElapsed(remainingSeconds)}</span>
            {startedAt && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{formatElapsed(totalDurationSeconds)}</span>
              </>
            )}
            {timerWarning === 'critical_1min' && <AlertTriangle size={13} color="#EF4444" style={{ marginLeft: '2px' }} />}
          </div>
        </div>

        {/* RIGHT: Patient Status + Leave */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'auto' }}>
          {/* 5. Patient Self-Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px 5px 6px', borderRadius: '9999px', backgroundColor: 'rgba(30,16,10,0.75)', backdropFilter: 'blur(16px)', border: isPatientSpeaking ? '1px solid #22C55E' : '1px solid rgba(223,171,98,0.25)', transition: 'border-color 0.2s ease' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2A170F', border: '1px solid #DFAB62', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <User size={14} color="#DFAB62" />
              {isPatientSpeaking && <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />}
            </div>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF' }}>{user?.fullName || 'Patient'}</div>
              <div style={{ fontSize: '0.675rem', color: isAudioMuted ? '#EF4444' : isPatientSpeaking ? '#4ADE80' : '#DFAB62', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>{isAudioMuted ? 'Muted' : isPatientSpeaking ? 'Speaking...' : 'Mic Active'}</span>
                {!isAudioMuted && (
                  <span style={{ display: 'inline-block', width: '16px', height: '4px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${Math.min(100, micVolumeLevel * 1.5)}%`, backgroundColor: '#22C55E', transition: 'width 0.1s linear' }} />
                  </span>
                )}
              </div>
            </div>
          </div>

          </div>
      </div>

      {/* ====================================================================
          NOTIFICATION TOASTS (Extension confirmed, etc.)
          ==================================================================== */}
      {extensionNotice && (
        <div style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', padding: '10px 24px', borderRadius: '12px', backgroundColor: 'rgba(20,12,8,0.9)', backdropFilter: 'blur(16px)', border: '1px solid rgba(223,171,98,0.4)', fontSize: '0.85rem', fontWeight: 700, color: '#DFAB62', zIndex: 45, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
          <TimerReset size={16} /> <span>{extensionNotice}</span>
        </div>
      )}

      {/* ====================================================================
          MAIN VIDEO CONTAINER
          ==================================================================== */}
      <div style={{ position: 'relative', flex: 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Remote Doctor Video */}
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#150B07' }}>
          <img src="/images/doctor_consultation_video.jpg" alt={doctorName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <video ref={remoteVideoRef} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: isDoctorConnected && remoteVideoRef.current?.srcObject ? 'block' : 'none' }} />


        </div>

        {/* Patient Self-View PiP */}
        <div style={{ position: 'absolute', bottom: '96px', right: '28px', width: '260px', height: '168px', borderRadius: '18px', overflow: 'hidden', backgroundColor: '#1E100A', border: isPatientSpeaking ? '2px solid #22C55E' : '2px solid rgba(223,171,98,0.45)', boxShadow: '0 14px 40px rgba(0,0,0,0.65)', zIndex: 25, transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
          {activeEffect === 'virtual-image' && activeBgSource && !isVideoMuted && (
            <img src={activeBgSource} alt="Virtual BG" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }} />
          )}
          <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: isVideoMuted ? 'none' : 'block', zIndex: 2, filter: activeEffect === 'blur-light' ? 'blur(6px)' : activeEffect === 'blur-heavy' ? 'blur(16px)' : 'none', transition: 'filter 0.3s ease', opacity: activeEffect === 'virtual-image' ? 0.92 : 1 }} />

          {isVideoMuted && (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A170F', gap: '8px', zIndex: 3, position: 'relative' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'rgba(223,171,98,0.15)', border: '1.5px solid #DFAB62', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={28} color="#DFAB62" />
              </div>
              <span style={{ fontSize: '0.78rem', color: '#D5C7B8', fontWeight: 600 }}>Camera Off</span>
            </div>
          )}

          {hasCameraPermission === false && !isVideoMuted && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(20,12,8,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', textAlign: 'center', zIndex: 5 }}>
              <AlertCircle size={24} color="#DFAB62" style={{ marginBottom: '6px' }} />
              <span style={{ fontSize: '0.72rem', color: '#FAF6EE', fontWeight: 600 }}>Camera not detected</span>
              <button onClick={() => startRealMedia()} style={{ marginTop: '8px', padding: '4px 10px', borderRadius: '9999px', backgroundColor: '#DFAB62', border: 'none', color: '#2A170F', fontSize: '0.675rem', fontWeight: 700, cursor: 'pointer' }}>
                Grant Access
              </button>
            </div>
          )}

          {/* Self-view label */}
          <div style={{ position: 'absolute', bottom: '8px', left: '8px', right: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(20,12,8,0.82)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FFFFFF' }}>You</span>
              {activeEffect !== 'none' && (
                <span style={{ fontSize: '0.625rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(223,171,98,0.25)', color: '#DFAB62', fontWeight: 700 }}>
                  {activeEffect === 'blur-light' ? 'Soft Blur' : activeEffect === 'blur-heavy' ? 'Strong Blur' : 'Virtual BG'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {availableCameras.length > 1 && (
                <button onClick={handleSwitchCamera} title="Switch Camera" style={{ background: 'none', border: 'none', color: '#DFAB62', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  <SwitchCamera size={14} />
                </button>
              )}
              {isAudioMuted ? <MicOff size={13} color="#EF4444" /> : <Mic size={13} color={isPatientSpeaking ? '#4ADE80' : '#DFAB62'} />}
            </div>
          </div>
        </div>

        {/* ================================================================
            EFFECTS DRAWER
            ================================================================ */}
        {showEffectsDrawer && (
          <div style={{ position: 'absolute', bottom: '96px', left: '50%', transform: 'translateX(-50%)', width: '460px', maxWidth: '92vw', backgroundColor: '#1E100A', border: '1.5px solid rgba(223,171,98,0.35)', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.75)', padding: '20px', zIndex: 40, backdropFilter: 'blur(20px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(223,171,98,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#DFAB62" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>Video Background & Privacy</h3>
              </div>
              <button onClick={() => setShowEffectsDrawer(false)} style={{ background: 'none', border: 'none', color: '#D5C7B8', cursor: 'pointer', padding: '4px', display: 'flex' }}><X size={18} /></button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#DFAB62', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Background Blur</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {([
                  { key: 'none' as BackgroundEffectType, label: 'No Blur', icon: Camera },
                  { key: 'blur-light' as BackgroundEffectType, label: 'Slight Blur', icon: Sliders },
                  { key: 'blur-heavy' as BackgroundEffectType, label: 'Strong Blur', icon: Layers },
                ]).map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => applyBackgroundEffect(key)} style={{ padding: '10px 8px', borderRadius: '12px', border: activeEffect === key ? '2px solid #DFAB62' : '1px solid rgba(223,171,98,0.2)', backgroundColor: activeEffect === key ? 'rgba(223,171,98,0.15)' : 'rgba(255,255,255,0.04)', color: '#FAF6EE', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <Icon size={16} color={activeEffect === key ? '#DFAB62' : '#D5C7B8'} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#DFAB62', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Virtual Backgrounds</label>
                <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#DFAB62', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                  <ImageIcon size={13} /> <span>Upload</span>
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {VIRTUAL_BACKGROUND_PRESETS.map((preset) => {
                  const sel = activeEffect === 'virtual-image' && selectedBgPreset === preset.id;
                  return (
                    <div key={preset.id} onClick={() => { setSelectedBgPreset(preset.id); applyBackgroundEffect('virtual-image', preset.id); }}
                      style={{ borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', position: 'relative', border: sel ? '2px solid #DFAB62' : '1px solid rgba(223,171,98,0.2)', boxShadow: sel ? '0 0 14px rgba(223,171,98,0.35)' : 'none', transition: 'all 0.18s ease' }}>
                      <img src={preset.previewUrl} alt={preset.name} style={{ width: '100%', height: '76px', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 8px', backgroundColor: 'rgba(20,12,8,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#FFFFFF' }}>{preset.name}</span>
                        {sel && <Check size={12} color="#DFAB62" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            FLOATING CALL CONTROL BAR
            ================================================================ */}
        <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', borderRadius: '9999px', backgroundColor: 'rgba(26,15,10,0.88)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(223,171,98,0.35)', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', zIndex: 30 }}>
          {/* Mic */}
          <button onClick={toggleMic} title={isAudioMuted ? 'Unmute' : 'Mute'} style={{ width: '46px', height: '46px', borderRadius: '50%', border: isAudioMuted ? '1.5px solid #EF4444' : isPatientSpeaking ? '2px solid #22C55E' : '1px solid rgba(223,171,98,0.3)', backgroundColor: isAudioMuted ? 'rgba(239,68,68,0.2)' : isPatientSpeaking ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)', color: isAudioMuted ? '#EF4444' : isPatientSpeaking ? '#4ADE80' : '#FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.18s ease', boxShadow: isPatientSpeaking ? '0 0 14px rgba(34,197,94,0.4)' : 'none' }}>
            {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          {/* Camera */}
          <button onClick={toggleVideo} title={isVideoMuted ? 'Camera On' : 'Camera Off'} style={{ width: '46px', height: '46px', borderRadius: '50%', border: isVideoMuted ? '1.5px solid #EF4444' : '1px solid rgba(223,171,98,0.3)', backgroundColor: isVideoMuted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)', color: isVideoMuted ? '#EF4444' : '#FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.18s ease' }}>
            {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
          {/* Effects */}
          <button onClick={() => setShowEffectsDrawer(!showEffectsDrawer)} title="Video Effects" style={{ width: '46px', height: '46px', borderRadius: '50%', border: activeEffect !== 'none' || showEffectsDrawer ? '1.5px solid #DFAB62' : '1px solid rgba(223,171,98,0.3)', backgroundColor: activeEffect !== 'none' || showEffectsDrawer ? 'rgba(223,171,98,0.25)' : 'rgba(255,255,255,0.08)', color: activeEffect !== 'none' || showEffectsDrawer ? '#DFAB62' : '#FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.18s ease', position: 'relative' }}>
            <Sparkles size={20} />
            {activeEffect !== 'none' && <span style={{ position: 'absolute', top: '3px', right: '3px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DFAB62', boxShadow: '0 0 6px #DFAB62' }} />}
          </button>
          {/* Speaker */}
          <button onClick={toggleSpeaker} title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'} style={{ width: '46px', height: '46px', borderRadius: '50%', border: isSpeakerMuted ? '1.5px solid #EF4444' : '1px solid rgba(223,171,98,0.3)', backgroundColor: isSpeakerMuted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)', color: isSpeakerMuted ? '#EF4444' : '#FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.18s ease' }}>
            {isSpeakerMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          {/* Screen Share */}
          <button onClick={toggleScreenShare} title={isSharingScreen ? 'Stop Share' : 'Share Screen'} style={{ width: '46px', height: '46px', borderRadius: '50%', border: isSharingScreen ? '1.5px solid #DFAB62' : '1px solid rgba(223,171,98,0.3)', backgroundColor: isSharingScreen ? 'rgba(223,171,98,0.25)' : 'rgba(255,255,255,0.08)', color: isSharingScreen ? '#DFAB62' : '#FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.18s ease' }}>
            <Share2 size={20} />
          </button>
          {/* Fullscreen */}
          <button onClick={toggleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} style={{ width: '46px', height: '46px', borderRadius: '50%', border: '1px solid rgba(223,171,98,0.3)', backgroundColor: 'rgba(255,255,255,0.08)', color: '#FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.18s ease' }}>
            {isFullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
          </button>
          {/* End Call */}
          <button onClick={() => setShowEndModal(true)} title="End Consultation" style={{ height: '46px', padding: '0 20px', borderRadius: '9999px', border: 'none', backgroundColor: '#DC2626', color: '#FFFFFF', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 18px rgba(220,38,38,0.45)', transition: 'all 0.2s ease', marginLeft: '4px' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#B91C1C')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#DC2626')}>
            <PhoneOff size={18} /> <span>End Call</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          DOCTOR TIME EXTENSION CONSENT MODAL
          ==================================================================== */}
      {pendingExtension && !isConsultationEnded && !!callObject && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ maxWidth: '440px', width: '100%', backgroundColor: '#1E100A', borderRadius: '24px', border: '1.5px solid rgba(223,171,98,0.4)', padding: '30px', boxShadow: '0 25px 60px rgba(0,0,0,0.8)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(223,171,98,0.15)', border: '1.5px solid rgba(223,171,98,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#DFAB62' }}>
              <TimerReset size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>
              Time Extension Request
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#D5C7B8', margin: '0 0 20px', lineHeight: 1.5 }}>
              <strong style={{ color: '#DFAB62' }}>{pendingExtension.doctorName || doctorName}</strong> is offering
              to extend your consultation by{' '}
              <strong style={{ color: '#FFFFFF' }}>+{pendingExtension.durationMinutes} minutes</strong>.
            </p>

            {pendingExtension.isFree || Number(pendingExtension.amount) <= 0 ? (
              <div style={{ backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: '14px', padding: '14px', marginBottom: '20px', border: '1px solid rgba(34,197,94,0.35)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Sparkles size={16} color="#4ADE80" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4ADE80' }}>
                    Complimentary Extension (No Charge)
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#D5C7B8', margin: 0 }}>
                  This extension is offered free of charge. Your card will not be debited.
                </p>
              </div>
            ) : (
              <div style={{ backgroundColor: 'rgba(223,171,98,0.1)', borderRadius: '14px', padding: '14px', marginBottom: '20px', border: '1px solid rgba(223,171,98,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CreditCard size={16} color="#DFAB62" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FAF6EE' }}>
                    R{Number(pendingExtension.amount).toFixed(2)}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#8C7768', margin: 0 }}>
                  You&apos;ll be taken to our secure payment page in a new tab. Keep this
                  call tab open — your consultation continues the moment payment succeeds.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleExtensionConsent(false)}
                disabled={isProcessingExtension}
                style={{ flex: 1, padding: '12px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(223,171,98,0.25)', color: '#FAF6EE', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', opacity: isProcessingExtension ? 0.5 : 1 }}
              >
                Decline
              </button>
              <button
                onClick={() => handleExtensionConsent(true)}
                disabled={isProcessingExtension}
                style={{ flex: 1, padding: '12px', borderRadius: '9999px', backgroundColor: '#E2B467', border: 'none', color: '#2A170F', fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: isProcessingExtension ? 0.7 : 1 }}
              >
                {isProcessingExtension ? <Loader2 size={16} className="animate-spin" /> : null}
                <span>
                  {isProcessingExtension
                    ? 'Processing...'
                    : pendingExtension.isFree || Number(pendingExtension.amount) <= 0
                    ? 'Accept Free Extension'
                    : `Consent & Pay R${Number(pendingExtension.amount).toFixed(2)}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          AWAITING EXTENSION PAYMENT (redirect in progress)
          Shown after the patient is sent to the payment gateway in a new tab.
          The call keeps running; extension_confirmed clears this automatically.
          ==================================================================== */}
      {awaitingExtensionPayment && !isConsultationEnded && !!callObject && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ maxWidth: '440px', width: '100%', backgroundColor: '#1E100A', borderRadius: '24px', border: '1.5px solid rgba(223,171,98,0.4)', padding: '30px', boxShadow: '0 25px 60px rgba(0,0,0,0.8)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(223,171,98,0.15)', border: '1.5px solid rgba(223,171,98,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#DFAB62' }}>
              <Loader2 size={28} className="animate-spin" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>
              Waiting for Payment
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#D5C7B8', margin: '0 0 20px', lineHeight: 1.5 }}>
              Complete the{' '}
              <strong style={{ color: '#DFAB62' }}>R{awaitingExtensionPayment.amount.toFixed(2)}</strong>{' '}
              payment in the payment tab to add{' '}
              <strong style={{ color: '#FFFFFF' }}>+{awaitingExtensionPayment.durationMinutes} minutes</strong>.
              Your consultation is still live — <strong style={{ color: '#FAF6EE' }}>keep this tab open</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Re-open the payment page (mobile: the tab may have been backgrounded/closed). */}
              <button
                onClick={() => window.open(awaitingExtensionPayment.authorizationUrl, '_blank')}
                style={{ width: '100%', padding: '12px', borderRadius: '9999px', backgroundColor: '#E2B467', border: 'none', color: '#2A170F', fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <CreditCard size={16} /> <span>Re-open payment page</span>
              </button>
              <button
                onClick={() => setAwaitingExtensionPayment(null)}
                style={{ width: '100%', padding: '12px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(223,171,98,0.25)', color: '#FAF6EE', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Return to call
              </button>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#8C7768', margin: '14px 0 0' }}>
              The extra time is added automatically once payment is confirmed.
            </p>
          </div>
        </div>
      )}

      {/* ====================================================================
          END CONSULTATION CONFIRMATION MODAL
          ==================================================================== */}
      {showEndModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ maxWidth: '440px', width: '100%', backgroundColor: '#1E100A', borderRadius: '24px', border: '1.5px solid rgba(223,171,98,0.35)', padding: '30px', boxShadow: '0 25px 60px rgba(0,0,0,0.8)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(220,38,38,0.15)', border: '1.5px solid rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#EF4444' }}>
              <PhoneOff size={26} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>End Consultation?</h3>
            <p style={{ fontSize: '0.875rem', color: '#D5C7B8', margin: '0 0 24px', lineHeight: 1.4 }}>
              Are you sure you want to leave your consultation with {doctorName}?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowEndModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(223,171,98,0.25)', color: '#FAF6EE', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                Resume Call
              </button>
              <button onClick={handleConfirmLeaveConsultation} disabled={isEndingCall} style={{ flex: 1, padding: '12px', borderRadius: '9999px', backgroundColor: '#DC2626', border: 'none', color: '#FFFFFF', fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: isEndingCall ? 0.7 : 1 }}>
                {isEndingCall ? <Loader2 size={16} className="animate-spin" /> : null}
                <span>{isEndingCall ? 'Leaving...' : 'Leave Room'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
