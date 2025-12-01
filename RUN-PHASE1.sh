#!/bin/bash

# Phase 1 Subscription System - Setup Script
# This script helps you run the Phase 1 implementation

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Phase 1: Subscription Plans Foundation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

print_success "Found project directories"
echo ""

# Step 1: Check environment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Environment Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -f "backend/.env" ]; then
    print_error "backend/.env not found!"
    echo "Please create backend/.env with your Supabase credentials"
    exit 1
fi

print_success "backend/.env found"

# Check for required env variables
if grep -q "SUPABASE_URL" backend/.env && grep -q "SUPABASE_SERVICE_KEY" backend/.env; then
    print_success "Supabase credentials configured"
else
    print_warning "Check your Supabase credentials in backend/.env"
fi

echo ""

# Step 2: Database Migrations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Database Migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Database migrations need to be run manually"
echo ""
echo "Choose one method:"
echo ""
echo "Option A: Supabase Dashboard (Recommended)"
echo "  1. Go to: https://app.supabase.com/project/YOUR_PROJECT/sql"
echo "  2. Execute these files in order:"
echo "     - backend/scripts/migrations/001_create_subscription_plans_table.sql"
echo "     - backend/scripts/migrations/002_create_subscriptions_table.sql"
echo "     - backend/scripts/migrations/003_create_usage_tracking_table.sql"
echo "     - backend/scripts/migrations/004_update_organizations_table.sql"
echo ""
echo "Option B: Using psql"
echo "  psql YOUR_SUPABASE_URL < backend/scripts/migrations/001_create_subscription_plans_table.sql"
echo "  psql YOUR_SUPABASE_URL < backend/scripts/migrations/002_create_subscriptions_table.sql"
echo "  psql YOUR_SUPABASE_URL < backend/scripts/migrations/003_create_usage_tracking_table.sql"
echo "  psql YOUR_SUPABASE_URL < backend/scripts/migrations/004_update_organizations_table.sql"
echo ""

read -p "Have you run the migrations? (y/n): " migrations_done

if [ "$migrations_done" != "y" ]; then
    print_warning "Please run migrations first, then re-run this script"
    exit 0
fi

print_success "Migrations confirmed"
echo ""

# Step 3: Syntax Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Syntax Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd backend

files=(
    "repositories/SubscriptionPlanRepository.js"
    "services/SubscriptionPlanService.js"
    "controllers/SubscriptionPlanController.js"
    "middleware/limitEnforcement.js"
    "routes/subscriptionPlans.js"
)

for file in "${files[@]}"; do
    if node -c "$file" 2>&1; then
        print_success "$(basename $file)"
    else
        print_error "$(basename $file) has syntax errors"
        exit 1
    fi
done

cd ..
echo ""

# Step 4: Start Backend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Start Backend Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Start backend server now? (y/n): " start_backend

if [ "$start_backend" = "y" ]; then
    print_info "Starting backend on port 4000..."
    print_info "Press Ctrl+C to stop"
    echo ""
    cd backend
    bun run dev &
    BACKEND_PID=$!
    cd ..
    sleep 3

    # Check if server started
    if curl -s http://localhost:4000/health > /dev/null; then
        print_success "Backend server running on port 4000"
    else
        print_error "Backend server failed to start"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    echo ""
else
    print_info "Start backend manually: cd backend && bun run dev"
    exit 0
fi

# Step 5: Test API
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Test API Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

sleep 2

read -p "Run API tests? (y/n): " run_tests

if [ "$run_tests" = "y" ]; then
    print_info "Running API tests..."
    echo ""
    cd backend
    node scripts/test-subscription-api.js
    TEST_RESULT=$?
    cd ..

    if [ $TEST_RESULT -eq 0 ]; then
        echo ""
        print_success "All API tests passed! 🎉"
    else
        echo ""
        print_error "Some tests failed. Check output above."
    fi
    echo ""
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Phase 1 Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_success "Backend server running on http://localhost:4000"
echo ""
echo "Test it:"
echo "  curl http://localhost:4000/api/subscription-plans"
echo ""
echo "Next steps:"
echo "  1. Check PHASE1-QUICK-START.md for usage examples"
echo "  2. Start implementing Phase 2 (usage tracking)"
echo "  3. Add limit enforcement to your routes"
echo ""
print_info "Backend PID: $BACKEND_PID (kill with: kill $BACKEND_PID)"
echo ""

# Keep script running to maintain background process
if [ "$start_backend" = "y" ]; then
    print_info "Press Ctrl+C to stop backend server and exit"
    wait $BACKEND_PID
fi
