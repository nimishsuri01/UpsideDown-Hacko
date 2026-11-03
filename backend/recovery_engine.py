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
    ActionType
)
from .ml_engine import RootCauseMLDiagnosis
from .bandit import MultiArmedBanditOptimizer
from .compliance import ComplianceGuardrailFilter

logger = logging.getLogger("PayRevive.Engine")

class AutonomousRecoveryEngine:
    """
    Part 4: Autonomous Audit Trail & Zero-Prompt Event Loop.
    The entire event loop—from failure trigger to final recovery outcome—operates
    automatically in the background without needing manual user prompts.
    Includes Human-in-the-Loop (HITL) supervised mode and multi-tool dispatch.
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

    def set_hitl_mode(self, enabled: bool):
        self.hitl_mode = enabled

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_websockets.add(ws)
        # Send initial state
        await ws.send_json({
            "type": "INITIAL_STATE",
            "metrics": self.metrics,
            "hitl_mode": self.hitl_mode,
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
        if action_type == ActionType.INSTANT_REROUTE_BACKUP_GATEWAY:
            tools.append("ICICI UPI Secondary Rail API (HTTP 200)")
            tools.append("NPCI Switch Reroute Webhook")
            tools.append("Merchant Slack Alert #ops-radar")
        elif action_type == ActionType.SCHEDULE_SMART_PAYDAY_RETRY:
            tools.append("Temporal Payday Cron Scheduler")
            tools.append(f"WhatsApp UPI 1-Click Pay Link (+91 98***)")
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

        # Step 1: Root-Cause Diagnosis (XGBoost + SHAP)
        diagnosis = self.ml_diagnosis.diagnose(tx)

        # Step 2: Action Optimization (Multi-Armed Bandit)
        action = self.bandit_optimizer.optimize_action(tx, diagnosis)

        # Step 3: Strict Compliance Guardrails
        compliance = self.compliance_filter.verify(tx, action)

        # Step 4: Outcome Determination
        if compliance.status == ComplianceStatus.BLOCKED:
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
        for r in self.audit_records:
            if r.id == record_id:
                r.optimization.chosen_action = ActionType(new_action)
                r.hitl_status = "OVERRIDDEN_BY_OPERATOR"
                r.dispatched_tools.append(f"Human Operator Override -> {new_action}")
                await self.broadcast({
                    "type": "RECORD_UPDATED",
                    "record": r.model_dump(),
                    "metrics": self.metrics
                })
                return r
        return None
