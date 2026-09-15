@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo [ListingReady] Node.js and npm are required. Install Node.js, then run this file again.
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo [ListingReady] Missing .env.local.
  echo Copy .env.example to .env.local and fill TOKEN_PLAN_API_KEY locally.
  pause
  exit /b 1
)

echo [1/2] Installing project dependencies...
call npm install
if errorlevel 1 (
  echo [ListingReady] npm install failed. Check the network and the log above.
  pause
  exit /b 1
)

echo [2/2] Starting ListingReady with the real Token Plan service...
call npx --yes node@22.13.1 scripts\start-live.mjs
if errorlevel 1 pause

endlocal
