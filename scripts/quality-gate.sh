#!/bin/bash

# ============================================================
# BETALI MASTER QUALITY GATE v2.0
# Runs: Unit Tests → Integration Tests → E2E Suite → Report
#
# Usage:
#   bun run quality-gate              # Full suite
#   bun run quality-gate --fast       # Skip integration (unit + E2E)
#   bun run quality-gate --e2e-only   # Only E2E (skip unit + integration)
#   bun run quality-gate --e2e-filter=orders/   # Run only orders E2E
#   FAIL_FAST=true bun run quality-gate          # Stop on first failure
# ============================================================
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ROOT_DIR=$(pwd)
GATE_START=$(date +%s)
RESULTS_FILE="/tmp/betali-gate-results.txt"
echo "" > "$RESULTS_FILE"

# ─── Helpers ────────────────────────────────────────────────
log_step() { echo -e "\n${BLUE}${BOLD}══════════════════════════════════════${NC}"; echo -e "${BLUE}${BOLD}  $1${NC}"; echo -e "${BLUE}${BOLD}══════════════════════════════════════${NC}"; }
log_ok()   { echo -e "${GREEN}  ✅ $1${NC}"; echo "PASS: $1" >> "$RESULTS_FILE"; }
log_fail() { echo -e "${RED}  ❌ $1${NC}"; echo "FAIL: $1" >> "$RESULTS_FILE"; }
log_info() { echo -e "${CYAN}  ℹ  $1${NC}"; }
log_warn() { echo -e "${YELLOW}  ⚠  $1${NC}"; }

BACK_PID=""
FRONT_PID=""
OVERALL_PASS=true

# ─── Cleanup on exit ────────────────────────────────────────
cleanup() {
  log_info "Cleaning up processes..."
  [ -n "$BACK_PID" ] && kill "$BACK_PID" 2>/dev/null || true
  [ -n "$FRONT_PID" ] && kill "$FRONT_PID" 2>/dev/null || true
  lsof -ti:3000,4000 | xargs kill -9 2>/dev/null || true
}
trap cleanup EXIT

# ─── Parse flags ────────────────────────────────────────────
SKIP_UNIT=false
SKIP_INTEGRATION=false
SKIP_E2E=false
E2E_FILTER=""

for arg in "$@"; do
  case $arg in
    --skip-unit)        SKIP_UNIT=true ;;
    --skip-integration) SKIP_INTEGRATION=true ;;
    --skip-e2e)         SKIP_E2E=true ;;
    --e2e-filter=*)     E2E_FILTER="${arg#*=}" ;;
    --fast)             SKIP_INTEGRATION=true ;;
    --e2e-only)         SKIP_UNIT=true; SKIP_INTEGRATION=true ;;
  esac
done

echo -e "\n${BOLD}🚀 BETALI QUALITY GATE v2.0${NC}"
echo -e "   Unit=${SKIP_UNIT:+skip}${SKIP_UNIT:-run} | Integration=${SKIP_INTEGRATION:+skip}${SKIP_INTEGRATION:-run} | E2E=${SKIP_E2E:+skip}${SKIP_E2E:-run}"
echo -e "   Date: $(date '+%Y-%m-%d %H:%M:%S')"

# ════════════════════════════════════════════
# STAGE 0: Seed Database
# ════════════════════════════════════════════
log_step "STAGE 0: Database Seed"

log_info "Seeding test user and fixed data..."
if (cd "$ROOT_DIR/backend" && node scripts/seed-test-user.js 2>&1 | tail -5); then
  log_ok "Database seeded successfully"
else
  log_fail "Database seeding failed"
  OVERALL_PASS=false
fi

# ════════════════════════════════════════════
# STAGE 1: Unit Tests (no servers needed)
# ════════════════════════════════════════════
if [ "$SKIP_UNIT" = false ]; then
  log_step "STAGE 1: Unit Tests"
  log_info "Running backend unit tests..."
  UNIT_TEST_OUTPUT=$(cd "$ROOT_DIR/backend" && npx jest tests/unit --config=jest.unit.config.js --passWithNoTests --forceExit 2>&1)
  UNIT_TEST_EXIT=$?
  echo "$UNIT_TEST_OUTPUT" | tail -15
  if [ $UNIT_TEST_EXIT -eq 0 ]; then
    log_ok "Backend unit tests passed"
  else
    log_fail "Backend unit tests FAILED"
    OVERALL_PASS=false
    if [ "${FAIL_FAST:-false}" = "true" ]; then exit 1; fi
  fi
else
  log_warn "Unit tests skipped"
fi

