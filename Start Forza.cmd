@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install Node.js LTS and reopen this launcher.
  pause
  exit /b 1
)
node launcher.js
if errorlevel 1 (
  echo.
  echo Close any older Forza CMD window and retry. See the error above.
  pause
)
endlocal
