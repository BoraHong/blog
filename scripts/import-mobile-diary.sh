#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="${1:-$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/hongbora/Diary}"
dest_root="${2:-$repo_root/content/Diary}"

if [[ ! -d "$source_dir" ]]; then
  echo "Source directory does not exist: $source_dir" >&2
  exit 1
fi

copied=0
unchanged=0
skipped=0

file_signature() {
  local path="$1"
  stat -f '%m %z %Lp' "$path"
}

while IFS= read -r -d '' source_file; do
  filename="$(basename "$source_file")"

  if [[ "$filename" =~ ^([0-9]{4})\.([0-9]{2})\.[0-9]{2}\..*\.md$ ]]; then
    year="${BASH_REMATCH[1]}"
    month="${BASH_REMATCH[2]}"
    dest_dir="$dest_root/${year}_${month}"
    dest_file="$dest_dir/$filename"

    mkdir -p "$dest_dir"

    if [[ -f "$dest_file" ]]; then
      source_signature="$(file_signature "$source_file")"
      dest_signature="$(file_signature "$dest_file")"

      if [[ "$source_signature" == "$dest_signature" ]] && cmp -s "$source_file" "$dest_file"; then
        echo "unchanged: $filename -> ${year}_${month}/"
        unchanged=$((unchanged + 1))
        continue
      fi
    fi

    {
      cp -p "$source_file" "$dest_file"
      echo "copied:   $filename -> ${year}_${month}/"
      copied=$((copied + 1))
    }
  else
    echo "skipped:  $filename"
    skipped=$((skipped + 1))
  fi
done < <(find "$source_dir" -maxdepth 1 -type f -print0 | sort -z)

echo
echo "Done. copied=$copied unchanged=$unchanged skipped=$skipped"
