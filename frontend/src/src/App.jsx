import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Zap, 
  Activity, 
  Radio, 
  AlertTriangle, 
  Play, 
  Pause, 
  Download, 
  X, 
  Smartphone,
  Copy,
  Check,
  Volume2,
  VolumeX,
  MessageSquare,
  Share2,
  Sparkles,
  Globe,
  RefreshCw,
  Flame,
  ChevronDown,
  ChevronUp,
  Sliders
} from 'lucide-react';

const API_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';
const WS_URL = typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws` : 'ws://localhost:8000/ws';

// Synthetic Multi-Sensory Feedback (Audio Chime + Physical Phone Vibration)
function triggerDeviceFeedback(soundEnabled = true) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([100, 60, 180]);
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
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }
}

export default function App() {
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
  const [filter, setFilter] = useState('ALL');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [expandedRecordId, setExpandedRecordId] = useState(null);

  // Mobile vs Desktop Tab on small screens
  const [mobileTab, setMobileTab] = useState('SIMULATOR'); // 'SIMULATOR' | 'FEED'

  // Bank Health Telemetry
  const [bankTelemetry, setBankTelemetry] = useState({
    npci: { name: 'NPCI Central Switch', status: 'HEALTHY', latency_ms: 68, uptime_pct: 99.85 },
    hdfc: { name: 'HDFC Core UPI Node', status: 'HEALTHY', latency_ms: 92, uptime_pct: 99.70 },
    paytm: { name: 'Paytm Payments Bank', status: 'HEALTHY', latency_ms: 96, uptime_pct: 99.65 },
    icici: { name: 'ICICI Secondary Rail', status: 'HEALTHY', latency_ms: 84, uptime_pct: 99.92 }
  });

  // Big-3 Indian UPI Ecosystem Configuration
  const UPI_APPS = {
    GPAY: {
      id: 'GPAY',
      name: 'Google Pay',
      shortName: 'GPay',
      color: '#4285F4',
      lightBg: 'rgba(66, 133, 244, 0.1)',
      vpa: 'manjot@okhdfcbank',
      bankName: 'HDFC Bank ••••4821',
      outageBankName: 'HDFC Core Node Degraded (Auto-Rerouting to ICICI)'
    },
    PAYTM: {
      id: 'PAYTM',
      name: 'Paytm UPI',
      shortName: 'Paytm',
      color: '#00baf2',
      lightBg: 'rgba(0, 186, 242, 0.1)',
      vpa: 'manjot@paytm',
      bankName: 'Paytm Payments Bank ••••9102',
      outageBankName: 'Paytm Node Degraded (Auto-Rerouting to ICICI)'
    },
    PHONEPE: {
      id: 'PHONEPE',
      name: 'PhonePe',
      shortName: 'PhonePe',
      color: '#a855f7',
      lightBg: 'rgba(168, 85, 247, 0.1)',
      vpa: 'manjot@ybl',
      bankName: 'PhonePe (Axis/YBL) ••••3418',
      outageBankName: 'Axis Switch Degraded (Auto-Rerouting to ICICI)'
    }
  };

  const [selectedUpiApp, setSelectedUpiApp] = useState('GPAY');
  const [stateChangeNarrative, setStateChangeNarrative] = useState(null);

  // Phone payment animation states
  const [upiStage, setUpiStage] = useState('IDLE'); // IDLE, PROCESSING, FAILED, RECOVERING, SUCCESS
  const [upiStageInfo, setUpiStageInfo] = useState('');
  const [lastUpiRecord, setLastUpiRecord] = useState(null);

  // Human-in-the-Loop & Override
  const [hitlMode, setHitlMode] = useState(false);
  const [activeOverrideId, setActiveOverrideId] = useState(null);
  const [toast, setToast] = useState(null);
  const [toolModal, setToolModal] = useState(null);

  const mobileNetworkUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';

  // Custom Webhook Form
  const [customForm, setCustomForm] = useState({
    amount: 499,
    currency: 'INR',
    decline_code: 'upi_server_timeout',
    issuing_bank: 'Paytm Payments Bank (user@paytm)',
    card_network: 'UPI / NPCI',
    customer_tenure_months: 16,
    day_of_month: 3
  });

  const wsRef = useRef(null);

  useEffect(() => {
    let reconnectTimer;
    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INITIAL_STATE') {
            setMetrics(data.metrics || {});
            setAuditRecords(data.audit_records || []);
            if (data.hitl_mode !== undefined) setHitlMode(data.hitl_mode);
            if (data.bank_telemetry) setBankTelemetry(data.bank_telemetry);
          } else if (data.type === 'NEW_RECOVERY_EVENT') {
            setMetrics(data.metrics || {});
            setAuditRecords((prev) => [data.record, ...prev]);

            if (data.record.outcome === 'RECOVERED' || data.record.outcome === 'SCHEDULED') {
              triggerDeviceFeedback(soundEnabled);
              setToast({
                title: data.record.optimization.chosen_action === 'PROACTIVE_PREEMPTIVE_FAILOVER' ? 
                  '🛡️ Preemptive Failover Succeeded' : '⚡ Autonomous Recovery Succeeded',
                amount: data.record.recovered_amount_usd,
                action: data.record.optimization.chosen_action
              });
              setTimeout(() => setToast(null), 4000);
            }
          } else if (data.type === 'BANK_STATE_CHANGE') {
            if (data.telemetry) setBankTelemetry(data.telemetry);
            setStateChangeNarrative(data.ai_narrative);
            triggerDeviceFeedback(soundEnabled);
            setTimeout(() => setStateChangeNarrative(null), 10000);
          } else if (data.type === 'TELEMETRY_HEARTBEAT') {
            if (data.telemetry) setBankTelemetry(data.telemetry);
          } else if (data.type === 'HITL_MODE_CHANGED') {
            setHitlMode(data.hitl_mode);
          }
        } catch (e) {
          console.error('WebSocket parse error:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    // Check traffic status
    fetch(`${API_BASE}/api/traffic/status`)
      .then((r) => r.json())
      .then((d) => setTrafficRunning(d.is_running || false))
      .catch(() => {});

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [soundEnabled]);

  const toggleTraffic = async () => {
    try {
      const endpoint = trafficRunning ? '/api/traffic/stop' : '/api/traffic/start';
      await fetch(`${API_BASE}${endpoint}`, { method: 'POST' });
      setTrafficRunning(!trafficRunning);
    } catch (e) {
      console.error('Failed to toggle traffic:', e);
    }
  };

  const toggleBankOutage = async (bankId = 'hdfc') => {
    try {
      const res = await fetch(`${API_BASE}/api/telemetry/toggle_outage/${bankId}`, { method: 'POST' });
      const data = await res.json();
      if (data.telemetry) setBankTelemetry(data.telemetry);
    } catch (e) {
      console.error('Failed to toggle outage:', e);
    }
  };

  const toggleHitl = async () => {
    try {
      const nextState = !hitlMode;
      await fetch(`${API_BASE}/api/config/hitl_mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState })
      });
      setHitlMode(nextState);
    } catch (e) {
      console.error('Failed to toggle HITL:', e);
    }
  };

  const triggerSimulation = async (scenario) => {
    setSimulating(scenario);
    try {
      await fetch(`${API_BASE}/api/simulate/${scenario}`, { method: 'POST' });
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setSimulating(null);
    }
  };

  const runMobileUpiTest = async () => {
    if (upiStage !== 'IDLE') return;
    setUpiStage('PROCESSING');
    setUpiStageInfo('Initiating UPI 2.0 handshake with NPCI Switch...');

    setTimeout(() => {
      setUpiStage('FAILED');
      setUpiStageInfo(
        selectedUpiApp === 'PAYTM' ? '⚠️ Decline U30: Paytm socket timeout (>2400ms)' :
        selectedUpiApp === 'PHONEPE' ? '⚠️ Decline U30: Axis/PhonePe switch timeout (>2400ms)' :
        '⚠️ Decline U30: HDFC core socket timeout (>2400ms)'
      );

      setTimeout(async () => {
        setUpiStage('RECOVERING');
        setUpiStageInfo('⚡ PayRevive Sentinel: Auto-rerouting to ICICI Secondary Rail in 12ms...');

        try {
          const scenario = selectedUpiApp === 'PAYTM' ? 'paytm_timeout' : 
                           selectedUpiApp === 'PHONEPE' ? 'phonepe_timeout' : 'upi_timeout';
          const res = await fetch(`${API_BASE}/api/simulate/${scenario}`, { method: 'POST' });
          const rec = await res.json();
          setLastUpiRecord(rec);
          triggerDeviceFeedback(soundEnabled);

          setTimeout(() => {
            setUpiStage('SUCCESS');
            setUpiStageInfo('✓ Recovered! ₹499 settled via ICICI Rail (Zero Drops)');
            setTimeout(() => {
              setUpiStage('IDLE');
              setUpiStageInfo('');
            }, 5000);
          }, 800);
        } catch (e) {
          setUpiStage('IDLE');
        }
      }, 900);
    }, 700);
  };

  const overrideAction = async (recordId, newAction) => {
    try {
      const res = await fetch(`${API_BASE}/api/audit/${recordId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newAction })
      });
      const updated = await res.json();
      setAuditRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setActiveOverrideId(null);
    } catch (e) {
      console.error('Failed to override record:', e);
    }
  };

  const submitCustomWebhook = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/api/webhook/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customForm)
      });
      setShowCustomModal(false);
    } catch (e) {
      console.error('Custom webhook error:', e);
    }
  };

  const copyMobileUrl = () => {
    navigator.clipboard.writeText(mobileNetworkUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredRecords = auditRecords.filter((rec) => {
    if (filter === 'RECOVERED') return rec.outcome === 'RECOVERED' || rec.outcome === 'SCHEDULED';
    if (filter === 'BLOCKED') return rec.outcome === 'COMPLIANCE_BLOCKED';
    return true;
  });

  const isHdfcOutage = bankTelemetry.hdfc?.status === 'CRITICAL_OUTAGE';
  const isPaytmOutage = bankTelemetry.paytm?.status === 'CRITICAL_OUTAGE';
  const isAnyOutage = isHdfcOutage || isPaytmOutage;
  const currentApp = UPI_APPS[selectedUpiApp] || UPI_APPS.GPAY;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--g-bg-base)', color: '#f8fafc' }}>
      
      {/* 1. TOP HEADER (Simple, Clean, Professional) */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        background: 'rgba(30, 31, 32, 0.9)',
        borderBottom: '1px solid var(--g-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'var(--g-gemini-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.3px', color: '#fff' }}>
                PayRevive
              </span>
              <span style={{
                background: 'rgba(66, 133, 244, 0.15)',
                border: '1px solid rgba(138, 180, 248, 0.3)',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                color: 'var(--g-blue)'
              }}>
                Zero-Prompt AI
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--g-text-secondary)' }}>
              Autonomous Revenue Recovery • Google Cloud & NPCI Multi-Rail
            </div>
          </div>
        </div>

        {/* Ambient Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Audio Chime Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="g-button"
            title={soundEnabled ? "Mute audio chimes" : "Enable audio chimes"}
            style={{
              background: 'var(--g-surface-2)',
              border: '1px solid var(--g-border)',
              color: soundEnabled ? 'var(--g-green)' : 'var(--g-text-tertiary)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* Open on Phone QR */}
          <button
            onClick={() => setShowQRModal(true)}
            className="g-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--g-surface-2)',
              border: '1px solid var(--g-border)',
              color: 'var(--g-text-secondary)',
              padding: '6px 12px',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px'
            }}
          >
            <Smartphone size={13} color="var(--g-blue)" />
            <span>Mobile QR</span>
          </button>

          {/* Live Auto Traffic Toggle */}
          <button
            onClick={toggleTraffic}
            className="g-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: trafficRunning ? 'var(--g-green-container)' : 'var(--g-surface-2)',
              border: `1px solid ${trafficRunning ? 'rgba(129, 201, 149, 0.4)' : 'var(--g-border)'}`,
              color: trafficRunning ? 'var(--g-green)' : 'var(--g-text-secondary)',
              padding: '6px 14px',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '11px'
            }}
          >
            {trafficRunning ? <Pause size={12} /> : <Play size={12} />}
            <span>{trafficRunning ? 'Auto Traffic: ON' : 'Start Live Traffic'}</span>
          </button>

          {/* HITL Toggle */}
          <button
            onClick={toggleHitl}
            className="g-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: hitlMode ? 'var(--g-yellow-container)' : 'var(--g-surface-2)',
              border: `1px solid ${hitlMode ? 'rgba(253, 214, 99, 0.4)' : 'var(--g-border)'}`,
              color: hitlMode ? 'var(--g-yellow)' : 'var(--g-text-secondary)',
              padding: '6px 12px',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px'
            }}
          >
            <Sliders size={12} />
            <span>{hitlMode ? 'HITL: ON' : 'HITL: OFF'}</span>
          </button>

          {/* CSV Download */}
          <a
            href={`${API_BASE}/api/audit/csv`}
            download
            className="g-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--g-surface-2)',
              border: '1px solid var(--g-border)',
              color: 'var(--g-text-secondary)',
              padding: '6px 12px',
              borderRadius: '9999px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '11px'
            }}
          >
            <Download size={12} />
            <span>CSV</span>
          </a>
        </div>
      </header>

      {/* 2. SUBTLE STATE-CHANGE NARRATIVE BANNER (When Outage Toggled) */}
      {stateChangeNarrative && (
        <div style={{
          background: isAnyOutage ? 'rgba(242, 139, 130, 0.12)' : 'rgba(129, 201, 149, 0.12)',
          borderBottom: `1px solid ${isAnyOutage ? 'var(--g-red)' : 'var(--g-green)'}`,
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12px',
          fontWeight: 600,
          color: isAnyOutage ? '#fca5a5' : '#86efac'
        }}>
          <Radio size={14} className="pulse-indicator" />
          <span>{stateChangeNarrative}</span>
        </div>
      )}

      {/* 3. TOAST NOTIFICATION (Top-right subtle pop) */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '72px',
          right: '24px',
          background: 'var(--g-surface-1)',
          border: '1px solid var(--g-green)',
          borderRadius: '12px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 999,
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          animation: 'slideDownToast 0.2s ease-out'
        }}>
          <CheckCircle2 size={16} color="var(--g-green)" />
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--g-green)' }}>{toast.title}</div>
            <div style={{ fontSize: '11px', color: 'var(--g-text-secondary)' }}>Recovered ₹{toast.amount} with zero prompts</div>
          </div>
          <button onClick={() => setToast(null)} style={{ background: 'transparent', border: 'none', color: 'var(--g-text-tertiary)', cursor: 'pointer', marginLeft: '6px' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* 4. MAIN CONTENT CONTAINER */}
      <main style={{ flex: 1, padding: '16px 24px', maxWidth: '1440px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* TOP METRICS STRIP (4 Clean KPIs) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div className="g-card" style={cleanKpiStyle}>
            <div style={{ fontSize: '11px', color: 'var(--g-text-secondary)', fontWeight: 600 }}>TOTAL RECOVERED</div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--g-green)', marginTop: '4px' }}>
              ₹{metrics.total_recovered_usd ? metrics.total_recovered_usd.toLocaleString('en-IN') : '0'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--g-text-tertiary)', marginTop: '2px' }}>Autonomous Zero-Prompt Recovery</div>
          </div>

          <div className="g-card" style={cleanKpiStyle}>
            <div style={{ fontSize: '11px', color: 'var(--g-text-secondary)', fontWeight: 600 }}>TRANSACTIONS ANALYZED</div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
              {metrics.total_events || 0}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--g-text-tertiary)', marginTop: '2px' }}>Live Webhooks Ingested</div>
          </div>

          <div className="g-card" style={cleanKpiStyle}>
            <div style={{ fontSize: '11px', color: 'var(--g-text-secondary)', fontWeight: 600 }}>RECOVERY EFFICIENCY</div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--g-blue)', marginTop: '4px' }}>
              {metrics.recovery_rate_pct ? metrics.recovery_rate_pct.toFixed(1) : '0.0'}%
            </div>
            <div style={{ fontSize: '10px', color: 'var(--g-text-tertiary)', marginTop: '2px' }}>Contextual Multi-Armed Bandit ROI</div>
          </div>

          <div className="g-card" style={cleanKpiStyle}>
            <div style={{ fontSize: '11px', color: 'var(--g-text-secondary)', fontWeight: 600 }}>AVG FAILOVER LATENCY</div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, color: '#c084fc', marginTop: '4px' }}>
              12.4 <span style={{ fontSize: '14px', fontWeight: 500 }}>ms</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--g-text-tertiary)', marginTop: '2px' }}>Instant Reroute with 0ms User Drop</div>
          </div>
        </div>

        {/* COMPACT BANK HEALTH STATUS BAR */}
        <div style={{
          background: 'var(--g-surface-1)',
          border: `1px solid ${isAnyOutage ? 'rgba(242, 139, 130, 0.4)' : 'var(--g-border)'}`,
          borderRadius: '12px',
          padding: '10px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={14} color="var(--g-blue)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--g-text-secondary)' }}>
              LIVE BANK & GATEWAY SENSORS:
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* NPCI */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
              <span style={{ color: 'var(--g-text-secondary)' }}>NPCI Switch:</span>
              <span className="font-mono" style={{ color: 'var(--g-green)', fontWeight: 700 }}>
                {bankTelemetry.npci?.latency_ms || 68}ms 🟢
              </span>
            </div>

            {/* HDFC Node */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
              <span style={{ color: 'var(--g-text-secondary)' }}>HDFC Node:</span>
              <span className="font-mono" style={{ color: isHdfcOutage ? 'var(--g-red)' : 'var(--g-green)', fontWeight: 700 }}>
                {bankTelemetry.hdfc?.latency_ms || 92}ms {isHdfcOutage ? '🔴 OUTAGE' : '🟢'}
              </span>
              <button
                onClick={() => toggleBankOutage('hdfc')}
                style={{
                  background: isHdfcOutage ? 'var(--g-green-container)' : 'var(--g-red-container)',
                  border: `1px solid ${isHdfcOutage ? 'var(--g-green)' : 'var(--g-red)'}`,
                  color: isHdfcOutage ? 'var(--g-green)' : 'var(--g-red)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isHdfcOutage ? '✓ Restore HDFC' : '⚡ Simulate Outage'}
              </button>
            </div>

            {/* Paytm Bank */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
              <span style={{ color: 'var(--g-text-secondary)' }}>Paytm Bank:</span>
              <span className="font-mono" style={{ color: isPaytmOutage ? '#00baf2' : 'var(--g-green)', fontWeight: 700 }}>
                {bankTelemetry.paytm?.latency_ms || 96}ms {isPaytmOutage ? '⚡ OUTAGE' : '🟢'}
              </span>
              <button
                onClick={() => toggleBankOutage('paytm')}
                style={{
                  background: isPaytmOutage ? 'var(--g-green-container)' : 'rgba(0, 186, 242, 0.15)',
                  border: `1px solid ${isPaytmOutage ? 'var(--g-green)' : '#00baf2'}`,
                  color: isPaytmOutage ? 'var(--g-green)' : '#00baf2',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isPaytmOutage ? '✓ Restore Paytm' : '⚡ Simulate Outage'}
              </button>
            </div>

            {/* ICICI Secondary Rail */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
              <span style={{ color: 'var(--g-text-secondary)' }}>ICICI Rail:</span>
              <span className="font-mono" style={{ color: 'var(--g-green)', fontWeight: 700 }}>
                {bankTelemetry.icici?.latency_ms || 84}ms {isAnyOutage ? '⚡ ACTIVE FAILOVER' : '🟢 STANDBY'}
              </span>
            </div>
          </div>
        </div>

        {/* 5. TWO-COLUMN BALANCED LAYOUT */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 380px) 1fr',
          gap: '20px',
          alignItems: 'start'
        }}>
          
          {/* ================= LEFT COLUMN: INTERACTIVE PHONE SIMULATOR & CONTROLS ================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* The Phone Mockup */}
            <div className="g-card" style={{
              background: 'var(--g-surface-1)',
              border: '1px solid var(--g-border)',
              borderRadius: '24px',
              padding: '16px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.4)'
            }}>
              {/* App Segmented Switcher */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '4px',
                background: 'var(--g-surface-2)',
                padding: '3px',
                borderRadius: '12px',
                marginBottom: '14px'
              }}>
                {Object.values(UPI_APPS).map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedUpiApp(app.id)}
                    style={{
                      background: selectedUpiApp === app.id ? app.color : 'transparent',
                      color: selectedUpiApp === app.id ? '#fff' : 'var(--g-text-secondary)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {app.shortName}
                  </button>
                ))}
              </div>

              {/* Realistic Mobile View Inside Phone Frame */}
              <div style={{
                background: '#0f172a',
                borderRadius: '18px',
                border: '1px solid #334155',
                overflow: 'hidden',
                padding: '16px'
              }}>
                {/* Mobile Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: currentApp.color }} />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{currentApp.name}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>UPI 2.0 Auto-Protected</span>
                </div>

                {/* Merchant & Order Details */}
                <div style={{
                  background: '#1e293b',
                  borderRadius: '12px',
                  padding: '14px',
                  marginBottom: '14px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Paying to Swiggy Delivery</div>
                  <div className="font-mono" style={{ fontSize: '26px', fontWeight: 900, color: '#fff', margin: '4px 0' }}>
                    ₹499.00
                  </div>
                  <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                    Linked VPA: <b style={{ color: currentApp.color }}>{currentApp.vpa}</b>
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                    Primary: {currentApp.bankName}
                  </div>
                </div>

                {/* Payment Stage Feedback Area */}
                {upiStage !== 'IDLE' && (
                  <div style={{
                    background: upiStage === 'SUCCESS' ? 'rgba(34, 197, 94, 0.15)' :
                                upiStage === 'RECOVERING' ? 'rgba(56, 189, 248, 0.15)' :
                                upiStage === 'FAILED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                    border: `1px solid ${
                      upiStage === 'SUCCESS' ? '#22c55e' :
                      upiStage === 'RECOVERING' ? '#38bdf8' :
                      upiStage === 'FAILED' ? '#ef4444' : '#64748b'
                    }`,
                    borderRadius: '10px',
                    padding: '10px',
                    marginBottom: '14px',
                    fontSize: '11px',
                    lineHeight: '1.4'
                  }}>
                    <div style={{
                      fontWeight: 700,
                      color: upiStage === 'SUCCESS' ? '#4ade80' :
                             upiStage === 'RECOVERING' ? '#38bdf8' :
                             upiStage === 'FAILED' ? '#f87171' : '#cbd5e1'
                    }}>
                      {upiStage === 'PROCESSING' && '⏳ Connecting Bank Switch...'}
                      {upiStage === 'FAILED' && '⚠️ Primary Rail Timeout!'}
                      {upiStage === 'RECOVERING' && '⚡ Preemptive Auto-Failover in Action...'}
                      {upiStage === 'SUCCESS' && '✓ Payment Successful!'}
                    </div>
                    <div style={{ color: '#e2e8f0', fontSize: '10px', marginTop: '2px' }}>
                      {upiStageInfo}
                    </div>
                  </div>
                )}

                {/* Primary Action Button */}
                <button
                  onClick={runMobileUpiTest}
                  disabled={upiStage !== 'IDLE'}
                  style={{
                    width: '100%',
                    background: upiStage === 'PROCESSING' || upiStage === 'RECOVERING' ? '#334155' : currentApp.color,
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: upiStage === 'IDLE' ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {upiStage === 'IDLE' ? (
                    <>
                      <Zap size={14} />
                      <span>Pay ₹499 with {currentApp.shortName}</span>
                    </>
                  ) : upiStage === 'SUCCESS' ? (
                    <>
                      <CheckCircle2 size={14} color="#4ade80" />
                      <span>Settled ₹499 via ICICI Rail</span>
                    </>
                  ) : (
                    <span>Processing Reroute...</span>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Testbench Scenarios (Clean Pills) */}
            <div className="g-card" style={{
              background: 'var(--g-surface-1)',
              border: '1px solid var(--g-border)',
              borderRadius: '16px',
              padding: '14px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--g-text-secondary)', marginBottom: '8px' }}>
                QUICK MULTI-RAIL SCENARIOS:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button
                  onClick={() => triggerSimulation('upi_mandate')}
                  disabled={simulating !== null}
                  style={scenarioBtnStyle}
                >
                  <span>UPI AutoPay Mandate</span>
                </button>
                <button
                  onClick={() => triggerSimulation('processor_timeout')}
                  disabled={simulating !== null}
                  style={scenarioBtnStyle}
                >
                  <span>RuPay Switch Drop</span>
                </button>
                <button
                  onClick={() => triggerSimulation('stolen_card')}
                  disabled={simulating !== null}
                  style={scenarioBtnStyle}
                >
                  <span>Stolen Card (RBI Block)</span>
                </button>
                <button
                  onClick={() => setShowCustomModal(true)}
                  style={{ ...scenarioBtnStyle, border: '1px dashed var(--g-blue)', color: 'var(--g-blue)' }}
                >
                  <span>Custom Webhook...</span>
                </button>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: AUTONOMOUS REVENUE AUDIT STREAM ================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Feed Header & Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                  AUTONOMOUS REVENUE AUDIT STREAM
                </span>
                <span className="font-mono" style={{
                  background: 'var(--g-surface-2)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--g-text-secondary)',
                  padding: '2px 8px',
                  borderRadius: '9999px'
                }}>
                  {filteredRecords.length} events
                </span>
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {['ALL', 'RECOVERED', 'BLOCKED'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      background: filter === f ? 'var(--g-blue)' : 'var(--g-surface-2)',
                      color: filter === f ? '#041e49' : 'var(--g-text-secondary)',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '3px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Feed Cards */}
            {filteredRecords.length === 0 ? (
              <div style={{
                background: 'var(--g-surface-1)',
                border: '1px dashed var(--g-border)',
                borderRadius: '16px',
                padding: '40px',
                textAlign: 'center',
                color: 'var(--g-text-secondary)'
              }}>
                <Radio size={28} color="var(--g-text-tertiary)" style={{ marginBottom: '8px', opacity: 0.6 }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Listening for ambient payment webhooks...</div>
                <div style={{ fontSize: '11px', color: 'var(--g-text-tertiary)', marginTop: '4px' }}>
                  Tap "Pay ₹499" on the phone simulator or toggle an outage to watch the AI recover live!
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredRecords.map((record) => {
                  const isExpanded = expandedRecordId === record.id;
                  const isPreemptive = record.optimization.chosen_action === 'PROACTIVE_PREEMPTIVE_FAILOVER';
                  const isRecovered = record.outcome === 'RECOVERED' || record.outcome === 'SCHEDULED';
                  const isBlocked = record.outcome === 'COMPLIANCE_BLOCKED';

                  return (
                    <div
                      key={record.id}
                      className="g-card"
                      style={{
                        background: 'var(--g-surface-1)',
                        border: `1px solid ${
                          isPreemptive ? 'rgba(56, 189, 248, 0.4)' :
                          isRecovered ? 'rgba(129, 201, 149, 0.3)' :
                          isBlocked ? 'rgba(242, 139, 130, 0.4)' : 'var(--g-border)'
                        }`,
                        borderRadius: '14px',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Clean Card Summary Bar (Visible Always) */}
                      <div style={{
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="font-mono" style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                            ₹{record.transaction.amount.toFixed(2)}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--g-text-secondary)', fontWeight: 600 }}>
                            {record.transaction.issuing_bank}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Outcome Pill */}
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            background: isPreemptive ? 'rgba(56, 189, 248, 0.15)' :
                                        isRecovered ? 'var(--g-green-container)' :
                                        isBlocked ? 'var(--g-red-container)' : 'var(--g-surface-2)',
                            color: isPreemptive ? '#38bdf8' :
                                   isRecovered ? 'var(--g-green)' :
                                   isBlocked ? 'var(--g-red)' : 'var(--g-text-secondary)',
                            border: `1px solid ${
                              isPreemptive ? 'rgba(56, 189, 248, 0.3)' :
                              isRecovered ? 'rgba(129, 201, 149, 0.3)' :
                              isBlocked ? 'rgba(242, 139, 130, 0.3)' : 'var(--g-border)'
                            }`
                          }}>
                            {isPreemptive ? '🛡️ PREEMPTIVE FAILOVER' :
                             isRecovered ? '⚡ RECOVERED' :
                             isBlocked ? '🚫 RBI BLOCKED' : record.outcome}
                          </span>

                          <span className="font-mono" style={{ fontSize: '11px', color: 'var(--g-text-tertiary)' }}>
                            {record.latency_ms}ms
                          </span>

                          {/* Accordion Toggle */}
                          <button
                            onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                            style={{
                              background: 'var(--g-surface-2)',
                              border: '1px solid var(--g-border)',
                              color: 'var(--g-text-secondary)',
                              borderRadius: '6px',
                              padding: '3px 6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px'
                            }}
                          >
                            <span>{isExpanded ? 'Hide' : 'Details'}</span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        </div>
                      </div>

                      {/* Plain-English Action Summary */}
                      <div style={{
                        padding: '0 16px 12px 16px',
                        fontSize: '12px',
                        color: 'var(--g-text-secondary)',
                        lineHeight: '1.4'
                      }}>
                        {record.optimization.action_reasoning || record.diagnosis.root_cause}
                      </div>

                      {/* Expandable Technical Details (SHAP, Bandit, Compliance, Dispatched Tools) */}
                      {isExpanded && (
                        <div style={{
                          padding: '12px 16px',
                          background: 'var(--g-surface-2)',
                          borderTop: '1px solid var(--g-border)',
                          fontSize: '11px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}>
                          {/* Machine Learning Diagnosis & SHAP */}
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--g-blue)', marginBottom: '4px' }}>
                              🧠 Machine Learning Diagnosis ({record.diagnosis.model_used})
                            </div>
                            <div style={{ color: 'var(--g-text-secondary)' }}>
                              • Root Cause: {record.diagnosis.root_cause}<br />
                              • Recovery Probability: <b style={{ color: 'var(--g-green)' }}>{(record.diagnosis.recovery_probability * 100).toFixed(1)}%</b>
                            </div>
                          </div>

                          {/* Multi-Armed Bandit Strategy */}
                          <div>
                            <div style={{ fontWeight: 700, color: '#c084fc', marginBottom: '4px' }}>
                              🎰 Contextual Multi-Armed Bandit
                            </div>
                            <div style={{ color: 'var(--g-text-secondary)' }}>
                              • Strategy: {record.optimization.exploration_strategy}<br />
                              • Selected Action: <b style={{ color: '#fff' }}>{record.optimization.chosen_action}</b><br />
                              • Target Gateway: {record.optimization.target_gateway || 'ICICI Secondary Rail'}
                            </div>
                          </div>

                          {/* Compliance Verification */}
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--g-green)', marginBottom: '4px' }}>
                              🛡️ RBI & Card Network Compliance Check
                            </div>
                            <div style={{ color: 'var(--g-text-secondary)' }}>
                              • Status: <b>{record.compliance.status}</b> (Risk Score: {record.compliance.risk_score})<br />
                              • Checked Rules: {record.compliance.rules_checked.join(', ')}
                            </div>
                          </div>

                          {/* Dispatched Cross-Tool Actions */}
                          {record.dispatched_tools && record.dispatched_tools.length > 0 && (
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--g-text-secondary)', marginBottom: '4px' }}>
                                DISPATCHED AUTOMATIONS:
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {record.dispatched_tools.map((t, idx) => {
                                  const isWa = t.toLowerCase().includes('whatsapp');
                                  const isSl = t.toLowerCase().includes('slack');
                                  return (
                                    <span
                                      key={idx}
                                      onClick={() => {
                                        if (isWa) setToolModal({ type: 'WHATSAPP', record });
                                        if (isSl) setToolModal({ type: 'SLACK', record });
                                      }}
                                      style={{
                                        background: isWa ? 'rgba(37, 211, 102, 0.15)' : isSl ? 'rgba(224, 30, 90, 0.15)' : 'var(--g-surface-1)',
                                        border: `1px solid ${isWa ? '#25D366' : isSl ? '#E01E5A' : 'var(--g-border)'}`,
                                        color: isWa ? '#25D366' : isSl ? '#E01E5A' : 'var(--g-blue)',
                                        padding: '2px 8px',
                                        borderRadius: '9999px',
                                        cursor: (isWa || isSl) ? 'pointer' : 'default',
                                        fontSize: '10px',
                                        fontWeight: 600
                                      }}
                                    >
                                      {t} {(isWa || isSl) && '🔍'}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Human Override Option if HITL Mode is On */}
                          {hitlMode && (
                            <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--g-border)' }}>
                              <span style={{ fontWeight: 700, color: 'var(--g-yellow)', marginRight: '8px' }}>
                                Human Override:
                              </span>
                              <select
                                onChange={(e) => overrideAction(record.id, e.target.value)}
                                defaultValue=""
                                style={{
                                  background: 'var(--g-surface-1)',
                                  color: '#fff',
                                  border: '1px solid var(--g-border)',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '11px'
                                }}
                              >
                                <option value="" disabled>Select Operator Override...</option>
                                <option value="SCHEDULE_SMART_PAYDAY_RETRY">Force Payday Smart Retry</option>
                                <option value="INSTANT_REROUTE_BACKUP_GATEWAY">Force Reroute to ICICI Secondary</option>
                                <option value="DISPATCH_CUSTOMER_RECOVERY_LINK">Dispatch 1-Click WhatsApp Link</option>
                                <option value="ABANDON_NO_RETRY">Force Abandon (Save Fees)</option>
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL: QR Code to open on phone */}
      {showQRModal && (
        <div style={modalBackdropStyle}>
          <div style={modalCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>Open on Mobile Phone</span>
              <button onClick={() => setShowQRModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--g-text-secondary)', marginBottom: '14px' }}>
              Scan with your phone camera (on the same Wi-Fi) to test real mobile payments directly!
            </p>
            <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mobileNetworkUrl)}`}
                alt="QR Code"
                style={{ width: '180px', height: '180px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--g-surface-2)', padding: '8px 12px', borderRadius: '8px', fontSize: '11px' }}>
              <span style={{ color: 'var(--g-blue)' }}>{mobileNetworkUrl}</span>
              <button onClick={copyMobileUrl} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                {copiedLink ? <Check size={14} color="var(--g-green)" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Custom Webhook Tester */}
      {showCustomModal && (
        <div style={modalBackdropStyle}>
          <div style={modalCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>Custom Webhook Dispatcher</span>
              <button onClick={() => setShowCustomModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {/* Quick 1-Click Presets */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--g-text-secondary)', marginBottom: '6px' }}>Quick Presets:</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setCustomForm({
                    amount: 499,
                    currency: 'INR',
                    decline_code: 'upi_server_timeout',
                    issuing_bank: 'Paytm Payments Bank (user@paytm)',
                    card_network: 'UPI / NPCI',
                    customer_tenure_months: 16,
                    day_of_month: 3
                  })}
                  style={presetBtnStyle('#00baf2')}
                >
                  Paytm UPI (₹499)
                </button>
                <button
                  type="button"
                  onClick={() => setCustomForm({
                    amount: 499,
                    currency: 'INR',
                    decline_code: 'upi_server_timeout',
                    issuing_bank: 'PhonePe (user@ybl)',
                    card_network: 'UPI / NPCI',
                    customer_tenure_months: 12,
                    day_of_month: 3
                  })}
                  style={presetBtnStyle('#a855f7')}
                >
                  PhonePe UPI (₹499)
                </button>
                <button
                  type="button"
                  onClick={() => setCustomForm({
                    amount: 499,
                    currency: 'INR',
                    decline_code: 'upi_server_timeout',
                    issuing_bank: 'HDFC Bank (user@okhdfcbank)',
                    card_network: 'UPI / NPCI',
                    customer_tenure_months: 18,
                    day_of_month: 3
                  })}
                  style={presetBtnStyle('#4285F4')}
                >
                  Google Pay (₹499)
                </button>
              </div>
            </div>

            <form onSubmit={submitCustomWebhook} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--g-text-secondary)' }}>Amount (₹ INR)</label>
                <input
                  type="number"
                  value={customForm.amount}
                  onChange={(e) => setCustomForm({ ...customForm, amount: parseFloat(e.target.value) || 0 })}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--g-text-secondary)' }}>Decline Reason Code</label>
                <select
                  value={customForm.decline_code}
                  onChange={(e) => setCustomForm({ ...customForm, decline_code: e.target.value })}
                  style={inputStyle}
                >
                  <option value="upi_server_timeout">upi_server_timeout (Gateway Drop)</option>
                  <option value="upi_mandate_insufficient_funds">upi_mandate_insufficient_funds</option>
                  <option value="processor_timeout">processor_timeout</option>
                  <option value="lost_or_stolen_card">lost_or_stolen_card</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--g-text-secondary)' }}>Bank / App</label>
                <input
                  type="text"
                  value={customForm.issuing_bank}
                  onChange={(e) => setCustomForm({ ...customForm, issuing_bank: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: 'var(--g-blue)',
                  color: '#041e49',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginTop: '6px'
                }}
              >
                Send Webhook Payload
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cross-Tool WhatsApp / Slack Preview */}
      {toolModal && (
        <div style={modalBackdropStyle}>
          <div style={modalCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: toolModal.type === 'WHATSAPP' ? '#25D366' : '#E01E5A' }}>
                {toolModal.type === 'WHATSAPP' ? 'Dispatched Customer WhatsApp' : 'Dispatched Merchant Slack Alert'}
              </span>
              <button onClick={() => setToolModal(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {toolModal.type === 'WHATSAPP' ? (
              <div style={{ background: '#0b141a', borderRadius: '10px', padding: '12px', border: '1px solid #202c33' }}>
                <div style={{ fontSize: '10px', color: '#8696a0', marginBottom: '6px' }}>To: Customer (+91 98765-XXXXX) • Automated 1-Click Link</div>
                <div style={{ background: '#005c4b', color: '#e9edef', padding: '10px', borderRadius: '8px', fontSize: '12px', lineHeight: '1.4' }}>
                  👋 Hi Rahul, your payment of <b>₹{toolModal.record.transaction.amount}</b> to Swiggy timed out on your primary bank.<br /><br />
                  ⚡ PayRevive auto-failover scheduled: Tap below to complete with 1-click UPI:<br />
                  <span style={{ color: '#53bdeb', textDecoration: 'underline' }}>https://payrevive.ai/pay/{toolModal.record.id}</span>
                </div>
              </div>
            ) : (
              <div style={{ background: '#1a1d21', borderRadius: '10px', padding: '12px', border: '1px solid #383f45' }}>
                <div style={{ fontSize: '10px', color: '#9ba1a6', marginBottom: '6px' }}>Channel: #finops-radar-alerts • Bot: PayRevive-Sentinel</div>
                <div style={{ background: '#222529', borderLeft: '4px solid var(--g-green)', padding: '10px', borderRadius: '4px', fontSize: '11px', color: '#e2e8f0' }}>
                  <b>⚡ REVENUE RECOVERED: ₹{toolModal.record.recovered_amount_usd}</b><br />
                  • Action: {toolModal.record.optimization.chosen_action}<br />
                  • Latency: {toolModal.record.latency_ms}ms • Zero Prompts Required
                </div>
              </div>
            )}

            <button
              onClick={() => setToolModal(null)}
              style={{
                width: '100%',
                marginTop: '12px',
                background: 'var(--g-surface-2)',
                border: '1px solid var(--g-border)',
                color: '#fff',
                padding: '8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable styling helpers
const cleanKpiStyle = {
  background: 'var(--g-surface-1)',
  border: '1px solid var(--g-border)',
  borderRadius: '14px',
  padding: '14px 18px'
};

const scenarioBtnStyle = {
  background: 'var(--g-surface-2)',
  border: '1px solid var(--g-border)',
  borderRadius: '8px',
  color: 'var(--g-text-secondary)',
  padding: '8px 10px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'center'
};

const modalBackdropStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0,0,0,0.8)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalCardStyle = {
  background: 'var(--g-surface-1)',
  border: '1px solid var(--g-border-hover)',
  borderRadius: '16px',
  padding: '20px',
  maxWidth: '420px',
  width: '90%',
  boxShadow: '0 20px 50px rgba(0,0,0,0.7)'
};

const inputStyle = {
  width: '100%',
  background: 'var(--g-surface-2)',
  border: '1px solid var(--g-border)',
  borderRadius: '8px',
  padding: '8px 10px',
  color: '#fff',
  fontSize: '12px',
  marginTop: '4px',
  boxSizing: 'border-box'
};

const presetBtnStyle = (color) => ({
  background: 'var(--g-surface-2)',
  border: `1px solid ${color}`,
  color: color,
  borderRadius: '9999px',
  padding: '3px 8px',
  fontSize: '10px',
  fontWeight: 700,
  cursor: 'pointer'
});
