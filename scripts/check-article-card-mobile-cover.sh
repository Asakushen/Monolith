#!/usr/bin/env bash
# Regression guard for the upstream card-layout responsive cover behavior.
# Must run from repository root: bash scripts/check-article-card-mobile-cover.sh
set -euo pipefail

component='client/src/components/article-card.tsx'

if ! grep -q 'LOCAL MOD (2026-07-26): legacy 100×220 cards resolve to side mode' "$component"; then
  echo "FAIL: missing documented mobile side-cover compatibility override." >&2
  exit 1
fi

if ! grep -q 'h-\[132px\].*md:hidden' "$component"; then
  echo "FAIL: expected a mobile top-cover fallback for side-mode cards." >&2
  exit 1
fi

if ! grep -q 'md:grid-cols-\[minmax(0,1fr)_34%\]' "$component"; then
  echo "FAIL: expected the desktop side-layout breakpoint guard." >&2
  exit 1
fi

if ! grep -q 'md:h-\[var(--article-card-height)\]' "$component"; then
  echo "FAIL: the fixed desktop height must only apply from md upward; mobile top-cover needs natural height." >&2
  exit 1
fi

echo "PASS: side-mode cards retain a top cover below md and use a side cover from md upward."
