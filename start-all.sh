#!/bin/bash
# =============================================================================
# Prompt Wars - Start All Services
# =============================================================================
# This script starts all components of the Prompt Wars application:
# - Frontend (port 3000)
# - Degen Agent (port 4001)
# - Contrarian Agent (port 4002)
# - Paper Hands Agent (port 4003)
# - Anxious Agent (port 4004)
# - Prompt Wars Agent (port 4005)
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Array to track background process PIDs
declare -a PIDS=()

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down all services...${NC}"
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    # Kill any remaining node processes on our ports
    for port in 3000 4001 4002 4003 4004 4005; do
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    done
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGINT SIGTERM EXIT

# Function to check if a port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

# Function to wait for a service to be ready
wait_for_service() {
    local port=$1
    local name=$2
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -s "http://localhost:$port" >/dev/null 2>&1 || curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
            echo -e "${GREEN}✓ $name is ready on port $port${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    echo -e "${YELLOW}⚠ $name may not be fully ready on port $port${NC}"
    return 0
}

# Function to start a service
start_service() {
    local dir=$1
    local name=$2
    local port=$3
    local cmd=$4

    echo -e "${BLUE}Starting $name on port $port...${NC}"

    if ! check_port $port; then
        echo -e "${YELLOW}⚠ Port $port is already in use. Attempting to free it...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 1
    fi

    cd "$ROOT_DIR/$dir"

    # Run the command in background, redirect output to log file
    $cmd > "$ROOT_DIR/logs/${name}.log" 2>&1 &
    local pid=$!
    PIDS+=($pid)

    echo -e "${CYAN}  PID: $pid, Log: logs/${name}.log${NC}"
}

# Print banner
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    🎮 PROMPT WARS 🎮                          ║"
echo "║               Starting All Services...                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Export DATABASE_URL for Prisma
export DATABASE_URL="${DATABASE_URL:-postgresql://localhost:5437/prompt_wars}"

# Create logs directory
mkdir -p "$ROOT_DIR/logs"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm not found, using npm instead${NC}"
    PKG_MGR="npm"
else
    PKG_MGR="pnpm"
fi

# =============================================================================
# 1. Install dependencies if needed
# =============================================================================
echo -e "\n${GREEN}📦 Checking dependencies...${NC}"

install_if_needed() {
    local dir=$1
    local name=$2
    if [ ! -d "$ROOT_DIR/$dir/node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies for $name...${NC}"
        cd "$ROOT_DIR/$dir"
        $PKG_MGR install
    fi
}

install_if_needed "frontend" "Frontend"
install_if_needed "degen-agent" "Degen Agent"
install_if_needed "contrarian-agent" "Contrarian Agent"
install_if_needed "paper-hands-agent" "Paper Hands Agent"
install_if_needed "anxious-agent" "Anxious Agent"
install_if_needed "prompt-wars-agent" "Prompt Wars Agent"

# =============================================================================
# 2. Setup Prisma (Frontend)
# =============================================================================
echo -e "\n${GREEN}🗄️  Setting up database...${NC}"
cd "$ROOT_DIR/frontend"

# Generate Prisma client
echo -e "${BLUE}Generating Prisma client...${NC}"
npx prisma generate 2>/dev/null || echo -e "${YELLOW}Prisma generate skipped (may need DATABASE_URL)${NC}"

# =============================================================================
# 3. Start all services
# =============================================================================
echo -e "\n${GREEN}🚀 Starting services...${NC}"

# Start Frontend (port 3000)
start_service "frontend" "frontend" 3000 "$PKG_MGR run dev"

# Give frontend a head start
sleep 3

# Function to check if agent has required API key
check_agent_env() {
    local dir=$1
    if [ -f "$ROOT_DIR/$dir/.env" ]; then
        if grep -q "GEMINI_API_KEY=" "$ROOT_DIR/$dir/.env" && ! grep -q "GEMINI_API_KEY=your_" "$ROOT_DIR/$dir/.env"; then
            return 0
        fi
    fi
    return 1
}

# Start Agent Servers (only if they have valid .env with API key)
echo -e "${YELLOW}Note: Agents require GEMINI_API_KEY in .env to start${NC}"

if check_agent_env "degen-agent"; then
    start_service "degen-agent" "degen-agent" 4001 "node agent-server.js"
else
    echo -e "${YELLOW}⚠ Skipping degen-agent (missing GEMINI_API_KEY in .env)${NC}"
fi

if check_agent_env "contrarian-agent"; then
    start_service "contrarian-agent" "contrarian-agent" 4002 "node agent-server.js"
else
    echo -e "${YELLOW}⚠ Skipping contrarian-agent (missing GEMINI_API_KEY in .env)${NC}"
fi

if check_agent_env "paper-hands-agent"; then
    start_service "paper-hands-agent" "paper-hands-agent" 4003 "node agent-server.js"
else
    echo -e "${YELLOW}⚠ Skipping paper-hands-agent (missing GEMINI_API_KEY in .env)${NC}"
fi

if check_agent_env "anxious-agent"; then
    start_service "anxious-agent" "anxious-agent" 4004 "node agent-server.js"
else
    echo -e "${YELLOW}⚠ Skipping anxious-agent (missing GEMINI_API_KEY in .env)${NC}"
fi

if check_agent_env "prompt-wars-agent"; then
    start_service "prompt-wars-agent" "prompt-wars-agent" 4005 "node agent-server.js"
else
    echo -e "${YELLOW}⚠ Skipping prompt-wars-agent (missing GEMINI_API_KEY in .env)${NC}"
fi

# =============================================================================
# 4. Wait for services and show status
# =============================================================================
echo -e "\n${GREEN}⏳ Waiting for services to be ready...${NC}"
sleep 3

wait_for_service 3000 "Frontend"
wait_for_service 4001 "Degen Agent"
wait_for_service 4002 "Contrarian Agent"
wait_for_service 4003 "Paper Hands Agent"
wait_for_service 4004 "Anxious Agent"
wait_for_service 4005 "Prompt Wars Agent"

# =============================================================================
# 5. Print summary
# =============================================================================
echo -e "\n${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                  ✅ SERVICES STARTED                          ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Frontend:           http://localhost:3000                    ║"
echo "║                                                               ║"
echo "║  Agents (if configured with GEMINI_API_KEY):                  ║"
echo "║  - Degen Agent:        http://localhost:4001                  ║"
echo "║  - Contrarian Agent:   http://localhost:4002                  ║"
echo "║  - Paper Hands Agent:  http://localhost:4003                  ║"
echo "║  - Anxious Agent:      http://localhost:4004                  ║"
echo "║  - Prompt Wars Agent:  http://localhost:4005                  ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Logs: ./logs/                                                ║"
echo "║  Press Ctrl+C to stop all services                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Keep script running and show logs
echo -e "${CYAN}Tailing logs (Ctrl+C to stop)...${NC}\n"
tail -f "$ROOT_DIR/logs/"*.log 2>/dev/null || wait

