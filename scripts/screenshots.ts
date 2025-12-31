#!/usr/bin/env bun
/**
 * Automated Screenshot Script for DuckBake
 *
 * This script launches the app and captures screenshots of different views.
 * Screenshots are saved to website/src/screenshots/ for use on the website.
 *
 * Usage: bun scripts/screenshots.ts
 *
 * Requirements:
 * - macOS (uses screencapture and AppleScript)
 * - App must be built: bun tauri build
 */

import { $ } from "bun";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const APP_PATH = "./src-tauri/target/release/bundle/macos/DuckBake.app";
const SCREENSHOTS_DIR = "./website/src/screenshots";
const WINDOW_TITLE = "DuckBake";

// Ensure screenshots directory exists
if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAppleScript(script: string): Promise<string> {
  const result = await $`osascript -e ${script}`.text();
  return result.trim();
}

async function getWindowId(): Promise<string | null> {
  try {
    // Get the window ID for screencapture
    const script = `
      tell application "System Events"
        tell process "DuckBake"
          set frontWindow to first window
          return id of frontWindow
        end tell
      end tell
    `;
    const windowId = await runAppleScript(script);
    return windowId || null;
  } catch {
    return null;
  }
}

async function captureWindow(filename: string): Promise<void> {
  const filepath = join(SCREENSHOTS_DIR, filename);

  // Use screencapture with window selection
  // -o: no shadow, -l: capture specific window by ID
  try {
    // First, bring DuckBake to front
    await runAppleScript(`tell application "DuckBake" to activate`);
    await sleep(500);

    // Capture the frontmost window using interactive window mode with auto-select
    // -w: window mode, -o: no shadow
    await $`screencapture -o -w -x ${filepath}`.quiet();

    console.log(`  Captured: ${filename}`);
  } catch (error) {
    console.error(`  Failed to capture ${filename}:`, error);
  }
}

async function captureWindowByName(filename: string): Promise<void> {
  const filepath = join(SCREENSHOTS_DIR, filename);

  try {
    // Bring DuckBake to front
    await runAppleScript(`tell application "DuckBake" to activate`);
    await sleep(300);

    // Get window bounds and capture that region
    const boundsScript = `
      tell application "System Events"
        tell process "DuckBake"
          set frontWindow to first window
          set {x, y} to position of frontWindow
          set {w, h} to size of frontWindow
          return (x as text) & "," & (y as text) & "," & (w as text) & "," & (h as text)
        end tell
      end tell
    `;

    const bounds = await runAppleScript(boundsScript);
    const [x, y, w, h] = bounds.split(",").map(Number);

    // Capture the specific region
    await $`screencapture -R${x},${y},${w},${h} -o ${filepath}`.quiet();

    console.log(`  Captured: ${filename}`);
  } catch (error) {
    console.error(`  Failed to capture ${filename}:`, error);
  }
}

async function clickElement(description: string): Promise<void> {
  // Use AppleScript to click UI elements
  const script = `
    tell application "System Events"
      tell process "DuckBake"
        click ${description}
      end tell
    end tell
  `;
  await runAppleScript(script);
}

async function typeText(text: string): Promise<void> {
  const script = `
    tell application "System Events"
      keystroke "${text}"
    end tell
  `;
  await runAppleScript(script);
}

async function pressKey(key: string): Promise<void> {
  const script = `
    tell application "System Events"
      key code ${key}
    end tell
  `;
  await runAppleScript(script);
}

async function isAppRunning(): Promise<boolean> {
  try {
    const result = await $`pgrep -x DuckBake`.quiet();
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

async function launchApp(): Promise<void> {
  console.log("Launching DuckBake...");

  // Check if app exists
  if (!existsSync(APP_PATH)) {
    console.error(`App not found at ${APP_PATH}`);
    console.error("Please build the app first: bun tauri build");
    process.exit(1);
  }

  // Launch the app
  await $`open ${APP_PATH}`.quiet();

  // Wait for app to start
  let attempts = 0;
  while (!(await isAppRunning()) && attempts < 30) {
    await sleep(500);
    attempts++;
  }

  if (!(await isAppRunning())) {
    console.error("Failed to launch app");
    process.exit(1);
  }

  // Give it time to fully render
  await sleep(2000);
  console.log("App launched successfully");
}

async function quitApp(): Promise<void> {
  console.log("Quitting DuckBake...");
  try {
    await runAppleScript(`tell application "DuckBake" to quit`);
  } catch {
    // App might already be closed
  }
}

async function main() {
  console.log("DuckBake Screenshot Automation");
  console.log("==============================\n");

  const wasRunning = await isAppRunning();

  if (!wasRunning) {
    await launchApp();
  } else {
    console.log("App is already running\n");
  }

  try {
    // Capture home screen (projects list)
    console.log("1. Capturing home screen...");
    await runAppleScript(`tell application "DuckBake" to activate`);
    await sleep(1000);
    await captureWindowByName("home.png");

    console.log("\n Screenshots saved to:", SCREENSHOTS_DIR);
    console.log("\nNote: For more screenshots, you may need to:");
    console.log("  - Create a test project with sample data");
    console.log("  - Navigate to different views manually");
    console.log("  - Run this script again with --interactive flag");

  } catch (error) {
    console.error("Error during screenshot capture:", error);
  } finally {
    if (!wasRunning) {
      // Only quit if we launched it
      // await quitApp();
      console.log("\nApp left running for manual screenshots if needed.");
    }
  }
}

main().catch(console.error);
