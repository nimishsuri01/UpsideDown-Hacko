import time
import asyncio
import logging
from typing import List, Dict, Any, Set, Optional
from fastapi import WebSocket

from .models import (
    FailedTransactionEvent, 
    RecoveryAuditRecord, 
    RecoveryOutcome, 
    ComplianceStatus,
    ComplianceVerification,
    ActionType,
    ActionOptimization,
    BankHealthStatus,
    PaymentMethod,
    PaymentDeclineCode,
    CardNetwork,
    DiagnosisResult,
    SHAPAttribution
)
from .ml_engine import RootCauseMLDiagnosis
from .bandit import MultiArmedBanditOptimizer
from .compliance import ComplianceGuardrailFilter

logger = logging.getLogger("PayRevive.Engine")

class AutonomousRecoveryEngine:
    """
    Part 4: Autonomous Audit Trail & Zero-Prompt Event Loop.
    The entire event loop operates automatically in the background without needing manual user prompts.
    Includes:
    - Ambient Bank/Gateway Health Sensor with Proactive State-Change Failover
    - Human-in-the-Loop (HITL) supervised mode
    - Multi-Tool Action Dispatch
    """
    def __init__(self):
        self.ml_diagnosis = RootCauseMLDiagnosis()
        self.bandit_optimizer = MultiArmedBanditOptimizer()
        self.compliance_filter = ComplianceGuardrailFilter()

        self.audit_records: List[RecoveryAuditRecord] = []
        self.active_websockets: Set[WebSocket] = set()

        # Running Telemetry Metrics
        self.metrics = {
            "total_at_risk_usd": 0.0,
            "total_recovered_usd": 0.0,
            "total_fees_saved_usd": 0.0,
            "total_events": 0,
            "recovery_rate_pct": 0.0,
            "compliance_blocks": 0
        }
        self.hitl_mode: bool = False  # False = Autonomous AI, True = Supervised (HITL)

        # Ambient Bank & Gateway Health Sensor State
        self.bank_telemetry: Dict[str, BankHealthStatus] = {
            "npci": BankHealthStatus(
                bank_id="npci",
                name="NPCI Central Switch",
                status="HEALTHY",
                uptime_pct=99.85,
                latency_ms=68,
                failure_rate_pct=0.1,
                proactive_reroute_active=False,
                last_incident=None
            ),
            "hdfc": BankHealthStatus(
                bank_id="hdfc",
                name="HDFC Core UPI Node",
                status="HEALTHY",
                uptime_pct=99.7,
                latency_ms=92,
                failure_rate_pct=0.3,
                proactive_reroute_active=False,
                last_incident=None
            ),
            "icici": BankHealthStatus(
                bank_id="icici",
                name="ICICI Secondary Rail",
                status="HEALTHY",
                uptime_pct=99.92,
                latency_ms=84,
                failure_rate_pct=0.2,
                proactive_reroute_active=False,
                last_incident=None
            ),
            "razorpay": BankHealthStatus(
                bank_id="razorpay",
                name="Razorpay Gateway API",
                status="HEALTHY",
                uptime_pct=99.4,
                latency_ms=115,
                failure_rate_pct=0.5,
                proactive_reroute_active=False,
                last_incident=None
            )
        }

    def set_hitl_mode(self, enabled: bool):
        self.hitl_mode = enabled

    async def toggle_bank_outage(self, bank_id: str = "hdfc") -> Dict[str, Any]:
        """
        Simulate an ambient Bank Core Outage or restore health.
        Reacts to state changes and triggers proactive AI failover.
        """
        node = self.bank_telemetry.get(bank_id)
        if not node:
            return {"status": "error", "message": f"Unknown node: {bank_id}"}

        rec = None
        if node.status == "HEALTHY":
            if bank_id == "hdfc":
                node.status = "CRITICAL_OUTAGE"
                node.latency_ms = 2450
                node.failure_rate_pct = 48.6
                node.uptime_pct = 54.2
                node.proactive_reroute_active = True
                node.last_incident = "Core UPI Banking Socket Timeout (>2400ms)"
                if "icici" in self.bank_telemetry:
                    self.bank_telemetry["icici"].status = "ACTIVE_FAILOVER"
                ai_action = "PROACTIVE_PREEMPTIVE_FAILOVER_ENGAGED"
                ai_narrative = "⚡ STATE CHANGE DETECTED: HDFC Core Banking latency breached 1200ms threshold (2450ms). Ambient Sentinel proactively rerouted 100% of upcoming UPI traffic to ICICI Secondary Rail before customer dropped!"

                # Create immutable Sentinel Audit Record for the state change
                tx = FailedTransactionEvent(
                    amount=1420.00,
                    currency="INR",
                    payment_method=PaymentMethod.UPI,
                    decline_code=PaymentDeclineCode.UPI_SERVER_TIMEOUT,
                    decline_message="Telemetry Sensor Trigger: HDFC Core Banking socket response > 2400ms",
                    issuing_bank="HDFC Bank Core Node",
                    card_network=CardNetwork.UPI_NPCI,
                    retry_count=0,
                    customer_tenure_months=18,
                    day_of_month=3,
                    time_of_day_utc=14
                )
                diag = DiagnosisResult(
                    root_cause="⚡ AMBIENT SENSOR STATE-CHANGE: HDFC Core UPI Node degraded (2450ms > 1200ms SLA). 48.6% packet loss detected.",
                    decline_category="TRANSIENT",
                    recovery_probability=0.99,
                    shap_attributions=[
                        SHAPAttribution(feature="core_bank_latency_ms", shap_value=0.89, description="HDFC Core UPI node socket timeout breached SLA threshold"),
                        SHAPAttribution(feature="ambient_sensor_state", shap_value=0.78, description="Background telemetry sensor flagged node as degraded"),
                        SHAPAttribution(feature="secondary_rail_health", shap_value=-0.62, description="ICICI secondary rail verified healthy at 84ms latency")
                    ],
                    model_used="Ambient Telemetry Sentinel + XGBoost"
                )
                opt = ActionOptimization(
                    chosen_action=ActionType.PROACTIVE_PREEMPTIVE_FAILOVER,
                    exploration_strategy="Deterministic Zero-Downtime Hot Reroute",
                    estimated_cost_usd=0.0,
                    expected_recovery_value_usd=1420.00,
                    action_reasoning="⚡ PREEMPTIVE FAILOVER: Swapped active UPI routing cache to ICICI Secondary Rail. Bypassed degraded HDFC node with 0ms downtime.",
                    target_gateway="ICICI UPI Secondary Rail API (84ms)"
                )
                comp = ComplianceVerification(
                    status=ComplianceStatus.APPROVED,
                    rules_checked=["RBI Master Direction on Digital Payment Gateways", "Zero Drop Preemptive Routing SLA", "NPCI Circular 112/2024 Redundancy Rule"],
                    risk_score=0.01,
                    reason="Preemptive gateway redundancy authorized by FinOps SLA guardrails"
                )
                rec = RecoveryAuditRecord(
                    transaction=tx,
                    diagnosis=diag,
                    optimization=opt,
                    compliance=comp,
                    outcome=RecoveryOutcome.RECOVERED,
                    recovered_amount_usd=1420.00,
                    processing_fee_saved_usd=0.0,
                    latency_ms=11.4,
                    dispatched_tools=[
                        "Live Telemetry Sensor (Outage Threshold Triggered)",
                        "Preemptive ICICI Backup Rail (Direct API Pre-Route)",
                        "Routing Cache Updated (Zero Customer Downtime)",
                        "Merchant Slack Alert #finops-radar"
                    ],
                    hitl_status="AUTO_EXECUTED"
                )
            else: # npci or other
                node.status = "CRITICAL_OUTAGE"
                node.latency_ms = 1850
                node.failure_rate_pct = 34.5
                node.uptime_pct = 68.2
                node.proactive_reroute_active = True
                node.last_incident = "NPCI Switch Congestion Surge (>1800ms)"
                ai_action = "NPCI_LATENCY_SURGE_PREEMPTION"
                ai_narrative = "⚡ NPCI SWITCH CONGESTION DETECTED: Latency spiked to 1850ms. Ambient Sentinel proactively switched UPI transactions to Direct Card/RuPay Fallback!"

                tx = FailedTransactionEvent(
                    amount=1950.00,
                    currency="INR",
                    payment_method=PaymentMethod.UPI,
                    decline_code=PaymentDeclineCode.NETWORK_ERROR,
                    decline_message="Telemetry Sensor Trigger: NPCI Central Switch latency > 1800ms",
                    issuing_bank="NPCI Central Switch",
                    card_network=CardNetwork.UPI_NPCI,
                    retry_count=0,
                    customer_tenure_months=24,
                    day_of_month=3,
                    time_of_day_utc=14
                )
                diag = DiagnosisResult(
                    root_cause="⚡ AMBIENT SENSOR TRIGGER: NPCI Switch congested (1850ms). 34.5% network drop rate.",
                    decline_category="TRANSIENT",
                    recovery_probability=0.98,
                    shap_attributions=[
                        SHAPAttribution(feature="npci_switch_latency_ms", shap_value=0.91, description="NPCI Central Switch packet queue backlog"),
                        SHAPAttribution(feature="ambient_sensor_state", shap_value=0.81, description="Real-time latency sensor threshold breached")
                    ],
                    model_used="Ambient Telemetry Sentinel + XGBoost"
                )
                opt = ActionOptimization(
                    chosen_action=ActionType.PROACTIVE_PREEMPTIVE_FAILOVER,
                    exploration_strategy="Direct Fallback Redirection",
                    estimated_cost_usd=0.0,
                    expected_recovery_value_usd=1950.00,
                    action_reasoning="⚡ NPCI PREEMPTION: Rerouted high-ticket checkouts to Direct RuPay Gateway to bypass switch congestion.",
                    target_gateway="RuPay Direct Payment Rail"
                )
                comp = ComplianceVerification(
                    status=ComplianceStatus.APPROVED,
                    rules_checked=["NPCI High-Traffic Contingency Mandate", "Zero Drop Preemptive Routing SLA"],
                    risk_score=0.01,
                    reason="Preemptive bypass authorized during NPCI switch congestion"
                )
                rec = RecoveryAuditRecord(
                    transaction=tx,
                    diagnosis=diag,
                    optimization=opt,
                    compliance=comp,
                    outcome=RecoveryOutcome.RECOVERED,
                    recovered_amount_usd=1950.00,
                    processing_fee_saved_usd=0.0,
                    latency_ms=13.2,
                    dispatched_tools=[
                        "Live Telemetry Sensor (NPCI Congestion Triggered)",
                        "Direct RuPay Direct Rail Redirection",
                        "Merchant Slack Alert #finops-radar"
                    ],
                    hitl_status="AUTO_EXECUTED"
                )
        else: # Restoring to HEALTHY
            if bank_id == "hdfc":
                node.status = "HEALTHY"
                node.latency_ms = 88
                node.failure_rate_pct = 0.3
                node.uptime_pct = 99.8
                node.proactive_reroute_active = False
                node.last_incident = "State Normalized: Traffic re-balanced to primary HDFC node."
                if "icici" in self.bank_telemetry:
                    self.bank_telemetry["icici"].status = "HEALTHY"
                ai_action = "TRAFFIC_REBALANCED_TO_PRIMARY"
                ai_narrative = "✓ STATE NORMALIZED: HDFC Core Banking recovered to 88ms latency. Ambient Sentinel re-balanced primary UPI routing table."

                tx = FailedTransactionEvent(
                    amount=850.00,
                    currency="INR",
                    payment_method=PaymentMethod.UPI,
                    decline_code=PaymentDeclineCode.UPI_SERVER_TIMEOUT,
                    decline_message="Telemetry Sensor Trigger: HDFC Core Banking socket recovered to 88ms",
                    issuing_bank="HDFC Bank Core Node",
                    card_network=CardNetwork.UPI_NPCI,
                    retry_count=0
                )
                diag = DiagnosisResult(
                    root_cause="✓ AMBIENT STATE NORMALIZATION: HDFC Core Node recovered to 88ms latency. Health checks verified clean.",
                    decline_category="TRANSIENT",
                    recovery_probability=0.99,
                    shap_attributions=[
                        SHAPAttribution(feature="core_bank_latency_ms", shap_value=-0.75, description="HDFC latency normalized to 88ms optimal baseline"),
                        SHAPAttribution(feature="ambient_health_score", shap_value=0.82, description="Node health score restored to 99.8%")
                    ],
                    model_used="Ambient Telemetry Sentinel"
                )
                opt = ActionOptimization(
                    chosen_action=ActionType.INSTANT_REROUTE_BACKUP_GATEWAY,
                    exploration_strategy="Graceful Route Normalization",
                    estimated_cost_usd=0.0,
                    expected_recovery_value_usd=850.00,
                    action_reasoning="✓ GRACEFUL RE-BALANCE: Primary UPI traffic routing restored to HDFC node without session drops.",
                    target_gateway="HDFC Primary Rail (88ms)"
                )
                comp = ComplianceVerification(
                    status=ComplianceStatus.APPROVED,
                    rules_checked=["Traffic Balancing Safety Protocol", "Graceful Connection Draining Check"],
                    risk_score=0.01,
                    reason="Node recovery verified healthy across 3 consecutive heartbeats"
                )
                rec = RecoveryAuditRecord(
                    transaction=tx,
                    diagnosis=diag,
                    optimization=opt,
                    compliance=comp,
                    outcome=RecoveryOutcome.RECOVERED,
                    recovered_amount_usd=850.00,
                    latency_ms=8.6,
                    dispatched_tools=[
                        "Live Telemetry Sensor (Recovery Verified)",
                        "HDFC Primary Rail Restored",
                        "Routing Cache Re-balanced",
                        "Merchant Slack Alert #finops-radar"
                    ],
                    hitl_status="AUTO_EXECUTED"
                )
            else: # npci restored
                node.status = "HEALTHY"
                node.latency_ms = 68
                node.failure_rate_pct = 0.15
                node.uptime_pct = 99.85
                node.proactive_reroute_active = False
                node.last_incident = "State Normalized: NPCI Central Switch stabilized at 68ms."
                ai_action = "NPCI_TRAFFIC_NORMALIZED"
                ai_narrative = "✓ STATE NORMALIZED: NPCI Central Switch latency stabilized at 68ms. Standard routing operational."

        if rec:
            self.audit_records.append(rec)
            self.metrics["total_events"] += 1
            self.metrics["total_recovered_usd"] += rec.recovered_amount_usd
            self.metrics["total_at_risk_usd"] += rec.recovered_amount_usd
            recovered_count = sum(1 for r in self.audit_records if r.outcome in [RecoveryOutcome.RECOVERED, RecoveryOutcome.SCHEDULED])
            self.metrics["recovery_rate_pct"] = round((recovered_count / self.metrics["total_events"]) * 100, 1)

        event = {
            "type": "BANK_STATE_CHANGE",
            "bank_id": bank_id,
            "telemetry": {k: v.model_dump() for k, v in self.bank_telemetry.items()},
            "ai_action": ai_action,
            "ai_narrative": ai_narrative,
            "timestamp": time.time()
        }
        await self.broadcast(event)

        if rec:
            await self.broadcast({
                "type": "NEW_RECOVERY_EVENT",
                "record": rec.model_dump(),
                "metrics": self.metrics
            })

        return event

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_websockets.add(ws)
        # Send initial state including bank telemetry
        await ws.send_json({
            "type": "INITIAL_STATE",
            "metrics": self.metrics,
            "hitl_mode": self.hitl_mode,
            "bank_telemetry": {k: v.model_dump() for k, v in self.bank_telemetry.items()},
            "audit_records": [rec.model_dump() for rec in self.audit_records[-30:]]
        })

    def disconnect(self, ws: WebSocket):
        self.active_websockets.discard(ws)

    async def broadcast(self, message: Dict[str, Any]):
        for ws in list(self.active_websockets):
            try:
                await ws.send_json(message)
            except Exception:
                self.active_websockets.discard(ws)

    def _determine_dispatched_tools(self, tx: FailedTransactionEvent, action_type: ActionType, is_blocked: bool) -> List[str]:
        """Cross-Tool Actions taken by Autonomous PayRevive"""
        if is_blocked:
            return ["Visa Rule 5.4.1.3 Compliance Shield", "Immutable Audit Vault Logger", "Risk Engine Alert"]
        
        tools = []
        if action_type == ActionType.PROACTIVE_PREEMPTIVE_FAILOVER:
            tools.append("Live Telemetry Sensor (Outage Threshold Triggered)")
            tools.append("Preemptive ICICI Backup Rail (Direct API Pre-Route)")
            tools.append("Routing Cache Updated (Zero Customer Downtime)")
        elif action_type == ActionType.INSTANT_REROUTE_BACKUP_GATEWAY:
            tools.append("ICICI UPI Secondary Rail API (HTTP 200)")
            tools.append("NPCI Switch Reroute Webhook")
            tools.append("Merchant Slack Alert #finops-radar")
        elif action_type == ActionType.SCHEDULE_SMART_PAYDAY_RETRY:
            tools.append("Temporal Payday Cron Scheduler")
            tools.append("WhatsApp UPI 1-Click Pay Link (+91 98***)")
        elif action_type == ActionType.AUTO_CARD_UPDATER:
            tools.append("Visa/Mastercard Account Updater (VAU/ABU)")
            tools.append("Card Vault Token Refresh")
        elif action_type == ActionType.ABANDON_NO_RETRY:
            tools.append("Interchange Fee Shield ($0.35 Saved)")
            tools.append("Terminal Retry Suppressor")
        else:
            tools.append("Payment Gateway Webhook")
        return tools

    async def process_failed_transaction(self, tx: FailedTransactionEvent) -> RecoveryAuditRecord:
        start_time = time.time()
        self.metrics["total_at_risk_usd"] += tx.amount
        self.metrics["total_events"] += 1

        # Check if issuing bank or network is currently flagged by Ambient Telemetry Sensor
        hdfc_sensor = self.bank_telemetry.get("hdfc")
        npci_sensor = self.bank_telemetry.get("npci")
        is_hdfc_preemptive = (hdfc_sensor and hdfc_sensor.proactive_reroute_active and ("HDFC" in tx.issuing_bank or tx.payment_method == PaymentMethod.UPI or tx.decline_code == PaymentDeclineCode.UPI_SERVER_TIMEOUT))
        is_npci_preemptive = (npci_sensor and npci_sensor.proactive_reroute_active and (tx.payment_method == PaymentMethod.UPI or tx.card_network == CardNetwork.UPI_NPCI))

        # Step 1: Root-Cause Diagnosis (XGBoost + SHAP)
        diagnosis = self.ml_diagnosis.diagnose(tx)

        # Step 2: Action Optimization (Multi-Armed Bandit)
        action = self.bandit_optimizer.optimize_action(tx, diagnosis)

        # Step 3: Strict Compliance Guardrails
        compliance = self.compliance_filter.verify(tx, action)

        # Step 4: Proactive Sensor Preemption or Reactive Outcome
        if is_hdfc_preemptive and compliance.status != ComplianceStatus.BLOCKED:
            # Proactive State-Change Sentinel Intervention for HDFC!
            action.chosen_action = ActionType.PROACTIVE_PREEMPTIVE_FAILOVER
            action.action_reasoning = "⚡ PROACTIVE PREEMPTION: Ambient sensor flagged HDFC Core Banking node in CRITICAL_OUTAGE (2450ms). Preemptively bypassed before customer drop!"
            diagnosis.root_cause = "PROACTIVE TELEMETRY FAILOVER: Preemptive bypass of degraded HDFC node -> Direct ICICI Rail"
            outcome = RecoveryOutcome.RECOVERED
            recovered_amt = tx.amount
            fee_saved = 0.0
            self.metrics["total_recovered_usd"] += recovered_amt

        elif is_npci_preemptive and compliance.status != ComplianceStatus.BLOCKED:
            # Proactive State-Change Sentinel Intervention for NPCI!
            action.chosen_action = ActionType.PROACTIVE_PREEMPTIVE_FAILOVER
            action.action_reasoning = "⚡ PROACTIVE PREEMPTION: Ambient sensor flagged NPCI Switch congestion (>1800ms). Preemptively routed via Direct RuPay Rail!"
            diagnosis.root_cause = "PROACTIVE TELEMETRY FAILOVER: NPCI Switch congested -> Direct RuPay Gateway Bypass"
            outcome = RecoveryOutcome.RECOVERED
            recovered_amt = tx.amount
            fee_saved = 0.0
            self.metrics["total_recovered_usd"] += recovered_amt

        elif compliance.status == ComplianceStatus.BLOCKED:
            outcome = RecoveryOutcome.COMPLIANCE_BLOCKED
            recovered_amt = 0.0
            fee_saved = 0.35  # Saved illegal retry fee
            self.metrics["compliance_blocks"] += 1
            self.metrics["total_fees_saved_usd"] += fee_saved

        elif action.chosen_action == ActionType.ABANDON_NO_RETRY:
            outcome = RecoveryOutcome.ABANDONED_FEES_SAVED
            recovered_amt = 0.0
            fee_saved = 0.35
            self.metrics["total_fees_saved_usd"] += fee_saved

        elif action.chosen_action == ActionType.SCHEDULE_SMART_PAYDAY_RETRY:
            outcome = RecoveryOutcome.SCHEDULED
            recovered_amt = tx.amount
            self.metrics["total_recovered_usd"] += recovered_amt
            fee_saved = 0.35

        else: # INSTANT_REROUTE or AUTO_CARD_UPDATER
            outcome = RecoveryOutcome.RECOVERED
            recovered_amt = tx.amount
            self.metrics["total_recovered_usd"] += recovered_amt
            fee_saved = 0.0

        latency_ms = round((time.time() - start_time) * 1000, 2)

        # Determine multi-tool dispatch
        is_blocked = (compliance.status == ComplianceStatus.BLOCKED)
        tools = self._determine_dispatched_tools(tx, action.chosen_action, is_blocked)

        hitl_status = "AUTO_EXECUTED"
        if self.hitl_mode and tx.amount > 5000:
            hitl_status = "SUPERVISED_REVIEW"

        # Calculate recovery rate
        recovered_count = sum(1 for r in self.audit_records if r.outcome in [RecoveryOutcome.RECOVERED, RecoveryOutcome.SCHEDULED])
        if outcome in [RecoveryOutcome.RECOVERED, RecoveryOutcome.SCHEDULED]:
            recovered_count += 1
        self.metrics["recovery_rate_pct"] = round((recovered_count / self.metrics["total_events"]) * 100, 1)

        # Create immutable Audit Record
        record = RecoveryAuditRecord(
            transaction=tx,
            diagnosis=diagnosis,
            optimization=action,
            compliance=compliance,
            outcome=outcome,
            recovered_amount_usd=round(recovered_amt, 2),
            processing_fee_saved_usd=round(fee_saved, 2),
            latency_ms=latency_ms,
            dispatched_tools=tools,
            hitl_status=hitl_status
        )
        self.audit_records.append(record)

        # Real-time WebSocket Broadcast (Zero-Prompt Live Audit Trail)
        await self.broadcast({
            "type": "NEW_RECOVERY_EVENT",
            "record": record.model_dump(),
            "metrics": self.metrics
        })

        return record

    async def override_record_action(self, record_id: str, new_action: str) -> Optional[RecoveryAuditRecord]:
        """Human-in-the-Loop Operator Override"""
        try:
            action_enum = ActionType(new_action)
        except ValueError:
            return None

        for r in self.audit_records:
            if r.id == record_id:
                old_action = r.optimization.chosen_action
                r.optimization.chosen_action = action_enum
                r.hitl_status = "OVERRIDDEN_BY_OPERATOR"
                r.dispatched_tools.append(f"Human Operator Override -> {new_action}")

                # Update outcome and metrics if action type changes
                if action_enum == ActionType.ABANDON_NO_RETRY and r.outcome != RecoveryOutcome.ABANDONED_FEES_SAVED:
                    if r.outcome in [RecoveryOutcome.RECOVERED, RecoveryOutcome.SCHEDULED]:
                        self.metrics["total_recovered_usd"] = max(0.0, self.metrics["total_recovered_usd"] - r.recovered_amount_usd)
                    r.outcome = RecoveryOutcome.ABANDONED_FEES_SAVED
                    r.recovered_amount_usd = 0.0
                    r.processing_fee_saved_usd = 0.35
                    self.metrics["total_fees_saved_usd"] += 0.35
                elif action_enum in [ActionType.INSTANT_REROUTE_BACKUP_GATEWAY, ActionType.SCHEDULE_SMART_PAYDAY_RETRY, ActionType.PROACTIVE_PREEMPTIVE_FAILOVER, ActionType.AUTO_CARD_UPDATER]:
                    if r.outcome == RecoveryOutcome.ABANDONED_FEES_SAVED:
                        self.metrics["total_fees_saved_usd"] = max(0.0, self.metrics["total_fees_saved_usd"] - r.processing_fee_saved_usd)
                        r.processing_fee_saved_usd = 0.0
                    r.outcome = RecoveryOutcome.RECOVERED
                    if r.recovered_amount_usd == 0.0:
                        r.recovered_amount_usd = r.transaction.amount
                        self.metrics["total_recovered_usd"] += r.recovered_amount_usd

                # Recalculate recovery rate
                recovered_count = sum(1 for rec in self.audit_records if rec.outcome in [RecoveryOutcome.RECOVERED, RecoveryOutcome.SCHEDULED])
                if self.metrics["total_events"] > 0:
                    self.metrics["recovery_rate_pct"] = round((recovered_count / self.metrics["total_events"]) * 100, 1)

                await self.broadcast({
                    "type": "RECORD_UPDATED",
                    "record": r.model_dump(),
                    "metrics": self.metrics
                })
                return r
        return None
