"""Build a self-contained Windows bootstrap installer, without network access.
Requires the existing Node.js installation at runtime; does not bundle credentials.
"""
from pathlib import Path
import base64
import hashlib
import io
import zipfile

ROOT=Path(__file__).resolve().parents[1]

def payload():
    files=[ROOT/name for name in ['package.json','server.js','telemetry.js','fh6-decoder.js','launcher.js','README.md']]
    files+=sorted((ROOT/'public').glob('*'))
    files+=sorted((ROOT/'docs').glob('*.md'))
    output=io.BytesIO()
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        for file in files:
            if not file.is_file():continue
            rel=file.relative_to(ROOT).as_posix()
            entry=zipfile.ZipInfo('app/'+rel,date_time=(2026,1,1,0,0,0))
            entry.compress_type=zipfile.ZIP_DEFLATED
            archive.writestr(entry,file.read_bytes())
        entry=zipfile.ZipInfo('install.ps1',date_time=(2026,1,1,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED
        archive.writestr(entry,(ROOT/'packaging/install.ps1').read_bytes())
    return output.getvalue()

def build():
    binary=payload();digest=hashlib.sha256(binary).hexdigest()
    # The script reads its path from an environment variable, not interpolated command text.
    # SHA-256 detects a truncated/corrupted payload; it is not a code-signing claim.
    bootstrap=("$ErrorActionPreference='Stop'; $temp=$null; try { "
      "$text=[IO.File]::ReadAllText($env:FORZA_INSTALLER); $marker=':FORZA_PAYLOAD'; "
      "$encoded=$text.Substring($text.LastIndexOf($marker)+$marker.Length).Trim(); "
      "$bytes=[Convert]::FromBase64String($encoded); $sha=[Security.Cryptography.SHA256]::Create(); "
      "$actual=([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant(); "
      f"if($actual -ne '{digest}') {{ throw 'Installer checksum failed. Download the complete file again.' }}; "
      "$temp=Join-Path ([IO.Path]::GetTempPath()) ('ForzaGarage-'+[guid]::NewGuid().ToString('N')); "
      "New-Item -ItemType Directory -Path $temp | Out-Null; $zip=Join-Path $temp 'app.zip'; "
      "[IO.File]::WriteAllBytes($zip,$bytes); Expand-Archive -LiteralPath $zip -DestinationPath $temp; "
      "$script=[IO.File]::ReadAllText((Join-Path $temp 'install.ps1')); "
      "& ([ScriptBlock]::Create($script)) -SourcePath (Join-Path $temp 'app'); "
      "} catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 } "
      "finally { if($temp -and (Test-Path -LiteralPath $temp)) { Remove-Item -LiteralPath $temp -Recurse -Force } }")
    header='\r\n'.join(['@echo off','setlocal','title Install Forza Garage','set "FORZA_INSTALLER=%~f0"',
        'powershell.exe -NoLogo -NoProfile -Command "'+bootstrap+'"',
        'if errorlevel 1 (','  pause','  exit /b 1',')','exit /b 0',':FORZA_PAYLOAD',''])
    encoded=base64.b64encode(binary).decode('ascii')
    target=ROOT/'Install Forza Garage.cmd'
    target.write_bytes((header+'\r\n'.join(encoded[i:i+120] for i in range(0,len(encoded),120))+'\r\n').encode('ascii'))
    return target,len(binary),digest

if __name__=='__main__':
    target,size,digest=build();print(f'Built {target.name}: {target.stat().st_size} bytes, payload {size} bytes, SHA256 {digest}')
