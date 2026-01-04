#!/bin/bash
set -e

# App Store Build Script for DuckBake
#
# Prerequisites:
# 1. Install certificates in Keychain:
#    - "3rd Party Mac Developer Application: Your Name (TEAM_ID)"
#    - "3rd Party Mac Developer Installer: Your Name (TEAM_ID)"
# 2. Download provisioning profile to src-tauri/profiles/appstore.provisionprofile
# 3. Update YOUR_TEAM_ID in src-tauri/Entitlements.plist

APP_NAME="DuckBake"
BUNDLE_PATH="src-tauri/target/universal-apple-darwin/release/bundle/macos/${APP_NAME}.app"
PKG_NAME="${APP_NAME}.pkg"

echo "=== Building App Store version of ${APP_NAME} ==="

# Step 1: Build the app bundle
echo ""
echo "Step 1: Building universal app bundle..."
bun run build:appstore

if [ ! -d "$BUNDLE_PATH" ]; then
    echo "Error: App bundle not found at $BUNDLE_PATH"
    exit 1
fi

echo "App bundle created at: $BUNDLE_PATH"

# Step 2: Find the installer signing identity
echo ""
echo "Step 2: Looking for installer signing identity..."
INSTALLER_IDENTITY=$(security find-identity -v -p basic | grep "3rd Party Mac Developer Installer" | head -1 | sed 's/.*"\(.*\)".*/\1/')

if [ -z "$INSTALLER_IDENTITY" ]; then
    echo "Error: No '3rd Party Mac Developer Installer' certificate found in Keychain"
    echo ""
    echo "To fix this:"
    echo "1. Go to https://developer.apple.com/account/resources/certificates"
    echo "2. Create a 'Mac Installer Distribution' certificate"
    echo "3. Download and double-click to install in Keychain"
    exit 1
fi

echo "Using installer identity: $INSTALLER_IDENTITY"

# Step 3: Create the signed .pkg
echo ""
echo "Step 3: Creating signed .pkg installer..."
xcrun productbuild \
    --sign "$INSTALLER_IDENTITY" \
    --component "$BUNDLE_PATH" /Applications \
    "$PKG_NAME"

echo ""
echo "=== Build Complete ==="
echo "Created: $PKG_NAME"
echo ""
echo "Next steps:"
echo "1. Open Transporter app (download from Mac App Store)"
echo "2. Sign in with your Apple Developer account"
echo "3. Drag $PKG_NAME into Transporter"
echo "4. Click 'Deliver' to upload to App Store Connect"
echo ""
echo "Or upload via command line:"
echo "  xcrun altool --upload-app --type macos --file $PKG_NAME \\"
echo "    --apiKey YOUR_API_KEY_ID --apiIssuer YOUR_ISSUER_ID"
