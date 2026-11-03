import os
import io
import csv
import time
import random
import asyncio
from typing import Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from .models import (
    FailedTransactionEvent, 
    PaymentDeclineCode, 
    PaymentMethod, 
    CardNetwork,
    RecoveryAuditRecord
)
from .recovery_engine import AutonomousRecoveryEngine
from .traffic_generator import AmbientTrafficGenerator

app = FastAPI(
    title="PayRevive // Autonomous AI Revenue Recovery Engine",
    description="Zero-Prompt FinTech Sentinel for Mobile UPI & Multi-Rail Involuntary Churn Recovery",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = AutonomousRecoveryEngine()
traffic_gen = AmbientTrafficGenerator(engine=engine, interval_seconds=3.0)
ambient_telemetry_task = None

async def ambient_telemetry_loop():
    """Ambient background sentinel loop continuously polling bank & gateway nodes"""
    while True:
        try:
            await asyncio.sleep(3.2)
            for k, node in engine.bank_telemetry.items():
                if node.status == "HEALTHY":
                    if k == "npci":
                        node.latency_ms = random.randint(64, 73)
                    elif k == "hdfc":
                        node.latency_ms = random.randint(88, 97)
                    elif k == "icici":
                        node.latency_ms = random.randint(81, 88)
                    elif k == "razorpay":
                        node.latency_ms = random.randint(111, 120)
                elif node.status == "CRITICAL_OUTAGE":
                    if k == "hdfc":
                        node.latency_ms = random.randint(2380, 2520)
                    elif k == "npci":
                        node.latency_ms = random.randint(1820, 1940)

            await engine.broadcast({
                "type": "TELEMETRY_HEARTBEAT",
                "telemetry": {k: v.model_dump() for k, v in engine.bank_telemetry.items()}
            })
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(2)

@app.on_event("startup")
async def startup_event():
    global ambient_telemetry_task
    ambient_telemetry_task = asyncio.create_task(ambient_telemetry_loop())

@app.on_event("shutdown")
async def shutdown_event():
    global ambient_telemetry_task
    if ambient_telemetry_task:
        ambient_telemetry_task.cancel()
    traffic_gen.stop()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await engine.connect(websocket)
    try:
        while True:
            # Keep socket alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        engine.disconnect(websocket)
    except Exception:
        engine.disconnect(websocket)

@app.get("/api/metrics")
async def get_metrics():
    return engine.metrics

@app.get("/api/audit")
async def get_audit_trail(limit: int = 50):
    return [rec.model_dump() for rec in engine.audit_records[-limit:]]

@app.get("/api/audit/csv")
async def export_audit_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Record_ID", "Timestamp", "Amount_INR", "Issuing_Bank", "Payment_Rail",
        "Decline_Code", "Root_Cause", "P_Recovery", "Chosen_Action", 
        "Compliance_Status", "Outcome", "Recovered_Amount_INR", "Latency_MS", "Dispatched_Tools"
    ])
    for r in engine.audit_records:
        writer.writerow([
            r.id,
            time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(r.timestamp)),
            r.transaction.amount,
            r.transaction.issuing_bank,
            r.transaction.card_network.value if hasattr(r.transaction.card_network, 'value') else str(r.transaction.card_network),
            r.transaction.decline_code.value if hasattr(r.transaction.decline_code, 'value') else str(r.transaction.decline_code),
            r.diagnosis.root_cause,
            r.diagnosis.recovery_probability,
            r.optimization.chosen_action.value if hasattr(r.optimization.chosen_action, 'value') else str(r.optimization.chosen_action),
            r.compliance.status.value if hasattr(r.compliance.status, 'value') else str(r.compliance.status),
            r.outcome.value if hasattr(r.outcome, 'value') else str(r.outcome),
            r.recovered_amount_usd,
            r.latency_ms,
            "; ".join(r.dispatched_tools)
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=payrevive_audit_report.csv"}
    )

@app.post("/api/traffic/start")
async def start_ambient_traffic():
    traffic_gen.start()
    return {"status": "RUNNING", "message": "Ambient live traffic stream started"}

@app.post("/api/traffic/stop")
async def stop_ambient_traffic():
    traffic_gen.stop()
    return {"status": "STOPPED", "message": "Ambient live traffic stream stopped"}

@app.get("/api/traffic/status")
async def get_traffic_status():
    return {"is_running": traffic_gen.is_running}

# Ambient Bank Telemetry & Proactive Outage State-Change Endpoints
@app.get("/api/telemetry/bank_health")
async def get_bank_health():
    return {k: v.model_dump() for k, v in engine.bank_telemetry.items()}

@app.post("/api/telemetry/toggle_outage/{bank_id}")
async def toggle_bank_outage(bank_id: str):
    res = await engine.toggle_bank_outage(bank_id)
    return res

# Human-in-the-Loop & Override Endpoints
@app.post("/api/config/hitl_mode")
async def toggle_hitl_mode(payload: Dict[str, bool]):
    enabled = payload.get("enabled", False)
    engine.set_hitl_mode(enabled)
    await engine.broadcast({
        "type": "HITL_MODE_CHANGED",
        "hitl_mode": enabled
    })
    return {"status": "success", "hitl_mode": enabled}

@app.post("/api/audit/{record_id}/override")
async def override_audit_record(record_id: str, payload: Dict[str, str]):
    new_action = payload.get("action")
    if not new_action:
        raise HTTPException(status_code=400, detail="Missing action parameter")
    record = await engine.override_record_action(record_id, new_action)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record.model_dump()

