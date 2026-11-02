$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$pythonPath = Join-Path (Get-Location) '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) {
    $pythonCandidate = $null
    foreach ($candidate in @('python', 'python3', 'py')) {
        if (Get-Command $candidate -ErrorAction SilentlyContinue) {
            & $candidate -c 'import sys; assert sys.version_info >= (3,11)' 2>$null
            if ($LASTEXITCODE -eq 0) { $pythonCandidate = $candidate; break }
        }
    }
    if (-not $pythonCandidate) { throw 'Install Python 3.11+ from python.org, enable PATH, and reopen your terminal.' }
    & $pythonCandidate -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Could not create .venv. Check your Python installation.' }
}
$stamp = Join-Path (Get-Location) '.venv\requirements.sha256'
$hash = (Get-FileHash requirements.txt -Algorithm SHA256).Hash
if (-not (Test-Path $stamp) -or (Get-Content $stamp -Raw).Trim() -ne $hash) {
    & $pythonPath -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Check your internet connection and retry.' }
    Set-Content -LiteralPath $stamp -Value $hash
}
& $pythonPath scripts/serve.py
exit $LASTEXITCODE
