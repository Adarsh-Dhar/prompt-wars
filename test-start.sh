#!/bin/bash
# Quick test script for frontend

cd /Users/adarsh/Documents/prompt-wars/frontend

# Set environment
export DATABASE_URL="postgresql://localhost:5432/prompt_wars"

# Kill existing processes
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Generate Prisma
echo "Generating Prisma client..."
npx prisma generate

# Start dev server
echo "Starting frontend..."
pnpm run dev

