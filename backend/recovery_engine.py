import time
import asyncio
import logging
from typing import List, Dict, Any, Set
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

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_websockets.add(ws)
        # Send initial state
        await ws.send_json({
            "type": "INITIAL_STATE",
            "metrics": self.metrics,
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
            # Expected recovery when smart timer fires
            recovered_amt = tx.amount
            self.metrics["total_recovered_usd"] += recovered_amt
            fee_saved = 0.35

        else: # INSTANT_REROUTE or AUTO_CARD_UPDATER
            outcome = RecoveryOutcome.RECOVERED
            recovered_amt = tx.amount
            self.metrics["total_recovered_usd"] += recovered_amt
            fee_saved = 0.0

        latency_ms = round((time.time() - start_time) * 1000, 2)

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
            latency_ms=latency_ms
        )
        self.audit_records.append(record)

        # Real-time WebSocket Broadcast (Zero-Prompt Live Audit Trail)
        await self.broadcast({
            "type": "NEW_RECOVERY_EVENT",
            "record": record.model_dump(),
            "metrics": self.metrics
        })

        return record
