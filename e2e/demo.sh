#!/bin/bash

# StudyBuddy E2E Test Demo Script
# This script helps you run e2e tests for demonstrations

echo "🎭 StudyBuddy E2E Test Demo Script"
echo "=================================="
echo ""

# Check if browsers are installed
if ! npx playwright --version > /dev/null 2>&1; then
    echo "❌ Playwright not found. Please run 'npm install' first."
    exit 1
fi

# Function to check if services are running
check_services() {
    echo "🔍 Checking if services are running..."
    
    # Check frontend (port 3000)
    if curl -s http://localhost:3000 > /dev/null; then
        echo "✅ Frontend is running on http://localhost:3000"
    else
        echo "❌ Frontend is not running on port 3000"
        echo "   Please start the frontend first:"
        echo "   cd frontend && npm run dev"
        return 1
    fi
    
    # Check backend (port 8000)
    if curl -s http://localhost:8000/docs > /dev/null; then
        echo "✅ Backend is running on http://localhost:8000"
    else
        echo "⚠️  Backend might not be running on port 8000"
        echo "   Please start the backend:"
        echo "   cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    fi
    
    echo ""
    return 0
}

# Function to run demo
run_demo() {
    local test_type=$1
    
    echo "🎬 Starting demo for: $test_type"
    echo "Features enabled for demo:"
    echo "  • Visible browser window (headed mode)"
    echo "  • Slower execution (1 second delays)"
    echo "  • Single worker (tests run sequentially)"
    echo "  • Maximized browser window"
    echo ""
    echo "🎯 Running tests..."
    echo ""
    
    case $test_type in
        "auth")
            npm run test:demo:auth
            ;;
        "chat")
            npm run test:demo:chat
            ;;
        "all")
            npm run test:demo
            ;;
        *)
            echo "❌ Unknown test type: $test_type"
            show_usage
            exit 1
            ;;
    esac
    
    echo ""
    echo "🎉 Demo completed!"
    echo "📊 View detailed report: npm run report"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [demo-type]"
    echo ""
    echo "Demo types:"
    echo "  auth    - Run authentication tests only"
    echo "  chat    - Run chat functionality tests only"
    echo "  all     - Run all e2e tests"
    echo ""
    echo "Examples:"
    echo "  $0 auth    # Demo authentication features"
    echo "  $0 chat    # Demo chat functionality"
    echo "  $0 all     # Demo complete application"
    echo ""
    echo "Regular development (background) testing:"
    echo "  npm test              # Run all tests in background"
    echo "  npm run test:background # Explicitly run in background"
    echo ""
}

# Main execution
if [ $# -eq 0 ]; then
    echo "🤔 What would you like to demo?"
    show_usage
    exit 0
fi

# Check services before running demo
if ! check_services; then
    echo ""
    echo "🚫 Cannot run demo - services are not running properly"
    exit 1
fi

# Wait for user confirmation
echo "Press Enter to start the demo, or Ctrl+C to cancel..."
read -r

# Run the requested demo
run_demo $1
