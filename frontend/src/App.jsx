import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  RotateCcw, 
  CreditCard, 
  Cpu, 
  Activity, 
  ArrowRight, 
  ExternalLink, 
  Radio, 
  Layers, 
  SlidersHorizontal,
  Banknote,
  PiggyBank,
  AlertTriangle
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws';

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
  const [simulating, setSimulating] = useState(null);
  const [filter, setFilter] = useState('ALL');
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
          } else if (data.type === 'NEW_RECOVERY_EVENT') {
            setMetrics(data.metrics || {});
            setAuditRecords((prev) => [data.record, ...prev]);
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

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

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

  const filteredRecords = auditRecords.filter((rec) => {
    if (filter === 'RECOVERED') return rec.outcome === 'RECOVERED' || rec.outcome === 'SCHEDULED';
    if (filter === 'BLOCKED') return rec.outcome === 'COMPLIANCE_BLOCKED';
    if (filter === 'FEES_SAVED') return rec.outcome === 'ABANDONED_FEES_SAVED';
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Top Header */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.9)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(12px)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            padding: '10px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)'
          }}>
            <Banknote size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>
                PAY<span style={{ color: '#10b981' }}>REVIVE</span>
              </h1>
              <span className="font-mono" style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                color: '#10b981'
              }}>
                PS-02 : ZERO-PROMPT AI
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              Autonomous AI Payment Recovery Engine • XGBoost + Bandit + Compliance Filter
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '6px 14px',
            borderRadius: '20px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connected ? '#10b981' : '#ef4444',
              boxShadow: connected ? '0 0 8px #10b981' : '0 0 8px #ef4444'
            }} />
            <span className="font-mono" style={{ fontSize: '12px', color: connected ? '#f0fdf4' : '#fecaca' }}>
              {connected ? 'WEBHOOK BUS LIVE (0 PROMPTS)' : 'CONNECTING...'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '28px 24px', flex: 1 }}>
        {/* Real Financial Metrics Cards */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}>
          {/* Card 1: Revenue at Risk */}
          <div style={metricCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>FAILED AT RISK</span>
              <AlertCircle size={18} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#f59e0b' }}>
              ${metrics.total_at_risk_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {metrics.total_events} failed payment webhooks ingested
            </div>
          </div>

          {/* Card 2: Revenue Recovered */}
          <div style={metricCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>RECOVERED REVENUE</span>
              <DollarSign size={18} color="#10b981" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#10b981' }}>
              ${metrics.total_recovered_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
              ✦ Saved from customer involuntary churn
            </div>
          </div>

          {/* Card 3: Processing Fees Saved */}
          <div style={metricCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PROCESSING FEES SAVED</span>
              <PiggyBank size={18} color="#06b6d4" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#06b6d4' }}>
              ${metrics.total_fees_saved_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Avoided hopeless card retry fees ($0.35/tx)
            </div>
          </div>

          {/* Card 4: Autonomous Recovery Rate */}
          <div style={metricCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>AUTONOMOUS RECOVERY RATE</span>
              <TrendingUp size={18} color="#a855f7" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#a855f7' }}>
              {metrics.recovery_rate_pct}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Bandit optimized expected value
            </div>
          </div>
        </section>

        {/* Judges Live Testbench (Simulation Bar) */}
        <section style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-active)',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="#10b981" />
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  WEBHOOK SIMULATOR & TESTBENCH (JUDGES LIVE DEMO)
                </h2>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
                Simulate real gateway webhooks to watch XGBoost + SHAP, Bandit action optimization, and Compliance guardrails in action.
              </p>
            </div>
            <span className="font-mono" style={{ fontSize: '11px', color: '#10b981' }}>
              ● 100% EVENT-DRIVEN • NO HUMAN PROMPT
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => triggerSimulation('processor_timeout')}
              disabled={simulating !== null}
              style={simBtnStyle}
            >
              <Zap size={15} color="#06b6d4" />
              <span>1. Gateway Timeout ($249) ➔ Reroute Rail</span>
            </button>

            <button
              onClick={() => triggerSimulation('insufficient_funds')}
              disabled={simulating !== null}
              style={simBtnStyle}
            >
              <Clock size={15} color="#f59e0b" />
              <span>2. Insufficient Funds ($89) ➔ Payday Scheduler</span>
            </button>

            <button
              onClick={() => triggerSimulation('card_expired')}
              disabled={simulating !== null}
              style={simBtnStyle}
            >
              <CreditCard size={15} color="#10b981" />
              <span>3. Card Expired ($199) ➔ Auto Token Updater</span>
            </button>

            <button
              onClick={() => triggerSimulation('stolen_card')}
              disabled={simulating !== null}
              style={simBtnStyle}
            >
              <AlertTriangle size={15} color="#ef4444" />
              <span>4. Stolen Card ($550) ➔ Zero-Loss Abandon</span>
            </button>

            <button
              onClick={() => triggerSimulation('retry_limit_exceeded')}
              disabled={simulating !== null}
              style={simBtnStyle}
            >
              <ShieldAlert size={15} color="#f43f5e" />
              <span>5. 16-Day Limit ($140) ➔ Compliance Block</span>
            </button>
          </div>
        </section>

        {/* Autonomous Audit Stream Section */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={18} color="#10b981" />
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                AUTONOMOUS AUDIT TRAIL & RECOVERY STREAM
              </h2>
              <span className="font-mono" style={{
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                color: 'var(--text-muted)'
              }}>
                {filteredRecords.length} AUDIT RECORDS
              </span>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'RECOVERED', 'FEES_SAVED', 'BLOCKED'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  style={{
                    background: filter === tab ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                    border: '1px solid ' + (filter === tab ? '#10b981' : 'var(--border-subtle)'),
                    color: filter === tab ? '#10b981' : 'var(--text-muted)',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: '8px',
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              <Radio size={36} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.5 }} />
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
                Waiting for payment failure webhook...
              </div>
              <p style={{ fontSize: '13px', marginTop: '6px' }}>
                Click any of the 5 simulation buttons above to trigger an autonomous recovery chain.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredRecords.map((record) => (
                <AuditCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '16px 32px',
        fontSize: '12px',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.95)'
      }}>
        <div>PayRevive • Built for <strong>UPSIDE DOWN.EXE</strong> Hackathon (GNDU TSS)</div>
        <div className="font-mono" style={{ color: '#10b981' }}>
          ZERO CHATBOX • 100% AUDITABLE AUTONOMOUS REVENUE RECOVERY
        </div>
      </footer>
    </div>
  );
}

// Subcomponent: 4-Part Audit Record Card
function AuditCard({ record }) {
  const { transaction, diagnosis, optimization, compliance, outcome, recovered_amount_usd, processing_fee_saved_usd, latency_ms } = record;

  const isRecovered = outcome === 'RECOVERED' || outcome === 'SCHEDULED';
  const isBlocked = outcome === 'COMPLIANCE_BLOCKED';
  const isAbandoned = outcome === 'ABANDONED_FEES_SAVED';

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${isRecovered ? 'rgba(16, 185, 129, 0.35)' : isBlocked ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)'}`,
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: isRecovered ? '0 4px 20px rgba(16, 185, 129, 0.05)' : 'none'
    }}>
      {/* Top Banner */}
      <div style={{
        padding: '12px 20px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="font-mono" style={{
            fontSize: '11px',
            fontWeight: 700,
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            color: '#10b981',
            padding: '2px 8px',
            borderRadius: '4px'
          }}>
            AUDIT #{record.id}
          </span>
          <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            TX: {transaction.id}
          </span>
          <span className="font-mono" style={{ fontSize: '11px', color: '#f59e0b' }}>
            AMOUNT: ${transaction.amount.toFixed(2)} {transaction.currency}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="font-mono" style={{ fontSize: '11px', color: '#06b6d4' }}>
            ⚡ LATENCY: {latency_ms}ms
          </span>
          <span className="font-mono" style={{
            fontSize: '11px',
            fontWeight: 800,
            padding: '3px 12px',
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
      <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Part 1: Failure Trigger & Telemetry */}
        <div style={stepBoxStyle}>
          <div style={stepHeaderStyle}>
            <span className="font-mono" style={{ fontSize: '11px', color: '#f59e0b' }}>01 // FAILURE TRIGGER</span>
            <AlertCircle size={15} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
            {transaction.decline_code.toUpperCase()}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>
            {transaction.decline_message}
          </p>
          <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div>Bank: {transaction.issuing_bank} • Network: {transaction.card_network}</div>
            <div>Tenure: {transaction.customer_tenure_months} mo • Retries: {transaction.retry_count}</div>
          </div>
        </div>

        {/* Part 2: XGBoost + SHAP Diagnosis */}
        <div style={stepBoxStyle}>
          <div style={stepHeaderStyle}>
            <span className="font-mono" style={{ fontSize: '11px', color: '#06b6d4' }}>02 // XGBOOST + SHAP DIAGNOSIS</span>
            <Cpu size={15} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginTop: '4px' }}>
            Root Cause:
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 8px 0' }}>
            {diagnosis.root_cause}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>P(Recovery):</span>
            <span className="font-mono" style={{ fontSize: '12px', fontWeight: 700, color: diagnosis.recovery_probability > 0.5 ? '#10b981' : '#ef4444' }}>
              {(diagnosis.recovery_probability * 100).toFixed(1)}%
            </span>
          </div>

          {/* SHAP Feature Attribution Badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {diagnosis.shap_attributions.map((s, idx) => (
              <div key={idx} className="font-mono" style={{
                fontSize: '10px',
                padding: '3px 6px',
                borderRadius: '3px',
                background: s.shap_value > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${s.shap_value > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: s.shap_value > 0 ? '#10b981' : '#ef4444'
              }}>
                {s.shap_value > 0 ? `+${(s.shap_value * 100).toFixed(0)}%` : `${(s.shap_value * 100).toFixed(0)}%`} {s.feature}: {s.description.slice(0, 48)}...
              </div>
            ))}
          </div>
        </div>

        {/* Part 3: Multi-Armed Bandit Action */}
        <div style={stepBoxStyle}>
          <div style={stepHeaderStyle}>
            <span className="font-mono" style={{ fontSize: '11px', color: '#a855f7' }}>03 // BANDIT ACTION OPTIMIZER</span>
            <TrendingUp size={15} color="#a855f7" />
          </div>
          <div style={{ marginTop: '4px' }}>
            <span className="font-mono" style={{
              fontSize: '11px',
              fontWeight: 700,
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid #a855f7',
              color: '#a855f7',
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              {optimization.chosen_action}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '8px 0' }}>
            {optimization.action_reasoning}
          </p>
          <div className="font-mono" style={{ fontSize: '11px', color: '#10b981', marginTop: 'auto' }}>
            Expected Net ROI: +${optimization.expected_recovery_value_usd.toFixed(2)}
          </div>
        </div>

        {/* Part 4: Compliance Guardrails & Outcome */}
        <div style={stepBoxStyle}>
          <div style={stepHeaderStyle}>
            <span className="font-mono" style={{ fontSize: '11px', color: isRecovered ? '#10b981' : isBlocked ? '#ef4444' : '#06b6d4' }}>
              04 // COMPLIANCE & OUTCOME
            </span>
            <ShieldCheck size={15} color={isRecovered ? '#10b981' : isBlocked ? '#ef4444' : '#06b6d4'} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
            <span className="font-mono" style={{
              fontSize: '11px',
              color: compliance.status === 'APPROVED' ? '#10b981' : '#ef4444',
              fontWeight: 700
            }}>
              {compliance.status === 'APPROVED' ? '✓ Network Mandates Passed' : '✕ Action Blocked'}
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 8px 0' }}>
            {compliance.reason}
          </p>

          <div style={{
            marginTop: 'auto',
            padding: '8px',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            {isRecovered ? (
              <div className="font-mono" style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
                🎉 Recovered: +${recovered_amount_usd.toFixed(2)}
              </div>
            ) : isAbandoned ? (
              <div className="font-mono" style={{ fontSize: '12px', fontWeight: 700, color: '#06b6d4' }}>
                🛡️ Preserved Fees: +${processing_fee_saved_usd.toFixed(2)}
              </div>
            ) : (
              <div className="font-mono" style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>
                🚫 Regulatory Block Triggered
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Styling Constants
const metricCardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '10px',
  padding: '20px',
};

const simBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-main)',
  padding: '10px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600,
  transition: 'all 0.15s ease'
};

const stepBoxStyle = {
  background: 'rgba(0, 0, 0, 0.35)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '6px',
  padding: '14px',
  display: 'flex',
  flexDirection: 'column'
};

const stepHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '6px'
};
