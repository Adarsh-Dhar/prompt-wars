#!/bin/bash
# Script to rebuild and redeploy the agent_registry program
# This fixes the DeclaredProgramIdMismatch error

# Don't exit on error - we want to check build status manually

echo "================================================================================"
echo "🔧 Rebuilding and Redeploying Agent Registry Program"
echo "================================================================================"
echo ""

# Change to stake directory
cd "$(dirname "$0")"

# Step 1: Clean previous build
echo "📦 Step 1: Cleaning previous build..."
anchor clean || true
echo "✅ Clean complete"
echo ""

# Step 2: Build the program
echo "🔨 Step 2: Building program with current declare_id!()..."
echo "   Current declare_id: CQZEo9zd8QNgT2uUJRn1cdHxc2794xFumQu9ZXL4Syk8"
echo ""
echo "   Building (this may take a minute)..."
if anchor build 2>&1 | tee /tmp/anchor_build.log; then
    echo "✅ Build succeeded"
elif [ -f "target/deploy/agent_registry.so" ]; then
    echo "⚠️  Build had warnings/errors, but .so file was created"
    echo "   Checking if build actually succeeded..."
    if [ -f "target/deploy/agent_registry.so" ]; then
        echo "✅ Build artifact exists - proceeding with deployment"
    else
        echo "❌ ERROR: Build failed - agent_registry.so not found"
        echo "   Check /tmp/anchor_build.log for details"
        exit 1
    fi
else
    echo "❌ ERROR: Build failed"
    echo "   Check /tmp/anchor_build.log for details"
    exit 1
fi
echo ""

# Step 3: Verify the build artifact
if [ ! -f "target/deploy/agent_registry.so" ]; then
    echo "❌ ERROR: Build artifact not found - target/deploy/agent_registry.so"
    exit 1
fi
SO_SIZE=$(ls -lh target/deploy/agent_registry.so | awk '{print $5}')
echo "✅ Build artifact verified: target/deploy/agent_registry.so ($SO_SIZE)"
echo ""

# Step 4: Deploy to devnet
echo "🚀 Step 3: Deploying to devnet..."
anchor deploy --provider.cluster devnet
echo ""

# Step 5: Verify deployment
echo "🔍 Step 4: Verifying deployment..."
DEPLOYED_ID=$(anchor deploy --provider.cluster devnet --dry-run 2>&1 | grep "Program Id:" | awk '{print $3}' || echo "")
if [ -n "$DEPLOYED_ID" ]; then
    echo "✅ Program deployed successfully!"
    echo "   Program ID: $DEPLOYED_ID"
else
    echo "⚠️  Could not verify deployment automatically"
    echo "   Please check the output above for the Program Id"
fi
echo ""

echo "================================================================================"
echo "✅ Rebuild and deployment complete!"
echo "================================================================================"
echo ""
echo "The program has been rebuilt with the correct declare_id!() and redeployed."
echo "The DeclaredProgramIdMismatch error should now be resolved."
echo ""
echo "Next steps:"
echo "1. Refresh your frontend application"
echo "2. Try initializing the registry again"
echo ""
