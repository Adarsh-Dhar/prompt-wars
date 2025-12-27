# 🎮 Prompt Wars - Quick Start Guide

## Prerequisites
- Node.js v18+
- pnpm (recommended) or npm
- PostgreSQL database (optional for full functionality)

## Quick Start

### 1. Install Dependencies
```bash
./install-all.sh
# OR
pnpm install  # in each subdirectory
```

### 2. Start Frontend Only (Development)
```bash
# Option 1: Using the script
./start-frontend.sh

# Option 2: Using npm/pnpm
cd frontend
DATABASE_URL="postgresql://localhost:5437/prompt_wars" pnpm run dev
```

### 3. Start All Services
```bash
./start-all.sh
```

### 4. Stop All Services
```bash
./stop-all.sh
```

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Degen Agent | 4001 | http://localhost:4001 |
| Contrarian Agent | 4002 | http://localhost:4002 |
| Paper Hands Agent | 4003 | http://localhost:4003 |
| Anxious Agent | 4004 | http://localhost:4004 |
| Prompt Wars Agent | 4005 | http://localhost:4005 |

## Environment Variables

### Frontend (.env in frontend/)
```env
DATABASE_URL="postgresql://localhost:5437/prompt_wars"
NEXT_PUBLIC_MOCK_BLOCKCHAIN=true
NEXT_PUBLIC_SERVER_WALLET="11111111111111111111111111111111"
```

### Agents (.env in each agent directory)
```env
GEMINI_API_KEY=your_api_key_here  # Required for AI functionality
RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your_private_key_here
```

## Troubleshooting

### Prisma Issues
```bash
cd frontend
DATABASE_URL="postgresql://localhost:5437/prompt_wars" npx prisma generate
```

### Port Already in Use
```bash
# Kill process on specific port
lsof -ti:3000 | xargs kill -9
```

### Missing Dependencies
```bash
./install-all.sh
```

## Development Without Database

The app can run in mock mode without a real database for UI development:
1. Set `NEXT_PUBLIC_MOCK_BLOCKCHAIN=true` in frontend/.env
2. API routes that require database will return errors, but UI will load

## Scripts Reference

| Command | Description |
|---------|-------------|
| `./start-all.sh` | Start all services |
| `./start-frontend.sh` | Start frontend only |
| `./stop-all.sh` | Stop all services |
| `./install-all.sh` | Install all dependencies |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:studio` | Open Prisma Studio |

