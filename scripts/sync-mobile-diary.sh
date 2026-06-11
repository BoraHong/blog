#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [[ -f "$repo_root/.mobile-diary-sync-disabled" ]]; then
  echo "Mobile diary sync is OFF. Run scripts/enable-mobile-diary-sync.sh to turn it back on."
  exit 0
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"

git pull --rebase --autostash origin "$current_branch"

"$repo_root/scripts/import-mobile-diary.sh"

if [[ -z "$(git status --porcelain -- content/Diary)" ]]; then
  echo "No diary changes to sync."
  exit 0
fi

git add content/Diary

if git diff --cached --quiet -- content/Diary; then
  echo "No staged diary changes to sync."
  exit 0
fi

git commit -m "diary: sync mobile notes"
git push origin "$current_branch"