# ════════════════════════════════════════════
# STAGE 2: Integration Tests (backend required)
# ════════════════════════════════════════════
if [ "$SKIP_INTEGRATION" = false ]; then
  log_step "STAGE 2: Integration Tests"

  # Start backend if not already running
  lsof -ti:4000 | xargs kill -9 2>/dev/null || true
  sleep 1
  log_info "Starting Backend for integration tests..."
  (cd "$ROOT_DIR/backend" && bun run dev > /tmp/betali-backend-int.log 2>&1) &
  INT_BACK_PID=$!

  # Wait for backend
  INT_COUNTER=0
  until curl -sf http://localhost:4000/health > /dev/null 2>&1; do
    sleep 1
    INT_COUNTER=$((INT_COUNTER + 1))
    if [ $INT_COUNTER -ge 60 ]; then
      log_fail "Backend did not start for integration tests"
      OVERALL_PASS=false
      break
    fi
  done

  if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
    log_info "Running integration tests (multi-tenant, order workflow)..."
    INTEGRATION_OUTPUT=$(cd "$ROOT_DIR/backend" && npx jest tests/integration --passWithNoTests --forceExit 2>&1)
    INTEGRATION_EXIT=$?
    echo "$INTEGRATION_OUTPUT" | tail -15
    if [ $INTEGRATION_EXIT -eq 0 ]; then
      log_ok "Integration tests passed"
    else
      log_fail "Integration tests FAILED"
      OVERALL_PASS=false
      if [ "${FAIL_FAST:-false}" = "true" ]; then exit 1; fi
    fi
  fi

  # Stop backend before E2E (E2E starts its own)
  kill "$INT_BACK_PID" 2>/dev/null || true
  lsof -ti:4000 | xargs kill -9 2>/dev/null || true
  sleep 1
else
  log_warn "Integration tests skipped"
fi

# ════════════════════════════════════════════
# STAGE 3: E2E Tests (needs full stack)
# ════════════════════════════════════════════
if [ "$SKIP_E2E" = false ]; then
  log_step "STAGE 3: E2E Full Stack Tests"

  # Kill any stale servers
  lsof -ti:3000,4000 | xargs kill -9 2>/dev/null || true
  sleep 1

  log_info "Starting Backend on port 4000..."
  (cd "$ROOT_DIR/backend" && bun run dev > /tmp/betali-backend.log 2>&1) &
  BACK_PID=$!

  log_info "Starting Frontend on port 3000..."
  (cd "$ROOT_DIR/frontend" && bun run dev > /tmp/betali-frontend.log 2>&1) &
  FRONT_PID=$!

  # Wait for backend health
  log_info "Waiting for backend health check..."
  TIMEOUT=90
  COUNTER=0
  BACKEND_UP=false
  until curl -sf http://localhost:4000/health > /dev/null 2>&1; do
    sleep 1
    COUNTER=$((COUNTER + 1))
    if [ $COUNTER -ge $TIMEOUT ]; then
      log_fail "Backend did not start in ${TIMEOUT}s"
      echo -e "${RED}--- Backend Logs ---${NC}"
      tail -30 /tmp/betali-backend.log
      OVERALL_PASS=false
      break
    fi
  done
  if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
    log_ok "Backend is UP"
    BACKEND_UP=true
  fi

  # Wait for frontend
  FRONTEND_UP=false
  if [ "$BACKEND_UP" = true ]; then
    log_info "Waiting for frontend..."
    COUNTER=0
    until curl -sf http://localhost:3000 > /dev/null 2>&1; do
      sleep 1
      COUNTER=$((COUNTER + 1))
      if [ $COUNTER -ge $TIMEOUT ]; then
        log_fail "Frontend did not start in ${TIMEOUT}s"
        OVERALL_PASS=false
        break
      fi
    done
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
      log_ok "Frontend is UP"
      FRONTEND_UP=true
    fi
  fi

  # Run E2E tests
  if [ "$BACKEND_UP" = true ] && [ "$FRONTEND_UP" = true ]; then
    log_info "Running Playwright E2E tests..."

    if [ -n "$E2E_FILTER" ]; then
      E2E_CMD="bun x playwright test tests/e2e/${E2E_FILTER} --reporter=list"
      log_info "Filtered suite: tests/e2e/${E2E_FILTER}"
    else
      E2E_CMD="bun x playwright test --reporter=list"
      log_info "Full E2E suite (auth + orders + products + multi-tenant + dashboard + warehouse)"
    fi

    if (cd "$ROOT_DIR/frontend" && eval "$E2E_CMD" 2>&1); then
      log_ok "All E2E tests passed"
    else
      log_fail "E2E tests FAILED"
      OVERALL_PASS=false
      echo -e "${RED}--- Last Backend Errors ---${NC}"
      grep -i "error\|unhandled\|exception" /tmp/betali-backend.log | tail -20 || true
      echo -e "${YELLOW}  Tip: Run 'bun run test:e2e:ui' to debug visually${NC}"
    fi
  else
    log_fail "Servers failed to start — E2E skipped"
    OVERALL_PASS=false
  fi
else
  log_warn "E2E tests skipped"
fi

# ════════════════════════════════════════════
# FINAL REPORT
# ════════════════════════════════════════════
GATE_END=$(date +%s)
DURATION=$((GATE_END - GATE_START))

echo -e "\n${BOLD}══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  QUALITY GATE REPORT — ${DURATION}s${NC}"
echo -e "${BOLD}══════════════════════════════════════════════${NC}"

while IFS= read -r line; do
  if [[ "$line" == PASS:* ]]; then
    echo -e "  ${GREEN}✅ ${line#PASS: }${NC}"
  elif [[ "$line" == FAIL:* ]]; then
    echo -e "  ${RED}❌ ${line#FAIL: }${NC}"
  fi
done < "$RESULTS_FILE"

echo ""
if [ "$OVERALL_PASS" = true ]; then
  echo -e "${GREEN}${BOLD}  ✨ ALL CHECKS PASSED! SAFE TO DEPLOY 🚀${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}  🚫 QUALITY GATE BLOCKED — FIX FAILURES BEFORE DEPLOY${NC}"
  exit 1
fi
