#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
rm -f "$repo_root/.mobile-diary-sync-disabled"

echo "Mobile diary sync is ON."
