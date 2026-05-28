#!/bin/bash
set -e
echo "Building Tailwind CSS..."
npx tailwindcss --input src/tailwind-input.css --output public/css/tailwind.css --minify
echo "Building admin SPA..."
cd admin && npm run build && cd ..
echo "Build complete."
