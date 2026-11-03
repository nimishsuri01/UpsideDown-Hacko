# 💳 PayRevive // Autonomous AI Revenue Recovery Engine
> Built for the **UPSIDE DOWN.EXE** Hackathon (Technical Student Society, GNDU Amritsar)  
> **Problem Statement:** `PS-02 : Zero-Prompt AI` ("Kill the Chatbox")

---

## 🎯 The Problem: Involuntary Churn & Payment Failure Losses
When online transactions fail (credit card declines, network timeouts, authorization errors), businesses lose massive revenue automatically:
1. **Static Hand-Written Rules:** Retrying blindly (e.g. 3 times at set intervals) burns fees and irritates customers.
2. **Zero Cause Analysis:** Retrying terminal declines (e.g. expired or stolen cards) wastes $0.35+ per transaction.
3. **Compliance Risks:** Automated retry storms trigger Visa/Mastercard network fines and merchant account bans.

---

## 💡 The Solution: PayRevive (A 4-Part Zero-Prompt System)
PayRevive operates as an **event-driven, autonomous revenue recovery sentinel** with **ZERO chatbox interaction**.

```
[ WEBHOOK TRIGGER ] ➔ [ XGBOOST + SHAP ] ➔ [ BANDIT OPTIMIZATION ] ➔ [ COMPLIANCE FILTER ] ➔ [ RECOVERY OUTCOME ]
  Payment Failed        Root Cause & P(Rec)     Contextual Action        Visa/Mastercard Mandate    Recovered Revenue
  Stripe / Razorpay     Feature Attribution     Net Expected Value       Velocity & Fraud Check     Fees Preserved
```

### 1. Root-Cause Diagnosis (XGBoost + TreeSHAP)
As soon as a payment failure webhook arrives, the engine analyzes transaction telemetry (decline code, issuer bank, customer tenure, day of month, retry history) and computes:
* Precise recovery probability $P(recovery)$.
* **SHAP Feature Attribution Values:** Visualized impact metrics explaining *why* the AI diagnosed the failure.

### 2. Action Optimization (Contextual Multi-Armed Bandit)
Instead of static rules, an adaptive bandit algorithm chooses the optimal action only when expected payout exceeds retry costs:
* `INSTANT_REROUTE_BACKUP_GATEWAY`: Instant failover via secondary rail for bank/processor timeouts.
* `SCHEDULE_SMART_PAYDAY_RETRY`: Aligns retries to 1st or 5th of the month at 08:30 AM (payroll liquidity capture).
* `AUTO_CARD_UPDATER`: Background account token update for expired cards without bothering the customer.
* `ABANDON_NO_RETRY`: Immediately abandons terminal failures (stolen cards) to save $0.35 processing fees.

### 3. Strict Compliance Guardrails
Every proposed recovery action passes through real-world payment network filters:
* **Visa Core Mandate:** Maximum 4 retry attempts within 16 consecutive calendar days.
* **Mastercard Excessive Retry Standards:** Velocity limits (Max 2 attempts in 24 hours).
* **Terminal Fraud Filter:** Absolute prohibition on retrying lost/stolen cards.

### 4. Autonomous Audit Trail & Real-time Live Radar
* Operates 100% in the background via webhooks without needing manual user prompts.
* WebSocket streams live metrics to an executive FinTech Radar Dashboard:
  * **Total Failed Revenue at Risk ($)**
  * **Total Revenue Recovered ($)**
  * **Processing Fees Saved ($)**
  * **Autonomous Recovery Rate (%)**

---

## 🚀 How to Run (1-Command Startup)

```powershell
python run.py
```

Opens the live dashboard at **`http://localhost:8000`**.

---

## 🎪 Live Demo Walkthrough for Hackathon Judges

1. **Point out the Zero-Prompt Architecture:**
   * Highlight that there is **NO chat window or text input**. The system is 100% ambient and webhook-driven.
2. **Click the 5 Testbench Triggers:**
   * **Trigger 1 (Gateway Timeout - $249.00):** Watch XGBoost diagnose the transient timeout and the Bandit instantly reroute via the Adyen Direct Rail with 0.0ms latency.
   * **Trigger 2 (Insufficient Funds - $89.00):** Watch the Temporal Bandit calculate low mid-month liquidity and schedule a smart payday retry on the 1st of next month.
   * **Trigger 3 (Card Expired - $199.00):** Watch the engine dispatch an automated card token updater query without disturbing the customer.
   * **Trigger 4 (Stolen Card - $550.00):** Watch the bandit choose zero-loss abandonment to save processing fees.
   * **Trigger 5 (16-Day Limit Breach - $140.00):** Watch the Compliance Guardrail block the action, protecting the merchant from Visa/Mastercard regulatory penalties.
3. **Show Financial Counters:**
   * Watch **Recovered Revenue** and **Fees Saved** counters update live in real-time!
