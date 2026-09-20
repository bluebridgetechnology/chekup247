'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toastSuccess, toastError, errorMessage } from '../lib/toast';
import {
  ShieldCheck,
  Lock,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ClinicalVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  patientEmail?: string;
  doctorName?: string;
}

export function ClinicalVerificationModal({
  isOpen,
  onClose,
  onVerified,
  patientEmail,
  doctorName = 'the doctor',
}: ClinicalVerificationModalProps) {
  const { user, verifyOtp, resendOtp, refreshUser } = useAuth();
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState<number>(0);
  const [isResending, setIsResending] = useState<boolean>(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const emailToUse = patientEmail || user?.email || '';

  // Focus first input on open
  useEffect(() => {
    if (isOpen) {
      setOtpValues(['', '', '', '', '', '']);
      setErrorMsg(null);
      setSuccessMsg(null);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const interval = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCountdown]);

  if (!isOpen) return null;

  const handleOtpChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    const updated = [...otpValues];

    if (!cleanValue) {
      updated[index] = '';
      setOtpValues(updated);
      return;
    }

    if (cleanValue.length > 1) {
      const chars = cleanValue.slice(0, 6).split('');
      chars.forEach((c, i) => {
        if (index + i < 6) updated[index + i] = c;
      });
      setOtpValues(updated);
      const nextIdx = Math.min(index + chars.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    updated[index] = cleanValue;
    setOtpValues(updated);

    if (index < 5 && cleanValue) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const updated = [...otpValues];
    pasted.split('').forEach((ch, idx) => {
      if (idx < 6) updated[idx] = ch;
    });
    setOtpValues(updated);
    const targetIdx = Math.min(pasted.length, 5);
    inputRefs.current[targetIdx]?.focus();
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpValues.join('');
    if (code.length < 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    if (!emailToUse) {
      setErrorMsg('No email address found to verify against.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      await verifyOtp(emailToUse, code);
      setSuccessMsg('Clinical clearance active! Accessing consultation room...');
      toastSuccess('Verified', 'Clinical clearance active — entering the consultation room.');
      if (refreshUser) await refreshUser();
      setTimeout(() => {
        onVerified();
        onClose();
      }, 900);
    } catch (err: any) {
      const msg = errorMessage(err, 'Verification failed. The code may be invalid or expired.');
      setErrorMsg(msg);
      toastError('Verification failed', msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendClick = async () => {
    if (!emailToUse || resendCountdown > 0 || isResending) return;

    setIsResending(true);
    setErrorMsg(null);
    try {
      await resendOtp(emailToUse);
      setResendCountdown(60);
      setSuccessMsg('A new 6-digit code has been dispatched to your email.');
      toastSuccess('Code sent', 'A new verification code is on its way.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      const msg = errorMessage(err, 'Failed to resend code. Please try again.');
      setErrorMsg(msg);
      toastError('Could not resend code', msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--color-cream-surface, #FDFBF7)',
          border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.45))',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '480px',
          padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(42, 23, 15, 0.25)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--color-cream-text-muted, #6B5E55)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={20} />
        </button>

        {/* Header Icon */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(223, 171, 98, 0.25) 0%, rgba(223, 171, 98, 0.1) 100%)',
            border: '2px solid var(--color-gold-border, rgba(223, 171, 98, 0.5))',
            color: 'var(--color-chocolate-base, #2A170F)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Lock size={26} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <h2
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--color-chocolate-base, #2A170F)',
              fontFamily: 'var(--font-heading)',
              margin: 0,
            }}
          >
            Clinical Identity Verification
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-cream-text-muted, #6B5E55)',
              marginTop: '8px',
              lineHeight: 1.5,
            }}
          >
            Under South African HPCSA telehealth standards, please verify your account before entering the video consultation with <strong>{doctorName}</strong>.
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '10px',
              padding: '4px 12px',
              borderRadius: '9999px',
              background: 'var(--color-cream-base, #FAF6EE)',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--color-chocolate-base, #2A170F)',
            }}
          >
            <Mail size={13} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
            <span>Code sent to: {emailToUse}</span>
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '12px 14px',
              borderRadius: '12px',
              marginBottom: '18px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '12px 14px',
              borderRadius: '12px',
              marginBottom: '18px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleVerifySubmit}>
          {/* 6 Digit Input Cells */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              marginBottom: '22px',
            }}
          >
            {otpValues.map((val, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={val}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                style={{
                  width: '46px',
                  height: '56px',
                  borderRadius: '12px',
                  border: '2px solid ' + (val ? 'var(--color-gold-base, #DFAB62)' : 'rgba(42, 23, 15, 0.2)'),
                  background: '#ffffff',
                  textAlign: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  outline: 'none',
                  boxShadow: val ? '0 2px 8px rgba(223, 171, 98, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isVerifying || otpValues.join('').length < 6}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              background: 'var(--color-chocolate-base, #2A170F)',
              color: 'var(--color-gold-pale, #F0E5D3)',
              fontWeight: 800,
              fontSize: '0.95rem',
              fontFamily: 'var(--font-heading)',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.4))',
              cursor: isVerifying || otpValues.join('').length < 6 ? 'not-allowed' : 'pointer',
              opacity: otpValues.join('').length < 6 ? 0.65 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(42, 23, 15, 0.15)',
              transition: 'all 0.2s ease',
            }}
          >
            {isVerifying ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Verifying Clinical Access...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} style={{ color: 'var(--color-gold-base, #DFAB62)' }} />
                <span>Verify & Enter Room</span>
              </>
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              type="button"
              onClick={handleResendClick}
              disabled={isResending || resendCountdown > 0}
              style={{
                background: 'none',
                border: 'none',
                color: resendCountdown > 0 ? '#9ca3af' : 'var(--color-gold-bronze, #B88647)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: resendCountdown > 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px',
              }}
            >
              {isResending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Resending code...</span>
                </>
              ) : resendCountdown > 0 ? (
                <span>Resend code in {resendCountdown}s</span>
              ) : (
                <>
                  <RefreshCw size={13} />
                  <span>Didn't receive code? Resend</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
