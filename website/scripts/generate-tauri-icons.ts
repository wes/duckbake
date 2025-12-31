import sharp from "sharp";
import path from "path";
import { existsSync, mkdirSync } from "fs";

// Can be run from website folder or root
const rootDir = import.meta.dir.includes("/website/")
  ? path.join(import.meta.dir, "../..")
  : path.join(import.meta.dir, "..");

const SOURCE_ICON = path.join(rootDir, "website/src/duckbake.png");
const TAURI_ICONS_DIR = path.join(rootDir, "src-tauri/icons");
const ANDROID_ICONS_DIR = path.join(TAURI_ICONS_DIR, "android");

// Tauri icon sizes
const TAURI_SIZES = [32, 64, 128, 256, 512, 1024];

// Windows Store logo sizes
const WINDOWS_LOGOS = [
  { name: "Square30x30Logo", size: 30 },
  { name: "Square44x44Logo", size: 44 },
  { name: "Square71x71Logo", size: 71 },
  { name: "Square89x89Logo", size: 89 },
  { name: "Square107x107Logo", size: 107 },
  { name: "Square142x142Logo", size: 142 },
  { name: "Square150x150Logo", size: 150 },
  { name: "Square284x284Logo", size: 284 },
  { name: "Square310x310Logo", size: 310 },
  { name: "StoreLogo", size: 50 },
];

// Android icon sizes (mipmap)
const ANDROID_SIZES = [
  { folder: "mipmap-mdpi", size: 48 },
  { folder: "mipmap-hdpi", size: 72 },
  { folder: "mipmap-xhdpi", size: 96 },
  { folder: "mipmap-xxhdpi", size: 144 },
  { folder: "mipmap-xxxhdpi", size: 192 },
];

async function generateTauriIcons() {
  console.log("Generating Tauri app icons...\n");

  // Ensure directories exist
  if (!existsSync(TAURI_ICONS_DIR)) {
    mkdirSync(TAURI_ICONS_DIR, { recursive: true });
  }
  if (!existsSync(ANDROID_ICONS_DIR)) {
    mkdirSync(ANDROID_ICONS_DIR, { recursive: true });
  }

  // Generate standard PNG sizes
  for (const size of TAURI_SIZES) {
    let filename: string;
    if (size === 256) {
      filename = "128x128@2x.png";
    } else if (size === 1024 || size === 512) {
      if (size === 512) {
        filename = "icon.png";
      } else {
        continue; // Skip 1024, we use 512 for icon.png
      }
    } else {
      filename = `${size}x${size}.png`;
    }

    const outputPath = path.join(TAURI_ICONS_DIR, filename);
    await sharp(SOURCE_ICON)
      .ensureAlpha()
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outputPath);
    console.log(`Generated: ${filename}`);
  }

  // Generate Windows Store logos
  console.log("\nGenerating Windows Store logos...");
  for (const logo of WINDOWS_LOGOS) {
    const outputPath = path.join(TAURI_ICONS_DIR, `${logo.name}.png`);
    await sharp(SOURCE_ICON)
      .ensureAlpha()
      .resize(logo.size, logo.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outputPath);
    console.log(`Generated: ${logo.name}.png`);
  }

  // Generate Android icons
  console.log("\nGenerating Android icons...");
  for (const android of ANDROID_SIZES) {
    const folderPath = path.join(ANDROID_ICONS_DIR, android.folder);
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }
    const outputPath = path.join(folderPath, "ic_launcher.png");
    await sharp(SOURCE_ICON)
      .ensureAlpha()
      .resize(android.size, android.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outputPath);

    // Also generate round icon
    const roundOutputPath = path.join(folderPath, "ic_launcher_round.png");
    await sharp(SOURCE_ICON)
      .ensureAlpha()
      .resize(android.size, android.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(roundOutputPath);

    // Generate foreground icon (same as regular for now)
    const foregroundPath = path.join(folderPath, "ic_launcher_foreground.png");
    await sharp(SOURCE_ICON)
      .ensureAlpha()
      .resize(android.size, android.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(foregroundPath);

    console.log(`Generated: ${android.folder}/ic_launcher*.png`);
  }

  // Generate ICO file (Windows) - multi-size ICO using sharp
  console.log("\nGenerating Windows ICO...");
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoBuffers = await Promise.all(
    icoSizes.map(size =>
      sharp(SOURCE_ICON)
        .ensureAlpha()
        .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    )
  );

  // Create ICO file manually (ICO format)
  const icoPath = path.join(TAURI_ICONS_DIR, "icon.ico");
  const icoFile = createIcoFile(icoBuffers, icoSizes);
  await Bun.write(icoPath, icoFile);
  console.log("Generated: icon.ico");

  // Generate ICNS file (macOS)
  console.log("\nGenerating macOS ICNS...");
  const icnsPath = path.join(TAURI_ICONS_DIR, "icon.icns");
  const icnsFile = await createIcnsFile(SOURCE_ICON);
  await Bun.write(icnsPath, icnsFile);
  console.log("Generated: icon.icns");

  console.log("\nAll Tauri icons generated successfully!");
}

