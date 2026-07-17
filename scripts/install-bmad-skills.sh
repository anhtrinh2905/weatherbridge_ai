#!/usr/bin/env bash
#
# install-bmad-skills.sh
# ----------------------
# The repo's agents (.claude/agents, .opencode/agents, .cursor/rules) reference
# BMAD skills by name. The skill packages themselves are NOT vendored in this
# repo — they must be installed on your machine via the official BMAD Method
# installer. This script runs that installer for the two modules this repo uses:
#
#   - bmm : BMad Method core (analyst, PM, architect, dev, PRD, stories, ...)
#   - cis : Creative Intelligence Suite (brainstorming, design thinking, ...)
#
# Without this step the `bmad-*` skills will not resolve for a fresh clone.
#
# Usage:
#   scripts/install-bmad-skills.sh            # interactive (recommended)
#   scripts/install-bmad-skills.sh --yes      # best-effort non-interactive
#
# During the interactive install, select:
#   Modules : BMad Method (bmm) AND Creative Intelligence Suite (cis)
#   Tools   : Claude Code — and also Cursor / OpenCode if your team uses them,
#             so the skills resolve across all three agent surfaces in this repo.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NON_INTERACTIVE=0
[[ "${1:-}" == "--yes" || "${1:-}" == "-y" ]] && NON_INTERACTIVE=1

echo "==> BMAD skills install"
echo "    Project: $PROJECT_ROOT"

# --- prerequisites --------------------------------------------------------
if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: 'npx' not found. Install Node.js (>=18) first: https://nodejs.org" >&2
  exit 1
fi

# --- already installed? ---------------------------------------------------
SKILLS_DIR="${HOME}/.claude/skills"
existing=0
if [[ -d "$SKILLS_DIR" ]]; then
  existing=$(find "$SKILLS_DIR" -maxdepth 1 -type d -name 'bmad-*' 2>/dev/null | wc -l | tr -d ' ')
fi
if [[ "$existing" -gt 0 ]]; then
  echo "==> Found $existing existing bmad-* skill(s) in $SKILLS_DIR"
  echo "    Re-running the installer will update / add missing modules."
fi

# --- run the official installer ------------------------------------------
echo "==> Launching the official BMAD Method installer (bmm + cis)"
if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
  echo "    Non-interactive mode. If flag names have changed upstream, drop --yes"
  echo "    and re-run interactively to pick modules/tools from the menu."
  npx bmad-method install \
    --directory "$PROJECT_ROOT" \
    --modules bmm,cis \
    --tools claude-code \
    --yes
else
  echo "    In the menu, select modules: bmm + cis; tools: claude-code (+ cursor / opencode)."
  npx bmad-method install --directory "$PROJECT_ROOT"
fi

# --- verify ---------------------------------------------------------------
echo "==> Verifying"
found=0
[[ -d "$SKILLS_DIR" ]] && found=$(find "$SKILLS_DIR" -maxdepth 1 -type d -name 'bmad-*' 2>/dev/null | wc -l | tr -d ' ')
proj_found=0
[[ -d "$PROJECT_ROOT/.claude/skills" ]] && \
  proj_found=$(find "$PROJECT_ROOT/.claude/skills" -maxdepth 1 -type d -name 'bmad-*' 2>/dev/null | wc -l | tr -d ' ')

echo "    Global (~/.claude/skills):   $found bmad-* skill(s)"
echo "    Project (.claude/skills):    $proj_found bmad-* skill(s)"

if [[ "$found" -eq 0 && "$proj_found" -eq 0 ]]; then
  echo "WARNING: no bmad-* skills detected after install. Re-run interactively:" >&2
  echo "    npx bmad-method install --directory \"$PROJECT_ROOT\"" >&2
  exit 1
fi
echo "==> Done. The bmad-* skills referenced by the repo's agents are now available."
