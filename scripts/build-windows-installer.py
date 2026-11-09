"""Build a self-contained Windows bootstrap installer, without network access.
Bundles a pinned, checksum-verified Windows Node.js runtime; no runtime downloads.
"""
from pathlib import Path
import base64
import hashlib
import io
import zipfile
import json
import urllib.request

ROOT=Path(__file__).resolve().parents[1]

def runtime_files():
    manifest=json.loads((ROOT/'packaging/node-runtime.json').read_text())
    cache=ROOT/'.cache'/manifest['url'].rsplit('/',1)[1]
    if not cache.exists():
        raise RuntimeError('Runtime cache missing. Run this script with --fetch-runtime first.')
    binary=cache.read_bytes()
    if hashlib.sha256(binary).hexdigest()!=manifest['archiveSha256']:
        raise RuntimeError('Official Node runtime archive checksum mismatch')
    prefix='node-'+manifest['version']+'-'+manifest['platform']+'/'
    with zipfile.ZipFile(io.BytesIO(binary)) as archive:
        node=archive.read(prefix+'node.exe')
        if hashlib.sha256(node).hexdigest()!=manifest['nodeExeSha256']:
            raise RuntimeError('Node executable checksum mismatch')
        return {'app/runtime/node.exe':node,
                'app/runtime/LICENSE':archive.read(prefix+'LICENSE'),
                'app/runtime/node-runtime.json':(ROOT/'packaging/node-runtime.json').read_bytes()}

def payload_files():
    files=[ROOT/name for name in ['package.json','server.js','telemetry.js','fh6-decoder.js','car-identities.js','telemetry-engine.js','rare-cars.js','launcher.js','README.md']]
    files+=sorted((ROOT/'public').glob('*'))
    files+=sorted((ROOT/'docs').glob('*.md'))
    result={'app/'+file.relative_to(ROOT).as_posix():file.read_bytes() for file in files if file.is_file()}
    result.update(runtime_files())
    result['install.ps1']=(ROOT/'packaging/install.ps1').read_bytes()
    for name in ['Start Forza-ingenium.cmd','Stop Forza-ingenium.cmd','Setup Forza-ingenium.cmd','READ ME.txt']:
        result[name]=(ROOT/'packaging'/name).read_bytes()
    return result

def payload():
    output=io.BytesIO()
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        for name,data in payload_files().items():
            entry=zipfile.ZipInfo(name,date_time=(2026,1,1,0,0,0))
            entry.compress_type=zipfile.ZIP_DEFLATED
            archive.writestr(entry,data)
    return output.getvalue()

def build():
    binary=payload();(ROOT/'Forza-ingenium-Windows-x64.zip').write_bytes(binary);digest=hashlib.sha256(binary).hexdigest()
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
    header='\r\n'.join(['@echo off','setlocal','title Install Forza-ingenium','set "FORZA_INSTALLER=%~f0"',
        'powershell.exe -NoLogo -NoProfile -Command "'+bootstrap+'"',
        'if errorlevel 1 (','  pause','  exit /b 1',')','exit /b 0',':FORZA_PAYLOAD',''])
    encoded=base64.b64encode(binary).decode('ascii')
    target=ROOT/'Install Forza-ingenium.cmd'
    target.write_bytes((header+'\r\n'.join(encoded[i:i+120] for i in range(0,len(encoded),120))+'\r\n').encode('ascii'))
    return target,len(binary),digest

if __name__=='__main__':
    import sys
    if '--fetch-runtime' in sys.argv:
        manifest=json.loads((ROOT/'packaging/node-runtime.json').read_text())
        destination=ROOT/'.cache'/manifest['url'].rsplit('/',1)[1]
        destination.parent.mkdir(exist_ok=True)
        data=urllib.request.urlopen(manifest['url'],timeout=120).read()
        if hashlib.sha256(data).hexdigest()!=manifest['archiveSha256']:
            raise RuntimeError('Downloaded runtime checksum mismatch')
        destination.write_bytes(data)
    target,size,digest=build();print(f'Built {target.name}: {target.stat().st_size} bytes, payload {size} bytes, SHA256 {digest}')
