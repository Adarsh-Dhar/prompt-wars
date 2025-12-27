#!/bin/bash

echo "🔍 Checking PostgreSQL setup..."

# Check if Docker is running
if docker ps &> /dev/null; then
    echo "✅ Docker is running"

    # Check if postgres container is running
    if docker ps | grep -q postgres; then
        echo "✅ PostgreSQL container is already running"
    else
        echo "🚀 Starting PostgreSQL container..."
        cd "$(dirname "$0")"
        docker compose up -d
        sleep 3

        # Create database if it doesn't exist
        echo "📦 Creating database..."
        docker compose exec -T db psql -U postgres -c "CREATE DATABASE prompt_wars;" 2>/dev/null || echo "Database might already exist"

        echo "✅ PostgreSQL is ready on port 5437 with credentials: postgres/example"
    echo ""
    echo "Now run: pnpm prisma migrate dev"
else
    echo "❌ Docker is not running"
    echo ""
    echo "Options:"
    echo "1. Start Docker Desktop and run this script again"
    echo "2. Install PostgreSQL locally:"
    echo "   brew install postgresql@15"
    echo "   brew services start postgresql@15"
    echo "   createdb prompt_wars"
    echo "   Then update .env: DATABASE_URL=\"postgresql://localhost:5437/prompt_wars?schema=public\""
fi

