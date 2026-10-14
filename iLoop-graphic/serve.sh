#!/bin/sh
# Serve the explorer over http so YouTube sources can play (they will not from a file:// page).
cd "$(dirname "$0")"
echo "Open http://localhost:8642"
exec python3 -m http.server 8642
