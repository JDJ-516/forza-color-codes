@echo off
setlocal
title Stop Forza-ingenium
if not exist "%~dp0app\runtime\node.exe" (
  echo Extract the complete ZIP first, then run this file from the extracted folder.
  pause
  exit /b 1
)
"%~dp0app\runtime\node.exe" "%~dp0app\launcher.js" --stop
if errorlevel 1 pause
