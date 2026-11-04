import QRCodeView from './QRCodeView';
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  CreditCard, 
  Cpu, 
  Activity, 
  ArrowRight, 
  Radio, 
  Layers, 
  Banknote, 
  PiggyBank, 
  AlertTriangle, 
  Play, 
  Square, 
  Download, 
  PlusCircle, 
  X, 
  QrCode, 
  Smartphone,
  Copy,
  Check,
  Settings,
  UserCheck,
  Volume2,
  VolumeX,
  MessageSquare,
  Share2,
  ExternalLink,
  ChevronRight,
  Send,
  Sparkles,
  Server,
  Globe,
  RotateCw,
  Sliders,
  Filter,
  FileText,
  Lock,
  ChevronDown,
  Workflow
} from 'lucide-react';

const isDevServer = typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '3000');
const backendHost = isDevServer ? `${window.location.hostname}:8000` : (typeof window !== 'undefined' ? window.location.host : 'localhost:8000');
const API_BASE = typeof window !== 'undefined' ? (isDevServer ? `${window.location.protocol}//${backendHost}` : window.location.origin) : 'http://localhost:8000';
const WS_URL = typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${backendHost}/ws` : 'ws://localhost:8000/ws';

// Synthetic Multi-Sensory Feedback (Audio Chime + Physical Phone Vibration)
function triggerDeviceFeedback(soundEnabled = true) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([80, 40, 120]);
    } catch (e) {}
  }

  if (soundEnabled) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12); // G5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }
}

export default function App() {
  // Core Telemetry & Metrics
  const [metrics, setMetrics] = useState({
    total_at_risk_usd: 0.0,
    total_recovered_usd: 0.0,
    total_fees_saved_usd: 0.0,
    total_events: 0,
    recovery_rate_pct: 0.0,
    compliance_blocks: 0
  });

  const [auditRecords, setAuditRecords] = useState([]);
  const [connected, setConnected] = useState(false);
  const [trafficRunning, setTrafficRunning] = useState(false);
  const [simulating, setSimulating] = useState(null);
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW', 'RADAR', 'AI_INTELLIGENCE', 'TESTBENCH', 'COMPLIANCE'
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hitlMode, setHitlMode] = useState(false);
  
  // Modals & Drawers
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFlowchartModal, setShowFlowchartModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showToolModal, setShowToolModal] = useState(null); // { type: 'WHATSAPP' | 'SLACK', record: rec }
  const [selectedRecord, setSelectedRecord] = useState(null); // For AI Intelligence inspect
  const [copiedLink, setCopiedLink] = useState(false);

  // Bank Telemetry State
  const [bankTelemetry, setBankTelemetry] = useState({
    npci: { name: 'NPCI Central Switch', status: 'HEALTHY', latency_ms: 68, uptime_pct: 99.85, proactive_reroute_active: false },
    hdfc: { name: 'HDFC Core UPI Node', status: 'HEALTHY', latency_ms: 92, uptime_pct: 99.70, proactive_reroute_active: false },
    icici: { name: 'ICICI Secondary Rail', status: 'HEALTHY', latency_ms: 84, uptime_pct: 99.92, proactive_reroute_active: false },
    paytm: { name: 'Paytm Payments Bank', status: 'HEALTHY', latency_ms: 96, uptime_pct: 99.50, proactive_reroute_active: false },
    razorpay: { name: 'Razorpay Gateway API', status: 'HEALTHY', latency_ms: 115, uptime_pct: 99.40, proactive_reroute_active: false }
  });

  const [stateChangeNarrative, setStateChangeNarrative] = useState(null);
  const [lastNotification, setLastNotification] = useState(null);

  // Dynamic Mobile Network URL
  const [mobileNetworkUrl, setMobileNetworkUrl] = useState(typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');

  // Custom Webhook Builder State
  const [customForm, setCustomForm] = useState({
    amount: 1499,
    currency: 'INR',
    decline_code: 'upi_server_timeout',
    issuing_bank: 'HDFC Bank (UPI / PhonePe)',
    card_network: 'UPI / NPCI',
    customer_tenure_months: 14,
    day_of_month: 3,
    retry_count: 0
  });
  const [customResult, setCustomResult] = useState(null);

  // WebSocket Connection
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    const connectWs = () => {
      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'INITIAL_STATE') {
              if (data.metrics) setMetrics(data.metrics);
              if (data.audit_records) {
                setAuditRecords(data.audit_records.reverse());
                if (data.audit_records.length > 0) setSelectedRecord(data.audit_records[0]);
              }
              if (data.bank_telemetry) setBankTelemetry(data.bank_telemetry);
              if (data.hitl_mode !== undefined) setHitlMode(data.hitl_mode);
            } else if (data.type === 'NEW_RECOVERY_EVENT' || data.type === 'MOBILE_PAYMENT_INTERCEPTED') {
              if (data.metrics) setMetrics(data.metrics);
              if (data.record) {
                setAuditRecords((prev) => [data.record, ...prev.slice(0, 49)]);
                setSelectedRecord(data.record);
                triggerDeviceFeedback(soundEnabled);
                setLastNotification({
                  amount: data.record.transaction?.amount,
                  outcome: data.record.outcome,
                  action: data.record.optimization?.chosen_action,
                  isMobile: data.type === 'MOBILE_PAYMENT_INTERCEPTED',
                  appName: data.app === 'paytm' ? 'Paytm UPI' : (data.app === 'google_pay' ? 'Google Pay' : 'Mobile UPI')
                });
                setTimeout(() => setLastNotification(null), 5000);
              }
            } else if (data.type === 'TELEMETRY_HEARTBEAT') {
              if (data.telemetry) setBankTelemetry(data.telemetry);
            } else if (data.type === 'BANK_OUTAGE_TRIGGERED') {
              if (data.telemetry) setBankTelemetry(data.telemetry);
              if (data.narrative) setStateChangeNarrative(data.narrative);
            } else if (data.type === 'RECORD_UPDATED') {
              if (data.metrics) setMetrics(data.metrics);
              if (data.record) {
                setAuditRecords((prev) =>
                  prev.map((r) => (r.id === data.record.id ? data.record : r))
                );
                if (selectedRecord?.id === data.record.id) setSelectedRecord(data.record);
              }
            } else if (data.type === 'HITL_MODE_CHANGED') {
              setHitlMode(data.hitl_mode);
            }
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        setConnected(false);
        reconnectTimeout = setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    // Immediate fetch of latest state
    const fetchFreshState = () => {
      fetch(`${API_BASE}/api/metrics`)
        .then((r) => r.json())
        .then((m) => setMetrics(m))
        .catch(() => {});
      fetch(`${API_BASE}/api/audit?limit=40`)
        .then((r) => r.json())
        .then((recs) => {
          if (Array.isArray(recs) && recs.length > 0) {
            setAuditRecords(recs.slice().reverse());
            setSelectedRecord(recs[recs.length - 1]);
          }
        })
        .catch(() => {});
      fetch(`${API_BASE}/api/traffic/status`)
        .then((res) => res.json())
        .then((d) => setTrafficRunning(d.is_running))
        .catch(() => {});
      fetch(`${API_BASE}/api/network/ip`)
        .then((r) => r.json())
        .then((d) => {
          if (d && d.mobile_url) setMobileNetworkUrl(d.mobile_url);
        })
        .catch(() => {});
    };

    fetchFreshState();

    // Fallback polling every 2.2s if live stream is running or if WS is disconnected
    const pollInterval = setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        fetchFreshState();
      }
    }, 2200);

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
    };
  }, [soundEnabled]);

  // Traffic Generator Toggle with Instant Feedback
  const toggleTraffic = async () => {
    const nextState = !trafficRunning;
    setTrafficRunning(nextState);
    const endpoint = nextState ? '/api/traffic/start' : '/api/traffic/stop';
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST' });
      const data = await res.json();
      const isRunning = data.status === 'RUNNING';
      setTrafficRunning(isRunning);
      if (isRunning) {
        setTimeout(() => {
          fetch(`${API_BASE}/api/metrics`).then(r => r.json()).then(m => setMetrics(m)).catch(() => {});
          fetch(`${API_BASE}/api/audit?limit=30`).then(r => r.json()).then(a => {
            if (Array.isArray(a) && a.length > 0) {
              setAuditRecords(a.slice().reverse());
              setSelectedRecord(a[a.length - 1]);
            }
          }).catch(() => {});
        }, 350);
      }
    } catch (e) {
      console.error('Traffic toggle error:', e);
    }
  };

  // Toggle Human-in-the-Loop Mode
  const toggleHitl = async () => {
    const nextState = !hitlMode;
    try {
      await fetch(`${API_BASE}/api/config/hitl_mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState })
      });
      setHitlMode(nextState);
    } catch (e) {
      console.error('HITL toggle error:', e);
    }
  };

  // Toggle Simulated Bank Outage
  const toggleOutage = async (bankId = 'hdfc') => {
    try {
      const res = await fetch(`${API_BASE}/api/telemetry/toggle_outage/${bankId}`, { method: 'POST' });
      const data = await res.json();
      if (data.narrative) setStateChangeNarrative(data.narrative);
    } catch (e) {
      console.error('Outage toggle error:', e);
    }
  };

  // Trigger Pre-built Test Scenarios
  const triggerSimulation = async (scenarioKey) => {
    setSimulating(scenarioKey);
    try {
      const res = await fetch(`${API_BASE}/api/simulate/${scenarioKey}`, { method: 'POST' });
      const record = await res.json();
      setSelectedRecord(record);
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setTimeout(() => setSimulating(null), 800);
    }
  };

  // Submit Custom Webhook
  const submitCustomWebhook = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/webhook/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customForm)
      });
      const data = await res.json();
      setCustomResult(data);
      setSelectedRecord(data);
    } catch (err) {
      console.error('Custom webhook error:', err);
    }
  };

  // Manual Operator Override
  const overrideAction = async (recordId, newAction) => {
    try {
      await fetch(`${API_BASE}/api/audit/${recordId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newAction })
      });
    } catch (e) {
      console.error('Override error:', e);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    window.open(`${API_BASE}/api/audit/csv`, '_blank');
  };

  // Open Architecture Flowchart Modal
  const handleOpenFlowchart = () => {
    setShowFlowchartModal(true);
  };

  // Filtered decisions for Timeline
  const filteredRecords = auditRecords.filter((rec) => {
    if (activityFilter === 'ALL') return true;
    if (activityFilter === 'RECOVERED') return rec.outcome === 'RECOVERED';
    if (activityFilter === 'BLOCKED') return rec.outcome === 'COMPLIANCE_BLOCKED' || rec.outcome === 'ABANDONED_FEES_SAVED';
    if (activityFilter === 'SCHEDULED') return rec.outcome === 'SCHEDULED';
    return true;
  });

  const isHdfcOutage = bankTelemetry?.hdfc?.status === 'CRITICAL_OUTAGE';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Header */}
      <header
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid var(--border-color)',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        <div className="header-container">
          {/* Logo & Identity */}
          <div className="header-brand-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: 'var(--color-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}
              >
                <Zap size={18} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    PayRevive
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: '10px', padding: '1px 5px' }}>
                    v2.0
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Autonomous Revenue Recovery Engine
                </p>
              </div>
            </div>

            {/* Mobile-only status pill */}
            <div
              className="pulse-dot"
              style={{
                display: 'none',
                background: connected ? 'var(--color-green)' : 'var(--color-warning)'
              }}
            />
          </div>

          {/* Nav Tabs */}
          <nav className="header-nav-scroll">
            {[
              { id: 'OVERVIEW', label: 'Overview', icon: Layers },
              { id: 'RADAR', label: 'Live Radar', icon: Radio },
              { id: 'AI_INTELLIGENCE', label: 'AI Intelligence', icon: Cpu },
              { id: 'TESTBENCH', label: 'Testbench', icon: Sliders },
              { id: 'COMPLIANCE', label: 'Compliance Center', icon: ShieldCheck }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`nav-tab ${isActive ? 'active' : ''}`}
                >
                  <Icon size={15} color={isActive ? 'var(--color-blue)' : 'var(--text-secondary)'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="header-actions-row">
            {/* Live Status indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                background: connected ? 'var(--color-green-light)' : 'var(--color-warning-light)',
                border: `1px solid ${connected ? 'var(--color-green-border)' : 'var(--color-warning-border)'}`,
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                fontWeight: 600,
                color: connected ? 'var(--color-green)' : 'var(--color-warning)'
              }}
            >
              <div className={connected ? 'pulse-dot' : ''} style={{ background: connected ? 'var(--color-green)' : 'var(--color-warning)', width: '7px', height: '7px', borderRadius: '50%' }} />
              <span className="font-mono">{connected ? 'Live Sync' : 'Reconnecting'}</span>
            </div>

            {/* Architecture Flowchart Button */}
            <button
              onClick={handleOpenFlowchart}
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              title="Open Interactive Architecture & Decision Flowchart"
            >
              <Workflow size={14} color="var(--color-blue)" />
              <span>Flowchart</span>
            </button>

            {/* Pitch Deck Presentation Button */}
            <a
              href="/slides"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Open Executive Pitch Deck Presentation"
            >
              <FileText size={14} color="var(--color-primary)" />
              <span>Pitch Deck</span>
            </a>

            {/* Mobile QR Sentinel Button */}
            <button
              onClick={() => setShowQrModal(true)}
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              title="Scan QR Code to open Mobile UPI Sentinel on smartphone"
            >
              <Smartphone size={14} color="var(--color-blue)" />
              <span>Mobile QR</span>
            </button>

            {/* Continuous Live Stream Toggle */}
            <button
              onClick={toggleTraffic}
              className="btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: trafficRunning ? 'var(--color-green-light)' : '#FFFFFF',
                borderColor: trafficRunning ? 'var(--color-green-border)' : 'var(--border-color)',
                color: trafficRunning ? 'var(--color-green)' : 'var(--text-primary)',
                fontWeight: trafficRunning ? 600 : 500
              }}
              title={trafficRunning ? 'Click to pause simulated live payment stream' : 'Click to start simulated live payment stream'}
            >
              {trafficRunning ? (
                <>
                  <div className="pulse-dot" style={{ width: '8px', height: '8px', background: 'var(--color-green)', borderRadius: '50%' }} />
                  <span>Live Stream On</span>
                </>
              ) : (
                <>
                  <Play size={13} fill="currentColor" />
                  <span>Live Stream</span>
                </>
              )}
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="btn-secondary"
              style={{ padding: '6px 10px' }}
              title="System Configuration & Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* State Change Notification Banner */}
      {isHdfcOutage && (
        <div
          style={{
            background: 'var(--color-warning-light)',
            borderBottom: '1px solid var(--color-warning-border)',
            padding: '10px 20px',
            fontSize: '13px',
            color: '#92400E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="var(--color-warning)" />
            <span>
              <b>Live Sentinel Telemetry Alert:</b> HDFC Core UPI Node is experiencing critical latency spikes (2450ms). Preemptive failover automatically routes UPI traffic to ICICI Secondary Rail.
            </span>
          </div>
          <button
            onClick={() => toggleOutage('hdfc')}
            className="btn-secondary"
            style={{ padding: '4px 10px', fontSize: '11px', background: '#FFFFFF' }}
          >
            Resolve Outage
          </button>
        </div>
      )}

      {/* Main Body Content */}
      <main style={{ flex: 1, maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '24px 20px' }}>
        
        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW (Main Dashboard) */}
        {/* ============================================================== */}
        {activeTab === 'OVERVIEW' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 2B. Welcome Section */}
            <div
              className="welcome-card-inner"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                background: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-card)',
                padding: '16px 20px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Your Revenue Recovery Overview
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '720px' }}>
                  PayRevive monitors incoming payment webhooks ambiently, diagnoses root causes via Gradient Boosting, and executes optimal recovery routes without requiring human prompts or chatboxes.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  className="badge"
                  style={{
                    background: hitlMode ? 'var(--color-warning-light)' : 'var(--color-blue-light)',
                    color: hitlMode ? 'var(--color-warning)' : 'var(--color-blue)',
                    border: `1px solid ${hitlMode ? 'var(--color-warning-border)' : 'var(--color-blue-border)'}`,
                    padding: '5px 10px'
                  }}
                >
                  <UserCheck size={13} />
                  <span>{hitlMode ? 'Supervised (HITL) Mode' : '100% Autonomous Mode'}</span>
                </span>

                <button
                  onClick={handleExportCsv}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <Download size={13} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* 2C. Four KPI Cards */}
            <div className="kpi-grid">
              {/* Card 1: Revenue Recovered */}
              <div className="fintech-card kpi-card" style={{ padding: "16px" }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Revenue Recovered
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={16} color="var(--color-green)" />
                  </div>
                </div>
                <div className="font-mono kpi-num" style={{ fontSize: "24px", fontWeight: 800, color: "var(--color-green)", letterSpacing: "-0.02em", marginBottom: "4px" }}>
                  ₹{metrics.total_recovered_usd ? metrics.total_recovered_usd.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge badge-green font-mono" style={{ fontSize: '11px', padding: '1px 6px' }}>
                    {metrics.recovery_rate_pct}%
                  </span>
                  <span>recovery success rate</span>
                </div>
              </div>

              {/* Card 2: Revenue at Risk */}
              <div className="fintech-card kpi-card" style={{ padding: "16px" }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Revenue at Risk
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={16} color="var(--color-warning)" />
                  </div>
                </div>
                <div className="font-mono kpi-num" style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>
                  ₹{metrics.total_at_risk_usd ? metrics.total_at_risk_usd.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Total gross volume intercepted
                </p>
              </div>

              {/* Card 3: Processing Fees Saved */}
              <div className="fintech-card kpi-card" style={{ padding: "16px" }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Processing Fees Saved
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={16} color="var(--color-blue)" />
                  </div>
                </div>
                <div className="font-mono kpi-num" style={{ fontSize: "24px", fontWeight: 800, color: "var(--color-blue)", letterSpacing: "-0.02em", marginBottom: "4px" }}>
                  ₹{metrics.total_fees_saved_usd ? (metrics.total_fees_saved_usd * 85).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Wasted retry fines eliminated
                </p>
              </div>

              {/* Card 4: Autonomous Decisions */}
              <div className="fintech-card kpi-card" style={{ padding: "16px" }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Autonomous Decisions
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-surface-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Cpu size={16} color="var(--text-primary)" />
                  </div>
                </div>
                <div className="font-mono kpi-num" style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: "4px" }}>
                  {metrics.total_events}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {metrics.compliance_blocks} guardrail blocks enforced
                </p>
              </div>
            </div>

            {/* 2E. Test Your AI (Six Simple Scenario Cards) */}
            <div className="fintech-card" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Sliders size={18} color="var(--color-blue)" />
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Test Your AI
                  </h2>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Select any payment scenario below to observe how the autonomous engine intercepts, diagnoses, and recovers transactions in real time.
                </p>
              </div>

              <div className="scenarios-grid">
                {[
                  {
                    id: 'gateway_timeout',
                    title: 'Gateway Timeout',
                    amount: '₹499.00',
                    rail: 'UPI / PhonePe',
                    reason: 'NPCI UPI switch response timeout > 2400ms',
                    action: 'Instant reroute to ICICI secondary rail'
                  },
                  {
                    id: 'insufficient_funds',
                    title: 'Insufficient Funds',
                    amount: '₹299.00',
                    rail: 'UPI AutoPay (SBI)',
                    reason: 'Recurring AutoPay mandate balance shortfall',
                    action: 'Bandit schedules payday liquidity retry'
                  },
                  {
                    id: 'card_expired',
                    title: 'Expired Card',
                    amount: '₹1,499.00',
                    rail: 'Visa Card (Axis)',
                    reason: 'Card lifecycle expired in token vault',
                    action: 'Dispatches Visa Account Updater (VAU)'
                  },
                  {
                    id: 'stolen_card',
                    title: 'Stolen Card',
                    amount: '₹8,500.00',
                    rail: 'Visa Card (HDFC)',
                    reason: 'Card reported lost/stolen by cardholder',
                    action: 'Zero-retry block prevents merchant ban'
                  },
                  {
                    id: 'retry_limit_exceeded',
                    title: 'Retry Limit Exceeded',
                    amount: '₹1,999.00',
                    rail: 'Mastercard (Kotak)',
                    reason: 'Exceeded 4 retries within 16 calendar days',
                    action: 'Enforces Visa Rule 5.4.1.3 Shield'
                  },
                  {
                    id: 'high_value_hitl',
                    title: 'High-Value Transaction',
                    amount: '₹14,999.00',
                    rail: 'Enterprise UPI Rail',
                    reason: 'Large enterprise settlement timeout',
                    action: 'Proactive failover with operator audit'
                  }
                ].map((sc) => (
                  <div
                    key={sc.id}
                    style={{
                      background: 'var(--bg-page)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {sc.title}
                        </span>
                        <span className="badge badge-neutral font-mono">{sc.amount}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-blue)', fontWeight: 600, marginBottom: '6px' }}>
                        {sc.rail}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>
                        {sc.reason}
                      </p>
                      <div style={{ fontSize: '11px', color: 'var(--color-green)', fontWeight: 600 }}>
                        ➔ {sc.action}
                      </div>
                    </div>

                    <button
                      onClick={() => triggerSimulation(sc.id)}
                      disabled={simulating === sc.id}
                      className="btn-primary"
                      style={{ width: '100%', fontSize: '12px', padding: '7px 12px' }}
                    >
                      {simulating === sc.id ? (
                        <>
                          <RotateCw size={13} className="spin" />
                          <span>Executing...</span>
                        </>
                      ) : (
                        <>
                          <Play size={12} fill="currentColor" />
                          <span>Test Scenario</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 2D. AI Activity (Vertical Timeline) */}
            <div className="fintech-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    AI Activity Timeline
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Chronological audit log of autonomous recoveries, model diagnoses, and regulatory checks.
                  </p>
                </div>

                {/* Filter pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {['ALL', 'RECOVERED', 'SCHEDULED', 'BLOCKED'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setActivityFilter(f)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: '1px solid var(--border-color)',
                        background: activityFilter === f ? 'var(--color-blue)' : '#FFFFFF',
                        color: activityFilter === f ? '#FFFFFF' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                  <Activity size={32} style={{ margin: '0 auto 12px', color: 'var(--text-tertiary)' }} />
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    No decisions recorded yet
                  </p>
                  <p style={{ fontSize: '12px', maxWidth: '400px', margin: '0 auto 16px' }}>
                    Click "Test Scenario" above or start the "Live Stream" to observe the AI sentinel recovering transactions.
                  </p>
                  <button onClick={() => triggerSimulation('gateway_timeout')} className="btn-primary" style={{ fontSize: '12px' }}>
                    Run Sample Recovery
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredRecords.slice(0, 10).map((rec) => {
                    const isRecovered = rec.outcome === 'RECOVERED';
                    const isScheduled = rec.outcome === 'SCHEDULED';
                    const isBlocked = rec.outcome === 'COMPLIANCE_BLOCKED' || rec.outcome === 'ABANDONED_FEES_SAVED';
                    const isSelected = selectedRecord?.id === rec.id;

                    return (
                      <div
                        key={rec.id}
                        onClick={() => setSelectedRecord(rec)}
                        style={{
                          background: isSelected ? 'var(--color-blue-light)' : '#FFFFFF',
                          border: `1px solid ${isSelected ? 'var(--color-blue-border)' : 'var(--border-color)'}`,
                          borderRadius: '10px',
                          padding: '14px 18px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Left: Transaction Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              background: isRecovered ? 'var(--color-green-light)' : isScheduled ? 'var(--color-blue-light)' : 'var(--color-warning-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {isRecovered ? (
                              <CheckCircle2 size={18} color="var(--color-green)" />
                            ) : isScheduled ? (
                              <Clock size={18} color="var(--color-blue)" />
                            ) : (
                              <ShieldAlert size={18} color="var(--color-warning)" />
                            )}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="font-mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                ₹{rec.transaction?.amount?.toFixed(2)}
                              </span>
                              <span className="badge badge-neutral font-mono" style={{ fontSize: '10px' }}>
                                {rec.transaction?.card_network}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {rec.transaction?.issuing_bank}
                            </div>
                          </div>
                        </div>

                        {/* Middle: AI Root Cause & Action */}
                        <div style={{ flex: 1, minWidth: '280px' }}>
                          {isBlocked ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                <span style={{
                                  background: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  color: '#DC2626',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <ShieldAlert size={12} color="#DC2626" />
                                  <span>BLOCKED REASON: {
                                    rec.transaction?.decline_code === 'lost_or_stolen_card' ? 'Card Reported Lost / Stolen by Cardholder (Anti-Fraud Rule)' :
                                    rec.transaction?.retry_count >= 4 ? 'Exceeded 4-Retry Limit (Visa/Mastercard Rule 5.4)' :
                                    rec.compliance?.status === 'COMPLIANCE_BLOCKED' ? 'Regulatory Compliance Violation' :
                                    'Terminal Bank Refusal (Do Not Honor)'
                                  }</span>
                                </span>
                                <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>
                                  • Preserved ₹30 Interchange Penalty
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                {rec.compliance?.reason && rec.compliance.reason !== 'All 5 Card Network & Regulatory compliance rules verified. Action cleared for execution.' 
                                  ? rec.compliance.reason 
                                  : rec.diagnosis?.root_cause || rec.optimization?.action_reasoning}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                                {rec.optimization?.chosen_action}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>Cause: {rec.diagnosis?.root_cause?.slice(0, 50)}...</span>
                                <span>•</span>
                                <span className="font-mono" style={{ color: 'var(--color-blue)', fontWeight: 600 }}>
                                  P(Rec): {(rec.diagnosis?.recovery_probability * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right: Outcome Badge & Latency */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ textAlign: 'right' }}>
                            {isRecovered && (
                              <span className="badge badge-green font-mono">
                                +₹{rec.recovered_amount_usd?.toFixed(0)} Recovered
                              </span>
                            )}
                            {isScheduled && (
                              <span className="badge badge-blue font-mono">
                                Scheduled Payday
                              </span>
                            )}
                            {isBlocked && (
                              <span className="badge font-mono" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 700 }}>
                                🚫 Blocked: Fee Saved
                              </span>
                            )}
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                              {rec.latency_ms}ms latency
                            </div>
                          </div>

                          <ChevronRight size={16} color="var(--text-tertiary)" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: LIVE RADAR (Bank & Gateway Health Monitoring) */}
        {/* ============================================================== */}
        {activeTab === 'RADAR' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Description */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-card)',
                padding: '20px 24px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Live Gateway & Bank Telemetry Radar
                  </h1>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '720px' }}>
                    Ambient background sensor continuously monitoring core UPI switches and gateway nodes. Automatically executes preemptive routing before customer checkout drops.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => toggleOutage('hdfc')}
                    className="btn-secondary"
                    style={{
                      background: isHdfcOutage ? 'var(--color-error-light)' : '#FFFFFF',
                      borderColor: isHdfcOutage ? 'var(--color-error-border)' : 'var(--border-color)',
                      color: isHdfcOutage ? 'var(--color-error)' : 'var(--text-primary)'
                    }}
                  >
                    <AlertTriangle size={14} />
                    <span>{isHdfcOutage ? 'Resolve HDFC Outage' : 'Simulate HDFC Outage'}</span>
                  </button>

                  <button
                    onClick={toggleTraffic}
                    className="btn-primary"
                    style={{
                      background: trafficRunning ? 'var(--color-error)' : 'var(--color-blue)'
                    }}
                  >
                    {trafficRunning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    <span>{trafficRunning ? 'Stop Payment Stream' : 'Start Live Stream'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Radar Node Grid */}
            <div className="radar-grid">
              {Object.entries(bankTelemetry).map(([key, node]) => {
                const isOutage = node.status === 'CRITICAL_OUTAGE';
                const isFailover = node.status === 'ACTIVE_FAILOVER';

                return (
                  <div
                    key={key}
                    className="fintech-card"
                    style={{
                      padding: '20px',
                      borderLeft: `4px solid ${isOutage ? 'var(--color-error)' : isFailover ? 'var(--color-blue)' : 'var(--color-green)'}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {node.name}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: isOutage ? 'var(--color-error-light)' : isFailover ? 'var(--color-blue-light)' : 'var(--color-green-light)',
                          color: isOutage ? 'var(--color-error)' : isFailover ? 'var(--color-blue)' : 'var(--color-green)',
                          fontSize: '11px'
                        }}
                      >
                        {node.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
                      <span className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: isOutage ? 'var(--color-error)' : 'var(--text-primary)' }}>
                        {node.latency_ms}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ms latency</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                      <span>Network Uptime</span>
                      <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {node.uptime_pct}%
                      </span>
                    </div>

                    {node.proactive_reroute_active && (
                      <div style={{ marginTop: '10px', padding: '6px 8px', background: 'var(--color-blue-light)', borderRadius: '6px', fontSize: '11px', color: 'var(--color-blue)', fontWeight: 600 }}>
                        ⚡ Traffic Preemptively Rerouted
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Architecture Explainer */}
            <div className="fintech-card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                How Preemptive State Failover Operates
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
                Unlike reactive chatbox tools that wait for a human operator, PayRevive continuously measures rolling 10-second latency and error rate percentiles across issuing banks. If an issuer node (e.g. HDFC Core Banking) exceeds 1200ms or drops packets, the sentinel flips incoming routing tables to secondary rails (ICICI / Axis Direct) in under 50 milliseconds.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-green)' }} />
                  <span>Threshold: &lt; 200ms Optimal</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-warning)' }} />
                  <span>Degraded: 200ms - 1200ms</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-error)' }} />
                  <span>Outage Preemption: &gt; 1200ms Auto-Failover</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: AI INTELLIGENCE (ML, SHAP & Contextual Bandit) */}
        {/* ============================================================== */}
        {activeTab === 'AI_INTELLIGENCE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-card)',
                padding: '20px 24px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Machine Learning & Decision Attribution
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Inspect the Gradient Boosting Classifier, TreeSHAP feature attributions, and Thompson Sampling bandit policy for any intercepted payment failure.
              </p>
            </div>

            {selectedRecord ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Left Card: TreeSHAP Feature Attribution */}
                <div className="fintech-card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        TreeSHAP Feature Attributions
                      </h2>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Local game-theoretic weights explaining why the model predicted P(Recovery).
                      </p>
                    </div>
                    <span className="badge badge-blue font-mono">
                      P(Rec): {(selectedRecord.diagnosis?.recovery_probability * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* SHAP Bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                    {selectedRecord.diagnosis?.shap_attributions?.map((attr, idx) => {
                      const isPositive = attr.shap_value > 0;
                      const absWidth = Math.min(Math.abs(attr.shap_value) * 100, 100);

                      return (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{attr.feature}</span>
                            <span className="font-mono" style={{ fontWeight: 700, color: isPositive ? 'var(--color-green)' : 'var(--color-error)' }}>
                              {isPositive ? `+${attr.shap_value.toFixed(2)}` : attr.shap_value.toFixed(2)}
                            </span>
                          </div>
                          <div style={{ height: '6px', background: 'var(--bg-surface-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${absWidth}%`,
                                height: '100%',
                                background: isPositive ? 'var(--color-green)' : 'var(--color-error)',
                                borderRadius: '3px'
                              }}
                            />
                          </div>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {attr.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {(selectedRecord.outcome === 'ABANDONED_FEES_SAVED' || selectedRecord.outcome === 'COMPLIANCE_BLOCKED') && (
                    <div style={{ padding: '14px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA', fontSize: '12px', marginBottom: '16px' }}>
                      <div style={{ fontWeight: 700, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <ShieldAlert size={16} color="#DC2626" />
                        <span>REASON WHY PAYMENT WAS BLOCKED BY AI SENTINEL:</span>
                      </div>
                      <div style={{ color: '#7F1D1D', fontWeight: 600, lineHeight: 1.5, marginBottom: '6px' }}>
                        {selectedRecord.compliance?.reason && selectedRecord.compliance.reason !== 'All 5 Card Network & Regulatory compliance rules verified. Action cleared for execution.'
                          ? selectedRecord.compliance.reason
                          : selectedRecord.diagnosis?.root_cause || selectedRecord.optimization?.action_reasoning}
                      </div>
                      <div style={{ fontSize: '11px', color: '#991B1B' }}>
                        • <b>Mandate Enforced:</b> {selectedRecord.transaction?.decline_code === 'lost_or_stolen_card' ? 'Visa/Mastercard Core Rule 5.1 & RBI Anti-Fraud Directive' : 'Visa Rule 5.4.1.3 (Max 4 Retries / 16 Days)'}<br />
                        • <b>Action:</b> ABANDON_NO_RETRY (Terminal retry suppressor engaged)<br />
                        • <b>Financial Saving:</b> Preserved interchange retry penalty fee ($0.35 / ₹30) & prevented dispute chargeback.
                      </div>
                    </div>
                  )}

                  <div style={{ padding: '12px', background: 'var(--bg-page)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Model Diagnosis Summary:
                    </div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {selectedRecord.diagnosis?.root_cause}
                    </div>
                  </div>
                </div>

                {/* Right Card: Contextual Bandit Policy */}
                <div className="fintech-card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Contextual Multi-Armed Bandit
                      </h2>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Thompson Sampling optimization balancing exploration vs fee preservation.
                      </p>
                    </div>
                    <span className="badge badge-green font-mono">
                      +₹{selectedRecord.optimization?.expected_recovery_value_usd?.toFixed(2)} ROI
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                    <div style={{ padding: '14px', background: 'var(--bg-page)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                        Selected Recovery Action
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-blue)', marginBottom: '6px' }}>
                        {selectedRecord.optimization?.chosen_action}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {selectedRecord.optimization?.action_reasoning}
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-page)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Exploration Strategy</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {selectedRecord.optimization?.exploration_strategy}
                        </div>
                      </div>

                      <div style={{ padding: '10px 12px', background: 'var(--bg-page)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Interchange Risk Floor</div>
                        <div className="font-mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                          ₹{(selectedRecord.optimization?.estimated_cost_usd * 85).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dispatched Tools Preview */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                      Dispatched Cross-Tool Actions:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedRecord.dispatched_tools?.map((tool, i) => {
                        const isWhatsapp = tool.toLowerCase().includes('whatsapp');
                        const isSlack = tool.toLowerCase().includes('slack');

                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (isWhatsapp) setShowToolModal({ type: 'WHATSAPP', record: selectedRecord });
                              if (isSlack) setShowToolModal({ type: 'SLACK', record: selectedRecord });
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-pill)',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: isWhatsapp ? '#ECFDF5' : isSlack ? '#FEF2F2' : 'var(--bg-surface-subtle)',
                              color: isWhatsapp ? '#059669' : isSlack ? '#DC2626' : 'var(--text-primary)',
                              border: `1px solid ${isWhatsapp ? '#A7F3D0' : isSlack ? '#FECACA' : 'var(--border-color)'}`,
                              cursor: isWhatsapp || isSlack ? 'pointer' : 'default',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>{tool}</span>
                            {(isWhatsapp || isSlack) && <ExternalLink size={11} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="fintech-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Please run a test scenario from Overview to inspect ML and bandit attributions.
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: TESTBENCH (Interactive Simulation & Custom Webhooks) */}
        {/* ============================================================== */}
        {activeTab === 'TESTBENCH' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-card)',
                padding: '20px 24px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Interactive Scenario & Webhook Testbench
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Simulate raw incoming payment webhooks from Stripe, Razorpay, Paytm, PhonePe, and UPI switches to verify autonomous decisioning.
              </p>
            </div>

            {/* Quick UPI Presets (Google Pay, Paytm, PhonePe) */}
            <div className="fintech-card kpi-card" style={{ padding: "16px" }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                Quick UPI Provider Presets
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => triggerSimulation('gateway_timeout')}
                  className="btn-secondary"
                  style={{ fontSize: '12px' }}
                >
                  <Zap size={14} color="var(--color-blue)" />
                  <span>Google Pay (HDFC Timeout)</span>
                </button>
                <button
                  onClick={() => triggerSimulation('paytm_timeout')}
                  className="btn-secondary"
                  style={{ fontSize: '12px' }}
                >
                  <Zap size={14} color="#00BAF2" />
                  <span>Paytm Payments Bank Socket Timeout</span>
                </button>
                <button
                  onClick={() => triggerSimulation('phonepe_timeout')}
                  className="btn-secondary"
                  style={{ fontSize: '12px' }}
                >
                  <Zap size={14} color="#5F259F" />
                  <span>PhonePe YBL Switch Delay</span>
                </button>
                <button
                  onClick={() => triggerSimulation('insufficient_funds')}
                  className="btn-secondary"
                  style={{ fontSize: '12px' }}
                >
                  <Clock size={14} color="var(--color-warning)" />
                  <span>SBI AutoPay Mandate Shortfall</span>
                </button>
              </div>
            </div>

            {/* Custom Webhook Simulator Form */}
            <div className="fintech-card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
                Custom Webhook Payload Dispatcher
              </h2>

              <form onSubmit={submitCustomWebhook} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Amount (₹ INR)
                  </label>
                  <input
                    type="number"
                    value={customForm.amount}
                    onChange={(e) => setCustomForm({ ...customForm, amount: parseFloat(e.target.value) || 0 })}
                    className="fintech-input"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Decline Code
                  </label>
                  <select
                    value={customForm.decline_code}
                    onChange={(e) => setCustomForm({ ...customForm, decline_code: e.target.value })}
                    className="fintech-input"
                  >
                    <option value="upi_server_timeout">UPI Server Timeout (Transient)</option>
                    <option value="upi_mandate_insufficient_funds">UPI AutoPay Mandate Shortfall</option>
                    <option value="insufficient_funds">Insufficient Funds (Card)</option>
                    <option value="processor_timeout">Processor Network Timeout</option>
                    <option value="card_expired">Card Expired in Vault</option>
                    <option value="lost_or_stolen_card">Lost / Stolen Card (Terminal)</option>
                    <option value="do_not_honor">Do Not Honor (Generic)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Issuing Bank
                  </label>
                  <input
                    type="text"
                    value={customForm.issuing_bank}
                    onChange={(e) => setCustomForm({ ...customForm, issuing_bank: e.target.value })}
                    className="fintech-input"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Payment Rail / Network
                  </label>
                  <select
                    value={customForm.card_network}
                    onChange={(e) => setCustomForm({ ...customForm, card_network: e.target.value })}
                    className="fintech-input"
                  >
                    <option value="UPI / NPCI">UPI / NPCI</option>
                    <option value="RUPAY">RuPay Direct Rail</option>
                    <option value="VISA">Visa Network</option>
                    <option value="MASTERCARD">Mastercard Network</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Customer Tenure (Months)
                  </label>
                  <input
                    type="number"
                    value={customForm.customer_tenure_months}
                    onChange={(e) => setCustomForm({ ...customForm, customer_tenure_months: parseInt(e.target.value) || 1 })}
                    className="fintech-input"
                    min="1"
                    max="60"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Prior Retry Attempts
                  </label>
                  <input
                    type="number"
                    value={customForm.retry_count}
                    onChange={(e) => setCustomForm({ ...customForm, retry_count: parseInt(e.target.value) || 0 })}
                    className="fintech-input"
                    min="0"
                    max="6"
                  />
                </div>

                <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button type="submit" className="btn-primary" style={{ padding: '9px 20px' }}>
                    <Send size={14} />
                    <span>Dispatch Webhook to Sentinel</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Output Inspection Console */}
            {customResult && (
              <div className="fintech-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Live Webhook Execution Result
                </h3>
                <pre
                  className="font-mono"
                  style={{
                    background: 'var(--bg-page)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '16px',
                    fontSize: '12px',
                    overflowX: 'auto',
                    color: 'var(--text-primary)'
                  }}
                >
                  {JSON.stringify(customResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: COMPLIANCE CENTER (Regulatory Shields & Audit Evidence) */}
        {/* ============================================================== */}
        {activeTab === 'COMPLIANCE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-card)',
                padding: '20px 24px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Compliance & Regulatory Shield Center
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Enforces Visa Rule 5.4.1.3, Mastercard Excessive Retry standards, and merchant fee preservation rules before any recovery action is taken.
                </p>
              </div>

              <button onClick={handleExportCsv} className="btn-primary">
                <Download size={14} />
                <span>Export Audit CSV</span>
              </button>
            </div>

            {/* 4 Guardrails Matrix */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { title: 'Visa Global Mandate', rule: 'Rule 5.4.1.3', desc: 'Cap of max 4 retry attempts within 16 calendar days to prevent interchange fines.' },
                { title: 'Mastercard Retry Standards', rule: 'Rule 8.2', desc: 'Velocity filter strictly capping retries to maximum 2 attempts within rolling 24 hours.' },
                { title: 'Terminal Fraud Prohibition', rule: 'Visa Core 5.1', desc: 'Zero-tolerance block on lost or stolen cards to prevent merchant account suspension.' },
                { title: 'Interchange Margin Floor', rule: 'Fee Shield', desc: 'Blocks micro-transactions where retry fee ($0.35) exceeds recovery net profit.' }
              ].map((m, i) => (
                <div key={i} className="fintech-card" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="badge badge-green font-mono" style={{ fontSize: '10px' }}>{m.rule}</span>
                    <ShieldCheck size={16} color="var(--color-green)" />
                  </div>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {m.title}
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {m.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Compliance Evidence Table */}
            <div className="fintech-card" style={{ padding: '24px', overflowX: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Regulatory Audit Trail Evidence
                </h2>
                <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {auditRecords.length} records in immutable ledger
                </span>
              </div>

              <div className="table-responsive-wrapper"><table className="fintech-table">
                <thead>
                  <tr>
                    <th>TIMESTAMP</th>
                    <th>RECORD ID</th>
                    <th>AMOUNT</th>
                    <th>BANK & NETWORK</th>
                    <th>AI DECISION</th>
                    <th>COMPLIANCE STATUS</th>
                    <th>OUTCOME</th>
                    {hitlMode && <th>OPERATOR OVERRIDE</th>}
                  </tr>
                </thead>
                <tbody>
                  {auditRecords.length === 0 ? (
                    <tr>
                      <td colSpan={hitlMode ? 8 : 7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        No audit records recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditRecords.map((r) => {
                      const isApproved = r.compliance?.status === 'APPROVED';
                      return (
                        <tr key={r.id}>
                          <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {new Date(r.timestamp * 1000).toLocaleTimeString()}
                          </td>
                          <td className="font-mono" style={{ fontSize: '11px', fontWeight: 600 }}>
                            {r.id}
                          </td>
                          <td className="font-mono" style={{ fontWeight: 700 }}>
                            ₹{r.transaction?.amount?.toFixed(2)}
                          </td>
                          <td style={{ fontSize: '12px' }}>
                            <div>{r.transaction?.issuing_bank}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{r.transaction?.card_network}</div>
                          </td>
                          <td style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-blue)' }}>
                            {r.optimization?.chosen_action}
                          </td>
                          <td>
                            <span className={`badge ${isApproved ? 'badge-green' : 'badge-error'}`} style={{ fontSize: '11px' }}>
                              {isApproved ? '✓ Cleared' : '✕ Blocked'}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-neutral font-mono" style={{ fontSize: '11px' }}>
                              {r.outcome}
                            </span>
                          </td>
                          {hitlMode && (
                            <td>
                              <button
                                onClick={() => overrideAction(r.id, 'ABANDON_NO_RETRY')}
                                className="btn-secondary"
                                style={{ padding: '3px 8px', fontSize: '10px' }}
                              >
                                Abort
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table></div>
            </div>
          </div>
        )}

      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-backdrop" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} color="var(--color-blue)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  System Configuration
                </h3>
              </div>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Human-in-the-Loop Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'var(--bg-page)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Human-in-the-Loop (HITL) Mode
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Requires operator approval for recoveries above ₹5,000.
                  </div>
                </div>
                <button
                  onClick={toggleHitl}
                  className={hitlMode ? 'btn-primary' : 'btn-secondary'}
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  {hitlMode ? 'Supervised Enabled' : '100% Autonomous'}
                </button>
              </div>

              {/* Audio Chime Feedback Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'var(--bg-page)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Web Audio Feedback Chime
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Subtle synthetic audio chime when revenue is recovered.
                  </div>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  {soundEnabled ? <Volume2 size={15} color="var(--color-green)" /> : <VolumeX size={15} />}
                  <span>{soundEnabled ? 'Enabled' : 'Muted'}</span>
                </button>
              </div>

              {/* Mobile Phone Wi-Fi Link */}
              <div style={{ padding: '14px', background: 'var(--bg-page)', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Mobile Device Link (Wi-Fi PWA)
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Open this URL on any smartphone connected to the same Wi-Fi to test the mobile simulator with phone vibration feedback.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000'}
                    readOnly
                    className="fintech-input font-mono"
                    style={{ fontSize: '11px' }}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="btn-secondary"
                  >
                    {copiedLink ? <Check size={14} color="var(--color-green)" /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSettingsModal(false)} className="btn-primary" style={{ padding: '8px 16px' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Architecture Flowchart Modal */}
      {showFlowchartModal && (
        <div className="modal-backdrop" onClick={() => setShowFlowchartModal(false)} style={{ zIndex: 120 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '1100px',
              width: '95vw',
              height: '88vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              borderRadius: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Workflow size={18} color="var(--color-blue)" />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>PayRevive Architecture & Decision Flowchart</span>
                    <span className="badge badge-blue font-mono" style={{ fontSize: '10px' }}>Zero-Prompt Loop</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    End-to-end webhook ingestion, XGBoost root-cause classification, contextual bandit optimization, and RBI guardrails.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={`${API_BASE}/flowchart`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 10px', textDecoration: 'none' }}
                  title="Open flowchart in dedicated browser tab"
                >
                  <span>Open in Tab</span>
                  <ExternalLink size={13} />
                </a>
                <a
                  href={`${API_BASE}/flowchart.svg`}
                  download="PayRevive_Architecture.svg"
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 10px', textDecoration: 'none' }}
                  title="Download vector SVG flowchart"
                >
                  <Download size={13} />
                  <span>SVG</span>
                </a>
                <button
                  onClick={() => setShowFlowchartModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
                  title="Close flowchart (Esc)"
                >
                  <X size={20} color="var(--text-secondary)" />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, position: 'relative', background: '#0b0f19', borderRadius: '10px', overflow: 'hidden' }}>
              <iframe
                src={`${API_BASE}/flowchart.html`}
                title="PayRevive Interactive Architecture Flowchart"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile QR Sentinel Modal */}
      {showQrModal && (
        <div className="modal-backdrop" onClick={() => setShowQrModal(false)} style={{ zIndex: 120 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '460px',
              width: '92vw',
              padding: '24px',
              borderRadius: '16px',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--color-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Smartphone size={16} color="var(--color-blue)" />
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Mobile UPI Sentinel
                </span>
              </div>
              <button onClick={() => setShowQrModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="var(--text-secondary)" />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', textAlign: 'left', lineHeight: 1.5 }}>
              Scan this QR code with your phone camera on the same Wi-Fi. It opens the <b>Google Pay & Paytm Mobile Checkout Terminal</b>. Tap Pay on your phone and watch this screen update live!
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <QRCodeView text={`${mobileNetworkUrl}/pay`} size={180} />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                value={mobileNetworkUrl + '/pay'}
                readOnly
                className="fintech-input font-mono"
                style={{ fontSize: '11px', textAlign: 'center' }}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(mobileNetworkUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="btn-secondary"
                style={{ padding: '6px 12px' }}
              >
                {copiedLink ? <Check size={14} color="var(--color-green)" /> : <Copy size={14} />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <a
                href={`${API_BASE}/pay`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ flex: 1, textDecoration: 'none', textAlign: 'center', padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <span>Launch Mobile Terminal in New Tab</span>
                <ExternalLink size={13} />
              </a>
            </div>

            <div style={{ background: 'var(--bg-page)', padding: '12px', borderRadius: '8px', fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'left' }}>
              💡 <b>Live Demonstration:</b> When you tap <b>"Pay via Google Pay"</b> or <b>"Pay via Paytm"</b> on your phone, your phone vibrates and this dashboard instantly intercepts and recovers the transaction via ICICI secondary rail!
            </div>
          </div>
        </div>
      )}

      {/* Dispatched Tool Preview Modal (WhatsApp / Slack) */}
      {showToolModal && (
        <div className="modal-backdrop" onClick={() => setShowToolModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {showToolModal.type === 'WHATSAPP' ? 'Dispatched WhatsApp Recovery Link' : 'Dispatched FinOps Alert'}
              </h3>
              <button onClick={() => setShowToolModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {showToolModal.type === 'WHATSAPP' ? (
              <div style={{ background: '#EFEAE2', padding: '16px', borderRadius: '10px' }}>
                <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', fontSize: '13px', lineHeight: 1.5 }}>
                  <p style={{ fontWeight: 600, color: '#075E54', marginBottom: '4px' }}>PayRevive Smart Recovery</p>
                  <p style={{ color: '#111827', marginBottom: '8px' }}>
                    Hi, your mandate for ₹{showToolModal.record?.transaction?.amount?.toFixed(2)} could not be processed due to a temporary bank delay.
                  </p>
                  <p style={{ color: '#111827', marginBottom: '12px' }}>
                    Tap below to complete in 1-click via ICICI Backup UPI:
                  </p>
                  <div style={{ background: '#25D366', color: '#FFFFFF', padding: '8px 12px', borderRadius: '6px', textAlign: 'center', fontWeight: 700, fontSize: '12px' }}>
                    👉 1-Click UPI Payment Link
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: '#4A154B', padding: '16px', borderRadius: '10px', color: '#FFFFFF' }}>
                <div style={{ background: '#1A1D21', padding: '12px 14px', borderRadius: '8px', fontSize: '12px', lineHeight: 1.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#E01E5A', fontWeight: 700, marginBottom: '4px' }}>
                    <AlertTriangle size={14} />
                    <span>#finops-radar-alerts</span>
                  </div>
                  <p style={{ color: '#E2E8F0', marginBottom: '6px' }}>
                    <b>Intervention:</b> Intercepted ₹{showToolModal.record?.transaction?.amount?.toFixed(2)} decline at {showToolModal.record?.transaction?.issuing_bank}.
                  </p>
                  <p style={{ color: '#94A3B8' }}>
                    <b>Action:</b> {showToolModal.record?.optimization?.chosen_action} (Fee Saved: $0.35).
                  </p>
                </div>
              </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowToolModal(null)} className="btn-secondary" style={{ padding: '6px 14px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Recovery Toast */}
      {lastNotification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#FFFFFF',
            border: lastNotification.isMobile ? '2px solid var(--color-blue)' : '1px solid var(--color-green-border)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 100,
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: lastNotification.isMobile ? 'var(--color-blue-light)' : 'var(--color-green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {lastNotification.isMobile ? <Smartphone size={18} color="var(--color-blue)" /> : <CheckCircle2 size={18} color="var(--color-green)" />}
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: lastNotification.isMobile ? 'var(--color-blue)' : 'var(--color-green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{lastNotification.isMobile ? `📱 LIVE ${lastNotification.appName.toUpperCase()} EVENT` : 'Autonomous Revenue Recovered'}</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              ₹{lastNotification.amount?.toFixed(2)} — {lastNotification.action}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
