#!/bin/bash
# =============================================================================
# Prompt Wars - Start Frontend Only
# =============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Export DATABASE_URL if not already set
export DATABASE_URL="${DATABASE_URL:-postgresql://localhost:5432/prompt_wars}"

cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down frontend...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              🎮 PROMPT WARS - Frontend Only 🎮                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Kill any existing process on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

cd "$ROOT_DIR/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pnpm install
fi

# Generate Prisma client
echo -e "${GREEN}Generating Prisma client...${NC}"
npx prisma generate || true

echo -e "${GREEN}Starting frontend on http://localhost:3000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"

pnpm run dev

