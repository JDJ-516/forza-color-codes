param([Parameter(Mandatory=$true)][string]$SourcePath)
$ErrorActionPreference = 'Stop'
$node = (Get-Command node.exe -CommandType Application -ErrorAction Stop).Source
$major = [int]((& $node --version).TrimStart('v').Split('.')[0])
if ($major -lt 22) { throw 'Node.js 22 or newer is required. Install Node.js LTS, then run this installer again.' }
$appRoot = Join-Path $env:LOCALAPPDATA 'ForzaGarage\app'
$sourceRoot = [IO.Path]::GetFullPath($SourcePath)
if (!(Test-Path -LiteralPath (Join-Path $sourceRoot 'launcher.js'))) { throw 'The installer payload is incomplete.' }
# Stop only a server whose PID and instance ID match this launcher's local state.
& $node (Join-Path $sourceRoot 'launcher.js') --stop
if ($LASTEXITCODE -ne 0) { throw 'Close the older app before updating. No files have been replaced.' }
New-Item -ItemType Directory -Path $appRoot -Force | Out-Null
Get-ChildItem -LiteralPath $sourceRoot -Force | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $appRoot -Recurse -Force }
$shell = New-Object -ComObject WScript.Shell
function Quote-Literal([string]$value) { return "'" + $value.Replace("'", "''") + "'" }
function Make-Shortcut([string]$path, [string]$flag) {
    $command = '& ' + (Quote-Literal $node) + ' ' + (Quote-Literal (Join-Path $appRoot 'launcher.js'))
    if ($flag) { $command += ' ' + $flag }
    $command += '; if ($LASTEXITCODE -ne 0) { Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show(' +
        (Quote-Literal 'Forza Garage could not start or stop. Close any older Forza CMD window and retry. Details are in %LOCALAPPDATA%\ForzaGarage\runtime\launcher-error.txt.') + ', ' + (Quote-Literal 'Forza Garage') + ') | Out-Null }'
    $shortcut = $shell.CreateShortcut($path)
    $shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $shortcut.Arguments = '-NoLogo -NoProfile -WindowStyle Hidden -Command "' + $command + '"'
    $shortcut.WorkingDirectory = $appRoot
    $shortcut.WindowStyle = 7
    $shortcut.Description = 'Start Forza Garage and its telemetry receiver'
    $shortcut.Save()
}
$desktop = [Environment]::GetFolderPath('Desktop')
$programs = Join-Path ([Environment]::GetFolderPath('Programs')) 'Forza Garage'
New-Item -ItemType Directory -Path $programs -Force | Out-Null
Make-Shortcut (Join-Path $desktop 'Forza Garage.lnk') ''
Make-Shortcut (Join-Path $programs 'Forza Garage.lnk') ''
Make-Shortcut (Join-Path $programs 'Stop Forza Garage.lnk') '--stop'
Write-Host 'Installed. Use the Forza Garage desktop shortcut from now on.' -ForegroundColor Green
Write-Host 'The background app stops at sign-out, or with Start menu > Forza Garage > Stop Forza Garage.'
& $node (Join-Path $appRoot 'launcher.js')
if ($LASTEXITCODE -ne 0) { throw 'Installation completed, but the app could not start. Close the older Forza CMD window, then use the desktop shortcut.' }
