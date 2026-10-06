#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Building Tailwind CSS..."
npm run build:css
echo "Building admin SPA..."
cd admin && npm run build && cd ..
echo "Build complete."
