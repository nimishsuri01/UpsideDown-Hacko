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
  UserCheck
} from 'lucide-react';

const API_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';
const WS_URL = typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws` : 'ws://localhost:8000/ws';

// Synthetic Web Audio Chime on Autonomous Recovery (Zero external MP3 dependency)
function playRecoveryChime() {
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

  // Challenge Features: Human-in-the-Loop & Override
  const [hitlMode, setHitlMode] = useState(false);
  const [activeOverrideId, setActiveOverrideId] = useState(null);

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
          } else if (data.type === 'NEW_RECOVERY_EVENT') {
            setMetrics(data.metrics || {});
            setAuditRecords((prev) => [data.record, ...prev]);
            if (data.record.outcome === 'RECOVERED' || data.record.outcome === 'SCHEDULED') {
              playRecoveryChime();
            }
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
  }, []);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Top Header Bar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Brand & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
          }}>
            <Zap size={20} color="#000" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>
                PAYREVIVE
              </h1>
              <span className="font-mono" style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                color: '#10b981'
              }}>
                PS-02 : ZERO-PROMPT AI
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
              Autonomous Revenue Recovery • Mobile UPI & Multi-Rail Sentinel
            </p>
          </div>
        </div>

        {/* Ambient Controls, HITL Mode, QR Code & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Human-in-the-Loop Control Switch (Challenge Requirement) */}
          <button
            onClick={toggleHitlMode}
            title="Toggle between 100% Autonomous AI and Supervised Human-in-the-Loop Mode"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: hitlMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.12)',
              border: `1px solid ${hitlMode ? '#f59e0b' : '#10b981'}`,
              color: hitlMode ? '#f59e0b' : '#10b981',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '11px'
            }}
          >
            {hitlMode ? <UserCheck size={14} /> : <ShieldCheck size={14} />}
            <span>{hitlMode ? 'SUPERVISED (HITL ON)' : '100% AUTONOMOUS AI'}</span>
          </button>

          {/* Mobile Connect / QR Code Button */}
          <button
            onClick={() => setShowQRModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid #06b6d4',
              color: '#06b6d4',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '11px'
            }}
          >
            <Smartphone size={14} />
            <span>OPEN ON PHONE (QR)</span>
          </button>

          {/* Continuous Traffic Generator Button */}
          <button
            onClick={toggleTraffic}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: trafficRunning ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${trafficRunning ? '#ef4444' : '#10b981'}`,
              color: trafficRunning ? '#ef4444' : '#10b981',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '11px'
            }}
          >
            {trafficRunning ? <Square size={13} fill="#ef4444" /> : <Play size={13} fill="#10b981" />}
            <span>{trafficRunning ? 'STOP' : 'LIVE STREAM'}</span>
          </button>

          {/* Download CSV */}
          <a
            href={`${API_BASE}/api/audit/csv`}
            download="payrevive_audit_report.csv"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              padding: '6px 10px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            <Download size={13} />
            <span>CSV</span>
          </a>

          {/* Live WebSocket Status Dot */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: connected ? '#10b981' : '#ef4444',
            padding: '5px 8px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: connected ? '#10b981' : '#ef4444',
              boxShadow: connected ? '0 0 8px #10b981' : 'none'
            }} />
            <span className="font-mono">{connected ? 'ONLINE' : 'RECONNECTING'}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '16px 20px', maxWidth: '1440px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* Ambient Gateway & Bank Telemetry Sensor (Reacts to State Changes) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          padding: '8px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '11px',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 700 }}>
            <Activity size={14} color="#38bdf8" />
            <span>AMBIENT SENSOR:</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
              NPCI UPI Switch: <b>99.8% Optimal (110ms)</b>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span>
              HDFC Core UPI: <b>CRITICAL OUTAGE (1850ms)</b> ➔ AI Auto-Reroute to ICICI
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
              ICICI Backup Rail: <b>READY (85ms)</b>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#38bdf8' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }}></span>
              Razorpay Gateway: <b>99.4% Active</b>
            </span>
          </div>
        </div>

        {/* 4 Metric Counter Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          {/* Revenue at Risk */}
          <div style={metricCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px' }}>
              <span>REVENUE AT RISK</span>
              <AlertCircle size={15} color="#ef4444" />
            </div>
            <div className="font-mono" style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: '#ef4444' }}>
              ₹{metrics.total_at_risk_usd ? metrics.total_at_risk_usd.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
              From {metrics.total_events || 0} failed mobile/card events
            </div>
          </div>

          {/* Autonomous Recovered */}
          <div style={{ ...metricCardStyle, border: '1px solid rgba(16, 185, 129, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontSize: '11px' }}>
              <span>AUTONOMOUS RECOVERED</span>
              <Banknote size={15} color="#10b981" />
            </div>
            <div className="font-mono" style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: '#10b981' }}>
              ₹{metrics.total_recovered_usd ? metrics.total_recovered_usd.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
            </div>
            <div style={{ fontSize: '10px', color: '#10b981', marginTop: '4px' }}>
              Recovered instantly via AI routing
            </div>
          </div>

          {/* Fees Saved */}
          <div style={metricCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px' }}>
              <span>INTERCHANGE FEES SAVED</span>
              <PiggyBank size={15} color="#06b6d4" />
            </div>
            <div className="font-mono" style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: '#06b6d4' }}>
              ₹{metrics.total_fees_saved_usd ? (metrics.total_fees_saved_usd * 85).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {metrics.compliance_blocks || 0} compliance blocks enforced
            </div>
          </div>

          {/* Net Recovery Rate */}
          <div style={metricCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px' }}>
              <span>NET RECOVERY EFFICIENCY</span>
              <TrendingUp size={15} color="#a855f7" />
            </div>
            <div className="font-mono" style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: '#a855f7' }}>
              {metrics.recovery_rate_pct ? metrics.recovery_rate_pct.toFixed(1) : '0.0'}%
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Zero-Prompt Multi-Armed Bandit
            </div>
          </div>
        </div>

        {/* Interactive Ambient Simulation Bar */}
        <section style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-active)',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} color="#10b981" />
                <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                  MOBILE UPI & MULTI-RAIL TESTBENCH (JUDGES DEMO)
                </h2>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
                Click below to simulate real mobile UPI timeouts, mandate drops, card blocks, or high-value HITL review.
              </p>
            </div>
            <button
              onClick={() => setShowCustomModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid #06b6d4',
                color: '#06b6d4',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <PlusCircle size={13} />
              <span>CUSTOM WEBHOOK</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
            <button
              onClick={() => triggerSimulation('upi_timeout')}
              disabled={simulating !== null}
              style={simBtnStyle}
            >
              <Smartphone size={15} color="#06b6d4" />
              <span>📱 1. UPI Timeout (₹499) ➔ ICICI Switch</span>
            </button>

            <button
              onClick={() => triggerSimulation('upi_mandate')}
              disabled={simulating !== null}
              style={simBtnStyle}
            >
              <Clock size={15} color="#f59e0b" />
              <span>📱 2. UPI AutoPay (₹299) ➔ Payday Retry</span>
            </button>

            <button
              onClick={() => triggerSimulation('processor_timeout')}
              disabled={simulating !== null}
              style={simBtnStyle}
            >
              <CreditCard size={15} color="#10b981" />
              <span>💳 3. RuPay Drop (₹2,490) ➔ Secondary Rail</span>
            </button>

            <button
              onClick={() => triggerSimulation('stolen_card')}
              disabled={simulating !== null}
              style={simBtnStyle}
            >
              <AlertTriangle size={15} color="#ef4444" />
              <span>🚨 4. Stolen Card (₹8,500) ➔ Zero-Loss Abandon</span>
            </button>

            <button
              onClick={() => triggerSimulation('retry_limit_exceeded')}
              disabled={simulating !== null}
              style={simBtnStyle}
            >
              <ShieldAlert size={15} color="#f43f5e" />
              <span>🚫 5. 16-Day Limit (₹1,999) ➔ Compliance Block</span>
            </button>

            {/* High-Value HITL Demo */}
            <button
              onClick={() => triggerSimulation('high_value_hitl')}
              disabled={simulating !== null}
              style={{ ...simBtnStyle, border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.08)' }}
            >
              <UserCheck size={15} color="#f59e0b" />
              <span>👑 6. High-Value (₹14,999) ➔ HITL Review</span>
            </button>
          </div>
        </section>

        {/* Autonomous Audit Stream Section */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="#10b981" />
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                AUTONOMOUS REVENUE AUDIT STREAM
              </h2>
              <span className="font-mono" style={{
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '10px',
                color: 'var(--text-muted)'
              }}>
                {filteredRecords.length} records
              </span>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'RECOVERED', 'BLOCKED', 'ABANDONED'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    background: filter === f ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: filter === f ? '#000' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontSize: '10px',
                    fontWeight: 700,
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
              background: 'var(--bg-card)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: '8px',
              padding: '40px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              <Radio size={32} color="var(--text-muted)" style={{ marginBottom: '8px', opacity: 0.5 }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                Waiting for mobile webhook event...
              </div>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>
                Tap any test button above or scan the QR code to test on mobile!
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
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* QR Code Modal for Mobile Phone Access */}
      {showQRModal && (
        <div style={{
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
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-active)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '380px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
                <Smartphone size={18} color="#06b6d4" />
                <span>Open Live on Mobile Phone</span>
              </div>
              <button onClick={() => setShowQRModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Scan this QR code with your phone camera (connect to same Wi-Fi) to watch PayRevive live on your smartphone!
            </p>

            {/* QR Code Image */}
            <div style={{
              background: '#ffffff',
              padding: '12px',
              borderRadius: '8px',
              display: 'inline-block',
              marginBottom: '16px'
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mobileNetworkUrl)}`}
                alt="Mobile QR Code"
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid var(--border-subtle)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}>
              <span style={{ color: '#06b6d4', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mobileNetworkUrl}</span>
              <button
                onClick={copyMobileUrl}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  marginLeft: '8px'
                }}
              >
                {copiedLink ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
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
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-active)',
            borderRadius: '10px',
            padding: '20px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>Custom Mobile/Card Webhook Inspector</div>
              <button onClick={() => setShowCustomModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitCustomWebhook} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Amount (₹ INR)</label>
                <input
                  type="number"
                  value={customForm.amount}
                  onChange={(e) => setCustomForm({ ...customForm, amount: parseFloat(e.target.value) || 0 })}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Decline Code</label>
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
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Issuing Bank / App</label>
                <input
                  type="text"
                  value={customForm.issuing_bank}
                  onChange={(e) => setCustomForm({ ...customForm, issuing_bank: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Payment Rail</label>
                  <select
                    value={customForm.card_network}
                    onChange={(e) => setCustomForm({ ...customForm, card_network: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="UPI / NPCI">UPI / NPCI</option>
                    <option value="RUPAY">RUPAY</option>
                    <option value="VISA">VISA</option>
                    <option value="MASTERCARD">MASTERCARD</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Day of Month (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={customForm.day_of_month}
                    onChange={(e) => setCustomForm({ ...customForm, day_of_month: parseInt(e.target.value) || 1 })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '10px',
                  background: 'var(--accent-primary)',
                  color: '#000',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Trigger Failed Webhook
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '14px 20px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.95)',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        <div>PayRevive • Built for <strong>UPSIDE DOWN.EXE</strong> (GNDU TSS)</div>
        <div className="font-mono" style={{ color: '#10b981' }}>
          MOBILE-READY • ZERO CHATBOX • CROSS-TOOL DISPATCH • HUMAN-IN-THE-LOOP
        </div>
      </footer>
    </div>
  );
}

// Subcomponent: 4-Part Audit Record Card with Cross-Tool Dispatch & Human-in-the-Loop Override
function AuditCard({ record, hitlMode, activeOverrideId, setActiveOverrideId, onOverride }) {
  const { transaction, diagnosis, optimization, compliance, outcome, recovered_amount_usd, processing_fee_saved_usd, latency_ms, dispatched_tools, hitl_status } = record;

  const isRecovered = outcome === 'RECOVERED' || outcome === 'SCHEDULED';
  const isBlocked = outcome === 'COMPLIANCE_BLOCKED';
  const isAbandoned = outcome === 'ABANDONED_FEES_SAVED';
  const isOverridden = hitl_status === 'OVERRIDDEN_BY_OPERATOR';

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${isOverridden ? '#f59e0b' : isRecovered ? 'rgba(16, 185, 129, 0.35)' : isBlocked ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)'}`,
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: isRecovered ? '0 4px 20px rgba(16, 185, 129, 0.05)' : 'none'
    }}>
      {/* Top Banner */}
      <div style={{
        padding: '10px 16px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="font-mono" style={{
            fontSize: '10px',
            fontWeight: 700,
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            color: '#10b981',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            #{record.id}
          </span>
          <span className="font-mono" style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700 }}>
            ₹{transaction.amount.toFixed(2)}
          </span>
          <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {transaction.issuing_bank}
          </span>
          {isOverridden && (
            <span className="font-mono" style={{
              fontSize: '10px',
              color: '#f59e0b',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid #f59e0b',
              padding: '1px 6px',
              borderRadius: '3px'
            }}>
              👤 OPERATOR OVERRIDE
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Operator Override / HITL Action Trigger */}
          {activeOverrideId === record.id ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select
                onChange={(e) => {
                  if (e.target.value) onOverride(record.id, e.target.value);
                }}
                defaultValue=""
                style={{
                  background: '#0f172a',
                  color: '#f59e0b',
                  border: '1px solid #f59e0b',
                  fontSize: '10px',
                  borderRadius: '4px',
                  padding: '2px 4px'
                }}
              >
                <option value="" disabled>Select Override Action...</option>
                <option value="INSTANT_REROUTE_BACKUP_GATEWAY">⚡ Force Switch to ICICI Rail</option>
                <option value="SCHEDULE_SMART_PAYDAY_RETRY">📅 Schedule for Payday (+1)</option>
                <option value="ABANDON_NO_RETRY">🛡️ Abort & Save Fee</option>
                <option value="AUTO_CARD_UPDATER">🔄 Token Card Updater</option>
              </select>
              <button 
                onClick={() => setActiveOverrideId(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '11px' }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveOverrideId(record.id)}
              title="Challenge HITL: Intervene and manually override AI decision"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#f59e0b',
                padding: '2px 7px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 700
              }}
            >
              <Settings size={11} />
              <span>OVERRIDE</span>
            </button>
          )}

          <span className="font-mono" style={{ fontSize: '10px', color: '#06b6d4' }}>
            ⚡ {latency_ms}ms
          </span>
          <span className="font-mono" style={{
            fontSize: '10px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '4px',
            background: isRecovered ? 'rgba(16, 185, 129, 0.15)' : isBlocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(6, 182, 212, 0.15)',
            color: isRecovered ? '#10b981' : isBlocked ? '#ef4444' : '#06b6d4',
            border: `1px solid ${isRecovered ? '#10b981' : isBlocked ? '#ef4444' : '#06b6d4'}`
          }}>
            {outcome}
          </span>
        </div>
      </div>

      {/* The 4-Part System Grid */}
      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {/* Part 1: Failure Trigger & Telemetry */}
        <div style={stepBoxStyle}>
          <div style={stepHeaderStyle}>
            <span className="font-mono" style={{ fontSize: '10px', color: '#f59e0b' }}>01 // TRIGGER</span>
            <AlertCircle size={14} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
            {transaction.decline_code.toUpperCase()}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0' }}>
            {transaction.decline_message}
          </p>
          <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 'auto' }}>
            Rail: {transaction.card_network} • Day {transaction.day_of_month}
          </div>
        </div>

        {/* Part 2: XGBoost + SHAP Diagnosis */}
        <div style={stepBoxStyle}>
          <div style={stepHeaderStyle}>
            <span className="font-mono" style={{ fontSize: '10px', color: '#06b6d4' }}>02 // SHAP DIAGNOSIS</span>
            <Cpu size={14} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
            Root Cause:
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 6px 0' }}>
            {diagnosis.root_cause}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>P(Rec):</span>
            <span className="font-mono" style={{ fontSize: '11px', fontWeight: 700, color: diagnosis.recovery_probability > 0.5 ? '#10b981' : '#ef4444' }}>
              {(diagnosis.recovery_probability * 100).toFixed(1)}%
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {diagnosis.shap_attributions.slice(0, 2).map((s, idx) => (
              <div key={idx} className="font-mono" style={{
                fontSize: '9px',
                padding: '2px 5px',
                borderRadius: '3px',
                background: s.shap_value > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${s.shap_value > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: s.shap_value > 0 ? '#10b981' : '#ef4444'
              }}>
                {s.shap_value > 0 ? `+${(s.shap_value * 100).toFixed(0)}%` : `${(s.shap_value * 100).toFixed(0)}%`} {s.feature}: {s.description.slice(0, 40)}...
              </div>
            ))}
          </div>
        </div>

        {/* Part 3: Multi-Armed Bandit Action */}
        <div style={stepBoxStyle}>
          <div style={stepHeaderStyle}>
            <span className="font-mono" style={{ fontSize: '10px', color: '#a855f7' }}>03 // BANDIT ACTION</span>
            <TrendingUp size={14} color="#a855f7" />
          </div>
          <div style={{ marginTop: '2px' }}>
            <span className="font-mono" style={{
              fontSize: '10px',
              fontWeight: 700,
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid #a855f7',
              color: '#a855f7',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {optimization.chosen_action}
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '6px 0' }}>
            {optimization.action_reasoning}
          </p>
          <div className="font-mono" style={{ fontSize: '10px', color: '#10b981', marginTop: 'auto' }}>
            Expected ROI: +₹{optimization.expected_recovery_value_usd.toFixed(2)}
          </div>
        </div>

        {/* Part 4: Compliance Guardrails & Outcome */}
        <div style={stepBoxStyle}>
          <div style={stepHeaderStyle}>
            <span className="font-mono" style={{ fontSize: '10px', color: isRecovered ? '#10b981' : isBlocked ? '#ef4444' : '#06b6d4' }}>
              04 // COMPLIANCE & OUTCOME
            </span>
            <ShieldCheck size={14} color={isRecovered ? '#10b981' : isBlocked ? '#ef4444' : '#06b6d4'} />
          </div>

          <div style={{ fontSize: '11px', color: compliance.status === 'APPROVED' ? '#10b981' : '#ef4444', fontWeight: 600, margin: '2px 0' }}>
            {compliance.status === 'APPROVED' ? '✓ Network Rules Cleared' : '✕ Action Blocked'}
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '2px 0 6px 0' }}>
            {compliance.reason}
          </p>

          <div style={{
            marginTop: 'auto',
            padding: '6px',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            {isRecovered ? (
              <div className="font-mono" style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>
                🎉 Recovered: +₹{recovered_amount_usd.toFixed(2)}
              </div>
            ) : isAbandoned ? (
              <div className="font-mono" style={{ fontSize: '11px', fontWeight: 700, color: '#06b6d4' }}>
                🛡️ Preserved Fees: +₹{(processing_fee_saved_usd * 85).toFixed(0)}
              </div>
            ) : (
              <div className="font-mono" style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>
                🚫 Regulatory Block Triggered
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Challenge Feature: Cross-Tool Action Dispatch */}
      {dispatched_tools && dispatched_tools.length > 0 && (
        <div style={{
          padding: '8px 16px',
          background: 'rgba(0, 0, 0, 0.45)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          fontSize: '11px'
        }}>
          <span className="font-mono" style={{ color: '#06b6d4', fontWeight: 700, fontSize: '10px' }}>
            CROSS-TOOL DISPATCH:
          </span>
          {dispatched_tools.map((tool, idx) => (
            <span key={idx} className="font-mono" style={{
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              color: '#38bdf8',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Zap size={10} color="#38bdf8" />
              <span>{tool}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Styling Constants
const metricCardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '8px',
  padding: '14px',
};

const simBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-main)',
  padding: '8px 12px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600,
  transition: 'all 0.15s ease'
};

const stepBoxStyle = {
  background: 'rgba(0, 0, 0, 0.35)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '6px',
  padding: '12px',
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
  padding: '8px 10px',
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '6px',
  color: '#fff',
  marginTop: '3px',
  fontSize: '12px',
  outline: 'none'
};
