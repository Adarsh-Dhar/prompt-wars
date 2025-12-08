# Fix DeclaredProgramIdMismatch Error

## Quick Fix

Run this script to rebuild and redeploy:

```bash
cd stake
chmod +x rebuild-and-deploy.sh
./rebuild-and-deploy.sh
```

## Manual Steps (if script doesn't work)

```bash
cd stake

# 1. Clean previous build
anchor clean

# 2. Build the program
anchor build

# 3. Deploy to devnet
anchor deploy --provider.cluster devnet
```

## What This Fixes

The error occurs because:
- **Declared in code**: `CQZEo9zd8QNgT2uUJRn1cdHxc2794xFumQu9ZXL4Syk8` ✅
- **Declared in deployed binary**: `AgNtRgstry111111111111111111111111111111111` ❌ (old)

Rebuilding and redeploying will embed the correct `declare_id!()` in the binary.

## After Deployment

1. Refresh your frontend
2. Try initializing the registry again
3. The error should be resolved
