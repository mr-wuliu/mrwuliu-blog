#!/bin/bash
set -e
echo "Building admin SPA..."
cd admin && npm run build && cd ..
echo "Build complete."
