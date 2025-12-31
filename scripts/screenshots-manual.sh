#!/bin/bash
# Manual Screenshot Helper for DuckBake
#
# This script helps you capture screenshots manually with consistent settings.
# It waits for you to position the app, then captures on keypress.
#
# Usage: ./scripts/screenshots-manual.sh

SCREENSHOTS_DIR="./website/src/screenshots"

# Create directory if needed
mkdir -p "$SCREENSHOTS_DIR"

echo "DuckBake Manual Screenshot Helper"
echo "================================="
echo ""
echo "Screenshots will be saved to: $SCREENSHOTS_DIR"
echo ""

capture_screenshot() {
    local name=$1
    local filepath="$SCREENSHOTS_DIR/$name.png"

    echo ""
    echo "Preparing to capture: $name"
    echo "Position the DuckBake window, then press ENTER..."
    read -r

    # Bring DuckBake to front
    osascript -e 'tell application "DuckBake" to activate' 2>/dev/null
    sleep 0.5

    # Get window bounds
    BOUNDS=$(osascript -e '
        tell application "System Events"
            tell process "DuckBake"
                set frontWindow to first window
                set {x, y} to position of frontWindow
                set {w, h} to size of frontWindow
                return (x as text) & "," & (y as text) & "," & (w as text) & "," & (h as text)
            end tell
        end tell
    ' 2>/dev/null)

    if [ -z "$BOUNDS" ]; then
        echo "Error: Could not find DuckBake window. Is the app running?"
        return 1
    fi

    # Parse bounds
    IFS=',' read -r X Y W H <<< "$BOUNDS"

    # Capture the region (no shadow)
    screencapture -R"$X,$Y,$W,$H" -o "$filepath"

    echo "Captured: $filepath"
}

echo "Make sure DuckBake is running before continuing."
echo ""

# Capture different views
capture_screenshot "home"

echo ""
read -p "Capture project view? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Navigate to a project in DuckBake..."
    capture_screenshot "project-browser"
fi

echo ""
read -p "Capture query view? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Navigate to the Query tab..."
    capture_screenshot "project-query"
fi

echo ""
read -p "Capture chat view? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Navigate to the Chat tab..."
    capture_screenshot "project-chat"
fi

echo ""
echo "Done! Screenshots saved to $SCREENSHOTS_DIR"
echo ""
echo "To use in the website, import them like:"
echo "  import homeScreenshot from './screenshots/home.png';"
