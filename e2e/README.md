# StudyBuddy E2E Testing Guide

This directory contains comprehensive end-to-end tests for the StudyBuddy application, organized by feature modules.

## 📁 Directory Structure

```
e2e/
├── tests/
│   ├── auth/           # Authentication tests
│   ├── chat/           # Chat functionality tests
│   ├── user/           # User management tests
│   ├── billing/        # Billing system tests
│   └── content/        # Content generation tests
├── utils/              # Test helper utilities
├── config/             # Test configuration
└── docker-compose.e2e.yml # Docker setup for tests
```

## 🎭 Demo Mode (For Presentations)

Use when showing tests to **non-technical stakeholders, clients, or during presentations**.

### Quick Demo Commands

```bash
# Demo authentication features
npm run test:demo:auth

# Demo chat functionality  
npm run test:demo:chat

# Demo user profile features
npm run test:demo:user

# Demo billing features
npm run test:demo:billing

# Demo all features
npm run test:demo
```

### Demo Script (Recommended)

```bash
# Linux/Mac
./demo.sh auth    # Demo authentication
./demo.sh chat    # Demo chat features
./demo.sh user    # Demo user profile features
./demo.sh all     # Demo everything

# Windows
demo.bat auth     # Demo authentication
demo.bat chat     # Demo chat features
demo.bat user     # Demo user profile features
demo.bat billing  # Demo billing features
demo.bat all      # Demo everything
```

### Demo Features

- ✅ **Visible browser** - Shows actual browser window
- ✅ **Slow execution** - 1-second delays between actions for clarity
- ✅ **Sequential tests** - One test at a time for easy following
- ✅ **Maximized window** - Better visibility for audience
- ✅ **Clear reporting** - Easy-to-understand test progress

## 🚀 Background Mode (For Development)

Use for **regular development, CI/CD, and automated testing**.

### Development Commands

```bash
# Run all tests (background/headless)
npm test

# Explicitly run in background mode
npm run test:background

# Run specific test files
npm test tests/auth/authentication.spec.ts
npm test tests/chat/chat.spec.ts

# Run with UI for debugging
npm run test:ui

# Run in headed mode for debugging
npm run test:headed
```

### Background Features

- ✅ **Headless execution** - No browser window (faster)
- ✅ **Parallel execution** - Multiple tests run simultaneously
- ✅ **CI/CD friendly** - Suitable for automated pipelines
- ✅ **Resource efficient** - Lower memory and CPU usage

## 🐳 Docker Mode

For containerized testing:

```bash
npm run test:docker
```

## 📊 Viewing Test Reports

After running tests:

```bash
npm run report
```

This opens an interactive HTML report showing:
- Test results and status
- Screenshots of failures
- Video recordings
- Detailed execution traces

## 🛠️ Setup Requirements

### Prerequisites

1. **Frontend running** on `http://localhost:3000`
2. **Backend running** on `http://localhost:8000`
3. **Test credentials** configured in `.env.test`

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run install:browsers
```

### Starting Services

```bash
# Terminal 1: Start backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start frontend  
cd frontend
npm run dev

# Terminal 3: Run tests
cd e2e
npm run test:demo:auth  # For demo
# or
npm test                # For development
```

## 🎯 Test Categories

### Authentication Tests (`tests/auth/`)
- Landing page loading
- Sign-in modal functionality
- Login with admin/regular users
- Error handling (invalid credentials, network errors)
- Form validation
- Loading states

### Chat Tests (`tests/chat/`)
- Access control (authenticated vs unauthenticated)
- Chat interface elements
- Message sending and receiving
- AI response detection
- Chat history persistence
- Error handling

### User Tests (`tests/user/`)
- Profile page access and navigation
- User information display
- Profile editing functionality
- Back to dashboard navigation
- Admin dashboard access (for admin users)
- Session persistence across operations

### Billing Tests (`tests/billing/`) - *Coming Soon*
- Payment processing
- Subscription management
- Billing history

### Content Tests (`tests/content/`) - *Coming Soon*
- Content generation
- Document upload
- Content moderation

## 🔧 Configuration Files

- `playwright.config.ts` - Main configuration (background mode)
- `playwright.demo.config.ts` - Demo configuration (presentation mode)
- `playwright.docker.config.ts` - Docker configuration
- `config/test-config.ts` - Test credentials and URLs

## 🐛 Troubleshooting

### Common Issues

1. **Tests fail to start**
   - Ensure frontend is running on port 3000
   - Ensure backend is running on port 8000
   - Check test credentials in `.env.test`

2. **Browser doesn't appear in demo mode**
   - Use `npm run test:demo:auth` instead of `npm test`
   - Check that `--headed` flag is included

3. **Tests run too fast for demo**
   - Use demo configuration: `npm run test:demo`
   - Adjust `slowMo` in `playwright.demo.config.ts`

4. **Parallel execution issues**
   - Demo mode uses 1 worker (sequential)
   - Background mode uses multiple workers (parallel)

### Getting Help

- Check test reports: `npm run report`
- View screenshots and videos in `test-results/`
- Enable trace collection for debugging

## 🚀 Quick Start

1. **For Development Testing:**
   ```bash
   npm test
   ```

2. **For Demo/Presentation:**
   ```bash
   ./demo.sh auth
   ```

3. **For Debugging:**
   ```bash
   npm run test:ui
   ```

---

## 📝 Best Practices

- **Use demo mode** when presenting to stakeholders
- **Use background mode** for development and CI/CD
- **Run specific test suites** during feature development
- **Check reports** after test failures
- **Keep services running** during active development
