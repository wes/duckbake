#!/bin/bash
# Build script for Mac App Store submission
# This temporarily removes updater-related code to comply with App Store guidelines
# Outputs a .pkg file ready for upload via Transporter

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CAPABILITIES_DIR="$PROJECT_DIR/src-tauri/capabilities"
BUNDLE_DIR="$PROJECT_DIR/src-tauri/target/release/bundle"
APP_PATH="$BUNDLE_DIR/macos/DuckBake.app"

# Get version from package.json
VERSION=$(grep '"version"' "$PROJECT_DIR/package.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
PKG_PATH="$BUNDLE_DIR/DuckBake_${VERSION}_appstore.pkg"

echo "🍎 Building for Mac App Store (v$VERSION)..."

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

# Create .pkg for App Store using productbuild
echo "📦 Creating installer package..."
if [ -d "$APP_PATH" ]; then
    productbuild \
        --component "$APP_PATH" /Applications \
        --sign "3rd Party Mac Developer Installer" \
        "$PKG_PATH"

    echo ""
    echo "✅ App Store build complete!"
    echo "📦 Package ready for Transporter:"
    echo "   $PKG_PATH"
else
    echo "❌ Error: App bundle not found at $APP_PATH"
    exit 1
fi
