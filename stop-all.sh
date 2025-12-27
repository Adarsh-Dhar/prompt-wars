#!/bin/bash
# =============================================================================
# Prompt Wars - Stop All Services
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🛑 Stopping all Prompt Wars services...${NC}"

# Kill processes on all known ports
for port in 3000 4001 4002 4003 4004 4005; do
    pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}Stopping service on port $port (PIDs: $pids)${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
done

# Also kill any remaining node processes with our project names
pkill -f "next dev" 2>/dev/null || true
pkill -f "agent-server.js" 2>/dev/null || true

echo -e "${GREEN}✅ All services stopped${NC}"

