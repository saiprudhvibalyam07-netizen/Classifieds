#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Valclassifieds — Automation Test Suite Runner
# ============================================================
# Usage:
#   ./scripts/run-automation.sh            # Run all tiers
#   ./scripts/run-automation.sh --seed     # Seed DB first, then run
#   ./scripts/run-automation.sh --api      # API tests only
#   ./scripts/run-automation.sh --mock     # Mock tests only
#   ./scripts/run-automation.sh --e2e      # E2E tests only
#   ./scripts/run-automation.sh --report   # Generate reports only
#   ./scripts/run-automation.sh --help     # Show this help
# ============================================================

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLAYWRIGHT_CONFIG="$ROOT/tests/e2e/playwright.config.ts"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
PASS=0
FAIL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_banner() {
  echo ""
  echo "============================================="
  echo "  Valclassifieds — Automation Test Suite"
  echo "  $TIMESTAMP"
  echo "============================================="
  echo ""
}

print_pass() { echo -e "  ${GREEN}✅ $1${NC}"; }
print_fail() { echo -e "  ${RED}❌ $1${NC}"; }
print_info() { echo -e "  ${CYAN}→ $1${NC}"; }
print_warn() { echo -e "  ${YELLOW}⚠ $1${NC}"; }

run_tier() {
  local name=$1
  local project=$2
  echo ""
  echo "---------------------------------------------"
  echo "  Running: $name ($project)"
  echo "---------------------------------------------"

  if npx playwright test --config="$PLAYWRIGHT_CONFIG" --project="$project" 2>&1; then
    print_pass "$name — All tests passed"
    return 0
  else
    print_fail "$name — Some tests failed"
    return 1
  fi
}

generate_reports() {
  echo ""
  echo "---------------------------------------------"
  echo "  Generating Reports"
  echo "---------------------------------------------"

  print_info "Generating automation test inventory (XLSX)..."
  node "$ROOT/scripts/generate-automation-inventory.mjs" && print_pass "XLSX inventory generated" || print_warn "XLSX generation skipped"

  print_info "Generating Allure report..."
  if command -v allure &>/dev/null; then
    allure generate "$ROOT/tests/e2e/allure-results" --clean -o "$ROOT/tests/e2e/allure-report" 2>/dev/null && print_pass "Allure report generated" || print_warn "Allure report skipped"
  else
    print_warn "Allure CLI not found — skipping Allure report"
  fi

  echo ""
  echo "---------------------------------------------"
  echo "  Report Locations"
  echo "---------------------------------------------"
  echo "  HTML reports:  tests/e2e/playwright-report/"
  echo "  JUnit XML:     tests/e2e/reports/"
  echo "  Allure:        tests/e2e/allure-results/"
  echo "  XLSX:          tests/docs/automation-test-inventory.xlsx"
}

seed_database() {
  echo ""
  echo "---------------------------------------------"
  echo "  Seeding Database"
  echo "---------------------------------------------"
  print_info "Seeding auth users..."
  node "$ROOT/scripts/seed-auth.mjs" && print_pass "Auth seeded" || print_fail "Auth seed failed"
  print_info "Seeding application data..."
  node "$ROOT/scripts/seed-data.mjs" && print_pass "Data seeded" || print_fail "Data seed failed"
}

show_help() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --seed       Seed database before running tests"
  echo "  --api        Run API tests only"
  echo "  --mock       Run Mock tests only"
  echo "  --e2e        Run E2E tests only"
  echo "  --report     Generate reports only (no tests)"
  echo "  --all        Run all tiers (default)"
  echo "  --help       Show this help"
  echo ""
  echo "Examples:"
  echo "  $0                        # Run all 3 tiers"
  echo "  $0 --seed --api           # Seed DB + run API tests"
  echo "  $0 --e2e --report         # Run E2E + generate reports"
}

# Parse arguments
SEED=false
RUN_API=false
RUN_MOCK=false
RUN_E2E=false
RUN_REPORT=false
RUN_ALL=true

for arg in "$@"; do
  case $arg in
    --seed) SEED=true; RUN_ALL=false ;;
    --api) RUN_API=true; RUN_ALL=false ;;
    --mock) RUN_MOCK=true; RUN_ALL=false ;;
    --e2e) RUN_E2E=true; RUN_ALL=false ;;
    --report) RUN_REPORT=true; RUN_ALL=false ;;
    --all) RUN_ALL=true ;;
    --help) show_help; exit 0 ;;
    *) echo "Unknown option: $arg"; show_help; exit 1 ;;
  esac
done

# Main
print_banner

# Check requirements
print_info "Checking requirements..."
command -v node &>/dev/null || { echo "Node.js required"; exit 1; }
command -v npx &>/dev/null || { echo "npx required"; exit 1; }
print_pass "Requirements met"

# Change to project root
cd "$ROOT"

# Seed if requested
if $SEED; then
  seed_database
fi

# Determine what to run
if $RUN_ALL; then
  RUN_API=true
  RUN_MOCK=true
  RUN_E2E=true
  RUN_REPORT=true
fi

# Run tiers
if $RUN_API; then
  run_tier "API Tests" "api" || ((FAIL++))
  ((PASS++)) || true
fi

if $RUN_MOCK; then
  run_tier "Mock Tests" "mock" || ((FAIL++))
  ((PASS++)) || true
fi

if $RUN_E2E; then
  print_warn "E2E tests require seeded DB with conversations"
  run_tier "E2E Tests" "e2e" || ((FAIL++))
  ((PASS++)) || true
fi

# Generate reports
if $RUN_REPORT; then
  generate_reports
fi

# Summary
echo ""
echo "============================================="
echo "  Automation Suite Complete"
echo "  $TIMESTAMP"
echo "============================================="
if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}All tiers completed ✅${NC}"
else
  echo -e "  ${RED}$FAIL tier(s) had failures${NC}"
fi
echo ""
