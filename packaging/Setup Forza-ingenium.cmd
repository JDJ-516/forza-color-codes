@echo off
setlocal
set "FORZA_SETUP_ROOT=%~dp0"
powershell.exe -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; try { $root=$env:FORZA_SETUP_ROOT; & ([ScriptBlock]::Create([IO.File]::ReadAllText((Join-Path $root 'install.ps1')))) -SourcePath (Join-Path $root 'app') } catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }"
if errorlevel 1 pause
