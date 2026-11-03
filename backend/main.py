import os
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional

from .models import (
    FailedTransactionEvent, 
    PaymentDeclineCode, 
    CardNetwork
)
from .recovery_engine import AutonomousRecoveryEngine

app = FastAPI(title="PayRevive // Autonomous AI Revenue Recovery Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = AutonomousRecoveryEngine()

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
        "metrics": engine.metrics
    }

@app.get("/api/metrics")
async def get_metrics():
    return engine.metrics

@app.get("/api/audit")
async def get_audit_trail():
    return [r.model_dump() for r in engine.audit_records]

# Webhook receiver for Stripe / Paytm / Razorpay
@app.post("/api/webhook/payment-failed")
async def payment_failed_webhook(payload: Dict[str, Any]):
    """
    Ingests payment failure webhooks from payment gateways (Stripe/Paytm/Razorpay).
    Operates 100% autonomously without human prompting.
    """
    data = payload.get("data", payload)
    tx = FailedTransactionEvent(
        amount=float(data.get("amount", 99.0)),
        currency=data.get("currency", "USD"),
        decline_code=PaymentDeclineCode(data.get("decline_code", "insufficient_funds")),
        decline_message=data.get("decline_message", "Card declined by issuing bank"),
        issuing_bank=data.get("issuing_bank", "HDFC / Chase"),
        card_network=CardNetwork(data.get("card_network", "VISA")),
        retry_count=int(data.get("retry_count", 0)),
        customer_tenure_months=int(data.get("customer_tenure_months", 8)),
        day_of_month=int(data.get("day_of_month", 3)),
        time_of_day_utc=int(data.get("time_of_day_utc", 14))
    )
    record = await engine.process_failed_transaction(tx)
    return record.model_dump()

# Live Demo Simulation Scenarios for Hackathon Presentation
@app.post("/api/simulate/{scenario}")
async def simulate_scenario(scenario: str):
    """
    Interactive testbench for hackathon judges to verify the 4-part PayRevive loop.
    """
    if scenario == "processor_timeout":
        tx = FailedTransactionEvent(
            amount=249.00,
            currency="USD",
            decline_code=PaymentDeclineCode.PROCESSOR_TIMEOUT,
            decline_message="Gateway timeout: Bank authorization server unreachable > 8000ms",
            issuing_bank="Chase Bank",
            card_network=CardNetwork.VISA,
            retry_count=0,
            customer_tenure_months=14,
            day_of_month=15,
            time_of_day_utc=10
        )
    elif scenario == "insufficient_funds":
        tx = FailedTransactionEvent(
            amount=89.00,
            currency="USD",
            decline_code=PaymentDeclineCode.INSUFFICIENT_FUNDS,
            decline_message="Decline 51: Insufficient funds in account",
            issuing_bank="Wells Fargo",
            card_network=CardNetwork.MASTERCARD,
            retry_count=0,
            customer_tenure_months=7,
            day_of_month=22, # Mid-month (low liquidity) -> schedules for 1st
            time_of_day_utc=18
        )
    elif scenario == "card_expired":
        tx = FailedTransactionEvent(
            amount=199.00,
            currency="USD",
            decline_code=PaymentDeclineCode.CARD_EXPIRED,
            decline_message="Decline 54: Expired card credential",
            issuing_bank="CitiBank",
            card_network=CardNetwork.VISA,
            retry_count=0,
            customer_tenure_months=24,
            day_of_month=5,
            time_of_day_utc=12
        )
    elif scenario == "stolen_card":
        tx = FailedTransactionEvent(
            amount=550.00,
            currency="USD",
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
            amount=140.00,
            currency="USD",
            decline_code=PaymentDeclineCode.DO_NOT_HONOR,
            decline_message="Decline 05: Do not honor",
            issuing_bank="Bank of America",
            card_network=CardNetwork.MASTERCARD,
            retry_count=4, # Exceeds Visa/Mastercard 16-day limit
            customer_tenure_months=3,
            day_of_month=10,
            time_of_day_utc=9
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
