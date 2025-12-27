#!/bin/bash
# =============================================================================
# Prompt Wars - Install All Dependencies
# =============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check package manager
if command -v pnpm &> /dev/null; then
    PKG_MGR="pnpm"
else
    PKG_MGR="npm"
fi

echo -e "${BLUE}📦 Installing dependencies with $PKG_MGR...${NC}"

dirs=("frontend" "degen-agent" "contrarian-agent" "paper-hands-agent" "anxious-agent" "prompt-wars-agent")

for dir in "${dirs[@]}"; do
    if [ -d "$ROOT_DIR/$dir" ] && [ -f "$ROOT_DIR/$dir/package.json" ]; then
        echo -e "${GREEN}Installing $dir...${NC}"
        cd "$ROOT_DIR/$dir"
        $PKG_MGR install
    fi
done

echo -e "\n${GREEN}✅ All dependencies installed${NC}"