# Custom Webhook Receiver
@app.post("/api/webhook/custom")
async def receive_custom_webhook(payload: Dict[str, Any]):
    try:
        network_str = payload.get("card_network", "UPI / NPCI")
        network = CardNetwork.UPI_NPCI
        if "RUPAY" in network_str:
            network = CardNetwork.RUPAY
        elif "VISA" in network_str:
            network = CardNetwork.VISA
        elif "MASTER" in network_str:
            network = CardNetwork.MASTERCARD

        decline_str = payload.get("decline_code", "upi_server_timeout")
        decline = PaymentDeclineCode.UPI_SERVER_TIMEOUT
        for code in PaymentDeclineCode:
            if code.value == decline_str:
                decline = code
                break

        tx = FailedTransactionEvent(
            amount=float(payload.get("amount", 499.0)),
            currency=payload.get("currency", "INR"),
            payment_method=PaymentMethod.UPI if "UPI" in network_str else PaymentMethod.CARD,
            decline_code=decline,
            decline_message=f"Custom Webhook: {decline.value} reported by {payload.get('issuing_bank', 'HDFC Bank')}",
            issuing_bank=payload.get("issuing_bank", "HDFC Bank (UPI / PhonePe)"),
            card_network=network,
            retry_count=int(payload.get("retry_count", 0)),
            customer_tenure_months=int(payload.get("customer_tenure_months", 12)),
            day_of_month=int(payload.get("day_of_month", 2)),
            time_of_day_utc=14
        )
        record = await engine.process_failed_transaction(tx)
        return record.model_dump()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid webhook payload: {str(e)}")

# Testbench Scenarios
@app.post("/api/simulate/{scenario}")
async def simulate_scenario(scenario: str):
    if scenario == "upi_timeout":
        tx = FailedTransactionEvent(
            amount=499.00,
            currency="INR",
            payment_method=PaymentMethod.UPI,
            decline_code=PaymentDeclineCode.UPI_SERVER_TIMEOUT,
            decline_message="Decline U30: NPCI UPI core banking timeout (latency > 2400ms)",
            issuing_bank="HDFC Bank (UPI / GPay)",
            card_network=CardNetwork.UPI_NPCI,
            retry_count=0,
            customer_tenure_months=18,
            day_of_month=3,
            time_of_day_utc=14
        )
    elif scenario == "upi_mandate":
        tx = FailedTransactionEvent(
            amount=299.00,
            currency="INR",
            payment_method=PaymentMethod.UPI,
            decline_code=PaymentDeclineCode.UPI_MANDATE_INSUFFICIENT_FUNDS,
            decline_message="Decline M05: UPI recurring AutoPay mandate failed due to insufficient funds",
            issuing_bank="State Bank of India (SBI)",
            card_network=CardNetwork.UPI_NPCI,
            retry_count=0,
            customer_tenure_months=8,
            day_of_month=28,
            time_of_day_utc=6
        )
    elif scenario == "processor_timeout":
        tx = FailedTransactionEvent(
            amount=2490.00,
            currency="INR",
            payment_method=PaymentMethod.CARD,
            decline_code=PaymentDeclineCode.PROCESSOR_TIMEOUT,
            decline_message="Gateway timeout: RuPay switch bank authorization server unreachable > 8000ms",
            issuing_bank="Punjab National Bank (PNB)",
            card_network=CardNetwork.RUPAY,
            retry_count=0,
            customer_tenure_months=14,
            day_of_month=15,
            time_of_day_utc=10
        )
    elif scenario == "stolen_card":
        tx = FailedTransactionEvent(
            amount=8500.00,
            currency="INR",
            payment_method=PaymentMethod.CARD,
            decline_code=PaymentDeclineCode.LOST_OR_STOLEN,
            decline_message="Decline 41: Lost or stolen card flag reported by cardholder",
            issuing_bank="HDFC Bank",
            card_network=CardNetwork.VISA,
            retry_count=0,
            customer_tenure_months=1,
            day_of_month=12,
            time_of_day_utc=20
        )
    elif scenario == "retry_limit_exceeded":
        tx = FailedTransactionEvent(
            amount=1999.00,
            currency="INR",
            payment_method=PaymentMethod.CARD,
            decline_code=PaymentDeclineCode.DO_NOT_HONOR,
            decline_message="Decline 05: Do not honor bank refusal",
            issuing_bank="Kotak Mahindra",
            card_network=CardNetwork.MASTERCARD,
            retry_count=4,
            customer_tenure_months=3,
            day_of_month=10,
            time_of_day_utc=9
        )
    elif scenario == "high_value_hitl":
        tx = FailedTransactionEvent(
            amount=14999.00,
            currency="INR",
            payment_method=PaymentMethod.UPI,
            decline_code=PaymentDeclineCode.UPI_SERVER_TIMEOUT,
            decline_message="High-Value Enterprise Settlement: UPI switch timeout on primary HDFC node",
            issuing_bank="HDFC Bank (Enterprise)",
            card_network=CardNetwork.UPI_NPCI,
            retry_count=0,
            customer_tenure_months=36,
            day_of_month=3,
            time_of_day_utc=15
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unknown scenario: {scenario}")

    record = await engine.process_failed_transaction(tx)
    return record.model_dump()

# Mount Frontend Static Assets
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
