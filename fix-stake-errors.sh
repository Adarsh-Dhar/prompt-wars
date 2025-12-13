#!/bin/bash

echo "🔧 Fixing Stake Errors - Setting bond to 0.05 SOL"
echo "=================================================="
echo ""

echo "The errors you're seeing are likely due to:"
echo "1. DeclaredProgramIdMismatch - program needs redeployment"
echo "2. Existing registry with wrong bond amount (5 SOL instead of 0.05 SOL)"
echo ""

echo "SOLUTION:"
echo "1. Redeploy the program to fix DeclaredProgramIdMismatch"
echo "2. Initialize a new registry with 0.05 SOL bond"
echo ""

echo "Step 1: Rebuilding and redeploying the program..."
cd stake
if [ -f "rebuild-and-deploy.sh" ]; then
    chmod +x rebuild-and-deploy.sh
    ./rebuild-and-deploy.sh
else
    echo "Running manual deployment..."
    anchor clean
    anchor build
    anchor deploy --provider.cluster devnet
fi

echo ""
echo "Step 2: The frontend has been updated to:"
echo "✅ Use 0.05 SOL bond amount (instead of 5 SOL)"
echo "✅ Better error handling for wallet transaction errors"
echo "✅ Balance checking before staking"
echo "✅ Warning for high bond amounts"
echo ""

echo "Next steps:"
echo "1. Refresh your frontend application"
echo "2. Connect your wallet"
echo "3. Click 'Initialize Registry' if needed (will use 0.05 SOL)"
echo "4. Try staking again"
echo ""

echo "The stake amount is now correctly set to 0.05 SOL!"