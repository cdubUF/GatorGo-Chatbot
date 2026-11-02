@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev.ps1"
set "GATORGO_EXIT=%ERRORLEVEL%"
if not "%GATORGO_EXIT%"=="0" pause
exit /b %GATORGO_EXIT%
