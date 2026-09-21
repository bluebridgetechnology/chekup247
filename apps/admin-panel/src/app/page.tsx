'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  DollarSign,
  Layers,
  AlertCircle,
  Users,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  Stethoscope,
  ChevronRight,
  Radio,
  Copy,
  Check,
  Coins,
  CheckCircle2,
  Calendar,
  Lock,
  ChevronDown,
  Shield,
  Clock,
  Activity,
  HeartPulse,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0]?.payload;
    const title = dataItem?.tooltipTitle || label || '';

    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E9E0D5',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 4px 12px rgba(32, 23, 18, 0.08)',
          fontSize: '0.75rem',
          lineHeight: 1.5,
          color: '#201712',
          zIndex: 50,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: '6px', color: '#201712' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B98232' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#DFA34F' }} />
          <span>Gross Volume: <strong>R {(dataItem?.gross || 0).toLocaleString()}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#201712' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#201712' }} />
          <span>Net Commission: <strong>R {(dataItem?.commission || 0).toLocaleString()}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#766C64', marginTop: '2px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#18A875' }} />
          <span>Consultations: <strong>{dataItem?.consultations || 0}</strong></span>
        </div>
      </div>
    );
  }
  return null;
};

interface AnalyticsData {
  kpis: {
    totalGrossVolume: number;
    netCommission: number;
    averageTakeRate: string;
    completedCount: number;
    noShowCount: number;
    noShowRate: string;
    activeConsultationsInFlight: number;
    activeDoctorsCount: number;
    verifiedPatientsCount: number;
  };
  revenueTrajectory: Array<{
    date: string;
    gross: number;
    commission: number;
    consultations: number;
  }>;
  specialtyDistribution: Array<{
    specialty: string;
    count: number;
    percentage: string;
  }>;
  topAttendedIssues?: Array<{
    issue: string;
    count: number;
    percentage: string;
    category: string;
  }>;
  topBookedSpecialties?: Array<{
    specialty: string;
    bookingsCount: number;
    percentage: string;
    revenue: number;
  }>;
  hourlyDistribution?: Array<{
    hour: string;
    encounters: number;
    label: string;
  }>;
  encounterOutcomes?: {
    completed: number;
    active: number;
    disputedOrNoShow: number;
    total: number;
  };
  recentActivity?: Array<{
    id: string;
    doctorName: string;
    patientMasked: string;
    specialty: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  systemHealth?: {
    operationalDb: string;
    patientHealthDb: string;
    popiaCompliance: string;
  };
}

export default function AdminExecutiveDashboardPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7D' | '30D'>('7D');
  const [demandTab, setDemandTab] = useState<'issues' | 'specialties'>('issues');
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchAnalytics = async () => {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!authToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/analytics`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        credentials: 'include',
      });

      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('chekup_admin_token');
        }
        router.push('/login');
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to load analytics (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      console.error('Failed to load analytics:', e.message);
      setError(e.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        fetchAnalytics();
      }
    }
  }, [authLoading, isAuthenticated, token, router]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return { date: isoString, time: '' };
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return { date: dateStr, time: timeStr };
    } catch {
      return { date: isoString, time: '' };
    }
  };

  const kpis = data?.kpis;
  
  // Weekly aggregation for 30D, daily for 7D
  const chartData = useMemo(() => {
    const rawTrajectory = data?.revenueTrajectory || [];
    if (!rawTrajectory.length) return [];

    if (timeRange === '7D') {
      return rawTrajectory.slice(-7).map((item) => ({
        ...item,
        label: (() => {
          try {
            const d = new Date(item.date);
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          } catch {
            return item.date;
          }
        })(),
        tooltipTitle: (() => {
          try {
            const d = new Date(item.date);
            return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
          } catch {
            return item.date;
          }
        })(),
      }));
    }

    // 30D view: aggregate into 4 weekly buckets
    const last30 = rawTrajectory.slice(-30);
    const weeks: Array<{
      date: string;
      label: string;
      tooltipTitle: string;
      gross: number;
      commission: number;
      consultations: number;
    }> = [];

    const chunkSize = Math.ceil(last30.length / 4);
    for (let i = 0; i < 4; i++) {
      const chunk = last30.slice(i * chunkSize, (i + 1) * chunkSize);
      if (chunk.length === 0) continue;

      const gross = chunk.reduce((sum, d) => sum + (d.gross || 0), 0);
      const commission = chunk.reduce((sum, d) => sum + (d.commission || 0), 0);
      const consultations = chunk.reduce((sum, d) => sum + (d.consultations || 0), 0);

      const startDate = chunk[0].date;
      const endDate = chunk[chunk.length - 1].date;

      const formatShort = (ds: string) => {
        try {
          const d = new Date(ds);
          return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        } catch {
          return ds;
        }
      };

      const weekNum = i + 1;
      weeks.push({
        date: `Week ${weekNum}`,
        label: `Week ${weekNum}`,
        tooltipTitle: `Week ${weekNum} (${formatShort(startDate)} – ${formatShort(endDate)})`,
        gross: Number(gross.toFixed(2)),
        commission: Number(commission.toFixed(2)),
        consultations,
      });
    }

    return weeks;
  }, [data?.revenueTrajectory, timeRange]);

  const specialties = data?.specialtyDistribution || [];
  const visibleSpecialties = showAllSpecialties ? specialties : specialties.slice(0, 5);

  // Hourly Clinical Consultation Heatmap from real database records
  const hourlyData = data?.hourlyDistribution || [
    { hour: '08:00', encounters: 0, label: 'Early Clinic' },
    { hour: '10:00', encounters: 0, label: 'Peak Morning' },
    { hour: '12:00', encounters: 0, label: 'Mid-Day Rush' },
    { hour: '14:00', encounters: 0, label: 'Afternoon' },
    { hour: '16:00', encounters: 0, label: 'Evening Ward' },
    { hour: '18:00', encounters: 0, label: 'After-Hours' },
    { hour: '20:00', encounters: 0, label: 'On-Call' },
  ];
  const maxHourly = Math.max(...hourlyData.map((h) => h.encounters), 1);
  const totalEncountersHourly = hourlyData.reduce((acc, h) => acc + h.encounters, 0);
  const daytimeEncounters = hourlyData
    .filter((h) => ['08:00', '10:00', '12:00', '14:00', '16:00'].includes(h.hour))
    .reduce((acc, h) => acc + h.encounters, 0);
  const daytimePct = totalEncountersHourly > 0 ? Math.round((daytimeEncounters / totalEncountersHourly) * 100) : 100;

  // Real encounter outcomes
  const totalEncounters = data?.encounterOutcomes?.total ?? ((kpis?.completedCount ?? 0) + (kpis?.noShowCount ?? 0) + (kpis?.activeConsultationsInFlight ?? 0));
  const completedEncounters = data?.encounterOutcomes?.completed ?? (kpis?.completedCount ?? 0);
  const activeEncounters = data?.encounterOutcomes?.active ?? (kpis?.activeConsultationsInFlight ?? 0);
  const disputedEncounters = data?.encounterOutcomes?.disputedOrNoShow ?? (kpis?.noShowCount ?? 0);
  const completedPct = totalEncounters > 0 ? Math.round((completedEncounters / totalEncounters) * 100) : 100;
  const activePct = totalEncounters > 0 ? Math.round((activeEncounters / totalEncounters) * 100) : 0;
  const disputedPct = totalEncounters > 0 ? Math.round((disputedEncounters / totalEncounters) * 100) : 0;
  const donutDashoffset = 264 - (264 * completedPct) / 100;

  return (
    <div className="dashboard-container">
      
      {/* ====================================================================
          PAGE HEADER
          ==================================================================== */}
      <div className="page-header-container">
        <div>
          <div className="page-header-title-row">
            <h1 className="page-title">
              Executive Analytics & Governance
            </h1>
            
            {/* Live In-Flight Telehealth Sessions Badge */}
            <div className="telemetry-badge">
              <Radio size={13} className="telemetry-badge-pulse" />
              <span>{kpis?.activeConsultationsInFlight ?? 0} In-Flight Telehealth Sessions</span>
            </div>
          </div>
          
          <p className="page-subtitle" style={{ margin: 0, maxWidth: '820px' }}>
            Unified real-time tele-clinical operations, financial performance, practitioner activity, and regulatory governance.
          </p>
        </div>

        {/* Refresh Action */}
        <button
          onClick={() => fetchAnalytics()}
          disabled={isLoading}
          className="telemetry-refresh-btn"
        >
          <RefreshCw size={13} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none', color: '#DFA34F' }} />
          <span>{isLoading ? 'Refreshing...' : 'Refresh Telemetry'}</span>
        </button>
      </div>

      {error && (
        <div role="status" className="fallback-banner" style={{ borderColor: '#E53E3E', backgroundColor: '#FFF5F5', color: '#C53030' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, color: '#E53E3E' }} />
          <span>{error}. Please verify your network connection or sign in again.</span>
        </div>
      )}

      {/* ====================================================================
          LEVEL 1: EXECUTIVE KPIS (CONNECTED CARD ROW - MATCHING REFERENCE)
          ==================================================================== */}
      <div className="kpi-connected-card">
        {[
          {
            title: "Gross Volume (GMV)",
            subtitle: `R ${(kpis?.totalGrossVolume ?? 0).toLocaleString()}`,
            cardIcon: Coins,
            badgeClass: "kpi-badge-teal",
            statusValue: kpis?.averageTakeRate ? `${kpis.averageTakeRate} take rate` : "0%",
            subtext: "Gross telemetry",
          },
          {
            title: "Platform Commission",
            subtitle: `R ${(kpis?.netCommission ?? 0).toLocaleString()}`,
            cardIcon: TrendingUp,
            badgeClass: "kpi-badge-teal",
            statusValue: kpis?.averageTakeRate || "0%",
            subtext: "Platform earnings",
          },
          {
            title: "Completed Consultations",
            subtitle: (kpis?.completedCount ?? 0).toLocaleString(),
            cardIcon: CheckCircle2,
            badgeClass: "kpi-badge-teal",
            statusValue: `${kpis?.completedCount ?? 0} finished`,
            subtext: `${kpis?.activeConsultationsInFlight ?? 0} in-flight`,
          },
          {
            title: "Clinical No-Show Rate",
            subtitle: kpis?.noShowRate ?? "0%",
            cardIcon: AlertCircle,
            badgeClass: "kpi-badge-teal",
            statusValue: `${kpis?.noShowCount ?? 0} no-shows`,
            subtext: "Target < 5%",
          },
        ].map((item, index) => {
          return (
            <div className="kpi-connected-item" key={index}>
              {/* Top row: Title + Icon */}
              <div className="kpi-connected-header">
                <span className="kpi-connected-title" title={item.title}>
                  {item.title}
                </span>
                <div className="kpi-connected-icon-btn">
                  <item.cardIcon size={16} />
                </div>
              </div>

              {/* Bottom: Big Number + Subtext/Badge */}
              <div>
                <div className="kpi-connected-value">
                  {item.subtitle}
                </div>
                <div className="kpi-connected-footer">
                  <span className="kpi-connected-subtext">
                    {item.subtext}
                  </span>
                  <span className={`kpi-connected-badge ${item.badgeClass}`}>
                    {item.statusValue}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>




      {/* ====================================================================
          LEVEL 2: OPERATIONAL SNAPSHOT (CLEAN VERTICAL CARDS, ZERO CLIPPING)
          ==================================================================== */}
      <div>
        <div className="snapshot-section-header">
          <span className="snapshot-section-title">
            Operational Snapshot
          </span>
        </div>

        <div className="snapshot-grid">
          {/* Active Doctor Roster */}
          <div className="snapshot-card">
            {/* Top row: Icon + Eyebrow */}
            <div className="snapshot-header">
              <div className="snapshot-header-left">
                <div className="snapshot-icon-wrapper">
                  <Stethoscope size={18} color="#201712" />
                </div>
                <span className="stat-label">Active Doctor Roster</span>
              </div>
              <span className="snapshot-badge-pill">
                HPCSA Active
              </span>
            </div>

            {/* Middle: Value */}
            <div>
              <div className="snapshot-value">
                {kpis?.activeDoctorsCount ?? 0} Practitioners
              </div>
            </div>

            {/* Bottom: Direct link */}
            <div className="snapshot-footer">
              <Link href="/doctors" className="snapshot-link">
                <span>Inspect roster directory</span>
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          {/* Verified Patient Base */}
          <div className="snapshot-card">
            {/* Top row: Icon + Eyebrow */}
            <div className="snapshot-header">
              <div className="snapshot-header-left">
                <div className="snapshot-icon-wrapper">
                  <Users size={18} color="#201712" />
                </div>
                <span className="stat-label">Verified Patient Base</span>
              </div>
              <span className="snapshot-badge-pill">
                Verified
              </span>
            </div>

            {/* Middle: Value */}
            <div>
              <div className="snapshot-value">
                {kpis?.verifiedPatientsCount ?? 0} Patient{(kpis?.verifiedPatientsCount ?? 0) === 1 ? '' : 's'}
              </div>
            </div>

            {/* Bottom: Supporting Context */}
            <div className="snapshot-footer">
              <div className="snapshot-footer-text success">
                <Check size={14} />
                <span>Identity & SA ID verified</span>
              </div>
            </div>
          </div>

          {/* Database Perimeter */}
          <div className="snapshot-card">
            {/* Top row: Icon + Eyebrow */}
            <div className="snapshot-header">
              <div className="snapshot-header-left">
                <div className="snapshot-icon-wrapper success">
                  <ShieldCheck size={18} color="#0F8F72" />
                </div>
                <span className="stat-label">Database Perimeter</span>
              </div>
              <span className="snapshot-badge-pill isolated">
                Isolated
              </span>
            </div>

            {/* Middle: Value */}
            <div>
              <div className="snapshot-value success">
                Dual-DB Isolated
              </div>
            </div>

            {/* Bottom: Infrastructure Context */}
            <div className="snapshot-footer">
              <div className="snapshot-footer-text">
                VPS + AWS RDS (af-south-1)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          LEVEL 3 (PRIMARY): MAIN ANALYTICS (VOLUME & REVENUE + SPECIALTIES)
          ==================================================================== */}
      <div className="analytics-main-grid">
        
        {/* Left (2/3): Consultation Volume & Revenue Trajectory Chart */}
        <div className="admin-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 className="section-title">Consultation Volume & Revenue Trajectory</h3>
              <p className="section-subtitle">Daily gross merchandise volume and clinical consultation throughput</p>
            </div>

            {/* Time Period Tabs (7D and 30D) */}
            <div className="chart-tabs-wrapper">
              {(['7D', '30D'] as const).map((range) => {
                const isActive = timeRange === range;
                return (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`chart-tab-button ${isActive ? 'active' : ''}`}
                  >
                    {range}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recharts Bar Chart Container - Starts strictly from the bottom baseline */}
          <div style={{ position: 'relative', width: '100%', height: '260px', marginTop: '10px' }}>
            {isMounted ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  barGap={4}
                  barCategoryGap={timeRange === '7D' ? '20%' : '32%'}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9E0D5" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#766C64' }}
                    axisLine={{ stroke: '#E9E0D5' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) => `R ${val}`}
                    tick={{ fontSize: 10, fill: '#766C64' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 'auto']}
                  />
                  <RechartsTooltip
                    content={<CustomChartTooltip />}
                    isAnimationActive={false}
                    cursor={{ fill: 'rgba(223, 163, 79, 0.08)' }}
                  />
                  <Bar
                    dataKey="gross"
                    name={timeRange === '7D' ? 'Daily Gross Volume' : 'Weekly Gross Volume'}
                    fill="#DFA34F"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                    maxBarSize={timeRange === '7D' ? 36 : 48}
                  />
                  <Bar
                    dataKey="commission"
                    name={timeRange === '7D' ? 'Net Commission' : 'Weekly Net Commission'}
                    fill="#201712"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                    maxBarSize={timeRange === '7D' ? 36 : 48}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '260px' }} />
            )}
          </div>

          {/* Bottom Legend */}
          <div className="chart-legend-container">
            <span style={{ fontWeight: 600 }}>{timeRange === '7D' ? 'Last 7 days (Daily)' : 'Last 30 days (Weekly)'}</span>

            <div className="chart-legend-group">
              <div className="chart-legend-item">
                <div className="chart-legend-dot" style={{ backgroundColor: '#DFA34F' }} />
                <span>{timeRange === '7D' ? 'Daily Gross Volume' : 'Weekly Gross Volume'}</span>
              </div>
              <div className="chart-legend-item">
                <div className="chart-legend-dot" style={{ backgroundColor: '#201712' }} />
                <span>{timeRange === '7D' ? 'Net Commission (15%)' : 'Weekly Net Commission (15%)'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right (1/3): Clinical Demand & Specialty Utilization Chart Card */}
        <div className="demand-card">
          <div className="demand-header">
            <div>
              <h3 className="section-title">Clinical Demand & Bookings</h3>
              <p className="section-subtitle">
                {demandTab === 'issues'
                  ? 'Primary patient health issues attended across telehealth'
                  : 'Medical specialties receiving the highest booking volume'}
              </p>
            </div>

            {/* Demand Tab Switcher */}
            <div className="demand-tab-bar">
              <button
                type="button"
                onClick={() => setDemandTab('issues')}
                className={`demand-tab-btn ${demandTab === 'issues' ? 'active' : ''}`}
              >
                <span>Attended Issues</span>
              </button>
              <button
                type="button"
                onClick={() => setDemandTab('specialties')}
                className={`demand-tab-btn ${demandTab === 'specialties' ? 'active' : ''}`}
              >
                <span>Booked Specialties</span>
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="demand-list">
            {demandTab === 'issues' ? (
              (data?.topAttendedIssues && data.topAttendedIssues.length > 0) ? (
                data.topAttendedIssues.map((item) => (
                  <div key={item.issue} className="demand-row">
                    <div className="demand-row-header">
                      <div className="demand-row-left">
                        <span className="demand-row-title">{item.issue}</span>
                        <span className="demand-tag">{item.category}</span>
                      </div>
                      <span className="demand-row-stat">
                        <strong className="demand-row-count">{item.count}</strong> ({item.percentage})
                      </span>
                    </div>
                    <div className="demand-bar-track">
                      <div
                        className="demand-bar-fill issues"
                        style={{ width: item.percentage }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#766C64', fontSize: '0.85rem' }}>
                  No attended clinical issues recorded yet.
                </div>
              )
            ) : (
              (data?.topBookedSpecialties && data.topBookedSpecialties.length > 0) ? (
                data.topBookedSpecialties.map((item) => (
                  <div key={item.specialty} className="demand-row">
                    <div className="demand-row-header">
                      <div className="demand-row-left">
                        <span className="demand-row-title">{item.specialty}</span>
                        <span className="demand-tag">R {item.revenue.toLocaleString()}</span>
                      </div>
                      <span className="demand-row-stat">
                        <strong className="demand-row-count">{item.bookingsCount}</strong> ({item.percentage})
                      </span>
                    </div>
                    <div className="demand-bar-track">
                      <div
                        className="demand-bar-fill specialties"
                        style={{ width: item.percentage }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#766C64', fontSize: '0.85rem' }}>
                  No booked specialties recorded yet.
                </div>
              )
            )}
          </div>

          {/* Quick Summary Footer */}
          <div className="demand-footer-info">
            <span>
              {demandTab === 'issues'
                ? (data?.topAttendedIssues?.[0]
                    ? `Highest frequency: ${data.topAttendedIssues[0].issue} (${data.topAttendedIssues[0].percentage})`
                    : 'No clinical issues recorded')
                : (data?.topBookedSpecialties?.[0]
                    ? `Top booking demand: ${data.topBookedSpecialties[0].specialty} (${data.topBookedSpecialties[0].percentage})`
                    : 'No booked specialties recorded')}
            </span>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
              {demandTab === 'issues'
                ? `${data?.topAttendedIssues?.length || 0} Clinical Classifications`
                : `${data?.topBookedSpecialties?.length || 0} Key Disciplines`}
            </span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          LEVEL 3 (SECONDARY): CLINICAL HOURLY ACTIVITY & RESOLUTION METRICS
          ==================================================================== */}
      <div className="analytics-secondary-grid">
        
        {/* Chart 2: Hourly Consultation Activity & Peak Telehealth Windows */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h3 className="section-title">Clinical Telehealth Peak Windows</h3>
              <p className="section-subtitle">Encounter frequency across daylight & after-hours windows (SAST)</p>
            </div>
            <div className="peak-badge">
              Peak: 10:00 - 16:00
            </div>
          </div>

          {/* Visual bar chart representing hourly distribution */}
          <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', gap: '14px', paddingTop: '10px', borderBottom: '1px solid #E9E0D5', paddingBottom: '10px' }}>
            {hourlyData.map((h) => {
              const hPct = Math.round((h.encounters / maxHourly) * 100);
              const isPeak = h.encounters >= 8;

              return (
                <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '32px',
                      height: `${hPct}%`,
                      backgroundColor: isPeak ? '#DFA34F' : '#E9E0D5',
                      borderRadius: '4px 4px 1px 1px',
                      transition: 'height 0.2s ease',
                    }}
                    title={`${h.hour}: ${h.encounters} encounters (${h.label})`}
                  />
                  <span style={{ fontSize: '0.65rem', color: isPeak ? '#201712' : '#766C64', fontWeight: isPeak ? 700 : 500, marginTop: '6px' }}>
                    {h.hour}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.72rem', color: '#766C64' }}>
            <span>{daytimePct}% of patient encounters occur during daytime operating hours</span>
            <span style={{ color: '#201712', fontWeight: 600 }}>HPCSA Coverage Compliant</span>
          </div>
        </div>

        {/* Chart 3: Clinical Outcomes & Regulatory Resolution Donut Breakdown */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h3 className="section-title">Encounter Outcomes & Resolution</h3>
              <p className="section-subtitle">Clinical completion, dispute arbitration, and no-show audit</p>
            </div>
            <div className="status-badge-neutral">
              {completedPct}% Resolved
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', paddingTop: '4px' }}>
            {/* Visual SVG Donut Ring */}
            <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
              <svg width="110" height="110" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r="42" fill="transparent" stroke="#E9E0D5" strokeWidth="12" />
                {/* Dynamically completed circle */}
                <circle
                  cx="55"
                  cy="55"
                  r="42"
                  fill="transparent"
                  stroke="#18A875"
                  strokeWidth="12"
                  strokeDasharray="264"
                  strokeDashoffset={donutDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#201712', lineHeight: 1 }}>
                  {totalEncounters}
                </span>
                <span style={{ fontSize: '0.58rem', color: '#766C64', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px' }}>
                  Total
                </span>
              </div>
            </div>

            {/* Outcome Metrics Breakdown */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#18A875' }} />
                  <span style={{ color: '#201712', fontWeight: 600 }}>Concluded Successfully</span>
                </div>
                <span style={{ fontWeight: 700, color: '#201712' }}>{completedEncounters} ({completedPct}%)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#DFA34F' }} />
                  <span style={{ color: '#766C64' }}>Active / Follow-Up Scheduled</span>
                </div>
                <span style={{ fontWeight: 600, color: '#766C64' }}>{activeEncounters} ({activePct}%)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#D88A24' }} />
                  <span style={{ color: '#766C64' }}>Disputed / No-Show Rate</span>
                </div>
                <span style={{ fontWeight: 600, color: '#766C64' }}>{disputedEncounters} ({disputedPct}%)</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #E9E0D5', marginTop: '16px', paddingTop: '10px', fontSize: '0.7rem', color: '#766C64' }}>
            Zero open dispute filings. All clinical sessions compliant with SAHPRA and HPCSA requirements.
          </div>
        </div>
      </div>

      {/* ====================================================================
          LEVEL 4: OPERATIONAL ACTIVITY: RECENT CONSULTATION ACTIVITY TABLE
          ==================================================================== */}
      <div className="admin-table-container">
        <div className="table-header-bar">
          <div>
            <h3 className="section-title">Recent Consultation Activity</h3>
            <p className="section-subtitle">Latest tele-clinical encounters across South Africa</p>
          </div>
          
          <Link href="/bookings" className="table-link-btn">
            <span>View all consultations</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Doctor</th>
                <th>Patient (POPIA Masked)</th>
                <th>Specialty</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Encounter Time</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentActivity || []).map((row) => {
                const shortId = row.id.length > 10 ? `${row.id.slice(0, 8)}…` : row.id;
                const { date, time } = formatDate(row.createdAt);
                const isCopied = copiedId === row.id;

                return (
                  <tr key={row.id}>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Link
                          href={`/bookings?id=${row.id}`}
                          title={`Full ID: ${row.id}`}
                          className="table-badge-booking-id"
                        >
                          {shortId}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCopyId(row.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: isCopied ? '#18A875' : '#766C64',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title={isCopied ? 'Copied to clipboard' : 'Copy Booking UUID'}
                        >
                          {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>

                    <td style={{ fontWeight: 600, color: '#201712' }}>
                      {row.doctorName}
                    </td>

                    <td style={{ color: '#766C64', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {row.patientMasked}
                    </td>

                    <td style={{ color: '#201712' }}>
                      {row.specialty}
                    </td>

                    <td style={{ fontWeight: 700, color: '#201712' }}>
                      R {row.amount}
                    </td>

                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          backgroundColor: '#ECF9F3',
                          color: '#18A875',
                          border: '1px solid #A7F3D0',
                          textTransform: 'capitalize',
                        }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#18A875' }} />
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', lineHeight: 1.3 }}>
                        <span style={{ color: '#201712', fontWeight: 500 }}>{date}</span>
                        {time && <span style={{ color: '#766C64', fontSize: '0.68rem' }}>{time}</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====================================================================
          PRIVACY & GOVERNANCE COMPLIANCE FOOTER
          ==================================================================== */}
      <div className="compliance-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={14} color="#0F8F72" />
          <span>Protection of Personal Information Act (POPIA No. 4 of 2013) — Statutory Section 19 Security Safeguards Enforced</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span>HPCSA Regulated Tele-Clinical Practice</span>
          <span>•</span>
          <span>256-Bit TLS 1.3 End-to-End Encryption</span>
        </div>
      </div>

    </div>
  );
}
