#!/bin/bash

set -e

NODE_VERSIONS=("20.19" "22")

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
elif [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
fi

if ! type nvm &> /dev/null; then
  echo "Error: nvm (Node Version Manager) is not installed or not available."
  echo "Please install nvm from https://github.com/nvm-sh/nvm"
  exit 1
fi

echo "Running CI tests across multiple Node.js versions..."
echo "Will test sequentially: ${NODE_VERSIONS[*]}"
echo ""

for version in "${NODE_VERSIONS[@]}"; do
  echo "=========================================="
  echo "Testing with Node.js $version (sequential)"
  echo "=========================================="
  
  if ! nvm use "$version" 2>/dev/null; then
    echo "Installing Node.js $version..."
    nvm install "$version"
    nvm use "$version"
  else
    INSTALLED_VERSION=$(node --version | sed 's/v//')
    echo "Using already installed Node.js $INSTALLED_VERSION"
  fi
  
  echo "Node version: $(node --version)"
  echo "npm version: $(npm --version)"
  echo ""
  
  echo "[$version] Installing dependencies..."
  npm ci
  
  echo "[$version] Running lint..."
  npm run lint
  
  echo "[$version] Checking format..."
  npm run format:check
  
  echo "[$version] Running tests..."
  npm run test
  
  echo "[$version] Building..."
  npm run build
  
  echo ""
  echo "✓ Node.js $version: All tests passed"
  echo "Continuing to next version..."
  echo ""
done

echo "=========================================="
echo "Running security check (Node.js 22)..."
echo "=========================================="
nvm use 22
npm run security:check

echo ""
echo "=========================================="
echo "✓ All Node.js versions passed CI tests!"
echo "=========================================="

