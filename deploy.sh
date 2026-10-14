#!/bin/sh
# Publish the six versions to https://codesine.exe.xyz (nginx on the VM serves /srv/codesine on :8000).
# The audio folders are links to iLoop/audio; rsync keeps them as links, so the recordings go up once.
set -e
cd "$(dirname "$0")"
rsync -az --delete --exclude '.DS_Store' --exclude '__pycache__' --exclude 'tests/' \
  --exclude 'home/capture.cjs' index.html home iLoop iLoop-watercolor iLoop-pencil iLoop-graphic iLoop-graphic-clean iLoop-real \
  codesine.exe.xyz:/srv/codesine/
echo "https://codesine.exe.xyz"
