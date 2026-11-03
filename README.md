# 💳 PayRevive // Autonomous AI Revenue Recovery Engine
> Built for the **UPSIDE DOWN.EXE** Hackathon (Technical Student Society, GNDU Amritsar)  
> **Problem Statement:** `PS-02 : Zero-Prompt AI` ("Kill the Chatbox. Build AI that responds to the world, not to a typed prompt.")

---

## 🎯 The Challenge & Why Chatboxes Fail in FinTech
Most AI tools require a human to sit in front of a chatbox, type a prompt, and babysit conversations. But in high-volume payment processing (UPI, Razorpay, Paytm, Stripe, Visa, Mastercard):
1. **Payments fail in milliseconds:** When an HDFC or ICICI server drops a UPI transaction or a recurring mandate fails, nobody has time to open ChatGPT or type a prompt.
2. **Blind retries burn millions:** Retrying blindly burns interchange fees ($0.35/retry) and triggers Visa Rule 5.4.1.3 fines and merchant account bans.
3. **True automation must be ambient:** Good automation notices failure events, understands context, acts across tools and devices, and recovers autonomously while keeping people in control.

---

## 💡 The Solution: PayRevive Architecture
PayRevive is an **event-driven, autonomous revenue recovery sentinel** with **ZERO chatbox interaction**.

```
[ WEBHOOK SENSOR ] ➔ [ XGBOOST + SHAP ] ➔ [ BANDIT OPTIMIZATION ] ➔ [ REGULATORY SHIELD ] ➔ [ CROSS-TOOL DISPATCH ]
  UPI / Card Failure    Root Cause & P(Rec)     Multi-Armed Bandit       Visa/Mastercard Mandate   • ICICI Secondary Rail
  Bank Server Drop      Feature Attribution     Expected Net ROI         Velocity & Fraud Check    • WhatsApp 1-Click Link
  Mandate Drop          TreeSHAP Weights        Dynamic Rerouting        Anti-Retry Blacklist      • Slack FinOps Alert
```

---

## 🌟 Key Features & Problem Statement Fulfillment

### 1. Zero Chatbox / 100% Ambient Execution
* Listens to payment webhooks from UPI switches (NPCI, PhonePe, GPay) and card gateways (RuPay, Visa, Mastercard).
* Zero user prompts required. Runs continuously in the background.

### 2. Understands Context & State (XGBoost + TreeSHAP)
* Analyzes decline telemetry (decline codes, issuer bank latency, day of month, tenure, retry count).
* Computes precise recovery probabilities $P(recovery)$ and calculates local TreeSHAP attribution scores explaining *why* the AI made the decision.

### 3. Acts Across Tools & Devices (Cross-Tool Dispatch)
* **Tool 1 (Payment Rail):** Seamlessly reroutes failed traffic to secondary ICICI / Axis UPI rails in <50ms.
* **Tool 2 (Customer Comm):** Automatically dispatches an OTP-less WhatsApp/SMS 1-click recovery link directly to the customer.
* **Tool 3 (Merchant Ops):** Posts incident resolution alerts to merchant Slack (`#finops-radar-alerts`).
* **Tool 4 (Mobile Phone):** Any smartphone can scan the QR code to run the **Mobile UPI App** with physical haptic vibration and audio feedback!

### 4. Recovers When Things Go Wrong (Multi-Armed Bandit Optimizer)
* Evaluates expected net ROI across competing recovery strategies:
  * `INSTANT_REROUTE_BACKUP_GATEWAY`: Instant failover for bank timeouts.
  * `SCHEDULE_SMART_PAYDAY_RETRY`: Captures payroll liquidity on the 1st or 5th of the month.
  * `AUTO_CARD_UPDATER`: Updates tokenized credentials via Visa Account Updater (VAU/ABU).
  * `ABANDON_NO_RETRY`: Aborts lost/stolen card retries to preserve fees.

### 5. "While Keeping People in Control" (Human-in-the-Loop Mode & Override)
* **Autonomous vs Supervised Mode Toggle:** Switch between 100% Autonomous AI and Supervised Mode.
* **1-Click Manual Override:** Operators can intervene and override any AI decision directly on the live feed.
* **Emergency Kill Switch:** Instant administrative control.

### 6. Ambient Gateway & Bank Telemetry Sensor
* Monitors live bank health:
  * `NPCI UPI Switch`: 99.8% Healthy
  * `HDFC Core Banking`: Outage Detected (1850ms) ➔ Proactive auto-reroute to ICICI
  * `ICICI Backup Rail`: Optimal (85ms)

---

## 📱 Mobile Application (PWA)
PayRevive is configured as a **Progressive Web App (PWA)**:
* Scan the QR Code on any phone (Android or iPhone) on the same Wi-Fi.
* Access the **Mobile UPI App Simulator (PhonePe/GPay View)** to experience a real UPI payment failure, physical phone vibration, and ambient AI recovery right in your hands!
* Can be installed to the mobile home screen as a standalone app.

---

## 🚀 Quickstart & How to Run

### Method 1: Double-Click Desktop Shortcut
Double-click **`PayRevive`** or **`Launch_PayRevive.bat`** on your Desktop. It automatically starts the server and opens your browser at **`http://localhost:8000`**.

### Method 2: Command Line
```powershell
python run.py
```

### Method 3: Mobile Phone
1. Open dashboard on laptop.
2. Click **`[OPEN ON PHONE (QR)]`**.
3. Scan with your phone camera to run on mobile!

---

## 👥 Hackathon Team & Repository
* **Project:** PayRevive // Autonomous AI Revenue Recovery Engine
* **Team Repository:** `https://github.com/nimishsuri01/UpsideDown-Hacko.git`
* **Author Repository:** `https://github.com/Manjotpreet-Singh/Zero-Prompt-AI.git`
* **Hackathon:** UPSIDE DOWN.EXE (Technical Student Society, GNDU Amritsar)
