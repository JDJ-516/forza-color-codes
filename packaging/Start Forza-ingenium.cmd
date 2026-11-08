@echo off
setlocal
title Start Forza-ingenium
if not exist "%~dp0app\runtime\node.exe" (
  echo Extract the complete ZIP first, then run this file from the extracted folder.
  pause
  exit /b 1
)
"%~dp0app\runtime\node.exe" "%~dp0app\launcher.js"
if errorlevel 1 pause
