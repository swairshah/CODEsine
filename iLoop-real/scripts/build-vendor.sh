#!/bin/sh
# Rebuilds vendor/three.bundle.js (three.js r186 and the addons iLoop-real uses) as one classic script.
# Run from anywhere; needs node and network access for npm. Writes into ../vendor next to this script.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/../vendor"
WORK="$(mktemp -d)"
cp "$HERE/three-entry.js" "$WORK/entry.js"
cd "$WORK"
npm init -y >/dev/null
npm install --silent three@0.186.1 esbuild@0.28.2 >/dev/null
npx esbuild entry.js --bundle --minify --format=iife --target=es2020 --legal-comments=none --outfile="$OUT/three.bundle.js"
cp node_modules/three/LICENSE "$OUT/LICENSE-three.txt"
rm -rf "$WORK"
echo "wrote $OUT/three.bundle.js"
