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
  Eye,
  MoreHorizontal,
  Share2,
  HelpCircle,
  ArrowRight,
  FileDown,
  ChevronLeft,
  Settings,
  PanelRightClose,
  PanelRightOpen,
  ClipboardList,
  AlertCircle,
  Sparkles,
  TimerReset,
  ArrowLeftRight,
  Grid,
  Move,
  Expand,
  Shrink,
  Layers,
  Sliders,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import DailyIframe, { DailyCall, DailyEventObjectTrack } from '@daily-co/daily-js';
import { io, Socket } from 'socket.io-client';
import { useDoctorAuth } from '../../../context/DoctorAuthContext';
import { toastSuccess, toastError, errorMessage } from '../../../lib/toast';
import { ChekupCrossLogo } from '../../../components/common/ChekupCrossLogo';
import { useWakeLock } from '../../../lib/hooks/useWakeLock';

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
    consultation_mode?: 'video' | 'audio' | 'in_clinic';
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

interface JoinResponse {
  consultation: ConsultationDetail;
  roomUrl: string;
  token: string;
  startedAt: string | null;
  isFirstParticipant: boolean;
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

export type BackgroundEffectType = 'none' | 'blur-light' | 'blur-heavy' | 'virtual-image';

interface VirtualBackgroundPreset {
  id: string;
  name: string;
  category: string;
  previewUrl: string;
}

const VIRTUAL_BACKGROUND_PRESETS: VirtualBackgroundPreset[] = [
  {
    id: 'clinic-suite',
    name: 'Medical Suite',
    category: 'Clinical',
    previewUrl: '/images/backgrounds/clinic-suite.png',
  },
  {
    id: 'modern-office',
    name: 'Modern Clinic Office',
    category: 'Professional',
    previewUrl: '/images/backgrounds/modern-office.png',
  },
  {
    id: 'warm-interior',
    name: 'Warm Living Room',
    category: 'Home',
    previewUrl: '/images/backgrounds/warm-interior.png',
  },
  {
    id: 'studio-bokeh',
    name: 'Studio Soft Bokeh',
    category: 'Minimalist',
    previewUrl: '/images/backgrounds/studio-bokeh.png',
  },
];

const PIP_DIMENSIONS: Record<'sm' | 'md' | 'lg', { width: string; height: string }> = {
  sm: { width: '180px', height: '120px' },
  md: { width: '270px', height: '180px' },
  lg: { width: '380px', height: '250px' },
};

const CORNER_STYLES: Record<string, React.CSSProperties> = {
  'bottom-right': { bottom: '78px', right: '16px' },
  'bottom-left': { bottom: '78px', left: '16px' },
  'top-right': { top: '56px', right: '16px' },
  'top-left': { top: '56px', left: '16px' },
};

export default function DoctorConsultationWorkspace() {
  const params = useParams();
  const router = useRouter();
  const { doctor, token } = useDoctorAuth();
  const bookingId = (params?.bookingId as string) || 'demo-booking-1';

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:4000/api/v1'
      : 'http://localhost:4000/api/v1');

