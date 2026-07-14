#!/usr/bin/env sh
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/.git/hooks"
cp "$ROOT/.githooks/commit-msg" "$ROOT/.git/hooks/commit-msg"
chmod +x "$ROOT/.git/hooks/commit-msg"
echo "Git commit-msg hook installed."
