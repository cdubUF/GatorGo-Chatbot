$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$pythonPath = Join-Path (Get-Location) '.venv\Scripts\python.exe'
$usable = $false
if (Test-Path -LiteralPath $pythonPath) {
    try { & $pythonPath -c 'import sys; assert sys.version_info >= (3,11)' 2>$null; $usable = ($LASTEXITCODE -eq 0) } catch { $usable = $false }
}
if (-not $usable) {
    $pythonCandidate = $null
    $localRuntime = Join-Path (Get-Location) '.local\python-runtime\python.exe'
    foreach ($candidate in @($localRuntime, 'python', 'python3', 'py')) {
        if (Get-Command $candidate -ErrorAction SilentlyContinue) {
            try {
                & $candidate -c 'import sys; assert sys.version_info >= (3,11)' 2>$null
                if ($LASTEXITCODE -eq 0) { $pythonCandidate = $candidate; break }
            } catch { continue }
        }
    }
    if (-not $pythonCandidate) { throw 'Python is missing or the virtual environment is broken. Install Python 3.11+ from python.org, enable PATH, then run this script again.' }
    Write-Host 'Creating or repairing the project Python environment...'
    & $pythonCandidate -m venv --upgrade .venv
    if ($LASTEXITCODE -ne 0) { throw 'Could not create .venv. Check your Python installation.' }
    & $pythonPath -c 'import sys; assert sys.version_info >= (3,11)'
    if ($LASTEXITCODE -ne 0) { throw 'The repaired environment is not usable. Repair your Python installation and try again.' }
}
$stamp = Join-Path (Get-Location) '.venv\requirements.sha256'
$hash = (Get-FileHash requirements.txt -Algorithm SHA256).Hash
$dependenciesReady = $false
try { & $pythonPath -c 'import fastapi, uvicorn, httpx, dotenv' 2>$null; $dependenciesReady = ($LASTEXITCODE -eq 0) } catch { $dependenciesReady = $false }
if (-not $dependenciesReady -or -not (Test-Path $stamp) -or (Get-Content $stamp -Raw).Trim() -ne $hash) {
    Write-Host 'Checking and installing project dependencies...'
    & $pythonPath -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Check your internet connection and retry.' }
    Set-Content -LiteralPath $stamp -Value $hash
}
Write-Host 'Starting the concierge and API together. Press Ctrl+C to stop.'
& $pythonPath scripts/serve.py
exit $LASTEXITCODE
