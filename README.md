# 💳 PayRevive // Autonomous AI Revenue Recovery Engine
> Built for the **UPSIDE DOWN.EXE** Hackathon (GNDU Technical Student Society)  
> **Problem Statement:** `PS-02 : Zero-Prompt AI` ("Kill the Chatbox. Build ambient, autonomous AI that acts on events and state changes with zero typed prompts while keeping humans in control.")

---

## 🚀 Live Demo & Presentation Links
* 🌐 **Live FinTech Dashboard:** `http://localhost:8000`
* 📊 **Interactive Architecture Flowchart:** `http://localhost:8000/flowchart`
* 🖥️ **Presentation Pitch Deck (Web Slides):** `http://localhost:8000/slides`
* 📁 **PowerPoint File:** `PayRevive_Hackathon_Pitch_Deck.pptx` (Saved on Desktop & Repository)

---

## 🎯 The Real-World Pain Point ($10B Involuntary Churn)
India processes **450M+ daily UPI transactions** across Google Pay, Paytm, and PhonePe.
1. **Payments Fail in Milliseconds:** During peak checkout hours (Swiggy, Zomato, petrol pumps), core banking sockets (HDFC, SBI, Paytm) spike above 2,400ms (`Decline U30: Core Banking Socket Timeout`).
2. **Involuntary Cart Abandonment:** Customers don't want to cancel! But when the bank drops, customers abandon their cart or leave the store, causing merchants to lose millions in direct revenue.
3. **Why Chatbots FAIL (The PS-02 Core):** Traditional AI pops up a support chatbox: *"Hi, please type your complaint."* **Nobody chats with an AI bot at a crowded petrol pump or food checkout!** The chatbox must be killed. Automation must be ambient, silent, and autonomous.

---

## 💡 The Solution: PayRevive Architecture

PayRevive is an **event-driven, autonomous revenue recovery sentinel** that plugs directly into Payment Orchestrators (Juspay / Razorpay / Cashfree) with **ZERO typed prompts**.

```
[ Customer Checkout ] ➔ [ Primary UPI Node (HDFC/Paytm) ] ──x [ Core Bank Timeout >2400ms ]
                                                                     │ (15ms Webhook)
                                                                     ▼
[ ICICI Secondary Rail ] ◄──(12.4ms Preemptive Failover)── [ PayRevive Zero-Prompt Brain ]
        │                                                            │
        ▼                                                            ▼
[ ✓ Succeeded ₹499 ]                                       [ WhatsApp 1-Click Link ]
[ Zero User Churn  ]                                       [ Merchant Slack Alert  ]
```

---

## 🌟 Core Features & Technical Highlights

### 1. Zero Chatbox / 100% Event-Driven Autonomy
* Subscribes to incoming payment webhooks (`/api/webhook/custom`) from UPI switches (NPCI, PhonePe, GPay) and card gateways (RuPay, Visa, Mastercard).
* Zero user prompts required. Runs continuously in the background.

### 2. Ambient Bank & Gateway Health Sentinel
* 24/7 background sensor continuously polling bank core nodes (NPCI, HDFC, Paytm, ICICI).
* Detects latency spikes (>1200ms) and triggers **State Change Detection** to hot-reroute upcoming traffic to the ICICI Secondary Rail *before* customers fail.

### 3. Glass-Box Machine Learning (XGBoost + TreeSHAP)
* Evaluates 8 transaction features in **12.4ms** to diagnose failure root causes.
* Computes exact mathematical TreeSHAP feature weights (local explainability). Not a black-box AI!

### 4. Contextual Multi-Armed Bandit (Thompson Sampling)
* Uses reinforcement learning (Beta Prior $\alpha=9, \beta=1$) to select the optimal recovery policy:
  * `INSTANT_REROUTE_BACKUP_GATEWAY`: Instant failover for bank timeouts.
  * `SCHEDULE_SMART_PAYDAY_RETRY`: Captures payroll liquidity on salary days.
  * `ABANDON_NO_RETRY`: Aborts stolen cards to preserve fees.

### 5. Regulatory Guardrails & Dedicated Blocked Reasons
* Enforces **RBI Master Directions on Payment Aggregators** & **Visa/Mastercard Core Rule 5.1**.
* **Smart Shield:** If a card is reported lost/stolen (`Decline 41`) or exceeds the 4-retry limit, AI aggressively **BLOCKS** the transaction, explicitly displaying the reason and saving the merchant ₹30–₹150 in interchange penalties!

### 6. Big-3 Indian UPI Simulator
* Interactive 1-click segmented switcher: **Google Pay (`manjot@okhdfcbank`)**, **Paytm UPI (`manjot@paytm`)**, and **PhonePe (`manjot@ybl`)**.

### 7. Cross-Tool Dispatches
* **Tool 1:** Hot-reroutes to ICICI Secondary Rail API.
* **Tool 2:** Dispatches customer 1-click WhatsApp recovery link.
* **Tool 3:** Posts incident alerts to merchant Slack (`#finops-radar-alerts`).
* **Tool 4:** Real-world mobile PWA with physical haptic vibration (`navigator.vibrate`) and audio chimes.

### 8. Human-in-the-Loop (HITL) Mode
* FinOps operators can toggle Supervised Mode and override any AI action in 1 click.

---

## 🎤 60-Second Judge Pitch Script

> *"Sir, our project is **PayRevive — Autonomous AI Revenue Recovery Sentinel** for **PS-02 : Zero-Prompt AI**.*
> 
> *1. **We killed the chatbox:** When a payment fails on Swiggy or at a petrol pump, customers don't want to chat with a support bot. 
> 2. **Ambient Telemetry:** Our background sensor monitors live bank pings. When we simulate an HDFC outage, the AI detects the state change and proactively reroutes traffic to the ICICI backup rail.
> 3. **12ms Recovery:** In our mobile simulator, when a Google Pay or Paytm payment times out, PayRevive evaluates XGBoost and Thompson Sampling to hot-reroute the transaction in 12.4ms.
> 4. **Smart Fraud Shield:** If a card is stolen, it aggressively blocks it under RBI rules, saving the merchant penalty fees.
> 
> *Everything runs with zero typed prompts, pure event-driven autonomy, and sub-50ms gateway SLA compliance!"*

---

## 👥 Hackathon Team & Repositories
* **Project:** PayRevive // Autonomous AI Revenue Recovery Engine
* **Team Repositories:**
  - `https://github.com/Manjotpreet-Singh/Zero-Prompt-AI.git`
  - `https://github.com/nimishsuri01/UpsideDown-Hacko.git`
