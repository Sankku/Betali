#!/bin/bash

# ============================================================
# BETALI — Git Hooks Setup
# Installs a pre-push hook that runs quality-gate on push to main/develop
# ============================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

HOOKS_DIR="$(git rev-parse --git-dir)/hooks"

echo -e "\n${CYAN}🔧 Installing Betali Git Hooks...${NC}"

# ── pre-push hook ──────────────────────────────────────────
cat > "$HOOKS_DIR/pre-push" << 'HOOK'
#!/bin/bash

# BETALI PRE-PUSH HOOK
# Runs quality-gate --fast before pushing to main or develop
# Skip with: git push --no-verify

BRANCH=$(git symbolic-ref HEAD 2>/dev/null | cut -d'/' -f3)
PROTECTED_BRANCHES="main master develop"

# Only run on protected branches
if ! echo "$PROTECTED_BRANCHES" | grep -qw "$BRANCH"; then
  echo "⚡ Pre-push: branch '$BRANCH' is not protected, skipping gate."
  exit 0
fi

echo ""
echo "🔒 Pre-push quality gate running for branch: $BRANCH"
echo "   (Use 'git push --no-verify' to skip)"
echo ""

# Navigate to repo root
ROOT_DIR=$(git rev-parse --show-toplevel)
cd "$ROOT_DIR"

# Run fast quality gate (unit tests + E2E, no integration)
if bash scripts/quality-gate.sh --fast; then
  echo ""
  echo "✅ Quality gate passed — push allowed!"
  exit 0
else
  echo ""
  echo "🚫 Quality gate FAILED — push blocked."
  echo "   Fix the failures and try again, or use 'git push --no-verify' to force."
  exit 1
fi
HOOK

chmod +x "$HOOKS_DIR/pre-push"
echo -e "${GREEN}  ✅ pre-push hook installed${NC}"

# ── commit-msg hook (optional: enforce commit format) ──────
cat > "$HOOKS_DIR/commit-msg" << 'HOOK'
#!/bin/bash

# BETALI COMMIT MESSAGE VALIDATOR
# Enforces conventional commits: type(scope): message

MSG=$(cat "$1")
PATTERN="^(feat|fix|chore|docs|style|refactor|test|perf|ci|build|revert)(\(.+\))?: .+"

if ! echo "$MSG" | grep -qE "$PATTERN"; then
  echo ""
  echo "❌ Commit message doesn't follow Conventional Commits format."
  echo "   Expected: type(scope): description"
  echo "   Examples:"
  echo "     feat(orders): add bulk create endpoint"
  echo "     fix(auth): handle token expiry edge case"
  echo "     test(e2e): add warehouse flow tests"
  echo ""
  echo "   Your message: $MSG"
  echo ""
  echo "   Types: feat fix chore docs style refactor test perf ci build revert"
  echo "   (Use 'git commit --no-verify' to bypass)"
  exit 1
fi

exit 0
HOOK

chmod +x "$HOOKS_DIR/commit-msg"
echo -e "${GREEN}  ✅ commit-msg hook installed (Conventional Commits enforced)${NC}"

# ── Summary ────────────────────────────────────────────────
echo ""
echo -e "${CYAN}Hooks installed:${NC}"
echo "  pre-push   → runs quality-gate --fast before push to main/develop"
echo "  commit-msg → enforces conventional commit format"
echo ""
echo -e "${YELLOW}Tips:${NC}"
echo "  Skip hooks:    git push --no-verify / git commit --no-verify"
echo "  Uninstall:     rm .git/hooks/pre-push .git/hooks/commit-msg"
echo "  Re-run setup:  bash scripts/setup-hooks.sh"
echo ""
