@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install Node.js and reopen this launcher.
  pause
  exit /b 1
)
set "HOST=127.0.0.1"
set "PORT=3000"
set "TELEMETRY_ENABLED=1"
set "TELEMETRY_HOST=127.0.0.1"
set "TELEMETRY_PORT=5300"
echo Starting Forza Color Codes...
echo Open http://127.0.0.1:3000 in your browser after the server starts.
echo Keep this window open. Press Ctrl+C to stop.
echo.
node server.js
if errorlevel 1 (
  echo.
  echo The app could not start. Copy the error above for troubleshooting.
  pause
)
endlocal