  // --------------------------------------------------------------------------
  // UI & Lifecycle States
  // --------------------------------------------------------------------------
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [consultation, setConsultation] = useState<ConsultationDetail | null>(null);
  const [isConsultationEnded, setIsConsultationEnded] = useState<boolean>(false);
  const [tabletDrawerOpen, setTabletDrawerOpen] = useState<boolean>(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'video' | 'patient' | 'notes' | 'prescription'>('video');

  // Video & Controls State
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isVideoFullView, setIsVideoFullView] = useState<boolean>(false);
  const videoStageRef = useRef<HTMLDivElement | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [isPatientConnected, setIsPatientConnected] = useState<boolean>(false);
  const [isPatientVideoActive, setIsPatientVideoActive] = useState<boolean>(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // True once a Daily track is actually attached to the <video> element.
  // (Reading ref.current.srcObject during render is unreliable — it doesn't
  // trigger re-renders — so track attachment is mirrored in state.)
  const [hasRemoteVideo, setHasRemoteVideo] = useState<boolean>(false);
  const [hasLocalVideo, setHasLocalVideo] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Dynamic Video Layout & PiP Customization States
  const [videoLayout, setVideoLayout] = useState<'pip' | 'grid'>('pip');
  const [pipSize, setPipSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [pipCorner, setPipCorner] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>('bottom-right');
  const [isSwapped, setIsSwapped] = useState<boolean>(false);

  // Background Effects State
  const [activeEffect, setActiveEffect] = useState<BackgroundEffectType>('none');
  const [selectedBgPreset, setSelectedBgPreset] = useState<string>('clinic-suite');
  const [customBgImage, setCustomBgImage] = useState<string | null>(null);
  const [showEffectsDrawer, setShowEffectsDrawer] = useState<boolean>(false);
  const [backgroundNotice, setBackgroundNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Clinical Workspace Tabs: 'notes' | 'instructions' | 'diagnosis' | 'prescription' | 'followup'
  const [activeClinicalTab, setActiveClinicalTab] = useState<'notes' | 'instructions' | 'diagnosis' | 'prescription' | 'followup'>('notes');

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
  useWakeLock(!showSummaryModal);
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
  const localTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteAudioTrackRef = useRef<MediaStreamTrack | null>(null);
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
  // WebRTC Media Synchronization (Daily.co Call Object)
  // --------------------------------------------------------------------------
  const syncDailyTracks = useCallback((call: DailyCall | null) => {
    if (!call) return;
    try {
      const participants = call.participants();
      if (!participants) return;

      // 1. Doctor (Local participant)
      const local = participants.local;
      if (local) {
        const vTrack = local.tracks?.video?.persistentTrack || local.tracks?.video?.track;
        const vState = local.tracks?.video?.state;
        const isPlayable = Boolean(vTrack && (vState === 'playable' || local.video) && vState !== 'off' && vState !== 'blocked');

        if (vTrack) {
          localTrackRef.current = vTrack;
          if (localVideoRef.current) {
            const currentStream = localVideoRef.current.srcObject as MediaStream | null;
            if (!currentStream || !currentStream.getTracks().includes(vTrack)) {
              localVideoRef.current.srcObject = new MediaStream([vTrack]);
            }
            localVideoRef.current.play().catch(() => {});
          }
        }
        setHasLocalVideo(isPlayable && Boolean(vTrack));
      }

      // 2. Patient (Remote participant)
      const remotes = Object.values(participants).filter((p) => !p.local);
      if (remotes.length > 0) {
        const remote = remotes[0];
        setIsPatientConnected(true);
        const rvTrack = remote.tracks?.video?.persistentTrack || remote.tracks?.video?.track;
        const raTrack = remote.tracks?.audio?.persistentTrack || remote.tracks?.audio?.track;
        const rvState = remote.tracks?.video?.state;
        const isRemotePlayable = Boolean(rvTrack && (rvState === 'playable' || remote.video) && rvState !== 'off' && rvState !== 'blocked');

        setIsPatientVideoActive(isRemotePlayable);
        if (rvTrack) {
          remoteVideoTrackRef.current = rvTrack;
          setHasRemoteVideo(isRemotePlayable);
          if (remoteVideoRef.current) {
            const currentStream = remoteVideoRef.current.srcObject as MediaStream | null;
            if (!currentStream || !currentStream.getTracks().includes(rvTrack)) {
              remoteVideoRef.current.srcObject = new MediaStream([rvTrack]);
            }
            remoteVideoRef.current.play().catch(() => {});
          }
        } else {
          setHasRemoteVideo(false);
        }

        if (raTrack) {
          remoteAudioTrackRef.current = raTrack;
          if (remoteAudioRef.current) {
            const currentStream = remoteAudioRef.current.srcObject as MediaStream | null;
            if (!currentStream || !currentStream.getTracks().includes(raTrack)) {
              remoteAudioRef.current.srcObject = new MediaStream([raTrack]);
            }
            remoteAudioRef.current.play().catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn('Daily sync tracks note:', e);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Apply Background Effect via Daily.co processor
  // --------------------------------------------------------------------------
  const applyBackgroundEffect = useCallback(
    async (effect: BackgroundEffectType, presetId?: string, customImg?: string, customBuffer?: ArrayBuffer) => {
      setActiveEffect(effect);
      const chosenPreset = presetId || selectedBgPreset;
      if (presetId) setSelectedBgPreset(presetId);

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
            let source: string | ArrayBuffer = '';
            if (customBuffer) {
              source = customBuffer;
            } else if (customImg && customImg.startsWith('data:')) {
              const res = await fetch(customImg);
              source = await res.arrayBuffer();
            } else {
              const preset = VIRTUAL_BACKGROUND_PRESETS.find((p) => p.id === chosenPreset);
              const path = preset?.previewUrl || '/images/backgrounds/clinic-suite.png';
              source = `${window.location.origin}${path}`;
            }

            await callObject.updateInputSettings({
              video: {
                processor: {
                  type: 'background-image',
                  config: { source },
                },
              },
            });
          } else {
            await callObject.updateInputSettings({
              video: { processor: { type: 'none' } },
            });
          }
          // Force track synchronization after input settings update
          syncDailyTracks(callObject);
        } catch (err: any) {
          console.warn('Daily background processor exception:', err);
          setBackgroundNotice('Background effect could not be activated on this camera. Hardware processor unavailable.');
          setTimeout(() => setBackgroundNotice(null), 5000);
        }
      }
    },
    [callObject, selectedBgPreset, syncDailyTracks],
  );

  const handleUploadCustomBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = async () => {
      const buffer = fileReader.result as ArrayBuffer;
      const urlReader = new FileReader();
      urlReader.onload = () => {
        const dataUrl = urlReader.result as string;
        setCustomBgImage(dataUrl);
        applyBackgroundEffect('virtual-image', undefined, dataUrl, buffer);
      };
      urlReader.readAsDataURL(file);
    };
    fileReader.readAsArrayBuffer(file);
  };

  // --------------------------------------------------------------------------
  // Initial Load & Daily.co WebRTC Initialization
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    let dailyCall: DailyCall | null = null;

    async function initWorkspace() {
      try {
        if (!(bookingId && token)) {
          return;
        }

        // 1) Load consultation context (clinical notes, patient records)
        const res = await fetch(`${API_BASE}/consultations/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          if (isMounted) {
            setLoadError(
              errData?.message ||
                'Unable to load this consultation. It may have been cancelled or the room is not provisioned yet.',
            );
          }
          return;
        }
        const data = await res.json();
        if (isMounted) {
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
        }

        if (data?.booking?.consultation_mode === 'in_clinic') {
          if (isMounted) {
            setLoadError('This booking is an in-clinic appointment and does not use a video session.');
          }
          return;
        }

        // 2) Join the room through the API: stamps presence and returns a real
        //    meeting token. Never join from a raw room_url without a token.
        const joinRes = await fetch(`${API_BASE}/consultations/${bookingId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            role: 'doctor',
            userName: doctor?.fullName || 'Consulting Doctor',
          }),
        });
        if (!joinRes.ok) {
          const errData = await joinRes.json().catch(() => null);
          if (isMounted) {
            setCallError(
              errData?.message ||
                'Unable to join the video consultation room. The video service may be unavailable.',
            );
          }
          return;
        }
        const joinData: JoinResponse = await joinRes.json();
        if (joinData?.consultation && isMounted) {
          setConsultation(joinData.consultation);
        }
        if (joinData?.startedAt && isMounted) {
          const startedMs = new Date(joinData.startedAt).getTime();
          const diffSec = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
          setElapsedSeconds(diffSec);
        }
        if (!(joinData?.roomUrl && joinData?.token)) {
          if (isMounted) {
            setCallError('The consultation room is not available. Please contact support.');
          }
          return;
        }

        const consultationMode =
          joinData?.consultation?.booking?.consultation_mode ??
          data?.booking?.consultation_mode;
        dailyCall = DailyIframe.createCallObject({
          videoSource: consultationMode !== 'audio',
          audioSource: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } as any,
          subscribeToTracksAutomatically: true,
        });

        dailyCall.on('joined-meeting', () => {
          if (!isMounted) return;
          syncDailyTracks(dailyCall);
        });

        dailyCall.on('track-started', () => {
          if (!isMounted) return;
          syncDailyTracks(dailyCall);
        });

        dailyCall.on('track-stopped', (ev: DailyEventObjectTrack) => {
          if (!isMounted) return;
          if (ev.participant?.local && ev.track.kind === 'video') {
            setHasLocalVideo(false);
          } else if (ev.participant && !ev.participant.local && ev.track.kind === 'video') {
            setIsPatientVideoActive(false);
            setHasRemoteVideo(false);
          }
          syncDailyTracks(dailyCall);
        });

        dailyCall.on('participant-joined', (ev) => {
          if (!isMounted) return;
          if (ev.participant && !ev.participant.local) {
            setIsPatientConnected(true);
          }
          syncDailyTracks(dailyCall);
        });

        dailyCall.on('participant-updated', () => {
          if (!isMounted) return;
          syncDailyTracks(dailyCall);
        });

        dailyCall.on('participant-left', (ev) => {
          if (!isMounted) return;
          if (ev.participant && !ev.participant.local) {
            setIsPatientConnected(false);
            setIsPatientVideoActive(false);
            setHasRemoteVideo(false);
            remoteVideoTrackRef.current = null;
            remoteAudioTrackRef.current = null;
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
            if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
          }
        });

        dailyCall.on('input-settings-updated', () => {
          if (!isMounted) return;
          syncDailyTracks(dailyCall);
        });

        // Surface camera acquisition failures (e.g. camera held by another
        // app/tab) instead of failing silently with a black tile.
        dailyCall.on('camera-error' as any, (ev: any) => {
          if (!isMounted) return;
          console.warn('Daily camera-error:', ev?.errorMsg || ev);
          setCameraError(
            'Camera unavailable — it may be in use by another app or browser tab. Audio continues.',
          );
        });
        dailyCall.on('error' as any, (ev: any) => {
          console.warn('Daily error:', ev?.errorMsg || ev);
        });

        await dailyCall.join({ url: joinData.roomUrl, token: joinData.token });

        // WebRTC Encoding & Latency Optimization
        try {
          await dailyCall.updateSendSettings({
            video: {
              maxQuality: 'medium',
              allowAdaptiveLayers: true,
              encodings: {
                low: { maxBitrate: 180000, maxFramerate: 20, scaleResolutionDownBy: 2.0 },
                medium: { maxBitrate: 550000, maxFramerate: 24, scaleResolutionDownBy: 1.0 },
                high: { maxBitrate: 1200000, maxFramerate: 30, scaleResolutionDownBy: 1.0 },
              },
            },
          });
        } catch (sendErr) {
          console.warn('Daily updateSendSettings note:', sendErr);
        }

        if (isMounted) {
          setCallObject(dailyCall);
          syncDailyTracks(dailyCall);
        }
      } catch (err: any) {
        console.warn('Consultation initialization failed:', err);
        if (isMounted) {
          setCallError(errorMessage(err, 'Could not connect to the video consultation room.'));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initWorkspace();

    return () => {
      isMounted = false;
      setHasRemoteVideo(false);
      setHasLocalVideo(false);
      if (dailyCall) {
        dailyCall.leave().catch(() => {});
        dailyCall.destroy().catch(() => {});
      }
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [bookingId, token, API_BASE, doctor?.fullName, syncDailyTracks]);

  // Media elements only mount after the loading gate clears, but Daily can
  // start tracks during join — attach anything buffered once they exist.
  useEffect(() => {
    if (isLoading || loadError || isConsultationEnded) return;
    if (callObject) {
      syncDailyTracks(callObject);
    } else {
      if (localTrackRef.current && localVideoRef.current && !localVideoRef.current.srcObject) {
        localVideoRef.current.srcObject = new MediaStream([localTrackRef.current]);
        localVideoRef.current.play().catch(() => {});
      }
      if (remoteVideoTrackRef.current && remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
        remoteVideoRef.current.srcObject = new MediaStream([remoteVideoTrackRef.current]);
        remoteVideoRef.current.play().catch(() => {});
      }
      if (remoteAudioTrackRef.current && remoteAudioRef.current && !remoteAudioRef.current.srcObject) {
        remoteAudioRef.current.srcObject = new MediaStream([remoteAudioTrackRef.current]);
        remoteAudioRef.current.play().catch(() => {});
      }
    }
  }, [isLoading, loadError, isConsultationEnded, videoLayout, isSwapped, pipSize, pipCorner, callObject, syncDailyTracks]);

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
      setTimeout(() => syncDailyTracks(callObject), 100);
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
    const stage = videoStageRef.current;
    const isCurrentlyFull = isVideoFullView || !!document.fullscreenElement;

    if (!isCurrentlyFull) {
      setIsVideoFullView(true);
      setIsFullscreen(true);
      if (stage && stage.requestFullscreen) {
        stage.requestFullscreen().catch(() => {});
      }
    } else {
      setIsVideoFullView(false);
      setIsFullscreen(false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) {
        setIsVideoFullView(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVideoFullView) {
        setIsVideoFullView(false);
        setIsFullscreen(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVideoFullView]);

  const cycleCorner = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPipCorner((curr) => {
      if (curr === 'bottom-right') return 'bottom-left';
      if (curr === 'bottom-left') return 'top-left';
      if (curr === 'top-left') return 'top-right';
      return 'bottom-right';
    });
  };

  const cyclePipSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPipSize((curr) => {
      if (curr === 'sm') return 'md';
      if (curr === 'md') return 'lg';
      return 'sm';
    });
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
  // Hard Load Error Screen (consultation context could not be loaded at all)
  // --------------------------------------------------------------------------
  if (loadError) {
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
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <ChekupCrossLogo size={44} />
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '2px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F87171',
          }}
        >
          <AlertCircle size={30} />
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#FAF6EE',
            margin: 0,
          }}
        >
          Couldn&apos;t open the consultation room
        </h2>
        <p style={{ color: '#D5C7B8', fontSize: '0.95rem', maxWidth: '480px', lineHeight: 1.5, margin: 0 }}>
          {loadError}
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 22px',
              borderRadius: '9999px',
              backgroundColor: '#DFAB62',
              border: 'none',
              color: '#2A170F',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
          <Link
            href="/appointments"
            style={{
              padding: '10px 22px',
              borderRadius: '9999px',
              backgroundColor: 'transparent',
              border: '1.5px solid rgba(223, 171, 98, 0.5)',
              color: '#FAF6EE',
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            Back to Appointments
          </Link>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // After Consultation Screen (Post-Encounter)
  // --------------------------------------------------------------------------
  const endedPatientName =
    consultation?.patient?.fullName || consultation?.booking?.patient?.fullName || null;

  const endedDurationLabel = (() => {
    if (consultation?.started_at && consultation?.ended_at) {
      const ms =
        new Date(consultation.ended_at).getTime() - new Date(consultation.started_at).getTime();
      if (Number.isFinite(ms) && ms > 0) return formatElapsed(Math.floor(ms / 1000));
    }
    return elapsedSeconds > 0 ? formatElapsed(elapsedSeconds) : '—';
  })();

  const endedDateLabel = (() => {
    const raw = consultation?.started_at || consultation?.ended_at;
    if (!raw) return '—';
    const d = new Date(raw);
    return Number.isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  })();

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
              fontWeight: 'var(--font-heading-weight, 400)',
              color: '#2A170F',
              marginBottom: '8px',
              letterSpacing: '-0.02em',
            }}
          >
            Consultation Complete
          </h2>
          <p style={{ color: '#6B5E55', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '28px' }}>
            {endedPatientName ? (
              <>The clinical consultation with <strong>{endedPatientName}</strong> has been successfully completed and documented.</>
            ) : (
              <>The clinical consultation has been successfully completed and documented.</>
            )}
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
                {endedDurationLabel}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#8C7768', fontWeight: 700 }}>
                Encounter Date
              </span>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#2A170F', marginTop: '3px' }}>
                {endedDateLabel}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#8C7768', fontWeight: 700 }}>
                Primary Diagnosis
              </span>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#2A170F', marginTop: '3px' }}>
                {diagnoses[0] ? `${diagnoses[0].name} (${diagnoses[0].code})` : '—'}
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
          height: '60px',
          backgroundColor: '#1F130E',
          borderBottom: '1px solid rgba(223, 171, 98, 0.16)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          flexShrink: 0,
          zIndex: 30,
          gap: '12px',
        }}
      >
        {/* LEFT: Back to Appointments */}
        <Link
          href="/appointments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px 6px 8px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(223, 171, 98, 0.3)',
            color: '#FAF6EE',
            fontSize: '0.8rem',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.18s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.backgroundColor = 'rgba(223, 171, 98, 0.2)')}
          onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
          title="Leave room and return to Appointments"
        >
          <ChevronLeft size={15} color="#DFAB62" />
          <span className="header-back-label">Appointments</span>
        </Link>

        {/* CENTER: Call state + session timer (single pill, reflects real Daily state) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            padding: '5px 14px',
            borderRadius: '9999px',
            backgroundColor: callError
              ? 'rgba(239, 68, 68, 0.12)'
              : !callObject
                ? 'rgba(223, 171, 98, 0.12)'
                : isPatientConnected
                  ? 'rgba(34, 197, 94, 0.12)'
                  : 'rgba(223, 171, 98, 0.12)',
            border: `1px solid ${
              callError
                ? 'rgba(239, 68, 68, 0.4)'
                : !callObject
                  ? 'rgba(223, 171, 98, 0.4)'
                  : isPatientConnected
                    ? 'rgba(34, 197, 94, 0.3)'
                    : 'rgba(223, 171, 98, 0.4)'
            }`,
            minWidth: 0,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              flexShrink: 0,
              backgroundColor: callError ? '#EF4444' : !callObject ? '#DFAB62' : isPatientConnected ? '#22C55E' : '#DFAB62',
              boxShadow: `0 0 8px ${callError ? '#EF4444' : !callObject ? '#DFAB62' : isPatientConnected ? '#22C55E' : '#DFAB62'}`,
            }}
          />
          <span
            className="header-status-text"
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: callError ? '#F87171' : !callObject ? '#DFAB62' : isPatientConnected ? '#4ADE80' : '#DFAB62',
            }}
          >
            {callError ? 'Connection failed' : !callObject ? 'Connecting' : isPatientConnected ? 'Live' : 'In session'}
          </span>
          <span
            style={{
              width: '1px',
              height: '14px',
              backgroundColor: 'rgba(223, 171, 98, 0.25)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#FAF6EE',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}
          >
            {formatElapsed(elapsedSeconds)}
          </span>
        </div>

        {/* RIGHT: Destructive End Consultation */}
        <button
          onClick={() => setShowEndModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '8px 16px',
            borderRadius: '9999px',
            backgroundColor: '#DC2626',
            border: 'none',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.825rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#B91C1C';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#DC2626';
          }}
        >
          <PhoneOff size={15} />
          <span className="header-end-label">End</span>
        </button>
      </header>

      {/* ====================================================================
          2. MAIN CLINICAL CONSULTATION BODY (3-PART DESKTOP LAYOUT)
          ==================================================================== */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          height: 'calc(100vh - 60px)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* ------------------------------------------------------------------
            CENTER / MAIN WORKSPACE: VIDEO HUD + CLINICAL NOTES (65–70%)
            ------------------------------------------------------------------ */}
        <main
          className="consultation-main"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
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
            ref={videoStageRef}
            className={`video-stage ${isVideoFullView ? 'video-stage-fullview' : ''}`}
            onDoubleClick={toggleFullscreen}
            style={
              isVideoFullView
                ? {
                    position: 'fixed',
                    inset: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 99999,
                    borderRadius: 0,
                    backgroundColor: '#150B07',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }
                : {
                    position: 'relative',
                    width: '100%',
                    flexShrink: 0,
                    borderRadius: '18px',
                    overflow: 'hidden',
                    backgroundColor: '#150B07',
                    border: '1px solid rgba(223, 171, 98, 0.25)',
                    boxShadow: '0 12px 36px rgba(30, 16, 10, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }
            }
          >
            {/* Connection error overlay */}
            {callError ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 40,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '14px',
                  padding: '0 24px',
                  backgroundColor: '#1E120B',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '2px solid rgba(239, 68, 68, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertCircle size={32} color="#F87171" />
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FAF6EE' }}>
                  Couldn&apos;t connect to the video room
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#D5C7B8', maxWidth: '440px', lineHeight: 1.5 }}>
                  {callError}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    marginTop: '4px',
                    padding: '9px 20px',
                    borderRadius: '9999px',
                    backgroundColor: '#DFAB62',
                    border: 'none',
                    color: '#2A170F',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                  }}
                >
                  Retry Connection
                </button>
              </div>
            ) : !callObject ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 40,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '14px',
                  backgroundColor: '#1E120B',
                }}
              >
                <Loader2 size={32} className="animate-spin" style={{ color: '#DFAB62' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#F0E5D3' }}>
                  Connecting to the secure consultation room…
                </div>
              </div>
            ) : null}

            {/* Top Bar inside Video Stage */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '14px',
                right: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 35,
                pointerEvents: 'none',
              }}
            >
              {/* Left: Consultation Status Badge */}
              <div
                style={{
                  pointerEvents: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(20, 12, 8, 0.85)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(223, 171, 98, 0.3)',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isPatientConnected ? '#22C55E' : '#EAB308',
                    boxShadow: isPatientConnected ? '0 0 8px #22C55E' : 'none',
                  }}
                />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FAF6EE' }}>
                  {isPatientConnected ? 'Live Video Room' : 'Waiting for Patient'}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#DFAB62' }}>•</span>
                <span style={{ fontSize: '0.72rem', color: '#DFAB62', fontWeight: 600 }}>
                  {formatElapsed(elapsedSeconds)}
                </span>
              </div>

              {/* Right: Layout Switcher & Swap Controls */}
              <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Side-by-Side vs PiP Toggle */}
                <button
                  onClick={() => setVideoLayout(videoLayout === 'pip' ? 'grid' : 'pip')}
                  title={videoLayout === 'pip' ? 'Switch to Side-by-Side Split View' : 'Switch to Picture-in-Picture View'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(26, 15, 10, 0.88)',
                    backdropFilter: 'blur(12px)',
                    border: '1.5px solid rgba(223, 171, 98, 0.4)',
                    color: '#FAF6EE',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                  }}
                >
                  {videoLayout === 'pip' ? <Grid size={14} color="#DFAB62" /> : <Layers size={14} color="#DFAB62" />}
                  <span>{videoLayout === 'pip' ? 'Side-by-Side View' : 'PiP View'}</span>
                </button>

                {/* Swap Views (only active in PiP mode) */}
                {videoLayout === 'pip' && (
                  <button
                    onClick={() => setIsSwapped(!isSwapped)}
                    title="Swap Main & Floating Window"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(26, 15, 10, 0.88)',
                      backdropFilter: 'blur(12px)',
                      border: '1.5px solid rgba(223, 171, 98, 0.4)',
                      color: '#DFAB62',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                    }}
                  >
                    <ArrowLeftRight size={14} />
                    <span>Swap Views</span>
                  </button>
                )}

                {/* Full Video View / Exit Full View */}
                <button
                  onClick={toggleFullscreen}
                  title={isVideoFullView ? 'Exit Full Video View (Esc)' : 'Expand Video to Full View'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    backgroundColor: isVideoFullView ? 'rgba(223, 171, 98, 0.25)' : 'rgba(26, 15, 10, 0.88)',
                    backdropFilter: 'blur(12px)',
                    border: isVideoFullView ? '1.5px solid #DFAB62' : '1.5px solid rgba(223, 171, 98, 0.4)',
                    color: isVideoFullView ? '#DFAB62' : '#FAF6EE',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                  }}
                >
                  {isVideoFullView ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  <span>{isVideoFullView ? 'Exit Full View' : 'Full Video View'}</span>
                </button>
              </div>
            </div>

            {/* Camera Error Banner */}
            {cameraError && (
              <div
                style={{
                  position: 'absolute',
                  top: '54px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 35,
                  maxWidth: '92%',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(60, 16, 12, 0.94)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: '#FCA5A5',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textAlign: 'center',
                }}
              >
                <span>{cameraError}</span>
                <button
                  onClick={() => setCameraError(null)}
                  style={{ background: 'none', border: 'none', color: '#FCA5A5', cursor: 'pointer', fontWeight: 800, padding: '0 0 0 6px' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Hidden Remote Audio Element (Always mounted and active) */}
            <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleUploadCustomBg}
            />

            {/* Background Notice Banner (Fallback / Processor Status) */}
            {backgroundNotice && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 35,
                  maxWidth: '92%',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(30, 16, 10, 0.94)',
                  border: '1px solid rgba(223, 171, 98, 0.45)',
                  color: '#FAF6EE',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                }}
              >
                <Sparkles size={14} color="#DFAB62" />
                <span>{backgroundNotice}</span>
                <button
                  onClick={() => setBackgroundNotice(null)}
                  style={{ background: 'none', border: 'none', color: '#DFAB62', cursor: 'pointer', fontWeight: 800, padding: '0 0 0 6px' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Video Stage Content: Container for Doctor and Patient Tiles */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                ...(videoLayout === 'grid'
                  ? {
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '12px',
                      padding: '12px',
                      boxSizing: 'border-box' as const,
                    }
                  : {}),
              }}
            >
              {/* ------------------------------------------------------------
                  TILE 1: DOCTOR TILE (Self-View)
                  ------------------------------------------------------------ */}
              <div
                className={videoLayout === 'pip' && !isSwapped ? 'doctor-pip' : ''}
                style={
                  videoLayout === 'grid'
                    ? {
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        backgroundColor: '#1E120B',
                        border: '1.5px solid rgba(223, 171, 98, 0.35)',
                      }
                    : isSwapped
                    ? {
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 10,
                        backgroundColor: '#150B07',
                      }
                    : {
                        position: 'absolute',
                        ...CORNER_STYLES[pipCorner],
                        ...PIP_DIMENSIONS[pipSize],
                        zIndex: 25,
                        borderRadius: '14px',
                        overflow: 'hidden',
                        backgroundColor: '#20120B',
                        border: '2px solid rgba(223, 171, 98, 0.55)',
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65)',
                        transition: 'all 0.22s ease-in-out',
                      }
                }
              >
                {/* Virtual Background Render */}
                {activeEffect === 'virtual-image' && !isVideoMuted && (
                  <img
                    src={
                      customBgImage ||
                      VIRTUAL_BACKGROUND_PRESETS.find((p) => p.id === selectedBgPreset)?.previewUrl ||
                      '/images/backgrounds/clinic-suite.png'
                    }
                    alt="Virtual BG"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Doctor Video Feed */}
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    display: !isVideoMuted ? 'block' : 'none',
                    backgroundColor: '#150B07',
                    zIndex: 2,
                    filter:
                      activeEffect === 'blur-light'
                        ? 'blur(6px)'
                        : activeEffect === 'blur-heavy'
                        ? 'blur(16px)'
                        : 'none',
                    transition: 'filter 0.3s ease',
                    opacity: activeEffect === 'virtual-image' ? 0.92 : 1,
                  }}
                />

                {/* Doctor Camera Off Placeholder */}
                {isVideoMuted && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#1E120B',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(223, 171, 98, 0.15)',
                        border: '1.5px solid #DFAB62',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <User size={28} color="#DFAB62" />
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#DFAB62', fontWeight: 600 }}>
                      Your Camera is Off
                    </span>
                  </div>
                )}

                {/* Mini Action Toolbar when Doctor is in PiP */}
                {videoLayout === 'pip' && !isSwapped && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      zIndex: 30,
                    }}
                  >
                    <button
                      onClick={() => setIsSwapped(true)}
                      title="Swap into Main View"
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(20, 12, 8, 0.82)',
                        border: '1px solid rgba(223, 171, 98, 0.4)',
                        color: '#DFAB62',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <ArrowLeftRight size={13} />
                    </button>
                    <button
                      onClick={cyclePipSize}
                      title={`Cycle Size (Current: ${pipSize.toUpperCase()})`}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(20, 12, 8, 0.82)',
                        border: '1px solid rgba(223, 171, 98, 0.4)',
                        color: '#FAF6EE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                      }}
                    >
                      {pipSize === 'sm' ? 'S' : pipSize === 'md' ? 'M' : 'L'}
                    </button>
                    <button
                      onClick={cycleCorner}
                      title="Move to next corner"
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(20, 12, 8, 0.82)',
                        border: '1px solid rgba(223, 171, 98, 0.4)',
                        color: '#FAF6EE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Move size={12} />
                    </button>
                    <button
                      onClick={() => setVideoLayout('grid')}
                      title="Switch to Side-by-Side"
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(20, 12, 8, 0.82)',
                        border: '1px solid rgba(223, 171, 98, 0.4)',
                        color: '#DFAB62',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Grid size={12} />
                    </button>
                  </div>
                )}

                {/* Doctor Bottom Badge */}
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
                    backgroundColor: 'rgba(20, 12, 8, 0.82)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 20,
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1 }}>
                      {doctor?.fullName ? `Dr. ${doctor.fullName}` : 'You (Doctor)'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                      <div style={{ fontSize: '0.62rem', color: '#DFAB62', fontWeight: 500 }}>
                        Doctor • Practitioner
                      </div>
                      {activeEffect !== 'none' && (
                        <span
                          style={{
                            fontSize: '0.58rem',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(223, 171, 98, 0.25)',
                            color: '#DFAB62',
                            fontWeight: 700,
                          }}
                        >
                          {activeEffect === 'blur-light'
                            ? 'Soft Blur'
                            : activeEffect === 'blur-heavy'
                            ? 'Strong Blur'
                            : 'Virtual BG'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isAudioMuted ? <MicOff size={12} color="#EF4444" /> : <Mic size={12} color="#4ADE80" />}
                    {!isVideoMuted && <Video size={12} color="#4ADE80" />}
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------
                  TILE 2: PATIENT TILE (Remote Participant)
                  ------------------------------------------------------------ */}
              <div
                className={videoLayout === 'pip' && isSwapped ? 'doctor-pip' : ''}
                style={
                  videoLayout === 'grid'
                    ? {
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        backgroundColor: '#1E120B',
                        border: '1.5px solid rgba(223, 171, 98, 0.35)',
                      }
                    : !isSwapped
                    ? {
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 10,
                        backgroundColor: '#150B07',
                      }
                    : {
                        position: 'absolute',
                        ...CORNER_STYLES[pipCorner],
                        ...PIP_DIMENSIONS[pipSize],
                        zIndex: 25,
                        borderRadius: '14px',
                        overflow: 'hidden',
                        backgroundColor: '#20120B',
                        border: '2px solid rgba(223, 171, 98, 0.55)',
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65)',
                        transition: 'all 0.22s ease-in-out',
                      }
                }
              >
                {/* Patient Video Stream */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: isPatientConnected && hasRemoteVideo ? 'block' : 'none',
                    backgroundColor: '#150B07',
                  }}
                />

                {/* Patient Placeholder Frame (When not connected or video inactive) */}
                {(!isPatientConnected || !hasRemoteVideo) && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      backgroundColor: '#1E120B',
                      padding: '16px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(223, 171, 98, 0.15)',
                        border: '2px solid #DFAB62',
                        color: '#DFAB62',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.6rem',
                        fontWeight: 700,
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
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FAF6EE' }}>
                        {consultation?.booking?.patient?.fullName || 'Patient'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: isPatientConnected ? '#DFAB62' : '#A8998A', marginTop: '4px' }}>
                        {isPatientConnected
                          ? 'Connected • Patient camera is off'
                          : 'Waiting for patient to connect to room...'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mini Action Toolbar when Patient is in PiP (when swapped) */}
                {videoLayout === 'pip' && isSwapped && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      zIndex: 30,
                    }}
                  >
                    <button
                      onClick={() => setIsSwapped(false)}
                      title="Swap back to Patient Main"
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(20, 12, 8, 0.82)',
                        border: '1px solid rgba(223, 171, 98, 0.4)',
                        color: '#DFAB62',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <ArrowLeftRight size={13} />
                    </button>
                    <button
                      onClick={cyclePipSize}
                      title={`Cycle Size (Current: ${pipSize.toUpperCase()})`}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(20, 12, 8, 0.82)',
                        border: '1px solid rgba(223, 171, 98, 0.4)',
                        color: '#FAF6EE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                      }}
                    >
                      {pipSize === 'sm' ? 'S' : pipSize === 'md' ? 'M' : 'L'}
                    </button>
                    <button
                      onClick={cycleCorner}
                      title="Move to next corner"
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(20, 12, 8, 0.82)',
                        border: '1px solid rgba(223, 171, 98, 0.4)',
                        color: '#FAF6EE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Move size={12} />
                    </button>
                    <button
                      onClick={() => setVideoLayout('grid')}
                      title="Switch to Side-by-Side"
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(20, 12, 8, 0.82)',
                        border: '1px solid rgba(223, 171, 98, 0.4)',
                        color: '#DFAB62',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Grid size={12} />
                    </button>
                  </div>
                )}

                {/* Patient Bottom Badge */}
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
                    backgroundColor: 'rgba(20, 12, 8, 0.82)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 20,
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1 }}>
                      {consultation?.booking?.patient?.fullName || 'Patient'}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#DFAB62', fontWeight: 500 }}>
                      Patient • Remote
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isPatientConnected ? '#22C55E' : '#F59E0B',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------
                BOTTOM-CENTER: Floating Video Control Bar
                -------------------------------------------------------------- */}
            <div
              className="call-control-bar"
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
                className="call-ctrl-btn"
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
                className="call-ctrl-btn"
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
                className="call-ctrl-btn"
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
                className="call-ctrl-btn"
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

              {/* Video Effects Toggle */}
              <button
                className="call-ctrl-btn"
                onClick={() => setShowEffectsDrawer(!showEffectsDrawer)}
                title="Video Background & Privacy"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: activeEffect !== 'none' || showEffectsDrawer ? '1.5px solid #DFAB62' : '1px solid rgba(223, 171, 98, 0.25)',
                  backgroundColor: activeEffect !== 'none' || showEffectsDrawer ? 'rgba(223, 171, 98, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  color: activeEffect !== 'none' || showEffectsDrawer ? '#DFAB62' : '#FAF6EE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  position: 'relative',
                }}
              >
                <Sparkles size={18} />
                {activeEffect !== 'none' && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      right: '3px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#DFAB62',
                      boxShadow: '0 0 6px #DFAB62',
                    }}
                  />
                )}
              </button>

              {/* Full Video View Toggle */}
              <button
                className="call-ctrl-btn"
                onClick={toggleFullscreen}
                title={isVideoFullView ? 'Exit Full Video View (Esc)' : 'Expand Video to Full View'}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: isVideoFullView ? '1.5px solid #DFAB62' : '1px solid rgba(223, 171, 98, 0.25)',
                  backgroundColor: isVideoFullView ? 'rgba(223, 171, 98, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  color: isVideoFullView ? '#DFAB62' : '#FAF6EE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                {isVideoFullView ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>

              {/* Offer Time Extension Button in Floating Bar */}
              <button
                className="call-extend-btn"
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
                  className="call-ctrl-btn"
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
                      {isVideoFullView ? <Minimize2 size={14} color="#DFAB62" /> : <Maximize2 size={14} color="#DFAB62" />}
                      <span>{isVideoFullView ? 'Exit Full Video View' : 'Full Video View'}</span>
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

            {/* ================================================================
                EFFECTS DRAWER (Video Background & Privacy)
                ================================================================ */}
            {showEffectsDrawer && (
              <div
                className="effects-drawer"
                style={{
                  position: 'absolute',
                  bottom: '76px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '460px',
                  maxWidth: '92%',
                  backgroundColor: '#1E100A',
                  border: '1.5px solid rgba(223, 171, 98, 0.35)',
                  borderRadius: '20px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.75)',
                  padding: '20px',
                  zIndex: 40,
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid rgba(223, 171, 98, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="#DFAB62" />
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>
                      Video Background & Privacy
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowEffectsDrawer(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#D5C7B8',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#DFAB62',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '10px',
                    }}
                  >
                    Background Blur
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      { key: 'none' as BackgroundEffectType, label: 'No Blur', icon: Camera },
                      { key: 'blur-light' as BackgroundEffectType, label: 'Slight Blur', icon: Sliders },
                      { key: 'blur-heavy' as BackgroundEffectType, label: 'Strong Blur', icon: Layers },
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => applyBackgroundEffect(key)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '12px',
                          border: activeEffect === key ? '2px solid #DFAB62' : '1px solid rgba(223, 171, 98, 0.2)',
                          backgroundColor: activeEffect === key ? 'rgba(223, 171, 98, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                          color: '#FAF6EE',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Icon size={16} color={activeEffect === key ? '#DFAB62' : '#D5C7B8'} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: '#DFAB62',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Virtual Backgrounds
                    </label>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#DFAB62',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0,
                      }}
                    >
                      <ImageIcon size={13} /> <span>Upload</span>
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {VIRTUAL_BACKGROUND_PRESETS.map((preset) => {
                      const sel = activeEffect === 'virtual-image' && selectedBgPreset === preset.id;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => {
                            setSelectedBgPreset(preset.id);
                            applyBackgroundEffect('virtual-image', preset.id);
                          }}
                          style={{
                            borderRadius: '12px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            position: 'relative',
                            border: sel ? '2px solid #DFAB62' : '1px solid rgba(223, 171, 98, 0.2)',
                            boxShadow: sel ? '0 0 14px rgba(223, 171, 98, 0.35)' : 'none',
                            transition: 'all 0.18s ease',
                          }}
                        >
                          <img
                            src={preset.previewUrl}
                            alt={preset.name}
                            style={{ width: '100%', height: '76px', objectFit: 'cover', display: 'block' }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              padding: '4px 8px',
                              backgroundColor: 'rgba(20, 12, 8, 0.85)',
                              backdropFilter: 'blur(4px)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
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
          </div>

          {/* ================================================================
              CLINICAL NOTES & ENCOUNTER PLAN WORKSPACE (Mission-Critical Feature)
              ================================================================ */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid rgba(223, 171, 98, 0.25)',
              padding: '20px 24px',
              boxShadow: '0 4px 20px rgba(42, 23, 15, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Card Header with Title, Autosave Status, and Tabs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingBottom: '14px',
                borderBottom: '1px solid rgba(223, 171, 98, 0.2)',
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.05rem',
                    fontWeight: 'var(--font-heading-weight, 400)',
                    color: '#2A170F',
                    margin: 0,
                  }}
                >
                  Clinical Notes & Care Plan
                </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6B5E55' }}>
                    Document live clinical findings, diagnosis, patient guidance, and medications.
                  </p>
              </div>

              {/* Autosave Status Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: saveStatus === 'saving' ? '#DFAB62' : '#10B981',
                    backgroundColor: saveStatus === 'saving' ? 'rgba(223, 171, 98, 0.12)' : 'rgba(16, 185, 129, 0.1)',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: `1px solid ${saveStatus === 'saving' ? 'rgba(223, 171, 98, 0.3)' : 'rgba(16, 185, 129, 0.25)'}`,
                  }}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <>
                      <Check size={12} />
                      <span>Autosaved</span>
                    </>
                  )}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#8C7768' }}>Last: {lastSavedTime}</span>
              </div>
            </div>

            {/* Segmented Tab Navigation */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#FAF6EE',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid rgba(223, 171, 98, 0.2)',
                gap: '4px',
                overflowX: 'auto',
              }}
            >
              {[
                { id: 'notes', label: 'SOAP Notes', icon: FileText },
                { id: 'instructions', label: 'Patient Health Notes', icon: User },
                { id: 'diagnosis', label: `Diagnoses (${diagnoses.length})`, icon: Stethoscope },
                { id: 'prescription', label: `In-Call Medications (${medications.length})`, icon: Pill },
                { id: 'followup', label: 'Follow-up & Care Plan', icon: Calendar },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeClinicalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveClinicalTab(tab.id as any)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 800 : 600,
                      borderRadius: '9px',
                      border: 'none',
                      backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                      color: isSelected ? '#2A170F' : '#6B5E55',
                      boxShadow: isSelected ? '0 2px 8px rgba(42, 23, 15, 0.08)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Icon size={14} color={isSelected ? '#B88647' : '#8C7768'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: SOAP NOTES (Chief Complaint, HPI, Assessment, Plan) in 2x2 Grid */}
            {activeClinicalTab === 'notes' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {/* Chief Complaint */}
                <div
                  style={{
                    backgroundColor: '#FAF6EE',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid rgba(223, 171, 98, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Subjective: Chief Complaint
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
                    placeholder="Document primary presenting concern or symptoms in patient's words..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(223, 171, 98, 0.25)',
                      backgroundColor: '#FFFFFF',
                      fontSize: '0.825rem',
                      fontFamily: 'inherit',
                      color: '#2A170F',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: 1.4,
                    }}
                  />
                </div>

                {/* History of Present Illness (HPI) */}
                <div
                  style={{
                    backgroundColor: '#FAF6EE',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid rgba(223, 171, 98, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Subjective: History of Present Illness (HPI)
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
                    placeholder="Onset, duration, frequency, aggravating/alleviating factors, past treatments..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(223, 171, 98, 0.25)',
                      backgroundColor: '#FFFFFF',
                      fontSize: '0.825rem',
                      fontFamily: 'inherit',
                      color: '#2A170F',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: 1.4,
                    }}
                  />
                </div>

                {/* Objective / Clinical Assessment */}
                <div
                  style={{
                    backgroundColor: '#FAF6EE',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid rgba(223, 171, 98, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Assessment / Clinical Observations
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
                    placeholder="Clinical synthesis, observational notes, risk stratification, differentials..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(223, 171, 98, 0.25)',
                      backgroundColor: '#FFFFFF',
                      fontSize: '0.825rem',
                      fontFamily: 'inherit',
                      color: '#2A170F',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: 1.4,
                    }}
                  />
                </div>

                {/* Treatment Plan */}
                <div
                  style={{
                    backgroundColor: '#FAF6EE',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid rgba(223, 171, 98, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Treatment & Management Plan
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
                    placeholder="Therapeutic plan, diagnostics ordered, non-pharmacological interventions..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(223, 171, 98, 0.25)',
                      backgroundColor: '#FFFFFF',
                      fontSize: '0.825rem',
                      fontFamily: 'inherit',
                      color: '#2A170F',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: 1.4,
                    }}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: PATIENT HEALTH NOTES */}
            {activeClinicalTab === 'instructions' && (
              <div
                style={{
                  backgroundColor: '#FAF6EE',
                  borderRadius: '12px',
                  padding: '18px',
                  border: '1px solid rgba(223, 171, 98, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#2A170F' }}>
                      Patient Instructions & Health Notes
                    </h4>
                    <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#6B5E55', lineHeight: 1.4 }}>
                      These instructions are saved directly to the patient's personal <strong>Health Notes</strong> tab on their patient portal. Formal e-prescriptions and medical certificates remain distinct.
                    </p>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#8C7768', fontWeight: 600 }}>
                    {patientInstructions.length}/1000
                  </span>
                </div>

                <textarea
                  value={patientInstructions}
                  maxLength={1000}
                  onChange={(e) => {
                    setPatientInstructions(e.target.value);
                    triggerAutoSave();
                  }}
                  placeholder="Write patient-facing instructions: hydration recommendations, dietary adjustments, red-flag symptoms to monitor, lifestyle advice, or next steps..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(223, 171, 98, 0.25)',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    color: '#2A170F',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.5,
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerAutoSave();
                      toastSuccess('Health Notes saved', 'Patient guidance has been saved to the encounter record.');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 20px',
                      borderRadius: '9999px',
                      backgroundColor: '#DFAB62',
                      color: '#2A170F',
                      fontWeight: 800,
                      fontSize: '0.825rem',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(42, 23, 15, 0.1)',
                    }}
                  >
                    <Save size={14} />
                    <span>Save Patient Health Note</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: DIAGNOSIS (ICD-10 Search & Confirmed List) */}
            {activeClinicalTab === 'diagnosis' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    backgroundColor: '#FAF6EE',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(223, 171, 98, 0.2)',
                  }}
                >
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                    Search & Add ICD-10 Diagnosis
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
                      placeholder="Type condition name or ICD-10 code (e.g. Hypertension, Migraine, I10, R51)..."
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 36px',
                        borderRadius: '10px',
                        border: '1px solid rgba(223, 171, 98, 0.3)',
                        backgroundColor: '#FFFFFF',
                        fontSize: '0.85rem',
                        color: '#2A170F',
                        outline: 'none',
                      }}
                    />
                    <Search size={16} color="#8C7768" style={{ position: 'absolute', left: '12px', top: '12px' }} />

                    {/* Suggestions Popover */}
                    {showIcdSuggestions && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 6px)',
                          left: 0,
                          right: 0,
                          backgroundColor: '#FFFFFF',
                          border: '1px solid rgba(223, 171, 98, 0.3)',
                          borderRadius: '12px',
                          boxShadow: '0 12px 30px rgba(42, 23, 15, 0.15)',
                          zIndex: 40,
                          maxHeight: '220px',
                          overflowY: 'auto',
                          padding: '6px',
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
                              padding: '9px 12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.825rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF6EE')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <span style={{ fontWeight: 600, color: '#2A170F' }}>{item.name}</span>
                            <span style={{ fontSize: '0.75rem', color: '#B88647', fontWeight: 700, backgroundColor: '#FAF6EE', padding: '2px 8px', borderRadius: '4px' }}>
                              {item.code}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Confirmed Diagnoses List */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Confirmed Diagnoses for this Encounter ({diagnoses.length})
                  </div>
                  {diagnoses.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                      {diagnoses.map((d) => (
                        <div
                          key={d.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            backgroundColor: '#FAF6EE',
                            border: '1px solid rgba(223, 171, 98, 0.25)',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2A170F' }}>
                              {d.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#B88647', fontWeight: 600, marginTop: '2px' }}>
                              ICD-10: {d.code} {d.isPrimary && '• Primary Diagnosis'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDiagnosis(d.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#8C7768',
                              padding: '4px',
                              borderRadius: '6px',
                            }}
                            title="Remove diagnosis"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '24px',
                        borderRadius: '12px',
                        backgroundColor: '#FAF6EE',
                        textAlign: 'center',
                        border: '1px dashed rgba(223, 171, 98, 0.35)',
                        color: '#8C7768',
                        fontSize: '0.825rem',
                      }}
                    >
                      No confirmed diagnoses recorded yet. Use the search bar above to add an ICD-10 code.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: PRESCRIPTION / MEDICATIONS */}
            {activeClinicalTab === 'prescription' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase' }}>
                      In-Call Medication List ({medications.length})
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B5E55' }}>
                      Quickly log medications during the live consultation.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setIsAddingMedication(!isAddingMedication)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '7px 14px',
                        borderRadius: '9999px',
                        backgroundColor: '#FAF6EE',
                        border: '1.5px solid rgba(223, 171, 98, 0.4)',
                        color: '#2A170F',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={14} color="#DFAB62" />
                      <span>{isAddingMedication ? 'Close Form' : 'Add Medication'}</span>
                    </button>
                    <Link
                      href={`/consultations/${bookingId}/prescribe`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '7px 14px',
                        borderRadius: '9999px',
                        backgroundColor: '#DFAB62',
                        color: '#2A170F',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      <Pill size={14} />
                      <span>Full Prescription Pad</span>
                    </Link>
                  </div>
                </div>

                {/* Inline Add Medication Form */}
                {isAddingMedication && (
                  <div
                    style={{
                      backgroundColor: '#FAF6EE',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1.5px solid rgba(223, 171, 98, 0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Medication Name (e.g. Paracetamol, Amoxicillin)"
                      value={newMedName}
                      onChange={(e) => setNewMedName(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(223, 171, 98, 0.3)',
                        fontSize: '0.825rem',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                      }}
                    />
                    <div className="resp-grid-fixed" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Dosage (500 mg)"
                        value={newMedDosage}
                        onChange={(e) => setNewMedDosage(e.target.value)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(223, 171, 98, 0.3)',
                          fontSize: '0.8rem',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Frequency (Q8H / 3x daily)"
                        value={newMedFrequency}
                        onChange={(e) => setNewMedFrequency(e.target.value)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(223, 171, 98, 0.3)',
                          fontSize: '0.8rem',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Duration (5 days)"
                        value={newMedDuration}
                        onChange={(e) => setNewMedDuration(e.target.value)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(223, 171, 98, 0.3)',
                          fontSize: '0.8rem',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Patient Instructions (e.g. Take with food, finish complete course)"
                      value={newMedInstructions}
                      onChange={(e) => setNewMedInstructions(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(223, 171, 98, 0.3)',
                        fontSize: '0.8rem',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setIsAddingMedication(false)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '9999px',
                          border: 'none',
                          background: 'none',
                          color: '#6B5E55',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddMedication}
                        style={{
                          padding: '6px 18px',
                          borderRadius: '9999px',
                          backgroundColor: '#DFAB62',
                          color: '#2A170F',
                          border: 'none',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        Save to Medication List
                      </button>
                    </div>
                  </div>
                )}

                {/* Medication Cards */}
                {medications.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                    {medications.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          backgroundColor: '#FAF6EE',
                          border: '1px solid rgba(223, 171, 98, 0.25)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#2A170F' }}>
                            {m.name} — {m.dosage}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#B88647', fontWeight: 700, marginTop: '3px' }}>
                            {m.frequency} • {m.duration}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#6B5E55', marginTop: '3px', lineHeight: 1.3 }}>
                            {m.instructions}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMedication(m.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C7768', padding: '2px' }}
                          title="Remove medication"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '24px',
                      borderRadius: '12px',
                      backgroundColor: '#FAF6EE',
                      textAlign: 'center',
                      border: '1px dashed rgba(223, 171, 98, 0.35)',
                      color: '#8C7768',
                      fontSize: '0.825rem',
                    }}
                  >
                    No medications added to this live encounter yet. Click "Add Medication" above or open the Full Prescription Pad.
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: FOLLOW-UP & CARE PLAN */}
            {activeClinicalTab === 'followup' && (
              <div
                style={{
                  backgroundColor: '#FAF6EE',
                  borderRadius: '12px',
                  padding: '18px',
                  border: '1px solid rgba(223, 171, 98, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                    Follow-up Consultation Required?
                  </label>
                  <div style={{ display: 'flex', gap: '10px', maxWidth: '240px' }}>
                    <button
                      type="button"
                      onClick={() => setFollowupRequired(true)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: '9999px',
                        border: followupRequired ? '2px solid #DFAB62' : '1px solid rgba(223, 171, 98, 0.25)',
                        backgroundColor: followupRequired ? '#FFFFFF' : 'transparent',
                        fontWeight: followupRequired ? 800 : 600,
                        color: '#2A170F',
                        fontSize: '0.825rem',
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
                        padding: '8px 0',
                        borderRadius: '9999px',
                        border: !followupRequired ? '2px solid #DFAB62' : '1px solid rgba(223, 171, 98, 0.25)',
                        backgroundColor: !followupRequired ? '#FFFFFF' : 'transparent',
                        fontWeight: !followupRequired ? 800 : 600,
                        color: '#2A170F',
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                      }}
                    >
                      No
                    </button>
                  </div>
                </div>

                {followupRequired && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
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
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(223, 171, 98, 0.3)',
                          backgroundColor: '#FFFFFF',
                          fontSize: '0.825rem',
                          color: '#2A170F',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                        Follow-up Review Type
                      </label>
                      <div className="resp-grid-fixed" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
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
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: followupType === t.id ? '2px solid #DFAB62' : '1px solid rgba(223, 171, 98, 0.25)',
                              backgroundColor: followupType === t.id ? '#FFFFFF' : 'transparent',
                              fontSize: '0.75rem',
                              fontWeight: followupType === t.id ? 800 : 600,
                              color: '#2A170F',
                              cursor: 'pointer',
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                        Follow-up Notes & Instructions
                      </label>
                      <textarea
                        value={followupInstructions}
                        onChange={(e) => {
                          setFollowupInstructions(e.target.value);
                          triggerAutoSave();
                        }}
                        placeholder="Describe instructions for the next consultation or specific symptoms requiring re-evaluation..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(223, 171, 98, 0.3)',
                          backgroundColor: '#FFFFFF',
                          fontSize: '0.825rem',
                          color: '#2A170F',
                          outline: 'none',
                          resize: 'vertical',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* ------------------------------------------------------------------
            RIGHT CLINICAL PANEL (30–35% Width, Independently Scrollable)
            ------------------------------------------------------------------ */}
        <aside
          className={`clinical-panel-drawer ${tabletDrawerOpen ? 'drawer-open' : ''}`}
          style={{
            width: '360px',
            backgroundColor: '#FFFFFF',
            borderLeft: '1px solid rgba(223, 171, 98, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            flexShrink: 0,
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            zIndex: 15,
            padding: '20px',
            gap: '18px',
          }}
        >
          {/* Top Section: Patient Identity & Summary */}
          {(() => {
            const isDoctorSelf =
              consultation?.patient?.fullName === doctor?.fullName ||
              consultation?.patient?.email === doctor?.email ||
              (consultation?.patient?.fullName?.toLowerCase().startsWith('dr.') ?? false);

            const resolvedPatientName =
              !isDoctorSelf && (consultation?.patient?.fullName || consultation?.booking?.patient?.fullName)
                ? (consultation?.patient?.fullName || consultation?.booking?.patient?.fullName)
                : 'Patient';

            const resolvedPatientPhone = !isDoctorSelf
              ? (consultation?.patient?.phone || consultation?.booking?.patient?.phone || null)
              : null;

            const resolvedPatientEmail = !isDoctorSelf
              ? (consultation?.patient?.email || consultation?.booking?.patient?.email || null)
              : null;

            const profile = consultation?.patientMedicalProfile ?? null;
            const hasClinicalData = Boolean(profile?.allergies || profile?.blood_group || profile?.genotype);

            return (
              <div>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8C7768', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    PATIENT RECORD
                  </span>
                </div>

                <h2
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.25rem',
                    fontWeight: 'var(--font-heading-weight, 500)',
                    color: '#2A170F',
                    margin: '2px 0 4px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {resolvedPatientName}
                </h2>

                {(resolvedPatientPhone || resolvedPatientEmail) && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.78rem',
                      color: '#6B5E55',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {resolvedPatientPhone && (
                      <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{resolvedPatientPhone}</span>
                    )}
                    {resolvedPatientPhone && resolvedPatientEmail && (
                      <span style={{ color: '#C4B5A5', flexShrink: 0 }}>•</span>
                    )}
                    {resolvedPatientEmail && (
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resolvedPatientEmail}</span>
                    )}
                  </div>
                )}

                {/* Clinical profile — real data only */}
                {hasClinicalData ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'nowrap',
                      gap: '6px',
                      marginTop: '10px',
                      padding: '8px 10px',
                      backgroundColor: '#FAF6EE',
                      borderRadius: '8px',
                      border: '1px solid rgba(223, 171, 98, 0.2)',
                    }}
                  >
                    {profile!.allergies ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#6B5E55', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Shield size={12} color="#10B981" style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Allergies: {profile!.allergies}
                        </span>
                      </div>
                    ) : (
                      <span />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {profile!.blood_group && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#2A170F', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <Heart size={12} color="#DC2626" />
                          <span>{profile!.blood_group}</span>
                        </div>
                      )}
                      {profile!.genotype && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#8E5A1C', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <Activity size={12} color="#B88647" />
                          <span>{profile!.genotype}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 10px',
                      backgroundColor: '#FAF6EE',
                      borderRadius: '8px',
                      border: '1px solid rgba(223, 171, 98, 0.2)',
                      fontSize: '0.72rem',
                      color: '#8C7768',
                    }}
                  >
                    Medical profile not on file
                  </div>
                )}
              </div>
            );
          })()}


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

          {/* Encounter Actions & Fast Shortcuts */}
          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              backgroundColor: '#FAF6EE',
              border: '1px solid rgba(223, 171, 98, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="#B88647" />
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2A170F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Encounter Actions
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B5E55', lineHeight: 1.35 }}>
              Clinical notes save automatically under the live video.
            </p>

            <button
              type="button"
              onClick={() => setShowSummaryModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 14px',
                borderRadius: '9999px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #DFAB62',
                color: '#2A170F',
                fontWeight: 700,
                fontSize: '0.825rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Eye size={15} color="#B88647" />
              <span>Preview Encounter Summary</span>
            </button>

            <Link
              href={`/consultations/${bookingId}/prescribe`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 14px',
                borderRadius: '9999px',
                backgroundColor: '#DFAB62',
                color: '#2A170F',
                fontWeight: 800,
                fontSize: '0.825rem',
                textDecoration: 'none',
              }}
            >
              <Pill size={15} />
              <span>Full E-Prescription Portal</span>
            </Link>
          </div>
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
                <div className="resp-grid-fixed" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
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
                <div className="resp-grid-fixed" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
        /* Invisible Scrollbars (functional scrolling without visible scrollbar track/thumb) */
        .clinical-panel-drawer,
        .clinical-panel-drawer * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .clinical-panel-drawer::-webkit-scrollbar,
        .clinical-panel-drawer *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
          background: transparent !important;
        }
        main,
        textarea,
        .consultation-scroll-area {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        main::-webkit-scrollbar,
        textarea::-webkit-scrollbar,
        .consultation-scroll-area::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
          background: transparent !important;
        }

        /* Video stage: fluid height, grows with viewport instead of fixed band */
        .video-stage {
          height: clamp(420px, 62vh, 780px);
          flex-shrink: 0;
          transition: all 0.25s ease-in-out;
        }

        /* True Video Fullscreen / Full View: fills 100% of viewport edge-to-edge */
        .video-stage.video-stage-fullview,
        .video-stage:fullscreen,
        .video-stage:-webkit-full-screen {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          max-height: 100vh !important;
          z-index: 99999 !important;
          border-radius: 0 !important;
          border: none !important;
          margin: 0 !important;
          box-shadow: none !important;
        }

        @media (max-width: 1024px) {
          .tablet-toggle-bar {
            display: flex !important;
          }
          .clinical-panel-drawer {
            position: fixed !important;
            top: 60px;
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
          .consultation-main {
            padding: 12px !important;
            gap: 12px !important;
          }
          .video-stage {
            height: clamp(320px, 48vh, 560px) !important;
            border-radius: 14px !important;
          }
          .doctor-pip {
            max-width: 48vw !important;
            max-height: 32vh !important;
          }
          /* Dock the call controls as a reachable bottom bar on touch screens */
          .call-control-bar {
            left: 12px !important;
            right: 12px !important;
            transform: none !important;
            bottom: 12px !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
            gap: 8px !important;
            padding: 8px 10px !important;
            border-radius: 18px !important;
          }
          .call-control-bar .call-ctrl-btn {
            width: 44px !important;
            height: 44px !important;
            flex-shrink: 0;
          }
          .call-control-bar .call-extend-btn {
            height: 44px !important;
          }
          .clinical-panel-drawer {
            width: 100% !important;
          }
          /* Collapse fixed multi-column clinical grids to one column */
          .resp-grid-fixed {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 560px) {
          .header-back-label,
          .header-end-label {
            display: none !important;
          }
        }
        @media (max-width: 420px) {
          .header-status-text {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
