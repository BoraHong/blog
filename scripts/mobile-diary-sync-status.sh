#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$repo_root/.mobile-diary-sync-disabled" ]]; then
  echo "Mobile diary sync is OFF."
else
  echo "Mobile diary sync is ON."
fi
