#!/bin/sh
# Xcode build phase "Copy the game in": put the game inside the app bundle.
#
# The app never keeps its own copy of the game in the repository. index.html
# is the single source of truth — the same rule build-scriptable.js follows —
# and this copies it in at build time, so pressing Run in Xcode is all it
# takes to put the current game on the phone. A second checked-in copy would
# drift the first time the game changed and nobody remembered the app.
set -eu

REPO="${SRCROOT}/.."
DEST="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/web"

if [ ! -f "$REPO/index.html" ]; then
  # "error:" makes Xcode show this in the issue navigator, not just the log.
  echo "error: no index.html at $REPO — the ios folder must stay inside the game's repository."
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST/icons"
cp "$REPO/index.html" "$DEST/index.html"
# Referenced from index.html's <head>; harmless to carry, and it keeps the
# page from logging a missing-file error on every launch.
cp "$REPO/manifest.webmanifest" "$DEST/" 2>/dev/null || true
cp "$REPO/icons/"*.png "$DEST/icons/" 2>/dev/null || true

echo "note: bundled index.html ($(wc -c < "$DEST/index.html" | tr -d ' ') bytes) into the app"
