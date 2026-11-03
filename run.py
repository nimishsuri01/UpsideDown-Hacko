import uvicorn
import os
import threading
import time
import socket

def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def find_available_port(preferred_port: int = 8000) -> int:
    for port in [preferred_port, 8085, 8080, 8081, 5000]:
        if not is_port_in_use(port):
            return port
    return 8000

def open_browser(port: int):
    time.sleep(1.2)
    local_ip = get_local_ip()
    local_url = f"http://localhost:{port}"
    mobile_url = f"http://{local_ip}:{port}"
    print("\n" + "="*65)
    print(">>> PAYREVIVE // Autonomous AI Revenue Recovery Engine (PS-02)")
    print(f"    Laptop URL:       {local_url}")
    print(f"    Mobile Phone URL: {mobile_url} (Open on Phone via Wi-Fi!)")
    print("    Payment Rails:    UPI (GPay/PhonePe), RuPay, Visa, Mastercard")
    print("    Zero-Prompt:      100% Webhook-Driven * ZERO CHATBOX")
    print("="*65 + "\n")
    
    opened = False
    # Method 1: os.startfile (Windows native ShellExecute)
    if hasattr(os, "startfile"):
        try:
            os.startfile(local_url)
            opened = True
        except Exception:
            pass

    # Method 2: webbrowser module fallback
    if not opened:
        try:
            import webbrowser
            opened = webbrowser.open(local_url)
        except Exception:
            pass

    # Method 3: PowerShell Start-Process fallback
    if not opened:
        try:
            import subprocess
            subprocess.Popen(["powershell", "-WindowStyle", "Hidden", "-Command", f"Start-Process '{local_url}'"])
        except Exception:
            pass

if __name__ == "__main__":
    port = find_available_port(8000)
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
