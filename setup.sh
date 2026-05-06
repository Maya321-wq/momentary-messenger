#!/usr/bin/env bash
# 🚀 Quick Start Script for Momentary Messenger

set -e

echo "=================================="
echo "  Momentary Messenger Quick Start"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install npm${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm --version)${NC}"

echo ""
echo -e "${YELLOW}Checking services...${NC}"

# Check Redis
if ! redis-cli ping &> /dev/null; then
    echo -e "${YELLOW}⚠️  Redis not running (optional - app will use memory fallback)${NC}"
else
    echo -e "${GREEN}✅ Redis connected${NC}"
fi

# Check MongoDB
if ! mongosh --eval "db.version()" &> /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  MongoDB not running (optional - app will use session-only mode)${NC}"
else
    echo -e "${GREEN}✅ MongoDB connected${NC}"
fi

echo ""
echo -e "${YELLOW}Setting up backend...${NC}"

# Backend setup
cd server

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

if [ ! -f ".env" ]; then
    echo -e "${RED}⚠️  .env file not found${NC}"
    echo "Please create server/.env with required variables:"
    echo "  - PORT"
    echo "  - CLIENT_URL"
    echo "  - MONGO_URI"
    echo "  - REDIS_URL"
    echo "  - FIREBASE_SERVICE_ACCOUNT_PATH"
    echo "See QUICK_START.md for template"
    exit 1
fi

echo -e "${GREEN}✅ Backend ready${NC}"

cd ..

echo ""
echo -e "${YELLOW}Setting up frontend...${NC}"

# Frontend setup
cd client

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

if [ ! -f ".env.local" ]; then
    echo -e "${RED}⚠️  .env.local file not found${NC}"
    echo "Please create client/.env.local with required variables:"
    echo "  - NEXT_PUBLIC_FIREBASE_API_KEY"
    echo "  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
    echo "  - NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    echo "  - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
    echo "  - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
    echo "  - NEXT_PUBLIC_FIREBASE_APP_ID"
    echo "  - NEXT_PUBLIC_API_URL"
    echo "See QUICK_START.md for template"
    exit 1
fi

echo -e "${GREEN}✅ Frontend ready${NC}"

cd ..

echo ""
echo -e "${GREEN}=================================="
echo "  Setup Complete! ✅"
echo "==================================${NC}"
echo ""
echo "To start the app, run in separate terminals:"
echo ""
echo -e "${YELLOW}Terminal 1 (Backend):${NC}"
echo "  cd server && npm run dev"
echo ""
echo -e "${YELLOW}Terminal 2 (Frontend):${NC}"
echo "  cd client && npm run dev"
echo ""
echo -e "${YELLOW}Then open:${NC}"
echo "  http://localhost:3000"
echo ""
echo "For troubleshooting, see:"
echo "  - QUICK_START.md"
echo "  - INFRASTRUCTURE_FIXES_SUMMARY.md"
echo "  - FINAL_STATUS.md"
echo ""
