#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const ROOT = new URL("..", import.meta.url).pathname;

// Files that contain version strings
const VERSION_FILES = {
  packageJson: `${ROOT}package.json`,
  tauriConf: `${ROOT}src-tauri/tauri.conf.json`,
  cargoToml: `${ROOT}src-tauri/Cargo.toml`,
};

type BumpType = "major" | "minor" | "patch";

function getCurrentVersion(): string {
  const pkg = JSON.parse(readFileSync(VERSION_FILES.packageJson, "utf-8"));
  return pkg.version;
}

function bumpVersion(current: string, type: BumpType): string {
  const [major, minor, patch] = current.split(".").map(Number);
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

function updatePackageJson(version: string) {
  const path = VERSION_FILES.packageJson;
  const pkg = JSON.parse(readFileSync(path, "utf-8"));
  pkg.version = version;
  writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`  Updated ${path}`);
}

function updateTauriConf(version: string) {
  const path = VERSION_FILES.tauriConf;
  const conf = JSON.parse(readFileSync(path, "utf-8"));
  conf.version = version;
  writeFileSync(path, JSON.stringify(conf, null, 2) + "\n");
  console.log(`  Updated ${path}`);
}

function updateCargoToml(version: string) {
  const path = VERSION_FILES.cargoToml;
  let content = readFileSync(path, "utf-8");
  content = content.replace(/^version = ".*"$/m, `version = "${version}"`);
  writeFileSync(path, content);
  console.log(`  Updated ${path}`);
}

function updateChangelog(version: string) {
  console.log("\nGenerating changelog...");
  try {
    // Generate changelog with the new tag (git-cliff will include it)
    execSync(`git cliff --tag v${version} -o CHANGELOG.md`, { cwd: ROOT, stdio: "inherit" });
    console.log("  Updated CHANGELOG.md");
  } catch (error) {
    console.warn("  Warning: Could not generate changelog. Is git-cliff installed?");
    console.warn("  Install with: brew install git-cliff");
  }
}

function gitCommitAndTag(version: string) {
  const tag = `v${version}`;

  console.log("\nCommitting changes...");
  execSync("git add -A", { cwd: ROOT, stdio: "inherit" });
  execSync(`git commit -m "${tag}"`, { cwd: ROOT, stdio: "inherit" });

  console.log(`\nCreating tag ${tag}...`);
  execSync(`git tag ${tag}`, { cwd: ROOT, stdio: "inherit" });

  console.log("\nPushing to origin...");
  execSync("git push && git push --tags", { cwd: ROOT, stdio: "inherit" });
}

function buildAppStore() {
  console.log("\n🍎 Building for Mac App Store...\n");
  execSync("./scripts/build-appstore.sh", { cwd: ROOT, stdio: "inherit" });
}

function main() {
  const args = process.argv.slice(2);
  const includeAppStore = args.includes("--appstore");
  const filteredArgs = args.filter((arg) => arg !== "--appstore");
  const bumpType: BumpType = (filteredArgs[0] as BumpType) || "patch";

  if (!["major", "minor", "patch"].includes(bumpType)) {
    console.error("Usage: bun release [major|minor|patch] [--appstore]");
    console.error("  Default: patch");
    console.error("  --appstore: Also build .pkg for Mac App Store");
    process.exit(1);
  }

  // Check for uncommitted changes
  try {
    execSync("git diff-index --quiet HEAD --", { cwd: ROOT });
  } catch {
    console.error("Error: You have uncommitted changes. Please commit or stash them first.");
    process.exit(1);
  }

  const currentVersion = getCurrentVersion();
  const newVersion = bumpVersion(currentVersion, bumpType);

  console.log(`\nBumping version: ${currentVersion} -> ${newVersion} (${bumpType})\n`);
  console.log("Updating version files:");

  updatePackageJson(newVersion);
  updateTauriConf(newVersion);
  updateCargoToml(newVersion);
  updateChangelog(newVersion);

  gitCommitAndTag(newVersion);

  console.log(`\nRelease v${newVersion} created and pushed!`);
  console.log("GitHub Actions will now build and create the release.");
  console.log(`View progress at: https://github.com/wes/duckbake/actions`);

  if (includeAppStore) {
    buildAppStore();
  }
}

main();
