'use client';

import React, { useEffect, useState } from 'react';
import { SolarIcon } from './SolarIcon';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastError } from '../lib/toast';

interface SupportContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  'Booking & Appointments',
  'Payments & Refunds',
  'Prescriptions',
  'Technical Issue',
  'Account & Profile',
  'Other',
];

/**
 * Popup "Contact Support" form. Submits to the backend contact endpoint
 * (/notifications/contact), which emails the configured SUPPORT_EMAIL inbox and
 * sends the user an acknowledgement. Pre-fills name/email for signed-in patients.
 */
export function SupportContactModal({ isOpen, onClose }: SupportContactModalProps) {
  const { user } = useAuth();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const [form, setForm] = useState({
    name: '',
    email: '',
    category: CATEGORIES[0],
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill identity from the signed-in user whenever the modal opens.
  useEffect(() => {
    if (isOpen && user) {
      setForm((f) => ({
        ...f,
        name: f.name || user.fullName || '',
        email: f.email || user.email || '',
      }));
    }
  }, [isOpen, user]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const reset = () => {
    setSent(false);
    setError(null);
    setForm({ name: user?.fullName || '', email: user?.email || '', category: CATEGORIES[0], subject: '', message: '' });
  };

  const handleClose = () => {
    onClose();
    // Reset a beat later so the success state doesn't flash on close.
    setTimeout(reset, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please provide your name, email, and a message.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/notifications/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to send your message. Please try again.');
      }
      setSent(true);
      toastSuccess('Message sent to support', 'Our team will reply to your email shortly.');
    } catch (err: any) {
      const msg = err instanceof Error && err.message ? err.message : 'Failed to send your message.';
      setError(msg);
      toastError('Could not send message', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#2A170F',
    marginBottom: '6px',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #E3D6C2',
    fontSize: '0.88rem',
    color: '#2A170F',
    background: '#FFFDF9',
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Contact support"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(42,23,15,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      className="support-modal-overlay"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '92vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          background: '#FFFDF9',
          borderRadius: '20px',
          border: '1px solid rgba(223,171,98,0.35)',
          boxShadow: '0 25px 60px rgba(42,23,15,0.35)',
          scrollbarGutter: 'stable',
          boxSizing: 'border-box',
        }}
        className="support-modal-panel"
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #F0E5D3',
            background: 'linear-gradient(135deg, #2A170F 0%, #3A2417 100%)',
            borderRadius: '20px 20px 0 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(223,171,98,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="headphones-round-linear" size={20} color="#DFAB62" />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF' }}>Contact Support</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>We typically reply within 2–4 hours</div>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              color: 'rgba(255,255,255,0.8)',
              display: 'flex',
            }}
          >
            <SolarIcon name="close-circle-linear" size={22} color="rgba(255,255,255,0.8)" />
          </button>
        </div>

        {/* Body */}
        {sent ? (
          <div style={{ padding: '40px 28px', textAlign: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(34,197,94,0.14)',
                border: '1.5px solid rgba(34,197,94,0.4)',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
              }}
            >
              <SolarIcon name="check-circle-linear" size={34} color="#16A34A" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: '#2A170F' }}>Message sent</h3>
            <p style={{ margin: '0 0 22px', fontSize: '0.9rem', color: '#6B5E55', lineHeight: 1.5 }}>
              Thanks{form.name ? `, ${form.name.split(' ')[0]}` : ''}. Our support team will reply to{' '}
              <strong style={{ color: '#2A170F' }}>{form.email}</strong> shortly. A confirmation is on its way to your inbox.
            </p>
            <button
              onClick={handleClose}
              style={{
                padding: '11px 28px',
                borderRadius: '9999px',
                background: '#DFAB62',
                color: '#2A170F',
                fontWeight: 800,
                fontSize: '0.88rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '22px 24px' }}>
            {error && (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#B91C1C',
                  fontSize: '0.82rem',
                  marginBottom: '16px',
                }}
              >
                <SolarIcon name="danger-circle-linear" size={16} color="#B91C1C" />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }} className="support-form-row">
              <div>
                <label style={labelStyle} htmlFor="sc-name">Full Name</label>
                <input
                  id="sc-name"
                  style={inputStyle}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="sc-email">Email Address</label>
                <input
                  id="sc-email"
                  type="email"
                  style={inputStyle}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.co.za"
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle} htmlFor="sc-category">Category</label>
              <select
                id="sc-category"
                style={inputStyle}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle} htmlFor="sc-subject">Subject</label>
              <input
                id="sc-subject"
                style={inputStyle}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Brief summary"
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle} htmlFor="sc-message">How can we help?</label>
              <textarea
                id="sc-message"
                style={{ ...inputStyle, minHeight: '120px', resize: 'vertical', fontFamily: 'inherit' }}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe your question or issue in detail…"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                style={{
                  padding: '11px 20px',
                  borderRadius: '9999px',
                  background: 'transparent',
                  border: '1px solid #E3D6C2',
                  color: '#6B5E55',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 24px',
                  borderRadius: '9999px',
                  background: '#DFAB62',
                  border: 'none',
                  color: '#2A170F',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: submitting ? 'default' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                <SolarIcon name={submitting ? 'refresh-linear' : 'plain-2-linear'} size={16} color="#2A170F" />
                <span>{submitting ? 'Sending…' : 'Send Message'}</span>
              </button>
            </div>

            <p style={{ margin: '16px 0 0', fontSize: '0.72rem', color: '#8C7768', lineHeight: 1.5, textAlign: 'center' }}>
              For medical emergencies do not use this form — call <strong>10177</strong> or <strong>112</strong> immediately.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
