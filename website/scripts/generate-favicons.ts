import sharp from "sharp";
import path from "path";

const FAVICON_SIZES = [16, 32, 180, 192, 512];

async function generateFavicons() {
  const publicDir = path.join(import.meta.dir, "../public");
  const sourcePath = path.join(publicDir, "duckbake.png");

  // Generate PNG favicons at different sizes
  for (const size of FAVICON_SIZES) {
    const outputPath = path.join(publicDir, `favicon-${size}x${size}.png`);
    await sharp(sourcePath)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outputPath);
    console.log(`Generated: favicon-${size}x${size}.png`);
  }

  // Generate favicon.ico (contains 16x16 and 32x32)
  // Sharp doesn't support ICO directly, so we'll create a PNG and rename
  // For proper ICO support, we generate 32x32 as the main favicon
  const icoPath = path.join(publicDir, "favicon.ico");
  await sharp(sourcePath)
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(icoPath);
  console.log(`Generated: favicon.ico (32x32 PNG)`);

  console.log("\nAll favicons generated successfully!");
}

generateFavicons().catch(console.error);
