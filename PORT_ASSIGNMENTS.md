# Port Assignments for RektOrRich Agents

## Port Allocation

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Degen Agent | 4001 | http://localhost:4001 |
| Contrarian Agent | 4002 | http://localhost:4002 |
| Paper Hands Agent | 4003 | http://localhost:4003 |
| Anxious Agent | 4004 | http://localhost:4004 |
| Prompt Wars Agent | 4005 | http://localhost:4005 |

## Running Individual Agents

### Degen Agent
```bash
cd degen-agent
pnpm run agent    # Backend server only
pnpm run dev      # Next.js frontend (port 4001) ✅ CONFIGURED
```

### Contrarian Agent
```bash
cd contrarian-agent
pnpm run agent    # Backend server only (port 4002)
```

### Paper Hands Agent
```bash
cd paper-hands-agent
pnpm run agent    # Backend server only
pnpm run dev      # Next.js frontend (port 4003) ✅ CONFIGURED
```

### Anxious Agent
```bash
cd anxious-agent
pnpm run agent    # Backend server only
pnpm run dev      # Next.js frontend (port 4004) ✅ CONFIGURED
```

### Prompt Wars Agent
```bash
cd prompt-wars-agent
pnpm run agent    # Backend server only (port 4005)
```

## Configuration Files Updated

All agents now have proper port configurations in their `.env` files:
- `PORT` - The port the agent server runs on
- `FRONTEND_URL` - Points to main frontend at localhost:3000
- `AGENT_SERVER_URL` - Points to the agent's own server URL

## Next.js Configuration Fixed

Fixed ES module compatibility issues in:
- `degen-agent/next.config.js`
- `paper-hands-agent/next.config.js`
- `anxious-agent/next.config.js`

Removed deprecated `appDir` experimental option and converted from CommonJS to ES modules.

## Status

✅ **FIXED**: All agents now have dedicated ports and won't conflict with the main frontend
✅ **FIXED**: Next.js configuration issues resolved (ES modules, deprecated options)
✅ **TESTED**: Degen agent successfully running on port 4001

The degen-agent is now properly configured and running on its dedicated port 4001, avoiding conflicts with the main frontend on port 3000.