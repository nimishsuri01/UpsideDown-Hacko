import os
import uvicorn
import io
import csv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional

from .models import (
    FailedTransactionEvent, 
    PaymentDeclineCode, 
    CardNetwork,
    PaymentMethod
)
from .recovery_engine import AutonomousRecoveryEngine
from .traffic_generator import AmbientTrafficGenerator
from .gemini_advisor import GeminiRecoveryAdvisor

app = FastAPI(title="PayRevive // Autonomous AI Revenue Recovery Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = AutonomousRecoveryEngine()
traffic_gen = AmbientTrafficGenerator(engine=engine)
advisor = GeminiRecoveryAdvisor()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await engine.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        engine.disconnect(websocket)

@app.get("/api/health")
async def health():
    return {
        "status": "ONLINE",
        "service": "PayRevive Autonomous Recovery Engine",
        "traffic_generator_active": traffic_gen.is_running,
        "metrics": engine.metrics
    }

@app.get("/api/metrics")
async def get_metrics():
    return engine.metrics

@app.get("/api/audit")
async def get_audit_trail():
    return [r.model_dump() for r in engine.audit_records]

# Continuous Ambient Traffic Generator Controls
@app.post("/api/traffic/start")
async def start_traffic():
    traffic_gen.start()
    return {"status": "RUNNING", "message": "Ambient live payment failure stream started."}

@app.post("/api/traffic/stop")
async def stop_traffic():
    traffic_gen.stop()
    return {"status": "STOPPED", "message": "Ambient live payment failure stream stopped."}

@app.get("/api/traffic/status")
async def traffic_status():
    return {"is_running": traffic_gen.is_running}

# Export Audit Trail as CSV for Compliance / CFO Review
@app.get("/api/audit/csv")
async def export_audit_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Record ID", "Timestamp", "Transaction ID", "Amount", "Currency", "Decline Code", 
        "Issuing Bank", "Payment Rail", "Root Cause", "P(Recovery)", 
        "Bandit Action", "Compliance Status", "Outcome", "Recovered Amount", "Fee Saved", "Latency ms"
    ])

    for r in engine.audit_records:
        writer.writerow([
            r.id, r.timestamp, r.transaction.id, r.transaction.amount, r.transaction.currency, r.transaction.decline_code.value,
            r.transaction.issuing_bank, r.transaction.card_network.value, r.diagnosis.root_cause,
            r.diagnosis.recovery_probability, r.optimization.chosen_action.value, r.compliance.status.value,
            r.outcome.value, r.recovered_amount_usd, r.processing_fee_saved_usd, r.latency_ms
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=payrevive_audit_report.csv"}
    )

# Webhook receiver for Stripe / Paytm / Razorpay
@app.post("/api/webhook/payment-failed")
async def payment_failed_webhook(payload: Dict[str, Any]):
    data = payload.get("data", payload)
    tx = FailedTransactionEvent(
        amount=float(data.get("amount", 499.0)),
        currency=data.get("currency", "INR"),
        payment_method=PaymentMethod.UPI if "upi" in data.get("decline_code", "") else PaymentMethod.CARD,
        decline_code=PaymentDeclineCode(data.get("decline_code", "upi_server_timeout")),
        decline_message=data.get("decline_message", "Transaction failed"),
        issuing_bank=data.get("issuing_bank", "HDFC Bank / GPay"),
        card_network=CardNetwork(data.get("card_network", "UPI / NPCI")),
        retry_count=int(data.get("retry_count", 0)),
        customer_tenure_months=int(data.get("customer_tenure_months", 8)),
        day_of_month=int(data.get("day_of_month", 3)),
        time_of_day_utc=int(data.get("time_of_day_utc", 14))
    )
    record = await engine.process_failed_transaction(tx)
    return record.model_dump()

class CustomWebhookRequest(BaseModel):
    amount: float
    currency: str = "INR"
    decline_code: PaymentDeclineCode
    issuing_bank: str
    card_network: CardNetwork
    customer_tenure_months: int = 12
    day_of_month: int = 2
    retry_count: int = 0

@app.post("/api/webhook/custom")
async def custom_webhook_simulator(req: CustomWebhookRequest):
    tx = FailedTransactionEvent(
        amount=req.amount,
        currency=req.currency,
        payment_method=PaymentMethod.UPI if "upi" in req.decline_code.value else PaymentMethod.CARD,
        decline_code=req.decline_code,
        decline_message=f"Issuer declined with code: {req.decline_code.value}",
        issuing_bank=req.issuing_bank,
        card_network=req.card_network,
        retry_count=req.retry_count,
        customer_tenure_months=req.customer_tenure_months,
        day_of_month=req.day_of_month,
        time_of_day_utc=14
    )
    record = await engine.process_failed_transaction(tx)
    return record.model_dump()

# Live Demo Simulation Scenarios for Hackathon Presentation
@app.post("/api/simulate/{scenario}")
async def simulate_scenario(scenario: str):
    if scenario == "upi_timeout":
        tx = FailedTransactionEvent(
            amount=499.00,
            currency="INR",
            payment_method=PaymentMethod.UPI,
            decline_code=PaymentDeclineCode.UPI_SERVER_TIMEOUT,
            decline_message="NPCI Gateway Timeout: HDFC Bank UPI server response latency > 6200ms",
            issuing_bank="HDFC Bank (UPI / PhonePe)",
            card_network=CardNetwork.UPI_NPCI,
            retry_count=0,
            customer_tenure_months=16,
            day_of_month=4,
            time_of_day_utc=14
        )
    elif scenario == "upi_mandate":
        tx = FailedTransactionEvent(
            amount=299.00,
            currency="INR",
            payment_method=PaymentMethod.UPI,
            decline_code=PaymentDeclineCode.UPI_MANDATE_INSUFFICIENT_FUNDS,
            decline_message="Decline 51: Recurring UPI AutoPay mandate balance insufficient",
            issuing_bank="State Bank of India (GPay)",
            card_network=CardNetwork.UPI_NPCI,
            retry_count=0,
            customer_tenure_months=8,
            day_of_month=21,
            time_of_day_utc=18
        )
    elif scenario == "processor_timeout":
        tx = FailedTransactionEvent(
            amount=2490.00,
            currency="INR",
            payment_method=PaymentMethod.CARD,
            decline_code=PaymentDeclineCode.PROCESSOR_TIMEOUT,
            decline_message="Gateway timeout: Bank authorization server unreachable > 8000ms",
            issuing_bank="ICICI Bank",
            card_network=CardNetwork.RUPAY,
            retry_count=0,
            customer_tenure_months=14,
            day_of_month=15,
            time_of_day_utc=10
        )
    elif scenario == "card_expired":
        tx = FailedTransactionEvent(
            amount=1499.00,
            currency="INR",
            payment_method=PaymentMethod.CARD,
            decline_code=PaymentDeclineCode.CARD_EXPIRED,
            decline_message="Decline 54: Expired card credential",
            issuing_bank="Axis Bank",
            card_network=CardNetwork.VISA,
            retry_count=0,
            customer_tenure_months=24,
            day_of_month=5,
            time_of_day_utc=12
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

@app.get("/api/telemetry/bank_health")
async def get_bank_health():
    return {
        "npci_switch": {"status": "HEALTHY", "uptime": "99.82%", "latency_ms": 110},
        "hdfc_bank": {"status": "DEGRADED", "uptime": "58.40%", "latency_ms": 1850, "incident": "Core Banking Latency Spike - Rerouted to ICICI"},
        "icici_rail": {"status": "OPTIMAL", "uptime": "99.95%", "latency_ms": 85},
        "razorpay_gateway": {"status": "OPTIMAL", "uptime": "99.40%", "latency_ms": 130}
    }

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
