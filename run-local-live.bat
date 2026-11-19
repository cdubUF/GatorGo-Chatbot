@echo off
set "APP_PROFILE=local"
set "MODEL_PROVIDER=openai"
set "DEMO_MODE=false"
set "SAMPLE_KNOWLEDGE=true"
set "RESERVATION_MODE=disabled"
set "MEWS_SANDBOX_ENABLED=false"
set "SPEECH_ENABLED=true"
set "MULTILINGUAL_ENABLED=true"
if not defined PROVIDER_BUDGET_USD set "PROVIDER_BUDGET_USD=10"
rem Conservative per-call reservations for bounded local demo requests (not actual billing).
if not defined TEXT_CALL_RESERVE_USD set "TEXT_CALL_RESERVE_USD=0.25"
if not defined SPEECH_CALL_RESERVE_USD set "SPEECH_CALL_RESERVE_USD=0.25"
call "%~dp0run.bat"
