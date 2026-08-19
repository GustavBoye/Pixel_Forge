#!/usr/bin/env bash
# Start a new short story from the template.
#   ./new-story.sh "The Light"
set -euo pipefail

[ $# -ge 1 ] || { echo "usage: $0 \"Story Title\"" >&2; exit 1; }

title="$*"
dir="$(cd "$(dirname "$0")" && pwd)/stories"
slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g')
file="$dir/$slug.md"

[ -e "$file" ] && { echo "already exists: $file" >&2; exit 1; }

sed -e "s/^title:$/title: $title/" -e "s/^# TITLE$/# $title/" "$dir/_TEMPLATE.md" > "$file"
echo "$file"
