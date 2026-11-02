#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v python3 >/dev/null; then
  echo 'Install Python 3.11+ and retry.' >&2; exit 1
fi
python3 -c 'import sys; assert sys.version_info >= (3,11), "Python 3.11+ required"'
if [ ! -x .venv/bin/python ]; then python3 -m venv .venv; fi
hash=$(.venv/bin/python -c 'import hashlib; print(hashlib.sha256(open("requirements.txt","rb").read()).hexdigest())')
if [ ! -f .venv/requirements.sha256 ] || [ "$(cat .venv/requirements.sha256)" != "$hash" ]; then
  .venv/bin/python -m pip install -r requirements.txt
  printf '%s\n' "$hash" > .venv/requirements.sha256
fi
exec .venv/bin/python scripts/serve.py
