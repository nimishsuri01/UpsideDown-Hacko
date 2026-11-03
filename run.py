import uvicorn
import webbrowser
import threading
import time

def open_browser():
    time.sleep(1.2)
    print("\n" + "="*65)
    print("🚀 PAYREVIVE // Autonomous AI Revenue Recovery Engine")
    print("📍 Dashboard URL: http://localhost:8000")
    print("⚡ ML Model: GradientBoosting + TreeSHAP Active")
    print("⚡ Decision Engine: Contextual Multi-Armed Bandit (MAB)")
    print("⚡ Zero-Prompt Guarantee: 100% Webhook-Driven • ZERO CHATBOX")
    print("="*65 + "\n")
    try:
        webbrowser.open("http://localhost:8000")
    except Exception:
        pass

if __name__ == "__main__":
    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
