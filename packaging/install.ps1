param([Parameter(Mandatory=$true)][string]$SourcePath)
$ErrorActionPreference = 'Stop'
$appRoot = Join-Path $env:LOCALAPPDATA 'ForzaGarage\app'
$sourceRoot = [IO.Path]::GetFullPath($SourcePath)
$node = Join-Path $sourceRoot 'runtime\node.exe'
if (!(Test-Path -LiteralPath $node) -or !(Test-Path -LiteralPath (Join-Path $sourceRoot 'launcher.js'))) {
    throw 'The installer payload is incomplete. Download the complete package again.'
}
if ($sourceRoot.TrimEnd('\') -eq ([IO.Path]::GetFullPath($appRoot)).TrimEnd('\')) {
    throw 'Run Setup from the downloaded package, outside the installed app folder.'
}
# Stop only a server whose PID and instance ID match this launcher's local state.
& $node (Join-Path $sourceRoot 'launcher.js') --stop
if ($LASTEXITCODE -ne 0) { throw 'Close the older app before updating. No files have been replaced.' }
New-Item -ItemType Directory -Path $appRoot -Force | Out-Null
Get-ChildItem -LiteralPath $sourceRoot -Force | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $appRoot -Recurse -Force }
$node = Join-Path $appRoot 'runtime\node.exe'
$shell = New-Object -ComObject WScript.Shell
function Quote-Literal([string]$value) { return "'" + $value.Replace("'", "''") + "'" }
function Make-Shortcut([string]$path, [string]$flag) {
    $command = '& ' + (Quote-Literal $node) + ' ' + (Quote-Literal (Join-Path $appRoot 'launcher.js'))
    if ($flag) { $command += ' ' + $flag }
    $command += '; if ($LASTEXITCODE -ne 0) { Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show(' +
        (Quote-Literal 'Forza-ingenium could not start or stop. Close any older Forza CMD window and retry. Details are in %LOCALAPPDATA%\ForzaGarage\runtime\launcher-error.txt.') + ', ' + (Quote-Literal 'Forza-ingenium') + ') | Out-Null }'
    $shortcut = $shell.CreateShortcut($path)
    $shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $shortcut.Arguments = '-NoLogo -NoProfile -WindowStyle Hidden -Command "' + $command + '"'
    $shortcut.WorkingDirectory = $appRoot
    $shortcut.WindowStyle = 7
    $shortcut.Description = 'Start Forza-ingenium and its telemetry receiver'
    $shortcut.Save()
}
$desktop = [Environment]::GetFolderPath('Desktop')
$programs = Join-Path ([Environment]::GetFolderPath('Programs')) 'Forza-ingenium'
New-Item -ItemType Directory -Path $programs -Force | Out-Null
Make-Shortcut (Join-Path $desktop 'Forza-ingenium.lnk') ''
Make-Shortcut (Join-Path $programs 'Forza-ingenium.lnk') ''
Make-Shortcut (Join-Path $programs 'Stop Forza-ingenium.lnk') '--stop'
# Retire only the pre-rebrand shortcuts created by this installer.
function Remove-LegacyShortcut([string]$path) {
    if (!(Test-Path -LiteralPath $path -PathType Leaf)) { return }
    try {
        $legacy = $shell.CreateShortcut($path)
        $launcherPath = Join-Path $appRoot 'launcher.js'
        $powerShellPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
        if ($legacy.TargetPath -eq $powerShellPath -and $legacy.WorkingDirectory -eq $appRoot -and
            $legacy.Description -eq 'Start Forza Garage and its telemetry receiver' -and
            $legacy.Arguments.IndexOf($launcherPath, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
            Remove-Item -LiteralPath $path -Force
        }
    } catch {
        Write-Host 'An older shortcut could not be inspected or removed; it was left in place.'
    }
}
$legacyPrograms = Join-Path ([Environment]::GetFolderPath('Programs')) 'Forza Garage'
Remove-LegacyShortcut (Join-Path $desktop 'Forza Garage.lnk')
Remove-LegacyShortcut (Join-Path $legacyPrograms 'Forza Garage.lnk')
Remove-LegacyShortcut (Join-Path $legacyPrograms 'Stop Forza Garage.lnk')
try {
    if ((Test-Path -LiteralPath $legacyPrograms -PathType Container) -and
        @(Get-ChildItem -LiteralPath $legacyPrograms -Force).Count -eq 0) {
        Remove-Item -LiteralPath $legacyPrograms
    }
} catch {
    Write-Host 'The older Start Menu folder was left in place.'
}
Write-Host 'Installed. Use the Forza-ingenium desktop shortcut from now on.' -ForegroundColor Green
Write-Host 'The background app stops at sign-out, or with Start menu > Forza-ingenium > Stop Forza-ingenium.'
& $node (Join-Path $appRoot 'launcher.js')
if ($LASTEXITCODE -ne 0) { throw 'Installation completed, but the app could not start. Close the older Forza CMD window, then use the desktop shortcut.' }
