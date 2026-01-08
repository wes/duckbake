#!/bin/bash
# Build script for Mac App Store submission
# This temporarily removes updater-related code to comply with App Store guidelines

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CAPABILITIES_DIR="$PROJECT_DIR/src-tauri/capabilities"

echo "🍎 Building for Mac App Store..."

# Backup the default capability (has updater permissions)
if [ -f "$CAPABILITIES_DIR/default.json" ]; then
    mv "$CAPABILITIES_DIR/default.json" "$CAPABILITIES_DIR/default.json.direct"
    echo "✓ Backed up default.json"
fi

# Move appstore capability to default (using mv, not cp, to avoid duplicate identifiers)
if [ -f "$CAPABILITIES_DIR/appstore.json" ]; then
    mv "$CAPABILITIES_DIR/appstore.json" "$CAPABILITIES_DIR/default.json"
    echo "✓ Using appstore capabilities"
fi

# Build function with cleanup on exit
cleanup() {
    echo "🧹 Restoring original capabilities..."
    # Restore appstore.json from default.json
    if [ -f "$CAPABILITIES_DIR/default.json" ]; then
        mv "$CAPABILITIES_DIR/default.json" "$CAPABILITIES_DIR/appstore.json"
    fi
    # Restore original default.json
    if [ -f "$CAPABILITIES_DIR/default.json.direct" ]; then
        mv "$CAPABILITIES_DIR/default.json.direct" "$CAPABILITIES_DIR/default.json"
    fi
    echo "✓ Restored capabilities"
}

# Register cleanup to run on exit
trap cleanup EXIT

# Build without updater feature
echo "🔨 Building app..."
cd "$PROJECT_DIR"
cargo tauri build \
    -f appstore \
    -c src-tauri/tauri.appstore.conf.json \
    "$@" \
    -- --no-default-features

echo "✅ App Store build complete!"
echo "📦 Output is in src-tauri/target/release/bundle/"
