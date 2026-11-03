@echo off
title PayRevive // Autonomous AI Revenue Recovery Engine (PS-02)
color 0A
cls
echo =====================================================================
echo   PAYREVIVE // Autonomous AI Revenue Recovery Engine (PS-02)
echo   Built for UPSIDE DOWN.EXE Hackathon (GNDU Technical Student Society)
echo =====================================================================
echo.
echo [*] Navigating to project directory...
cd /d "%~dp0"

echo [*] Launching background browser trigger...
start "" powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:8000'"

echo [*] Starting PayRevive server and dashboard...
echo.
python run.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server terminated with an error code.
    pause
)
