#!/usr/bin/env bash
# Bootstrap and start the Gator Go demo. One server hosts both the API and UI.
set -Eeuo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

printf '\n%s\n' 'Gator Go setup: checking Python and project dependencies...'
case "${OSTYPE:-}" in
  msys*|cygwin*|win32*)
    command -v powershell.exe >/dev/null 2>&1 || { echo 'PowerShell is required on Windows.' >&2; exit 1; }
    script="$ROOT/scripts/dev.ps1"
    if command -v cygpath >/dev/null 2>&1; then script="$(cygpath -w "$script")"; fi
    exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$script"
    ;;
  *) exec bash "$ROOT/scripts/dev.sh" ;;
esac
