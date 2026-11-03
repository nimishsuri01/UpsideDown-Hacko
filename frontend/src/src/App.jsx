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
  RefreshCw,
  Flame
} from 'lucide-react';

const API_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';
const WS_URL = typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws` : 'ws://localhost:8000/ws';

// Synthetic Multi-Sensory Feedback (Audio Chime + Physical Phone Vibration)
function triggerDeviceFeedback(soundEnabled = true) {
  // 1. Physical Phone Haptic Vibration
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([100, 60, 180]);
    } catch (e) {}
  }

  // 2. Google-Style Cybernetic Audio Chime via Web Audio API
  if (soundEnabled) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
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

  // Active View Tab: 'RADAR' (Live Stream) vs 'UPI_APP' (Google Pay UPI Simulator)
  const [activeTab, setActiveTab] = useState('RADAR');

  // Ambient Bank & Gateway Telemetry Sensor State
  const [bankTelemetry, setBankTelemetry] = useState({
    npci: { name: 'NPCI Central Switch', status: 'HEALTHY', latency_ms: 68, uptime_pct: 99.85, proactive_reroute_active: false },
    hdfc: { name: 'HDFC Core UPI Node', status: 'HEALTHY', latency_ms: 92, uptime_pct: 99.7, proactive_reroute_active: false },
    paytm: { name: 'Paytm Payments Bank UPI', status: 'HEALTHY', latency_ms: 96, uptime_pct: 99.65, proactive_reroute_active: false },
    icici: { name: 'ICICI Secondary Rail', status: 'HEALTHY', latency_ms: 84, uptime_pct: 99.92, proactive_reroute_active: false },
    razorpay: { name: 'Razorpay Gateway API', status: 'HEALTHY', latency_ms: 115, uptime_pct: 99.4, proactive_reroute_active: false }
  });

  // Multi-App UPI Ecosystem Configuration (Google Pay, Paytm, PhonePe)
  const UPI_APPS = {
    GPAY: {
      id: 'GPAY',
      name: 'Google Pay',
      shortName: 'GPay',
      tagline: 'UPI Secured • Zero-Prompt Protected',
      color: 'var(--g-blue)',
      vpa: 'manjot@okhdfcbank',
      bankName: 'HDFC Bank UPI ••••4821',
      outageBankName: 'HDFC Core Node Degraded (Auto-Rerouting to ICICI Rail)'
    },
    PAYTM: {
      id: 'PAYTM',
      name: 'Paytm UPI',
      shortName: 'Paytm',
      tagline: 'Paytm Payments Bank • NPCI Direct Switch',
      color: '#00baf2',
      vpa: 'manjot@paytm',
      bankName: 'Paytm Payments Bank UPI ••••9102',
      outageBankName: 'Paytm Bank Node Degraded (Auto-Rerouting to ICICI Rail)'
    },
    PHONEPE: {
      id: 'PHONEPE',
      name: 'PhonePe UPI',
      shortName: 'PhonePe',
      tagline: 'PhonePe Switch • Powered by NPCI & Yes Bank',
      color: '#a855f7',
      vpa: 'manjot@ybl',
      bankName: 'PhonePe (Yes Bank) UPI ••••3418',
      outageBankName: 'PhonePe Switch Degraded (Auto-Rerouting to ICICI Rail)'
    }
  };

  const [selectedUpiApp, setSelectedUpiApp] = useState('GPAY');

  // Ambient State-Change Event Narrative Banner
  const [stateChangeNarrative, setStateChangeNarrative] = useState(null);

  // Interactive Google Pay / Paytm / PhonePe UPI Checkout State
  const [upiAmount, setUpiAmount] = useState(499);
  const [upiStage, setUpiStage] = useState('IDLE'); // IDLE, PROCESSING, FAILED, RECOVERING, SUCCESS
  const [upiStageInfo, setUpiStageInfo] = useState('');
  const [lastUpiRecord, setLastUpiRecord] = useState(null);

  // Challenge Features: Human-in-the-Loop & Override
  const [hitlMode, setHitlMode] = useState(false);
  const [activeOverrideId, setActiveOverrideId] = useState(null);

  // Toast Alert State
  const [toast, setToast] = useState(null);

  // Tool Dispatch Preview Modal ('WHATSAPP' | 'SLACK' | null)
  const [toolModal, setToolModal] = useState(null);

  // Mobile network address (local IP)
  const mobileNetworkUrl = typeof window !== 'undefined' ? window.location.origin : 'http://192.168.69.211:8000';

  // Custom Webhook Form state
  const [customForm, setCustomForm] = useState({
    amount: 499,
    currency: 'INR',
    decline_code: 'upi_server_timeout',
    issuing_bank: 'HDFC Bank (UPI / PhonePe)',
    card_network: 'UPI / NPCI',
    customer_tenure_months: 14,
    day_of_month: 2
  });

  const wsRef = useRef(null);

  useEffect(() => {
    let reconnectTimer;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

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
            
            // Multi-sensory alert on recovery
            if (data.record.outcome === 'RECOVERED' || data.record.outcome === 'SCHEDULED') {
              triggerDeviceFeedback(soundEnabled);
              setToast({
                title: data.record.optimization.chosen_action === 'PROACTIVE_PREEMPTIVE_FAILOVER' ? 
                  '🛡️ Proactive Sensor Failover Succeeded' : '⚡ Autonomous Recovery Succeeded',
                amount: data.record.recovered_amount_usd,
                action: data.record.optimization.chosen_action,
                tools: data.record.dispatched_tools
              });
              setTimeout(() => setToast(null), 4500);
            }
          } else if (data.type === 'BANK_STATE_CHANGE') {
            if (data.telemetry) setBankTelemetry(data.telemetry);
            setStateChangeNarrative(data.ai_narrative);
            triggerDeviceFeedback(soundEnabled);
            setTimeout(() => setStateChangeNarrative(null), 12000);
          } else if (data.type === 'TELEMETRY_HEARTBEAT') {
            if (data.telemetry) setBankTelemetry(data.telemetry);
          } else if (data.type === 'RECORD_UPDATED') {
            setMetrics(data.metrics || {});
            setAuditRecords((prev) => prev.map(r => r.id === data.record.id ? data.record : r));
          } else if (data.type === 'HITL_MODE_CHANGED') {
            setHitlMode(data.hitl_mode);
          }
        } catch (e) {
          console.error('WS Error:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    // Check traffic status
    fetch(`${API_BASE}/api/traffic/status`)
      .then(res => res.json())
      .then(d => setTrafficRunning(d.is_running))
      .catch(() => {});

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [soundEnabled]);

  // Toggle Ambient Bank Outage / State Change (Challenge Feature: Reacting to State Changes)
  const toggleBankOutage = async (bankId = 'hdfc') => {
    try {
      const res = await fetch(`${API_BASE}/api/telemetry/toggle_outage/${bankId}`, { method: 'POST' });
      const data = await res.json();
      if (data.telemetry) setBankTelemetry(data.telemetry);
      setStateChangeNarrative(data.ai_narrative);
      triggerDeviceFeedback(soundEnabled);
      setTimeout(() => setStateChangeNarrative(null), 9000);
    } catch (e) {
      console.error('Outage toggle error:', e);
    }
  };

  const toggleTraffic = async () => {
    const endpoint = trafficRunning ? '/api/traffic/stop' : '/api/traffic/start';
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST' });
      const data = await res.json();
      setTrafficRunning(data.status === 'RUNNING');
    } catch (e) {
      console.error('Traffic toggle error:', e);
    }
  };

  const toggleHitlMode = async () => {
    const nextMode = !hitlMode;
    try {
      await fetch(`${API_BASE}/api/config/hitl_mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextMode })
      });
      setHitlMode(nextMode);
    } catch (e) {
      console.error('HITL toggle error:', e);
    }
  };

  const overrideAction = async (recordId, newAction) => {
    try {
      await fetch(`${API_BASE}/api/audit/${recordId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newAction })
      });
      setActiveOverrideId(null);
    } catch (e) {
      console.error('Override error:', e);
    }
  };

  const triggerSimulation = async (scenario) => {
    setSimulating(scenario);
    try {
      await fetch(`${API_BASE}/api/simulate/${scenario}`, { method: 'POST' });
    } catch (e) {
      console.error('Sim error:', e);
    } finally {
      setTimeout(() => setSimulating(null), 500);
    }
  };

  // Multi-App Mobile UPI Simulation (Google Pay, Paytm, PhonePe)
  const runMobileUpiTest = async (scenarioType) => {
    const currentApp = UPI_APPS[selectedUpiApp] || UPI_APPS.GPAY;
    const isPaytm = selectedUpiApp === 'PAYTM';
    const isOutage = isPaytm ? isPaytmOutage : isHdfcOutage;
    const simEndpoint = isPaytm ? 'paytm_timeout' : 'upi_timeout';

    setUpiStage('PROCESSING');
    setUpiStageInfo(`Initiating NPCI UPI Handshake via ${currentApp.name} (${currentApp.vpa})...`);

    setTimeout(async () => {
      // If bank node is currently in outage, show proactive preemption!
      if (isOutage) {
        setUpiStage('RECOVERING');
        setUpiStageInfo(`⚡ Sensor Warning: ${currentApp.shortName} Bank Node in Outage! Preemptively auto-routing to ICICI Secondary Rail...`);

        try {
          const res = await fetch(`${API_BASE}/api/simulate/${simEndpoint}`, { method: 'POST' });
          const rec = await res.json();
          setLastUpiRecord(rec);
          triggerDeviceFeedback(soundEnabled);
          setUpiStage('SUCCESS');
          setUpiStageInfo(`🛡️ Proactive Failover Complete! Direct routing to ICICI Secondary Rail in 14ms (Zero customer drop).`);
        } catch (e) {
          setUpiStage('IDLE');
        }
        return;
      }

      if (scenarioType === 'TIMEOUT') {
        setUpiStage('FAILED');
        setUpiStageInfo(`Decline U30: ${currentApp.shortName} Core Server Timeout (>2400ms)`);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

        setTimeout(async () => {
          setUpiStage('RECOVERING');
          setUpiStageInfo(`PayRevive Ambient Sentinel Intercepting ${currentApp.shortName} failure event...`);

          try {
            const res = await fetch(`${API_BASE}/api/simulate/${simEndpoint}`, { method: 'POST' });
            const rec = await res.json();
            setLastUpiRecord(rec);
            triggerDeviceFeedback(soundEnabled);
            setUpiStage('SUCCESS');
            setUpiStageInfo(`Payment Autonomous Recovered! Switched to ICICI Secondary Rail in 41ms.`);
          } catch (e) {
            setUpiStage('IDLE');
          }
        }, 1200);

      } else if (scenarioType === 'MANDATE') {
        setUpiStage('FAILED');
        setUpiStageInfo(`Decline M05: ${currentApp.shortName} AutoPay Mandate Failed - Insufficient Balance`);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

        setTimeout(async () => {
          setUpiStage('RECOVERING');
          setUpiStageInfo(`PayRevive TreeSHAP Diagnosing & Scheduling Payday Retry for ${currentApp.shortName}...`);

          try {
            const res = await fetch(`${API_BASE}/api/simulate/upi_mandate`, { method: 'POST' });
            const rec = await res.json();
            setLastUpiRecord(rec);
            triggerDeviceFeedback(soundEnabled);
            setUpiStage('SUCCESS');
            setUpiStageInfo('AutoPay Mandate Preserved! Scheduled retry for salary day (+1) + WhatsApp alert dispatched.');
          } catch (e) {
            setUpiStage('IDLE');
          }
        }, 1200);
      }
    }, 1000);
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
    if (filter === 'ABANDONED') return rec.outcome === 'ABANDONED_FEES_SAVED';
    return true;
  });

  const isHdfcOutage = bankTelemetry.hdfc?.status === 'CRITICAL_OUTAGE' || bankTelemetry.hdfc?.proactive_reroute_active;
  const isPaytmOutage = bankTelemetry.paytm?.status === 'CRITICAL_OUTAGE' || bankTelemetry.paytm?.proactive_reroute_active;
  const isAnyOutage = isHdfcOutage || isPaytmOutage || bankTelemetry.npci?.status === 'CRITICAL_OUTAGE';
  const currentApp = UPI_APPS[selectedUpiApp] || UPI_APPS.GPAY;
  const isSelectedAppOutage = selectedUpiApp === 'PAYTM' ? isPaytmOutage : isHdfcOutage;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--g-bg-base)', paddingBottom: '76px' }}>
      
      {/* Top Header Bar (Google Material 3 Style) */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        background: 'rgba(30, 31, 32, 0.85)',
        borderBottom: '1px solid var(--g-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Brand & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            background: 'var(--g-gemini-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px var(--g-gemini-glow)'
          }}>
            <Sparkles size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px', margin: 0, color: '#f8fafc' }}>
                PayRevive
              </h1>
              <span style={{
                background: 'rgba(66, 133, 244, 0.14)',
                border: '1px solid rgba(138, 180, 248, 0.3)',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '9999px',
                color: 'var(--g-blue)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Zap size={11} color="var(--g-blue)" />
                PS-02 : Zero-Prompt AI
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--g-text-secondary)', marginTop: '2px' }}>
              Autonomous Revenue Recovery • Google Cloud & NPCI Multi-Rail Sentinel
            </p>
          </div>
        </div>

        {/* Ambient Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="g-button"
            title={soundEnabled ? "Mute audio chimes" : "Enable audio chimes"}
            style={{
              background: 'var(--g-surface-2)',
              border: '1px solid var(--g-border)',
              color: soundEnabled ? 'var(--g-green)' : 'var(--g-text-tertiary)',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* HITL Control Switch */}
          <button
            onClick={toggleHitlMode}
            className="g-button"
            title="Toggle between 100% Autonomous AI and Supervised Human-in-the-Loop Mode"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: hitlMode ? 'var(--g-yellow-container)' : 'var(--g-green-container)',
              border: `1px solid ${hitlMode ? 'rgba(253, 214, 99, 0.4)' : 'rgba(129, 201, 149, 0.4)'}`,
              color: hitlMode ? 'var(--g-yellow)' : 'var(--g-green)',
              padding: '6px 14px',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px'
            }}
          >
            {hitlMode ? <UserCheck size={14} /> : <ShieldCheck size={14} />}
            <span>{hitlMode ? 'Supervised Mode' : '100% Autonomous'}</span>
          </button>

          {/* QR Code */}
          <button
            onClick={() => setShowQRModal(true)}
            className="g-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--g-blue-container)',
              border: '1px solid rgba(138, 180, 248, 0.3)',
              color: 'var(--g-blue)',
              padding: '6px 14px',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px'
            }}
          >
            <Smartphone size={14} />
            <span>Open on Phone</span>
          </button>

          {/* Continuous Traffic */}
          <button
            onClick={toggleTraffic}
            className="g-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: trafficRunning ? 'var(--g-red-container)' : 'var(--g-surface-2)',
              border: `1px solid ${trafficRunning ? 'rgba(242, 139, 130, 0.4)' : 'var(--g-border)'}`,
              color: trafficRunning ? 'var(--g-red)' : 'var(--g-text-primary)',
              padding: '6px 14px',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px'
            }}
          >
            {trafficRunning ? <Square size={13} fill="var(--g-red)" /> : <Play size={13} fill="var(--g-green)" />}
            <span>{trafficRunning ? 'Stop Stream' : 'Live Stream'}</span>
          </button>

          {/* WebSocket Status Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: connected ? 'var(--g-green)' : 'var(--g-red)',
            padding: '5px 10px',
            background: 'var(--g-surface-2)',
            borderRadius: '9999px',
            border: '1px solid var(--g-border)'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: connected ? 'var(--g-green)' : 'var(--g-red)',
              boxShadow: connected ? '0 0 8px var(--g-green)' : 'none'
            }} />
            <span className="font-mono">{connected ? 'ONLINE' : 'CONNECTING'}</span>
          </div>
        </div>
      </header>

      {/* Floating Google-Style Toast Notification on Recovery */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '72px',
          right: '20px',
          zIndex: 999,
          background: 'var(--g-surface-2)',
          border: '1px solid rgba(129, 201, 149, 0.5)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
          borderRadius: '14px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '380px',
          animation: 'slideDownToast 0.25s cubic-bezier(0.2, 0, 0, 1)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--g-green-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CheckCircle2 size={18} color="var(--g-green)" />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--g-green)' }}>{toast.title}</div>
            <div style={{ fontSize: '11px', color: 'var(--g-text-secondary)', marginTop: '2px' }}>
              Recovered <b style={{ color: '#fff' }}>₹{toast.amount}</b> via {toast.action}
            </div>
          </div>
          <button onClick={() => setToast(null)} style={{ background: 'transparent', border: 'none', color: 'var(--g-text-tertiary)', cursor: 'pointer', marginLeft: 'auto' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '16px 24px', maxWidth: '1440px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* DEDICATED AMBIENT BANK & GATEWAY HEALTH SENTINEL (REACTS TO STATE CHANGES & SENSOR TELEMETRY) */}
        <div style={{
          background: isHdfcOutage ? 'linear-gradient(180deg, rgba(242, 139, 130, 0.12) 0%, var(--g-surface-1) 100%)' : 'var(--g-surface-1)',
          border: `1px solid ${isHdfcOutage ? 'rgba(242, 139, 130, 0.5)' : 'var(--g-border)'}`,
          borderRadius: '20px',
          padding: '18px 22px',
          marginBottom: '20px',
          boxShadow: isHdfcOutage ? '0 8px 32px rgba(242, 139, 130, 0.15)' : '0 4px 20px rgba(0, 0, 0, 0.25)'
        }}>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: isHdfcOutage ? 'var(--g-red-container)' : 'var(--g-blue-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${isHdfcOutage ? 'rgba(242, 139, 130, 0.5)' : 'rgba(138, 180, 248, 0.4)'}`
              }}>
                <Radio size={18} color={isHdfcOutage ? 'var(--g-red)' : 'var(--g-blue)'} className="pulse-indicator" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.3px' }}>
                    AMBIENT BANK & GATEWAY HEALTH SENTINEL
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    background: 'var(--g-surface-2)',
                    color: 'var(--g-green)',
                    border: '1px solid rgba(129, 201, 149, 0.3)',
                    padding: '1px 7px',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--g-green)' }}></span>
                    LIVE POLLING (3.2s)
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--g-text-secondary)', marginTop: '2px' }}>
                  Zero-Prompt background sensor monitoring NPCI switch & core banking latency SLA thresholds (&gt;1200ms)
                </div>
              </div>
            </div>

            {/* Active Routing Cache Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: isPaytmOutage ? 'rgba(0, 186, 242, 0.15)' : isHdfcOutage ? 'var(--g-red-container)' : 'var(--g-surface-2)',
              border: `1px solid ${isPaytmOutage ? '#00baf2' : isHdfcOutage ? 'var(--g-red)' : 'var(--g-border)'}`,
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '11px'
            }}>
              <span style={{ color: 'var(--g-text-secondary)', fontWeight: 500 }}>Active Route:</span>
              <span style={{ color: isPaytmOutage ? '#00baf2' : isHdfcOutage ? 'var(--g-red)' : 'var(--g-green)', fontWeight: 800 }}>
                {isPaytmOutage ? '⚡ ICICI SECONDARY RAIL (PROACTIVELY FAILOVERED FOR PAYTM)' : isHdfcOutage ? '⚡ ICICI SECONDARY RAIL (PROACTIVELY FAILOVERED)' : '🟢 HDFC / PAYTM PRIMARY UPI RAILS (OPTIMAL)'}
              </span>
            </div>
          </div>

          {/* Telemetry Node Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {/* 1. NPCI Central Switch */}
            <div style={{
              background: 'var(--g-surface-2)',
              border: `1px solid ${bankTelemetry.npci?.status === 'CRITICAL_OUTAGE' ? 'var(--g-red)' : 'var(--g-border)'}`,
              borderRadius: '14px',
              padding: '12px 14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe size={13} color="var(--g-blue)" />
                  NPCI Central Switch
                </span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: bankTelemetry.npci?.status === 'CRITICAL_OUTAGE' ? 'var(--g-red)' : 'var(--g-green)',
                  background: bankTelemetry.npci?.status === 'CRITICAL_OUTAGE' ? 'var(--g-red-container)' : 'var(--g-green-container)',
                  padding: '1px 6px',
                  borderRadius: '9999px'
                }}>
                  {bankTelemetry.npci?.status === 'CRITICAL_OUTAGE' ? 'CONGESTED' : 'OPTIMAL'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: bankTelemetry.npci?.status === 'CRITICAL_OUTAGE' ? 'var(--g-red)' : '#f8fafc' }}>
                  {bankTelemetry.npci?.latency_ms || 68} <span style={{ fontSize: '11px', color: 'var(--g-text-secondary)', fontWeight: 500 }}>ms ping</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--g-text-secondary)' }}>
                  Uptime: <b style={{ color: 'var(--g-green)' }}>{bankTelemetry.npci?.uptime_pct}%</b>
                </div>
              </div>
              <button
                onClick={() => toggleBankOutage('npci')}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  background: 'transparent',
                  border: '1px dashed var(--g-border)',
                  color: 'var(--g-text-secondary)',
                  borderRadius: '8px',
                  padding: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {bankTelemetry.npci?.status === 'CRITICAL_OUTAGE' ? '✓ Restore NPCI' : '⚡ Simulate NPCI Surge'}
              </button>
            </div>

            {/* 2. HDFC Core UPI Node (The Main Star for Judges) */}
            <div style={{
              background: isHdfcOutage ? 'rgba(242, 139, 130, 0.15)' : 'var(--g-surface-2)',
              border: `2px solid ${isHdfcOutage ? 'var(--g-red)' : 'rgba(138, 180, 248, 0.3)'}`,
              borderRadius: '14px',
              padding: '12px 14px',
              boxShadow: isHdfcOutage ? '0 0 16px rgba(242, 139, 130, 0.25)' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: isHdfcOutage ? 'var(--g-red)' : '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Server size={13} color={isHdfcOutage ? 'var(--g-red)' : 'var(--g-blue)'} />
                  HDFC Core UPI Node
                </span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: isHdfcOutage ? '#fff' : 'var(--g-green)',
                  background: isHdfcOutage ? 'var(--g-red)' : 'var(--g-green-container)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  animation: isHdfcOutage ? 'pulse 1.5s infinite' : 'none'
                }}>
                  {isHdfcOutage ? 'CRITICAL OUTAGE' : 'HEALTHY'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: '18px', fontWeight: 900, color: isHdfcOutage ? 'var(--g-red)' : '#f8fafc' }}>
                  {bankTelemetry.hdfc?.latency_ms || 92} <span style={{ fontSize: '11px', color: 'var(--g-text-secondary)', fontWeight: 500 }}>ms {isHdfcOutage ? '(>1200ms SLA!)' : 'ping'}</span>
                </div>
                <div style={{ fontSize: '10px', color: isHdfcOutage ? 'var(--g-red)' : 'var(--g-text-secondary)', fontWeight: 600 }}>
                  {isHdfcOutage ? '48.6% Failure Rate' : '0.3% Optimal'}
                </div>
              </div>
              <button
                onClick={() => toggleBankOutage('hdfc')}
                className="g-button"
                style={{
                  marginTop: '10px',
                  width: '100%',
                  background: isHdfcOutage ? 'var(--g-green)' : 'rgba(242, 139, 130, 0.22)',
                  color: isHdfcOutage ? '#041e49' : 'var(--g-red)',
                  border: `1px solid ${isHdfcOutage ? 'transparent' : 'var(--g-red)'}`,
                  borderRadius: '8px',
                  padding: '5px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isHdfcOutage ? (
                  <>
                    <RefreshCw size={13} />
                    <span>✓ Restore HDFC Health (88ms)</span>
                  </>
                ) : (
                  <>
                    <Flame size={13} />
                    <span>⚡ Simulate HDFC Outage (2450ms)</span>
                  </>
                )}
              </button>
            </div>

            {/* 3. Paytm Payments Bank UPI Node */}
            <div style={{
              background: isPaytmOutage ? 'rgba(0, 186, 242, 0.15)' : 'var(--g-surface-2)',
              border: `2px solid ${isPaytmOutage ? '#00baf2' : 'var(--g-border)'}`,
              borderRadius: '14px',
              padding: '12px 14px',
              boxShadow: isPaytmOutage ? '0 0 16px rgba(0, 186, 242, 0.25)' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: isPaytmOutage ? '#00baf2' : '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Smartphone size={13} color={isPaytmOutage ? '#00baf2' : 'var(--g-blue)'} />
                  Paytm UPI Node
                </span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: isPaytmOutage ? '#fff' : 'var(--g-green)',
                  background: isPaytmOutage ? '#00baf2' : 'var(--g-green-container)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  animation: isPaytmOutage ? 'pulse 1.5s infinite' : 'none'
                }}>
                  {isPaytmOutage ? 'CRITICAL OUTAGE' : 'HEALTHY'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: '18px', fontWeight: 900, color: isPaytmOutage ? '#00baf2' : '#f8fafc' }}>
                  {bankTelemetry.paytm?.latency_ms || 96} <span style={{ fontSize: '11px', color: 'var(--g-text-secondary)', fontWeight: 500 }}>ms {isPaytmOutage ? '(>1200ms SLA!)' : 'ping'}</span>
                </div>
                <div style={{ fontSize: '10px', color: isPaytmOutage ? '#00baf2' : 'var(--g-text-secondary)', fontWeight: 600 }}>
                  {isPaytmOutage ? '44.5% Failure Rate' : '0.35% Optimal'}
                </div>
              </div>
              <button
                onClick={() => toggleBankOutage('paytm')}
                className="g-button"
                style={{
                  marginTop: '10px',
                  width: '100%',
                  background: isPaytmOutage ? 'var(--g-green)' : 'rgba(0, 186, 242, 0.18)',
                  color: isPaytmOutage ? '#041e49' : '#00baf2',
                  border: `1px solid ${isPaytmOutage ? 'transparent' : '#00baf2'}`,
                  borderRadius: '8px',
                  padding: '5px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isPaytmOutage ? (
                  <>
                    <RefreshCw size={13} />
                    <span>✓ Restore Paytm (94ms)</span>
                  </>
                ) : (
                  <>
                    <Flame size={13} />
                    <span>⚡ Simulate Paytm Outage</span>
                  </>
                )}
              </button>
            </div>

            {/* 4. ICICI Secondary Rail (The Failover Target) */}
            <div style={{
              background: isHdfcOutage ? 'rgba(129, 201, 149, 0.15)' : 'var(--g-surface-2)',
              border: `2px solid ${isHdfcOutage ? 'var(--g-green)' : 'var(--g-border)'}`,
              borderRadius: '14px',
              padding: '12px 14px',
              boxShadow: isHdfcOutage ? '0 0 16px rgba(129, 201, 149, 0.25)' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: isHdfcOutage ? 'var(--g-green)' : '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={13} color={isHdfcOutage ? 'var(--g-green)' : 'var(--g-text-secondary)'} />
                  ICICI Secondary Rail
                </span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: isHdfcOutage ? '#041e49' : 'var(--g-text-secondary)',
                  background: isHdfcOutage ? 'var(--g-green)' : 'var(--g-surface-3)',
                  padding: '2px 8px',
                  borderRadius: '9999px'
                }}>
                  {isHdfcOutage ? '⚡ ACTIVE FAILOVER' : 'HOT STANDBY'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: isHdfcOutage ? 'var(--g-green)' : '#f8fafc' }}>
                  {bankTelemetry.icici?.latency_ms || 84} <span style={{ fontSize: '11px', color: 'var(--g-text-secondary)', fontWeight: 500 }}>ms ping</span>
                </div>
                <div style={{ fontSize: '10px', color: isHdfcOutage ? 'var(--g-green)' : 'var(--g-text-secondary)', fontWeight: 600 }}>
                  {isHdfcOutage ? '100% Traffic Load' : '99.92% Uptime'}
                </div>
              </div>
              <div style={{
                marginTop: '10px',
                fontSize: '10px',
                color: isHdfcOutage ? 'var(--g-green)' : 'var(--g-text-tertiary)',
                textAlign: 'center',
                padding: '4px',
                background: isHdfcOutage ? 'rgba(129, 201, 149, 0.2)' : 'transparent',
                borderRadius: '8px',
                fontWeight: 600
              }}>
                {isHdfcOutage ? '🛡️ ZERO-DOWNTIME ACTIVE' : 'Hot-Sync Standby Rail'}
              </div>
            </div>

            {/* 4. Razorpay Gateway API */}
            <div style={{
              background: 'var(--g-surface-2)',
              border: '1px solid var(--g-border)',
              borderRadius: '14px',
              padding: '12px 14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={13} color="var(--g-blue)" />
                  Razorpay Gateway API
                </span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: 'var(--g-blue)',
                  background: 'var(--g-blue-container)',
                  padding: '1px 6px',
                  borderRadius: '9999px'
                }}>
                  ACTIVE
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                  {bankTelemetry.razorpay?.latency_ms || 115} <span style={{ fontSize: '11px', color: 'var(--g-text-secondary)', fontWeight: 500 }}>ms ping</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--g-text-secondary)' }}>
                  Uptime: <b style={{ color: 'var(--g-blue)' }}>{bankTelemetry.razorpay?.uptime_pct}%</b>
                </div>
              </div>
              <div style={{
                marginTop: '10px',
                fontSize: '10px',
                color: 'var(--g-text-tertiary)',
                textAlign: 'center',
                padding: '4px'
              }}>
                Card & Mandate Fallback Rail
              </div>
            </div>
          </div>

          {/* Real-time Dynamic Routing Visualizer Flow */}
          <div style={{
            background: 'var(--g-surface-2)',
            border: '1px solid var(--g-border)',
            borderRadius: '12px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '11px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--g-text-secondary)', fontWeight: 600 }}>
              <Activity size={14} color="var(--g-blue)" />
              <span>LIVE TRAFFIC PIPELINE:</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ color: '#f8fafc', fontWeight: 700 }}>[Customer UPI Checkout]</span>
              <span style={{ color: 'var(--g-text-tertiary)' }}>➔</span>
              
              {isPaytmOutage ? (
                <>
                  <span style={{
                    color: '#00baf2',
                    fontWeight: 800,
                    textDecoration: 'line-through',
                    background: 'rgba(0, 186, 242, 0.18)',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    [Paytm Node 2380ms TIMEOUT]
                  </span>
                  <span style={{ color: 'var(--g-green)', fontWeight: 800 }}>⚡ BYPASS ➔</span>
                  <span style={{
                    color: 'var(--g-green)',
                    fontWeight: 800,
                    background: 'var(--g-green-container)',
                    border: '1px solid var(--g-green)',
                    padding: '2px 10px',
                    borderRadius: '6px'
                  }}>
                    [ICICI Secondary Rail (84ms)]
                  </span>
                </>
              ) : isHdfcOutage ? (
                <>
                  <span style={{
                    color: 'var(--g-red)',
                    fontWeight: 800,
                    textDecoration: 'line-through',
                    background: 'var(--g-red-container)',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    [HDFC Core 2450ms TIMEOUT]
                  </span>
                  <span style={{ color: 'var(--g-green)', fontWeight: 800 }}>⚡ BYPASS ➔</span>
                  <span style={{
                    color: 'var(--g-green)',
                    fontWeight: 800,
                    background: 'var(--g-green-container)',
                    border: '1px solid var(--g-green)',
                    padding: '2px 10px',
                    borderRadius: '6px'
                  }}>
                    [ICICI Secondary Rail (84ms)]
                  </span>
                </>
              ) : (
                <span style={{
                  color: 'var(--g-green)',
                  fontWeight: 700,
                  background: 'var(--g-surface-3)',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  [Primary Rail: HDFC / Paytm UPI (Optimal)]
                </span>
              )}

              <span style={{ color: 'var(--g-text-tertiary)' }}>➔</span>
              <span style={{ color: '#f8fafc', fontWeight: 700 }}>[NPCI Switch]</span>
              <span style={{ color: 'var(--g-text-tertiary)' }}>➔</span>
              <span style={{ color: 'var(--g-green)', fontWeight: 700 }}>[Merchant Settlement (0ms Churn)]</span>
            </div>
          </div>
        </div>

        {/* PROACTIVE STATE-CHANGE AI NARRATIVE BANNER (PROVES AI RESPONDS TO STATE CHANGES) */}
        {stateChangeNarrative && (
          <div style={{
            background: isHdfcOutage ? 'rgba(242, 139, 130, 0.14)' : 'rgba(129, 201, 149, 0.14)',
            border: `1px solid ${isHdfcOutage ? 'var(--g-red)' : 'var(--g-green)'}`,
            borderRadius: '14px',
            padding: '12px 18px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            animation: 'slideDownToast 0.3s cubic-bezier(0.2, 0, 0, 1)',
            boxShadow: isHdfcOutage ? '0 8px 30px rgba(242, 139, 130, 0.2)' : '0 8px 30px rgba(129, 201, 149, 0.2)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isHdfcOutage ? 'var(--g-red-container)' : 'var(--g-green-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Zap size={16} color={isHdfcOutage ? 'var(--g-red)' : 'var(--g-green)'} />
            </div>
            <div style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: '#f8fafc', lineHeight: '1.4' }}>
              <div>{stateChangeNarrative}</div>
              {isHdfcOutage && (
                <button
                  onClick={() => triggerSimulation('upi_timeout')}
                  style={{
                    marginTop: '6px',
                    background: 'var(--g-blue-container)',
                    color: 'var(--g-blue)',
                    border: '1px solid rgba(138, 180, 248, 0.4)',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Play size={10} />
                  <span>Test UPI Preemptive Failover (Simulate ₹499 Payment)</span>
                </button>
              )}
            </div>
            <button onClick={() => setStateChangeNarrative(null)} style={{ background: 'transparent', border: 'none', color: 'var(--g-text-tertiary)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* TAB 1: GOOGLE PAY / UPI SIMULATOR EXPERIENCE */}
        {activeTab === 'UPI_APP' && (
          <div style={{ maxWidth: '440px', margin: '0 auto 24px auto' }}>
            <div style={{
              background: 'var(--g-surface-1)',
              border: '1px solid rgba(138, 180, 248, 0.3)',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
            }}>
              {/* App Switcher Chips (Google Pay | Paytm | PhonePe) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                background: 'var(--g-surface-2)',
                padding: '4px',
                borderRadius: '12px',
                marginBottom: '16px',
                border: '1px solid var(--g-border)'
              }}>
                {Object.values(UPI_APPS).map((app) => {
                  const isActive = selectedUpiApp === app.id;
                  return (
                    <button
                      key={app.id}
                      onClick={() => {
                        setSelectedUpiApp(app.id);
                        if (upiStage !== 'PROCESSING' && upiStage !== 'RECOVERING') {
                          setUpiStage('IDLE');
                          setUpiStageInfo('');
                        }
                      }}
                      className="g-button"
                      style={{
                        background: isActive ? app.color : 'transparent',
                        color: isActive ? '#041e49' : 'var(--g-text-secondary)',
                        border: 'none',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: isActive ? '#041e49' : app.color
                      }} />
                      <span>{app.shortName}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Mobile App Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--g-border)', paddingBottom: '14px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--g-surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${currentApp.color}`
                  }}>
                    <Smartphone size={16} color={currentApp.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>{currentApp.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--g-text-tertiary)' }}>{currentApp.tagline}</div>
                  </div>
                </div>
                <div style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: isSelectedAppOutage ? 'var(--g-yellow)' : 'var(--g-green)',
                  background: isSelectedAppOutage ? 'var(--g-yellow-container)' : 'var(--g-green-container)',
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  border: `1px solid ${isSelectedAppOutage ? 'rgba(253, 214, 99, 0.4)' : 'rgba(129, 201, 149, 0.3)'}`
                }}>
                  {isSelectedAppOutage ? 'FAILOVER ACTIVE' : 'ACTIVE SENTINEL'}
                </div>
              </div>

              {/* Bill Details (Mobile Card Style) */}
              <div style={{
                background: 'var(--g-surface-2)',
                borderRadius: '16px',
                padding: '18px',
                textAlign: 'center',
                border: '1px solid var(--g-border)',
                marginBottom: '18px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--g-text-tertiary)' }}>Paying Merchant:</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                  Swiggy / Zomato Express (Food Delivery)
                </div>
                <div className="font-mono" style={{ fontSize: '32px', fontWeight: 900, color: 'var(--g-text-primary)', margin: '12px 0 6px 0' }}>
                  ₹{upiAmount}.00
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--g-surface-3)',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '10px',
                  color: isSelectedAppOutage ? 'var(--g-yellow)' : 'var(--g-text-secondary)'
                }}>
                  <CreditCard size={12} color={isSelectedAppOutage ? 'var(--g-yellow)' : currentApp.color} />
                  <span>{isSelectedAppOutage ? currentApp.outageBankName : currentApp.bankName}</span>
                </div>
              </div>

              {/* Live Status Animation Box */}
              {upiStage !== 'IDLE' && (
                <div style={{
                  padding: '16px',
                  borderRadius: '14px',
                  background: upiStage === 'PROCESSING' ? 'var(--g-blue-container)' :
                              upiStage === 'FAILED' ? 'var(--g-red-container)' :
                              upiStage === 'RECOVERING' ? 'rgba(155, 114, 207, 0.16)' :
                              'var(--g-green-container)',
                  border: `1px solid ${
                    upiStage === 'PROCESSING' ? 'rgba(138, 180, 248, 0.4)' :
                    upiStage === 'FAILED' ? 'rgba(242, 139, 130, 0.5)' :
                    upiStage === 'RECOVERING' ? 'rgba(155, 114, 207, 0.5)' :
                    'rgba(129, 201, 149, 0.5)'
                  }`,
                  marginBottom: '18px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: upiStage === 'FAILED' ? 'var(--g-red)' : upiStage === 'SUCCESS' ? 'var(--g-green)' : 'var(--g-blue)'
                  }}>
                    {upiStage === 'PROCESSING' && `Step 1: Processing UPI request with ${currentApp.shortName}...`}
                    {upiStage === 'FAILED' && `✕ Step 2: ${currentApp.shortName} Core Server Timeout!`}
                    {upiStage === 'RECOVERING' && '⚡ Step 3: Zero-Prompt AI Intercepting...'}
                    {upiStage === 'SUCCESS' && '🎉 Step 4: Autonomous Failover Recovered!'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--g-text-secondary)', marginTop: '4px' }}>
                    {upiStageInfo}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => runMobileUpiTest('TIMEOUT')}
                  disabled={upiStage === 'PROCESSING' || upiStage === 'RECOVERING'}
                  className="g-button"
                  style={{
                    background: currentApp.color,
                    color: '#041e49',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <Zap size={16} />
                  <span>{isSelectedAppOutage ? `⚡ Tap to Pay via ${currentApp.shortName} (Preemptive Failover)` : `Tap to Pay via ${currentApp.shortName} (Simulate Timeout)`}</span>
                </button>

                <button
                  onClick={() => runMobileUpiTest('MANDATE')}
                  disabled={upiStage === 'PROCESSING' || upiStage === 'RECOVERING'}
                  className="g-button"
                  style={{
                    background: 'var(--g-surface-2)',
                    color: 'var(--g-yellow)',
                    border: '1px solid rgba(253, 214, 99, 0.3)',
                    padding: '12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Clock size={15} />
                  <span>AutoPay Mandate (Trigger Insufficient Funds)</span>
                </button>

                {upiStage === 'SUCCESS' && (
                  <button
                    onClick={() => { setUpiStage('IDLE'); setUpiStageInfo(''); }}
                    className="g-button"
                    style={{
                      background: 'transparent',
                      color: 'var(--g-text-secondary)',
                      border: '1px dashed var(--g-border)',
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      marginTop: '4px'
                    }}
                  >
                    Reset UPI Simulator
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4 Metric Counter Cards (Google Cloud Dashboard Style) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '22px'
        }}>
          {/* Revenue at Risk */}
          <div className="g-card" style={metricCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--g-text-secondary)', fontSize: '12px', fontWeight: 500 }}>
              <span>REVENUE AT RISK</span>
              <AlertCircle size={16} color="var(--g-red)" />
            </div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, marginTop: '8px', color: 'var(--g-red)' }}>
              ₹{metrics.total_at_risk_usd ? metrics.total_at_risk_usd.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--g-text-tertiary)', marginTop: '4px' }}>
              From {metrics.total_events || 0} failed transaction events
            </div>
          </div>

          {/* Autonomous Recovered */}
          <div className="g-card" style={{ ...metricCardStyle, border: '1px solid rgba(129, 201, 149, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--g-green)', fontSize: '12px', fontWeight: 500 }}>
              <span>AUTONOMOUS RECOVERED</span>
              <Banknote size={16} color="var(--g-green)" />
            </div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, marginTop: '8px', color: 'var(--g-green)' }}>
              ₹{metrics.total_recovered_usd ? metrics.total_recovered_usd.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--g-green)', marginTop: '4px' }}>
              Recovered without manual chat prompts
            </div>
          </div>

          {/* Fees Preserved */}
          <div className="g-card" style={metricCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--g-text-secondary)', fontSize: '12px', fontWeight: 500 }}>
              <span>FEES PRESERVED</span>
              <PiggyBank size={16} color="var(--g-blue)" />
            </div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, marginTop: '8px', color: 'var(--g-blue)' }}>
              ₹{metrics.total_fees_saved_usd ? (metrics.total_fees_saved_usd * 85).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--g-text-tertiary)', marginTop: '4px' }}>
              {metrics.compliance_blocks || 0} regulatory blocks enforced
            </div>
          </div>

          {/* Net Recovery Rate */}
          <div className="g-card" style={metricCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--g-text-secondary)', fontSize: '12px', fontWeight: 500 }}>
              <span>RECOVERY EFFICIENCY</span>
              <TrendingUp size={16} color="#c084fc" />
            </div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: 800, marginTop: '8px', color: '#c084fc' }}>
              {metrics.recovery_rate_pct ? metrics.recovery_rate_pct.toFixed(1) : '0.0'}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--g-text-tertiary)', marginTop: '4px' }}>
              Contextual Multi-Armed Bandit ROI
            </div>
          </div>
        </div>

        {/* TAB 2: AUTONOMOUS AUDIT STREAM & SIMULATION BAR */}
        {activeTab === 'RADAR' && (
          <>
            {/* Interactive Testbench (Google Cloud Run Style) */}
            <section className="g-card" style={{
              background: 'var(--g-surface-1)',
              border: '1px solid var(--g-border)',
              borderRadius: '16px',
              padding: '18px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={16} color="var(--g-blue)" />
                    <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                      UPI & MULTI-RAIL SCENARIO TESTBENCH
                    </h2>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--g-text-secondary)', margin: '2px 0 0 0' }}>
                    Trigger ambient real-world payment failures or live bank core outages to test proactive AI preemption.
                  </p>
                </div>
                <button
                  onClick={() => setShowCustomModal(true)}
                  className="g-button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--g-blue-container)',
                    border: '1px solid rgba(138, 180, 248, 0.3)',
                    color: 'var(--g-blue)',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <PlusCircle size={13} />
                  <span>Custom Webhook</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                <button
                  onClick={() => triggerSimulation('upi_timeout')}
                  disabled={simulating !== null}
                  className="g-button"
                  style={{
                    ...simBtnStyle,
                    border: isHdfcOutage ? '1px solid rgba(242, 139, 130, 0.4)' : '1px solid var(--g-border)',
                    background: isHdfcOutage ? 'var(--g-red-container)' : 'var(--g-surface-2)'
                  }}
                >
                  <Smartphone size={14} color={isHdfcOutage ? 'var(--g-red)' : 'var(--g-blue)'} />
                  <span>{isHdfcOutage ? '⚡ 1. HDFC Outage ➔ Preemptive Failover' : '1. UPI Timeout (₹499) ➔ ICICI Switch'}</span>
                </button>

                <button
                  onClick={() => triggerSimulation('upi_mandate')}
                  disabled={simulating !== null}
                  className="g-button"
                  style={simBtnStyle}
                >
                  <Clock size={14} color="var(--g-yellow)" />
                  <span>2. AutoPay Mandate (₹299) ➔ Payday Retry</span>
                </button>

                <button
                  onClick={() => triggerSimulation('processor_timeout')}
                  disabled={simulating !== null}
                  className="g-button"
                  style={simBtnStyle}
                >
                  <CreditCard size={14} color="var(--g-green)" />
                  <span>3. RuPay Latency (₹2,490) ➔ Secondary Rail</span>
                </button>

                <button
                  onClick={() => triggerSimulation('stolen_card')}
                  disabled={simulating !== null}
                  className="g-button"
                  style={simBtnStyle}
                >
                  <AlertTriangle size={14} color="var(--g-red)" />
                  <span>4. Stolen Card (₹8,500) ➔ Zero-Loss Abandon</span>
                </button>

                <button
                  onClick={() => triggerSimulation('retry_limit_exceeded')}
                  disabled={simulating !== null}
                  className="g-button"
                  style={simBtnStyle}
                >
                  <ShieldAlert size={14} color="#f43f5e" />
                  <span>5. 16-Day Limit (₹1,999) ➔ Compliance Block</span>
                </button>

                <button
                  onClick={() => triggerSimulation('high_value_hitl')}
                  disabled={simulating !== null}
                  className="g-button"
                  style={{ ...simBtnStyle, border: '1px solid rgba(253, 214, 99, 0.4)', background: 'var(--g-yellow-container)' }}
                >
                  <UserCheck size={14} color="var(--g-yellow)" />
                  <span>6. High-Value (₹14,999) ➔ HITL Review</span>
                </button>
              </div>
            </section>

            {/* Autonomous Audit Stream Feed */}
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} color="var(--g-green)" />
                  <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                    AUTONOMOUS REVENUE AUDIT STREAM
                  </h2>
                  <span className="font-mono" style={{
                    background: 'var(--g-surface-2)',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    color: 'var(--g-text-secondary)',
                    border: '1px solid var(--g-border)'
                  }}>
                    {filteredRecords.length} records
                  </span>
                </div>

                {/* Google Material 3 Filter Chips */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['ALL', 'RECOVERED', 'BLOCKED', 'ABANDONED'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className="g-button"
                      style={{
                        background: filter === f ? 'var(--g-blue)' : 'var(--g-surface-2)',
                        color: filter === f ? '#041e49' : 'var(--g-text-secondary)',
                        border: `1px solid ${filter === f ? 'transparent' : 'var(--g-border)'}`,
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audit Cards Feed */}
              {filteredRecords.length === 0 ? (
                <div style={{
                  background: 'var(--g-surface-1)',
                  border: '1px dashed var(--g-border)',
                  borderRadius: '16px',
                  padding: '44px 20px',
                  textAlign: 'center',
                  color: 'var(--g-text-secondary)'
                }}>
                  <Radio size={32} color="var(--g-text-tertiary)" style={{ marginBottom: '10px', opacity: 0.6 }} />
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                    Listening for ambient webhook events...
                  </div>
                  <p style={{ fontSize: '12px', marginTop: '4px', color: 'var(--g-text-tertiary)' }}>
                    Tap any simulation button above or toggle the HDFC Bank Outage sensor!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredRecords.map((record) => (
                    <AuditCard 
                      key={record.id} 
                      record={record} 
                      hitlMode={hitlMode}
                      activeOverrideId={activeOverrideId}
                      setActiveOverrideId={setActiveOverrideId}
                      onOverride={overrideAction}
                      onOpenToolModal={(type, rec) => setToolModal({ type, record: rec })}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (Google Material 3 Navigation Bar) */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'rgba(30, 31, 32, 0.95)',
        borderTop: '1px solid var(--g-border)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 500
      }}>
        <button
          onClick={() => setActiveTab('RADAR')}
          className="g-button"
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'RADAR' ? 'var(--g-blue)' : 'var(--g-text-tertiary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <div style={{
            background: activeTab === 'RADAR' ? 'var(--g-blue-container)' : 'transparent',
            padding: '3px 14px',
            borderRadius: '9999px'
          }}>
            <Activity size={18} />
          </div>
          <span>RADAR FEED</span>
        </button>

        <button
          onClick={() => setActiveTab('UPI_APP')}
          className="g-button"
          style={{
            background: activeTab === 'UPI_APP' ? 'var(--g-blue-container)' : 'var(--g-surface-2)',
            border: `1px solid ${activeTab === 'UPI_APP' ? 'rgba(138, 180, 248, 0.4)' : 'var(--g-border)'}`,
            color: activeTab === 'UPI_APP' ? 'var(--g-blue)' : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: activeTab === 'UPI_APP' ? '0 0 20px rgba(138, 180, 248, 0.25)' : 'none'
          }}
        >
          <Smartphone size={16} />
          <span>📱 GOOGLE PAY VIEW</span>
        </button>

        <a
          href={`${API_BASE}/api/audit/csv`}
          download="payrevive_audit_report.csv"
          className="g-button"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--g-text-tertiary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          <div style={{ padding: '3px 14px' }}>
            <Download size={18} />
          </div>
          <span>AUDIT CSV</span>
        </a>
      </nav>

      {/* Cross-Tool Dispatch Preview Modal (Google Material Dialog Style) */}
      {toolModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <div style={{
            background: 'var(--g-surface-1)',
            border: '1px solid var(--g-border-hover)',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '440px',
            width: '90%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: 700 }}>
                {toolModal.type === 'WHATSAPP' ? (
                  <>
                    <MessageSquare size={18} color="#25D366" />
                    <span style={{ color: '#25D366' }}>Dispatched Customer WhatsApp Message</span>
                  </>
                ) : (
                  <>
                    <Share2 size={18} color="#E01E5A" />
                    <span style={{ color: '#E01E5A' }}>Dispatched Merchant Slack Incident</span>
                  </>
                )}
              </div>
              <button onClick={() => setToolModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--g-text-tertiary)' }}>
                <X size={18} />
              </button>
            </div>

            {toolModal.type === 'WHATSAPP' ? (
              <div style={{
                background: '#0b141a',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid #202c33'
              }}>
                <div style={{ fontSize: '11px', color: '#8696a0', marginBottom: '8px' }}>
                  To: Customer (+91 98765-XXXXX) • Automated Zero-Prompt Link
                </div>
                <div style={{
                  background: '#005c4b',
                  color: '#e9edef',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  lineHeight: '1.4'
                }}>
                  <div>👋 Hi Rahul, your payment of <b>₹{toolModal.record.transaction.amount}</b> to Swiggy timed out on your primary bank.</div>
                  <div style={{ marginTop: '8px' }}>⚡ PayRevive auto-failover scheduled: Tap below to complete with 1-click UPI (No OTP needed):</div>
                  <div style={{ marginTop: '10px', color: '#53bdeb', textDecoration: 'underline' }}>
                    https://payrevive.ai/pay/{toolModal.record.id}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '10px', color: '#8696a0', marginTop: '6px' }}>Just now • Delivered ✓✓</div>
                </div>
              </div>
            ) : (
              <div style={{
                background: '#1a1d21',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid #383f45'
              }}>
                <div style={{ fontSize: '11px', color: '#9ba1a6', marginBottom: '8px' }}>
                  Channel: #finops-radar-alerts • Bot: PayRevive-Sentinel
                </div>
                <div style={{
                  background: '#222529',
                  borderLeft: '4px solid var(--g-green)',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--g-green)' }}>⚡ REVENUE RECOVERED: ₹{toolModal.record.recovered_amount_usd}</div>
                  <div style={{ color: '#d1d2d3', marginTop: '4px', fontSize: '11px' }}>
                    • Cause: {toolModal.record.diagnosis.root_cause}<br />
                    • Action: {toolModal.record.optimization.chosen_action}<br />
                    • Latency: {toolModal.record.latency_ms}ms • Zero Prompts Required
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setToolModal(null)}
              className="g-button"
              style={{
                width: '100%',
                marginTop: '16px',
                background: 'var(--g-surface-2)',
                color: '#fff',
                border: '1px solid var(--g-border)',
                padding: '10px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close Dispatch Preview
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal for Mobile Phone Access */}
      {showQRModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--g-surface-1)',
            border: '1px solid var(--g-border-hover)',
            borderRadius: '20px',
            padding: '28px',
            maxWidth: '380px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 24px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
                <Smartphone size={18} color="var(--g-blue)" />
                <span>Open App on Mobile</span>
              </div>
              <button onClick={() => setShowQRModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--g-text-tertiary)' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--g-text-secondary)', marginBottom: '18px' }}>
              Scan with your phone camera (on same Wi-Fi) to run the full UPI app on Android or iPhone!
            </p>

            {/* QR Code Image */}
            <div style={{
              background: '#ffffff',
              padding: '14px',
              borderRadius: '16px',
              display: 'inline-block',
              marginBottom: '18px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mobileNetworkUrl)}`}
                alt="Mobile QR Code"
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--g-surface-2)',
              border: '1px solid var(--g-border)',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}>
              <span style={{ color: 'var(--g-blue)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mobileNetworkUrl}</span>
              <button
                onClick={copyMobileUrl}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  marginLeft: '8px'
                }}
              >
                {copiedLink ? <Check size={15} color="var(--g-green)" /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Webhook Inspector Modal */}
      {showCustomModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--g-surface-1)',
            border: '1px solid var(--g-border-hover)',
            borderRadius: '18px',
            padding: '24px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 24px 50px rgba(0,0,0,0.7)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Custom Webhook Payload Tester</div>
              <button onClick={() => setShowCustomModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--g-text-tertiary)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitCustomWebhook} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--g-text-secondary)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  Quick App Presets
                </label>
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
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'rgba(0, 186, 242, 0.15)',
                      border: '1px solid #00baf2',
                      color: '#00baf2',
                      cursor: 'pointer'
                    }}
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
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'rgba(168, 85, 247, 0.15)',
                      border: '1px solid #a855f7',
                      color: '#c084fc',
                      cursor: 'pointer'
                    }}
                  >
                    PhonePe UPI (₹499)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomForm({
                      amount: 499,
                      currency: 'INR',
                      decline_code: 'upi_server_timeout',
                      issuing_bank: 'HDFC Bank (UPI / GPay user@okhdfcbank)',
                      card_network: 'UPI / NPCI',
                      customer_tenure_months: 18,
                      day_of_month: 3
                    })}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'var(--g-blue-container)',
                      border: '1px solid var(--g-blue)',
                      color: 'var(--g-blue)',
                      cursor: 'pointer'
                    }}
                  >
                    Google Pay (₹499)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--g-text-secondary)', fontWeight: 500 }}>Transaction Amount (₹ INR)</label>
                <input
                  type="number"
                  value={customForm.amount}
                  onChange={(e) => setCustomForm({ ...customForm, amount: parseFloat(e.target.value) || 0 })}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--g-text-secondary)', fontWeight: 500 }}>Decline Reason Code</label>
                <select
                  value={customForm.decline_code}
                  onChange={(e) => setCustomForm({ ...customForm, decline_code: e.target.value })}
                  style={inputStyle}
                >
                  <option value="upi_server_timeout">upi_server_timeout (NPCI Gateway Timeout)</option>
                  <option value="upi_mandate_insufficient_funds">upi_mandate_insufficient_funds (UPI AutoPay)</option>
                  <option value="processor_timeout">processor_timeout (Bank Server Drop)</option>
                  <option value="card_expired">card_expired</option>
                  <option value="lost_or_stolen_card">lost_or_stolen_card</option>
                  <option value="do_not_honor">do_not_honor</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--g-text-secondary)', fontWeight: 500 }}>Issuing Bank / Payment App</label>
                <input
                  type="text"
                  value={customForm.issuing_bank}
                  onChange={(e) => setCustomForm({ ...customForm, issuing_bank: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                className="g-button"
                style={{
                  marginTop: '10px',
                  background: 'var(--g-blue)',
                  color: '#041e49',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Dispatch Webhook Event
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: 4-Part Audit Record Card (Google Material 3 Elevation Style)
function AuditCard({ record, hitlMode, activeOverrideId, setActiveOverrideId, onOverride, onOpenToolModal }) {
  const { transaction, diagnosis, optimization, compliance, outcome, recovered_amount_usd, processing_fee_saved_usd, latency_ms, dispatched_tools, hitl_status } = record;

  const isRecovered = outcome === 'RECOVERED' || outcome === 'SCHEDULED';
  const isBlocked = outcome === 'COMPLIANCE_BLOCKED';
  const isAbandoned = outcome === 'ABANDONED_FEES_SAVED';
  const isOverridden = hitl_status === 'OVERRIDDEN_BY_OPERATOR';
  const isPreemptive = optimization.chosen_action === 'PROACTIVE_PREEMPTIVE_FAILOVER';

  return (
    <div className="g-card" style={{
      background: 'var(--g-surface-1)',
      border: `1px solid ${isPreemptive ? 'rgba(56, 189, 248, 0.4)' : isOverridden ? 'rgba(253, 214, 99, 0.4)' : isRecovered ? 'rgba(129, 201, 149, 0.35)' : isBlocked ? 'rgba(242, 139, 130, 0.4)' : 'var(--g-border)'}`,
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: isPreemptive ? '0 6px 24px rgba(56, 189, 248, 0.1)' : isRecovered ? '0 6px 24px rgba(129, 201, 149, 0.06)' : 'none'
    }}>
      {/* Top Banner */}
      <div style={{
        padding: '12px 18px',
        background: isPreemptive ? 'rgba(56, 189, 248, 0.08)' : 'var(--g-surface-2)',
        borderBottom: '1px solid var(--g-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span className="font-mono" style={{
            fontSize: '11px',
            fontWeight: 700,
            background: isPreemptive ? 'var(--g-blue-container)' : 'var(--g-green-container)',
            border: `1px solid ${isPreemptive ? 'rgba(138, 180, 248, 0.3)' : 'rgba(129, 201, 149, 0.3)'}`,
            color: isPreemptive ? 'var(--g-blue)' : 'var(--g-green)',
            padding: '2px 8px',
            borderRadius: '9999px'
          }}>
            #{record.id}
          </span>
          <span className="font-mono" style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 800 }}>
            ₹{transaction.amount.toFixed(2)}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--g-text-secondary)', fontWeight: 500 }}>
            {transaction.issuing_bank}
          </span>
          {isPreemptive && (
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--g-blue)',
              background: 'var(--g-blue-container)',
              border: '1px solid rgba(138, 180, 248, 0.4)',
              padding: '2px 8px',
              borderRadius: '9999px'
            }}>
              🛡️ PREEMPTIVE SENSOR FAILOVER
            </span>
          )}
          {isOverridden && (
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--g-yellow)',
              background: 'var(--g-yellow-container)',
              border: '1px solid rgba(253, 214, 99, 0.3)',
              padding: '2px 8px',
              borderRadius: '9999px'
            }}>
              OPERATOR OVERRIDE
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Operator Override Button */}
          {activeOverrideId === record.id ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select
                onChange={(e) => {
                  if (e.target.value) onOverride(record.id, e.target.value);
                }}
                defaultValue=""
                style={{
                  background: 'var(--g-surface-3)',
                  color: 'var(--g-yellow)',
                  border: '1px solid var(--g-yellow)',
                  fontSize: '11px',
                  borderRadius: '6px',
                  padding: '3px 6px',
                  outline: 'none'
                }}
              >
                <option value="" disabled>Select Action...</option>
                <option value="INSTANT_REROUTE_BACKUP_GATEWAY">Force Switch to ICICI Rail</option>
                <option value="SCHEDULE_SMART_PAYDAY_RETRY">Schedule for Payday (+1)</option>
                <option value="ABANDON_NO_RETRY">Abort & Save Fee</option>
                <option value="AUTO_CARD_UPDATER">Token Card Updater</option>
              </select>
              <button 
                onClick={() => setActiveOverrideId(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--g-text-tertiary)', cursor: 'pointer', fontSize: '12px' }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveOverrideId(record.id)}
              className="g-button"
              title="Challenge HITL: Intervene and manually override AI decision"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--g-surface-3)',
                border: '1px solid var(--g-border)',
                color: 'var(--g-yellow)',
                padding: '4px 10px',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              <Settings size={12} />
              <span>Override</span>
            </button>
          )}

          <span className="font-mono" style={{ fontSize: '11px', color: 'var(--g-blue)' }}>
            ⚡ {latency_ms}ms
          </span>
          <span className="font-mono" style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '9999px',
            background: isRecovered ? 'var(--g-green-container)' : isBlocked ? 'var(--g-red-container)' : 'var(--g-blue-container)',
            color: isRecovered ? 'var(--g-green)' : isBlocked ? 'var(--g-red)' : 'var(--g-blue)',
            border: `1px solid ${isRecovered ? 'rgba(129, 201, 149, 0.4)' : isBlocked ? 'rgba(242, 139, 130, 0.4)' : 'rgba(138, 180, 248, 0.4)'}`
          }}>
            {outcome}
          </span>
        </div>
      </div>

      {/* The 4-Part System Grid (Elevated Material 3 Cards) */}
      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
        {/* Part 1: Failure Trigger & Telemetry */}
        <div style={stepBoxStyle}>
          <div style={stepHeaderStyle}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--g-yellow)' }}>01 // AMBIENT TRIGGER</span>
            <AlertCircle size={14} color="var(--g-yellow)" />
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
            {transaction.decline_code.toUpperCase()}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--g-text-secondary)', margin: '4px 0 8px 0', lineHeight: '1.4' }}>
            {transaction.decline_message}
          </p>
          <div className="font-mono" style={{ fontSize: '10px', color: 'var(--g-text-tertiary)', marginTop: 'auto' }}>
            Rail: {transaction.card_network} • Day {transaction.day_of_month}
          </div>
        </div>

        {/* Part 2: XGBoost + SHAP Diagnosis */}
        <div style={stepBoxStyle}>
          <div style={stepHeaderStyle}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--g-blue)' }}>02 // SHAP DIAGNOSIS</span>
            <Cpu size={14} color="var(--g-blue)" />
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--g-text-secondary)', marginTop: '4px' }}>
            Root Cause:
          </div>
          <p style={{ fontSize: '11px', color: '#f8fafc', margin: '2px 0 6px 0', fontWeight: 500 }}>
            {diagnosis.root_cause}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--g-text-tertiary)' }}>P(Recovery):</span>
            <span className="font-mono" style={{ fontSize: '12px', fontWeight: 800, color: diagnosis.recovery_probability > 0.5 ? 'var(--g-green)' : 'var(--g-red)' }}>
              {(diagnosis.recovery_probability * 100).toFixed(1)}%
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {diagnosis.shap_attributions.slice(0, 2).map((s, idx) => (
              <div key={idx} className="font-mono" style={{
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: s.shap_value > 0 ? 'var(--g-green-container)' : 'var(--g-red-container)',
                border: `1px solid ${s.shap_value > 0 ? 'rgba(129, 201, 149, 0.25)' : 'rgba(242, 139, 130, 0.25)'}`,
                color: s.shap_value > 0 ? 'var(--g-green)' : 'var(--g-red)'
              }}>
                {s.shap_value > 0 ? `+${(s.shap_value * 100).toFixed(0)}%` : `${(s.shap_value * 100).toFixed(0)}%`} {s.feature}: {s.description.slice(0, 32)}...
              </div>
            ))}
          </div>
        </div>

        {/* Part 3: Multi-Armed Bandit Action */}
        <div style={stepBoxStyle}>
          <div style={stepHeaderStyle}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc' }}>03 // BANDIT ACTION</span>
            <TrendingUp size={14} color="#c084fc" />
          </div>
          <div style={{ marginTop: '4px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              background: isPreemptive ? 'var(--g-blue-container)' : 'rgba(192, 132, 252, 0.14)',
              border: `1px solid ${isPreemptive ? 'rgba(138, 180, 248, 0.4)' : 'rgba(192, 132, 252, 0.3)'}`,
              color: isPreemptive ? 'var(--g-blue)' : '#c084fc',
              padding: '2px 8px',
              borderRadius: '9999px',
              display: 'inline-block'
            }}>
              {optimization.chosen_action}
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--g-text-secondary)', margin: '6px 0', lineHeight: '1.4' }}>
            {optimization.action_reasoning}
          </p>
          <div className="font-mono" style={{ fontSize: '11px', color: 'var(--g-green)', fontWeight: 700, marginTop: 'auto' }}>
            Expected Net ROI: +₹{optimization.expected_recovery_value_usd.toFixed(2)}
          </div>
        </div>

        {/* Part 4: Compliance Guardrails & Outcome */}
        <div style={stepBoxStyle}>
          <div style={stepHeaderStyle}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: isRecovered ? 'var(--g-green)' : isBlocked ? 'var(--g-red)' : 'var(--g-blue)' }}>
              04 // REGULATORY OUTCOME
            </span>
            <ShieldCheck size={14} color={isRecovered ? 'var(--g-green)' : isBlocked ? 'var(--g-red)' : 'var(--g-blue)'} />
          </div>

          <div style={{ fontSize: '11px', color: compliance.status === 'APPROVED' ? 'var(--g-green)' : 'var(--g-red)', fontWeight: 600, margin: '4px 0 2px 0' }}>
            {compliance.status === 'APPROVED' ? '✓ Network Rules Cleared' : '✕ Action Blocked'}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--g-text-tertiary)', margin: '2px 0 6px 0', lineHeight: '1.3' }}>
            {compliance.reason}
          </p>

          <div style={{
            marginTop: 'auto',
            padding: '8px 10px',
            background: 'var(--g-surface-1)',
            borderRadius: '8px',
            border: '1px solid var(--g-border)'
          }}>
            {isRecovered ? (
              <div className="font-mono" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--g-green)' }}>
                🎉 Recovered: +₹{recovered_amount_usd.toFixed(2)}
              </div>
            ) : isAbandoned ? (
              <div className="font-mono" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--g-blue)' }}>
                🛡️ Preserved Fees: +₹{(processing_fee_saved_usd * 85).toFixed(0)}
              </div>
            ) : (
              <div className="font-mono" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--g-red)' }}>
                🚫 Regulatory Block Triggered
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Challenge Feature: Cross-Tool Action Dispatch */}
      {dispatched_tools && dispatched_tools.length > 0 && (
        <div style={{
          padding: '10px 18px',
          background: 'var(--g-surface-2)',
          borderTop: '1px solid var(--g-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          fontSize: '11px'
        }}>
          <span style={{ color: 'var(--g-text-secondary)', fontWeight: 700, fontSize: '10px' }}>
            DISPATCHED TOOLS:
          </span>
          {dispatched_tools.map((tool, idx) => {
            const isWhatsApp = tool.toLowerCase().includes('whatsapp');
            const isSlack = tool.toLowerCase().includes('slack');

            return (
              <span 
                key={idx} 
                onClick={() => {
                  if (isWhatsApp) onOpenToolModal('WHATSAPP', record);
                  if (isSlack) onOpenToolModal('SLACK', record);
                }}
                className="g-button"
                style={{
                  background: isWhatsApp ? 'rgba(37, 211, 102, 0.14)' : isSlack ? 'rgba(224, 30, 90, 0.14)' : 'var(--g-blue-container)',
                  border: `1px solid ${isWhatsApp ? '#25D366' : isSlack ? '#E01E5A' : 'rgba(138, 180, 248, 0.3)'}`,
                  color: isWhatsApp ? '#25D366' : isSlack ? '#E01E5A' : 'var(--g-blue)',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: (isWhatsApp || isSlack) ? 'pointer' : 'default'
                }}
              >
                {isWhatsApp ? <MessageSquare size={12} color="#25D366" /> :
                 isSlack ? <Share2 size={12} color="#E01E5A" /> :
                 <Zap size={11} color="var(--g-blue)" />}
                <span>{tool} {(isWhatsApp || isSlack) && '🔍'}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Styling Constants (Google Material 3 Theme)
const metricCardStyle = {
  background: 'var(--g-surface-1)',
  border: '1px solid var(--g-border)',
  borderRadius: '16px',
  padding: '18px 20px',
};

const simBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  background: 'var(--g-surface-2)',
  border: '1px solid var(--g-border)',
  color: '#f8fafc',
  padding: '10px 14px',
  borderRadius: '12px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600,
  textAlign: 'left'
};

const stepBoxStyle = {
  background: 'var(--g-surface-2)',
  border: '1px solid var(--g-border)',
  borderRadius: '12px',
  padding: '14px',
  display: 'flex',
  flexDirection: 'column'
};

const stepHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '4px'
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  background: 'var(--g-surface-2)',
  border: '1px solid var(--g-border)',
  borderRadius: '10px',
  color: '#fff',
  marginTop: '4px',
  fontSize: '13px',
  outline: 'none'
};
