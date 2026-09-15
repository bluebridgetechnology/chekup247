'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  ShieldCheck,
  Sparkles,
  Info,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Breadcrumbs } from '../../components/Breadcrumbs';

interface WalletCreditItem {
  id: string;
  patient_id: string;
  amount: number;
  currency: string;
  reason: string;
  booking_id: string | null;
  is_redeemed: boolean;
  created_at: string;
}

export default function PatientWalletPage() {
  const { user, token, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [ledger, setLedger] = useState<WalletCreditItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  useEffect(() => {
    let isMounted = true;

    async function loadWallet() {
      try {
        setIsLoading(true);

        if (token) {
          // Fetch balance
          const balRes = await fetch(`${API_BASE}/payments/wallet/balance`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (balRes.ok) {
            const balData = await balRes.json();
            if (isMounted) setBalance(Number(balData.total_balance) || 0);
          }

          // Fetch ledger
          const ledRes = await fetch(`${API_BASE}/payments/wallet/ledger`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (ledRes.ok) {
            const ledData = await ledRes.json();
            if (isMounted && Array.isArray(ledData)) {
              setLedger(ledData);
              return;
            }
          }
        }

        // Mock fallback for preview & demo
        if (isMounted) {
          setBalance(350.0);
          setLedger([
            {
              id: 'cred-1',
              patient_id: user?.id || 'pat-1',
              amount: 850.0,
              currency: 'ZAR',
              reason: 'Cancellation refund for Dr. Thabo Molefe consultation',
              booking_id: 'bk-demo-101',
              is_redeemed: true,
              created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'cred-2',
              patient_id: user?.id || 'pat-1',
              amount: 350.0,
              currency: 'ZAR',
              reason: 'Telehealth promotional welcome bonus',
              booking_id: null,
              is_redeemed: false,
              created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ]);
        }
      } catch (err) {
        console.warn('Error loading wallet data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadWallet();
    return () => {
      isMounted = false;
    };
  }, [token, API_BASE, user?.id]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-slate-50)', paddingBottom: '80px' }}>
      {/* Top Header */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid var(--color-slate-200)', padding: '28px 0' }}>
        <div className="container" style={{ maxWidth: '1000px' }}>
          <Breadcrumbs
            items={[
              { label: 'My Account', href: '/profile' },
              { label: 'Platform Wallet' },
            ]}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '12px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                ChekUp247 Patient Wallet
              </h1>
              <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem', marginTop: '2px' }}>
                Store credits from appointment refunds and promotions for instant, fee-free checkout
              </p>
            </div>

            <Link
              href="/doctors"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-700) 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.25)',
              }}
            >
              <span>Book with Credits</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '1000px', marginTop: '32px' }}>
        {/* Balance Hero Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
            borderRadius: '24px',
            padding: '36px',
            color: '#ffffff',
            boxShadow: '0 10px 30px rgba(13, 148, 136, 0.25)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.9, fontSize: '0.9rem', fontWeight: 600 }}>
              <Wallet size={18} />
              <span>ACTIVE WALLET BALANCE</span>
            </div>
            <div
              style={{
                fontSize: '3.2rem',
                fontWeight: 900,
                marginTop: '8px',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              R{balance.toFixed(2)}
              <span style={{ fontSize: '1.25rem', fontWeight: 600, opacity: 0.8, marginLeft: '8px' }}>
                ZAR
              </span>
            </div>
            <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#ccfbf1', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} />
              <span>Credits are automatically applied at checkout to reduce consultation costs</span>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(8px)',
              padding: '18px 24px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              maxWidth: '300px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
              <ShieldCheck size={18} />
              <span>Guaranteed Protection</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#ccfbf1', marginTop: '6px', lineHeight: 1.4 }}>
              Funds refunded to your wallet never expire and can be redeemed towards any HPCSA practitioner on ChekUp247.
            </p>
          </div>
        </div>

        {/* Transaction Ledger Table */}
        <div
          style={{
            marginTop: '36px',
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid var(--color-slate-200)',
            padding: '28px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
              Transaction Ledger
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
              {ledger.length} Record{ledger.length === 1 ? '' : 's'}
            </span>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-brand-600)' }} />
            </div>
          ) : ledger.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-slate-400)' }}>
              <Wallet size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>No credit transactions recorded yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ledger.map((item) => {
                const dateStr = new Date(item.created_at).toLocaleDateString('en-ZA', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid var(--color-slate-100)',
                      background: 'var(--color-slate-50)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: item.is_redeemed ? '#f1f5f9' : '#ecfdf5',
                          color: item.is_redeemed ? '#64748b' : '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {item.is_redeemed ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                      </div>

                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--color-slate-900)' }}>
                          {item.reason}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '2px' }}>
                          {dateStr} {item.booking_id ? `• Booking #${item.booking_id.substring(0, 8)}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '1.05rem',
                          color: item.is_redeemed ? '#64748b' : '#059669',
                        }}
                      >
                        {item.is_redeemed ? '-' : '+'}R{Number(item.amount).toFixed(2)}
                      </div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: item.is_redeemed ? '#64748b' : '#059669',
                        }}
                      >
                        {item.is_redeemed ? 'Redeemed' : 'Available'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