// Create ICO file from PNG buffers
function createIcoFile(pngBuffers: Buffer[], sizes: number[]): Buffer {
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;

  let dataOffset = headerSize + dirSize;
  const entries: { size: number; buffer: Buffer; offset: number }[] = [];

  for (let i = 0; i < numImages; i++) {
    entries.push({
      size: sizes[i],
      buffer: pngBuffers[i],
      offset: dataOffset
    });
    dataOffset += pngBuffers[i].length;
  }

  const totalSize = dataOffset;
  const ico = Buffer.alloc(totalSize);

  // ICO header
  ico.writeUInt16LE(0, 0);      // Reserved
  ico.writeUInt16LE(1, 2);      // Type: 1 = ICO
  ico.writeUInt16LE(numImages, 4); // Number of images

  // Directory entries
  let offset = headerSize;
  for (const entry of entries) {
    ico.writeUInt8(entry.size >= 256 ? 0 : entry.size, offset);     // Width
    ico.writeUInt8(entry.size >= 256 ? 0 : entry.size, offset + 1); // Height
    ico.writeUInt8(0, offset + 2);                                   // Color palette
    ico.writeUInt8(0, offset + 3);                                   // Reserved
    ico.writeUInt16LE(1, offset + 4);                                // Color planes
    ico.writeUInt16LE(32, offset + 6);                               // Bits per pixel
    ico.writeUInt32LE(entry.buffer.length, offset + 8);              // Image size
    ico.writeUInt32LE(entry.offset, offset + 12);                    // Image offset
    offset += dirEntrySize;
  }

  // Image data
  for (const entry of entries) {
    entry.buffer.copy(ico, entry.offset);
  }

  return ico;
}

// Create ICNS file from source image
async function createIcnsFile(sourcePath: string): Promise<Buffer> {
  // ICNS icon types and their sizes
  const icnsTypes = [
    { type: "ic07", size: 128 },   // 128x128
    { type: "ic08", size: 256 },   // 256x256
    { type: "ic09", size: 512 },   // 512x512
    { type: "ic10", size: 1024 },  // 1024x1024
    { type: "ic11", size: 32 },    // 32x32@2x (actually 64x64 stored as 32@2x)
    { type: "ic12", size: 64 },    // 64x64@2x (actually 128x128 stored as 64@2x)
    { type: "ic13", size: 256 },   // 256x256@2x (actually 512x512 stored as 256@2x)
    { type: "ic14", size: 512 },   // 512x512@2x (actually 1024x1024 stored as 512@2x)
  ];

  const images: { type: string; data: Buffer }[] = [];

  for (const icns of icnsTypes) {
    const pngBuffer = await sharp(sourcePath)
      .ensureAlpha()
      .resize(icns.size, icns.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    images.push({ type: icns.type, data: pngBuffer });
  }

  // Calculate total size
  let totalSize = 8; // ICNS header
  for (const img of images) {
    totalSize += 8 + img.data.length; // type (4) + size (4) + data
  }

  const icns = Buffer.alloc(totalSize);

  // ICNS header
  icns.write("icns", 0, 4, "ascii");
  icns.writeUInt32BE(totalSize, 4);

  let offset = 8;
  for (const img of images) {
    icns.write(img.type, offset, 4, "ascii");
    icns.writeUInt32BE(8 + img.data.length, offset + 4);
    img.data.copy(icns, offset + 8);
    offset += 8 + img.data.length;
  }

  return icns;
}

generateTauriIcons().catch(console.error);
