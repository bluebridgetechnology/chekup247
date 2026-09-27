'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SolarIcon } from '../../components/common/SolarIcon';
import { ChekupCrossLogo } from '../../components/common/ChekupCrossLogo';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { toastSuccess, toastError } from '../../lib/toast';

const HANDSHAKE_STEPS = [
  { label: 'Initiating OIDC Handshake', detail: 'Connecting to LocumStaff identity provider...' },
  { label: 'Validating PKCE Exchange', detail: 'Verifying S256 code challenge & state integrity...' },
  { label: 'Verifying Token Signature', detail: 'Validating RS256 cryptographic keys from JWKS...' },
  { label: 'Synchronizing HPCSA Profile', detail: 'Matching clinical registration and permissions...' },
  { label: 'Launching Practice Suite', detail: 'Establishing encrypted doctor practice session...' },
];

function SsoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleSsoCallback } = useDoctorAuth();

  const code = searchParams?.get('code');
  const codeVerifier = searchParams?.get('code_verifier') || undefined;
  const state = searchParams?.get('state') || undefined;

  const [status, setStatus] = useState<'exchanging' | 'success' | 'error'>('exchanging');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copiedDiag, setCopiedDiag] = useState(false);
  const [errorTimestamp, setErrorTimestamp] = useState<string | null>(null);

  // Animate through verification stages while exchanging
  useEffect(() => {
    if (status !== 'exchanging') return;

    const interval = setInterval(() => {
      setActiveStepIndex((prev) => {
        if (prev < HANDSHAKE_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 850);

    return () => clearInterval(interval);
  }, [status]);

  const executedRef = useRef(false);

  useEffect(() => {
    if (!code) {
      setStatus('error');
      setErrorMessage('Missing OIDC authorization code in redirect callback.');
      setErrorTimestamp(new Date().toISOString());
      return;
    }
    if (!state) {
      setStatus('error');
      setErrorMessage('Missing OIDC state parameter — this sign-in link is invalid or incomplete.');
      setErrorTimestamp(new Date().toISOString());
      return;
    }

    // Single-use authorization code guard: prevent duplicate exchanges caused
    // by React StrictMode, context re-renders, or hook re-evaluations.
    if (executedRef.current) return;
    executedRef.current = true;

    let isMounted = true;

    async function executeExchange() {
      try {
        const result = await handleSsoCallback(code!, codeVerifier, state);
        if (isMounted) {
          setStatus('success');
          setActiveStepIndex(HANDSHAKE_STEPS.length - 1);

          const name = result?.user?.fullName || result?.user?.firstName || 'Doctor';
          setDoctorName(name);

          toastSuccess('Signed in via LocumStaff', 'Launching your clinical dashboard.');

          const destination = result?.doctorProfile || result?.user?.doctorProfile ? '/calendar' : '/onboard';
          setTimeout(() => {
            router.push(destination);
          }, 1600);
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('error');
          setErrorTimestamp(new Date().toISOString());
          const _msg = err instanceof Error && err.message ? err.message : 'Federated SSO token exchange failed.';
          setErrorMessage(_msg);
          toastError('SSO sign-in failed', _msg);
        }
      }
    }

    executeExchange();

    return () => {
      isMounted = false;
    };
  }, [code, codeVerifier, state, handleSsoCallback, router]);

  const handleRetryLogin = () => {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:4000/api/v1'
        : 'http://localhost:4000/api/v1');
    window.location.href = `${apiBase}/auth/sso/locumstaff`;
  };

  const copyDiagnostics = () => {
    const diag = [
      `ChekUp247 LocumStaff SSO Handshake Diagnostics`,
      `---------------------------------------------`,
      `Timestamp: ${errorTimestamp || new Date().toISOString()}`,
      `Status: ${status}`,
      `Error: ${errorMessage || 'Unknown'}`,
      `Code Present: ${Boolean(code)} (${code ? code.slice(0, 8) + '...' : 'none'})`,
      `State Present: ${Boolean(state)}`,
      `Code Verifier: ${codeVerifier ? 'Present' : 'Resolved via Session'}`,
      `Host: ${typeof window !== 'undefined' ? window.location.host : 'unknown'}`,
    ].join('\n');

    navigator.clipboard?.writeText(diag);
    setCopiedDiag(true);
    setTimeout(() => setCopiedDiag(false), 2500);
  };

  return (
    <div className="sso-page-root">
      <style>{`
        .sso-page-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: radial-gradient(circle at 50% 15%, rgba(223, 171, 98, 0.12) 0%, transparent 55%),
                      linear-gradient(180deg, #1A0D07 0%, #2A170F 50%, #140A05 100%);
          color: var(--color-chocolate-base, #2A170F);
          font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
          position: relative;
          overflow: hidden;
        }

        /* Ambient background glow orbs */
        .sso-bg-glow-1 {
          position: absolute;
          top: -10%;
          left: 15%;
          width: 480px;
          height: 480px;
          background: radial-gradient(circle, rgba(223, 171, 98, 0.08) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          animation: ambientFloat 12s ease-in-out infinite alternate;
        }

        .sso-bg-glow-2 {
          position: absolute;
          bottom: -15%;
          right: 15%;
          width: 520px;
          height: 520px;
          background: radial-gradient(circle, rgba(42, 23, 15, 0.6) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          animation: ambientFloat 14s ease-in-out infinite alternate-reverse;
        }

        @keyframes ambientFloat {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(30px) scale(1.08); }
        }

        /* Main Container Card */
        .sso-card {
          width: 100%;
          max-width: 540px;
          background: var(--color-cream-surface, #FDFBF7);
          border-radius: 28px;
          padding: 44px 36px;
          border: 1px solid rgba(223, 171, 98, 0.35);
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(223, 171, 98, 0.08);
          text-align: center;
          position: relative;
          z-index: 2;
          backdrop-filter: blur(10px);
        }

        /* Handshake Interactive Stage */
        .handshake-stage {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          margin: 10px 0 36px 0;
          padding: 16px 12px;
          background: #FAF6EE;
          border-radius: 20px;
          border: 1px solid rgba(223, 171, 98, 0.22);
        }

        /* Brand Node Badges */
        .node-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          z-index: 3;
          width: 110px;
        }

        .node-avatar {
          width: 62px;
          height: 62px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px -4px rgba(42, 23, 15, 0.15);
          position: relative;
          transition: all 0.35s ease;
        }

        .node-avatar.locumstaff {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 2px solid rgba(56, 189, 248, 0.4);
          color: #38bdf8;
        }

        .node-avatar.chekup {
          background: linear-gradient(135deg, #2A170F 0%, #1c0f09 100%);
          border: 2px solid rgba(223, 171, 98, 0.5);
        }

        /* Radiating pulse waves on nodes when exchanging */
        .node-avatar.pulse-active::before {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: 22px;
          border: 2px solid rgba(223, 171, 98, 0.5);
          animation: nodeHalo 2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
          pointer-events: none;
        }

        .node-avatar.locumstaff.pulse-active::before {
          border-color: rgba(56, 189, 248, 0.5);
        }

        @keyframes nodeHalo {
          0% { transform: scale(0.95); opacity: 0.9; }
          100% { transform: scale(1.22); opacity: 0; }
        }

        .node-title {
          font-weight: 700;
          font-size: 0.92rem;
          letter-spacing: -0.01em;
          color: var(--color-chocolate-base, #2A170F);
        }

        .node-sub {
          font-size: 0.72rem;
          font-weight: 500;
          color: #8C7B70;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Connection Bridge SVG & Central Nexus */
        .bridge-conduit-wrapper {
          flex: 1;
          height: 70px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 -8px;
        }

        .bridge-svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        /* Animated stream pulse along the conduit */
        .stream-line {
          stroke-dasharray: 6 10;
          animation: streamFlow 1.4s linear infinite;
        }

        .stream-line-reverse {
          stroke-dasharray: 6 10;
          animation: streamFlowReverse 1.4s linear infinite;
        }

        @keyframes streamFlow {
          from { stroke-dashoffset: 32; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes streamFlowReverse {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 32; }
        }

        /* Traveling glowing energy packet */
        .energy-particle-forward {
          animation: travelForward 2.4s ease-in-out infinite;
        }

        .energy-particle-backward {
          animation: travelBackward 2.4s ease-in-out infinite 1.2s;
        }

        @keyframes travelForward {
          0% { transform: translateX(20px); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(160px); opacity: 0; }
        }

        @keyframes travelBackward {
          0% { transform: translateX(160px); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(20px); opacity: 0; }
        }

        /* Center Nexus Handshake Hub */
        .nexus-hub {
          position: absolute;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #FAF6EE;
          border: 2px solid var(--color-gold-base, #DFAB62);
          box-shadow: 0 4px 16px rgba(223, 171, 98, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 4;
        }

        .nexus-hub.success {
          border-color: #10B981;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
          background: #ECFDF5;
        }

        .nexus-hub.error {
          border-color: #EF4444;
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
          background: #FEF2F2;
        }

        /* Concentric Sonar Pulse from Center Hub */
        .sonar-wave {
          position: absolute;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 2px solid var(--color-gold-base, #DFAB62);
          opacity: 0.8;
          animation: sonarRipple 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
          pointer-events: none;
        }

        .sonar-wave.delayed {
          animation-delay: 1.1s;
        }

        @keyframes sonarRipple {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.85); opacity: 0; }
        }

        /* Rotating Orbit Ring */
        .orbit-ring {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px dashed rgba(223, 171, 98, 0.6);
          animation: orbitSpin 8s linear infinite;
        }

        @keyframes orbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Security Protocol Pill */
        .protocol-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: rgba(42, 23, 15, 0.05);
          border-radius: 100px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #6B5E55;
          margin-bottom: 24px;
          letter-spacing: 0.02em;
        }

        .protocol-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
          animation: blinkDot 1.6s ease-in-out infinite alternate;
        }

        @keyframes blinkDot {
          0% { opacity: 0.4; }
          100% { opacity: 1; }
        }

        /* Stage Telemetry Stepper Box */
        .telemetry-box {
          background: #FAF6EE;
          border: 1px solid rgba(223, 171, 98, 0.2);
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 24px;
          text-align: left;
        }

        .telemetry-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .telemetry-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-chocolate-base, #2A170F);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .telemetry-badge {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 2px 8px;
          background: rgba(223, 171, 98, 0.2);
          color: #8C5D23;
          border-radius: 6px;
        }

        .telemetry-detail {
          font-size: 0.8rem;
          color: #7A6D64;
          line-height: 1.4;
          margin-bottom: 12px;
        }

        .progress-track {
          width: 100%;
          height: 6px;
          background: rgba(42, 23, 15, 0.08);
          border-radius: 99px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #DFAB62 0%, #10B981 100%);
          border-radius: 99px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Step Dots Indicators */
        .step-dots {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 10px;
          padding: 0 4px;
        }

        .step-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(42, 23, 15, 0.15);
          transition: all 0.3s ease;
        }

        .step-dot.active {
          background: #DFAB62;
          transform: scale(1.3);
          box-shadow: 0 0 6px rgba(223, 171, 98, 0.8);
        }

        .step-dot.completed {
          background: #10B981;
        }

        /* Diagnostics Accordion */
        .diag-wrapper {
          margin-top: 18px;
          border-top: 1px dashed rgba(239, 68, 68, 0.3);
          padding-top: 14px;
          text-align: left;
        }

        .diag-toggle-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          color: #8C5D23;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0;
        }

        .diag-content {
          margin-top: 10px;
          background: #1A0D07;
          border-radius: 12px;
          padding: 14px;
          font-family: monospace;
          font-size: 0.76rem;
          color: #ECC27E;
          line-height: 1.5;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }

        @media (max-width: 480px) {
          .sso-card {
            padding: 32px 20px;
            border-radius: 22px;
          }
          .node-box {
            width: 85px;
          }
          .node-avatar {
            width: 52px;
            height: 52px;
            border-radius: 14px;
          }
          .node-title {
            font-size: 0.82rem;
          }
          .node-sub {
            font-size: 0.65rem;
          }
          .nexus-hub {
            width: 42px;
            height: 42px;
          }
        }
      `}</style>

      {/* Ambient background orbs */}
      <div className="sso-bg-glow-1" />
      <div className="sso-bg-glow-2" />

      <div className="sso-card">
        {/* Top Protocol Badge */}
        <div className="protocol-pill">
          <span className="protocol-dot" />
          <span>Federated OIDC • RS256 PKCE Protocol</span>
        </div>

        {/* Dynamic Animated Handshake Stage */}
        <div className="handshake-stage" aria-label="SSO Connection Handshake Visualizer">
          {/* Left Node: LocumStaff */}
          <div className="node-box">
            <div className={`node-avatar locumstaff ${status === 'exchanging' ? 'pulse-active' : ''}`}>
              <SolarIcon name="shield-check-bold" size={30} color="#38bdf8" />
            </div>
            <span className="node-title">LocumStaff</span>
            <span className="node-sub">Partner IDP</span>
          </div>

          {/* Center Connection Bridge with Animated Conduit & Central Hub */}
          <div className="bridge-conduit-wrapper">
            <svg
              className="bridge-svg"
              viewBox="0 0 180 70"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="goldBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#DFAB62" stopOpacity="1" />
                  <stop offset="100%" stopColor="#DFAB62" stopOpacity="0.9" />
                </linearGradient>

                <linearGradient id="successBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>

                <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Base background track */}
              <path
                d="M 10 35 L 170 35"
                stroke={status === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(223, 171, 98, 0.25)'}
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Active streaming pulse beam when exchanging */}
              {status === 'exchanging' && (
                <>
                  <path
                    d="M 10 35 L 170 35"
                    stroke="url(#goldBeamGrad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="stream-line"
                    filter="url(#glowFilter)"
                  />
                  <path
                    d="M 10 35 L 170 35"
                    stroke="rgba(255, 255, 255, 0.9)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="stream-line-reverse"
                  />
                  {/* Traveling Photon Particles */}
                  <g className="energy-particle-forward">
                    <circle cx="0" cy="35" r="4.5" fill="#DFAB62" filter="url(#glowFilter)" />
                    <circle cx="0" cy="35" r="2" fill="#ffffff" />
                  </g>
                  <g className="energy-particle-backward">
                    <circle cx="0" cy="35" r="3.5" fill="#38bdf8" filter="url(#glowFilter)" />
                    <circle cx="0" cy="35" r="1.5" fill="#ffffff" />
                  </g>
                </>
              )}

              {/* Solid locked beam on success */}
              {status === 'success' && (
                <path
                  d="M 10 35 L 170 35"
                  stroke="url(#successBeamGrad)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  filter="url(#glowFilter)"
                />
              )}

              {/* Severed line on error */}
              {status === 'error' && (
                <path
                  d="M 10 35 L 80 35 M 100 35 L 170 35"
                  stroke="#EF4444"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
              )}
            </svg>

            {/* Central Nexus Handshake Hub */}
            <div
              className={`nexus-hub ${status === 'success' ? 'success' : status === 'error' ? 'error' : ''}`}
            >
              {status === 'exchanging' && (
                <>
                  <div className="sonar-wave" />
                  <div className="sonar-wave delayed" />
                  <div className="orbit-ring" />
                  <SolarIcon
                    name="lock-keyhole-minimalistic-bold"
                    size={22}
                    color="var(--color-gold-bronze, #B88647)"
                  />
                </>
              )}

              {status === 'success' && (
                <SolarIcon name="check-circle-bold" size={26} color="#10B981" />
              )}

              {status === 'error' && (
                <SolarIcon name="danger-circle-bold" size={26} color="#EF4444" />
              )}
            </div>
          </div>

          {/* Right Node: ChekUp247 */}
          <div className="node-box">
            <div className={`node-avatar chekup ${status === 'exchanging' ? 'pulse-active' : ''}`}>
              <ChekupCrossLogo size={32} />
            </div>
            <span className="node-title">ChekUp247</span>
            <span className="node-sub">Practice Suite</span>
          </div>
        </div>

        {/* STATUS: EXCHANGING */}
        {status === 'exchanging' && (
          <div>
            <h2
              style={{
                fontSize: '1.45rem',
                fontWeight: 700,
                marginBottom: '8px',
                color: 'var(--color-chocolate-base, #2A170F)',
                letterSpacing: '-0.02em',
              }}
            >
              Connecting Healthcare Portals...
            </h2>
            <p
              style={{
                color: 'var(--color-cream-text-muted, #6B5E55)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                marginBottom: '22px',
              }}
            >
              Exchanging federated credentials between LocumStaff and ChekUp247 to unlock your clinical practice suite.
            </p>

            {/* Telemetry Stage Progress */}
            <div className="telemetry-box">
              <div className="telemetry-header">
                <span className="telemetry-title">
                  <SolarIcon name="refresh-linear" size={16} className="animate-spin" color="#DFAB62" />
                  <span>{HANDSHAKE_STEPS[activeStepIndex]?.label}</span>
                </span>
                <span className="telemetry-badge">
                  Step {activeStepIndex + 1} of {HANDSHAKE_STEPS.length}
                </span>
              </div>
              <p className="telemetry-detail">{HANDSHAKE_STEPS[activeStepIndex]?.detail}</p>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${((activeStepIndex + 1) / HANDSHAKE_STEPS.length) * 100}%`,
                  }}
                />
              </div>

              <div className="step-dots">
                {HANDSHAKE_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`step-dot ${
                      i < activeStepIndex ? 'completed' : i === activeStepIndex ? 'active' : ''
                    }`}
                  />
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                color: '#8C7B70',
              }}
            >
              <SolarIcon name="shield-check-linear" size={16} color="#DFAB62" />
              <span>HPCSA Rule 27A &amp; POPIA Encrypted Channel</span>
            </div>
          </div>
        )}

        {/* STATUS: SUCCESS */}
        {status === 'success' && (
          <div>
            <h2
              style={{
                fontSize: '1.45rem',
                fontWeight: 700,
                marginBottom: '8px',
                color: 'var(--color-chocolate-base, #2A170F)',
                letterSpacing: '-0.02em',
              }}
            >
              Doctor Handshake Complete
            </h2>
            <p
              style={{
                color: '#065f46',
                fontSize: '0.95rem',
                fontWeight: 600,
                marginBottom: '4px',
              }}
            >
              Welcome back, {doctorName || 'Doctor'}!
            </p>
            <p
              style={{
                color: 'var(--color-cream-text-muted, #6B5E55)',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                marginBottom: '24px',
              }}
            >
              Your LocumStaff credentials have been cryptographically verified. Launching your clinical dashboard...
            </p>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '12px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #DFAB62 0%, #B88647 100%)',
                color: '#2A170F',
                fontWeight: 700,
                fontSize: '0.9rem',
                boxShadow: '0 8px 20px -4px rgba(223, 171, 98, 0.4)',
              }}
            >
              <SolarIcon name="refresh-linear" size={18} className="animate-spin" color="#2A170F" />
              <span>Entering Practice Suite...</span>
            </div>
          </div>
        )}

        {/* STATUS: ERROR */}
        {status === 'error' && (
          <div>
            <h2
              style={{
                fontSize: '1.45rem',
                fontWeight: 700,
                marginBottom: '8px',
                color: '#991b1b',
                letterSpacing: '-0.02em',
              }}
            >
              SSO Handshake Interrupted
            </h2>
            <p
              style={{
                color: 'var(--color-cream-text-muted, #6B5E55)',
                fontSize: '0.9rem',
                marginBottom: '20px',
                lineHeight: 1.5,
              }}
            >
              {errorMessage || 'Unable to exchange LocumStaff authorization code. The session or token may have expired.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Direct Re-authentication Action */}
              <button
                type="button"
                onClick={handleRetryLogin}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  background: 'linear-gradient(135deg, #DFAB62 0%, #B88647 100%)',
                  color: '#2A170F',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px -4px rgba(223, 171, 98, 0.35)',
                }}
              >
                <SolarIcon name="refresh-square-linear" size={18} color="#2A170F" />
                <span>Try LocumStaff Sign-In Again</span>
              </button>

              {/* Back to Login */}
              <Link
                href="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '14px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  background: 'rgba(42, 23, 15, 0.05)',
                  textDecoration: 'none',
                  border: '1px solid rgba(42, 23, 15, 0.1)',
                }}
              >
                <SolarIcon name="arrow-left-linear" size={16} />
                <span>Return to Doctor Sign In</span>
              </Link>
            </div>

            {/* Diagnostics Drawer for Developer & Live VPS troubleshooting */}
            <div className="diag-wrapper">
              <button
                type="button"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="diag-toggle-btn"
              >
                <SolarIcon name={showDiagnostics ? 'alt-arrow-down-linear' : 'alt-arrow-right-linear'} size={14} />
                <span>{showDiagnostics ? 'Hide Technical Diagnostics' : 'View Technical Diagnostics'}</span>
              </button>

              {showDiagnostics && (
                <div className="diag-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>SSO Debug Payload</span>
                    <button
                      type="button"
                      onClick={copyDiagnostics}
                      style={{
                        background: 'rgba(223, 171, 98, 0.2)',
                        border: '1px solid rgba(223, 171, 98, 0.4)',
                        color: '#DFAB62',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                      }}
                    >
                      {copiedDiag ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                  <div>Timestamp: {errorTimestamp}</div>
                  <div>Error: {errorMessage}</div>
                  <div>Code: {code ? `${code.slice(0, 10)}... (${code.length} chars)` : 'null'}</div>
                  <div>State: {state ? `${state.slice(0, 10)}...` : 'null'}</div>
                  <div>PKCE Verifier: {codeVerifier ? 'Passed directly' : 'Resolved via server state cache'}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SsoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1A0D07',
            color: '#ECC27E',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '12px' }}>
              <SolarIcon name="refresh-linear" size={36} className="animate-spin" color="#DFAB62" />
            </div>
            <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>Initializing LocumStaff Authentication...</p>
          </div>
        </div>
      }
    >
      <SsoCallbackContent />
    </Suspense>
  );
}
