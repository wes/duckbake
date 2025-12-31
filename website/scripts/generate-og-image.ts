import sharp from "sharp";
import path from "path";

const WIDTH = 1200;
const HEIGHT = 630;

async function generateOGImage() {
  const srcDir = path.join(import.meta.dir, "../src");
  const outputPath = path.join(srcDir, "og-image.png");

  // Load the screenshot
  const screenshotPath = path.join(srcDir, "screenshots/home.png");
  const screenshot = await sharp(screenshotPath)
    .resize(800, null, { fit: "inside" })
    .toBuffer();

  const screenshotMeta = await sharp(screenshot).metadata();
  const screenshotWidth = screenshotMeta.width || 800;
  const screenshotHeight = screenshotMeta.height || 500;

  // Load the logo
  const logoPath = path.join(srcDir, "duckbake-square.png");
  const logo = await sharp(logoPath).resize(80, 80).toBuffer();

  // Create gradient background matching the dark theme
  const gradient = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0a0a0f;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#0f0f1a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0a1a1a;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#6366f1;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:0.3" />
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
      <ellipse cx="200" cy="500" rx="400" ry="300" fill="url(#accent)" opacity="0.5"/>
      <ellipse cx="1000" cy="100" rx="300" ry="200" fill="url(#accent)" opacity="0.3"/>
    </svg>
  `);

  // Create text overlay
  const textOverlay = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}">
      <style>
        .title { font-family: system-ui, -apple-system, sans-serif; font-weight: 700; fill: white; }
        .subtitle { font-family: system-ui, -apple-system, sans-serif; font-weight: 400; fill: #a1a1aa; }
        .badge { font-family: system-ui, -apple-system, sans-serif; font-weight: 600; fill: #a5b4fc; }
      </style>
      <text x="60" y="120" class="title" font-size="56">DuckBake</text>
      <text x="60" y="175" class="subtitle" font-size="26">Local Data Analysis with SQL &amp; AI</text>
      <text x="60" y="220" class="badge" font-size="18">Free • Privacy-First • Powered by DuckDB</text>
    </svg>
  `);

  // Position screenshot on the right side with slight offset
  const screenshotX = WIDTH - screenshotWidth - 40;
  const screenshotY = Math.round((HEIGHT - screenshotHeight) / 2) + 40;

  // Create rounded corners mask for screenshot
  const roundedMask = Buffer.from(`
    <svg width="${screenshotWidth}" height="${screenshotHeight}">
      <rect x="0" y="0" width="${screenshotWidth}" height="${screenshotHeight}" rx="16" ry="16" fill="white"/>
    </svg>
  `);

  // Apply rounded corners to screenshot
  const roundedScreenshot = await sharp(screenshot)
    .composite([
      {
        input: roundedMask,
        blend: "dest-in",
      },
    ])
    .toBuffer();

  // Add shadow effect
  const shadowOffset = 20;
  const shadow = Buffer.from(`
    <svg width="${screenshotWidth + shadowOffset * 2}" height="${screenshotHeight + shadowOffset * 2}">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="20" flood-color="#000000" flood-opacity="0.5"/>
        </filter>
      </defs>
      <rect x="${shadowOffset}" y="${shadowOffset}" width="${screenshotWidth}" height="${screenshotHeight}" rx="16" ry="16" fill="#1a1a2e" filter="url(#shadow)"/>
    </svg>
  `);

  // Compose final image
  const finalImage = await sharp(gradient)
    .composite([
      {
        input: await sharp(shadow).png().toBuffer(),
        left: screenshotX - shadowOffset,
        top: screenshotY - shadowOffset,
      },
      {
        input: roundedScreenshot,
        left: screenshotX,
        top: screenshotY,
      },
      {
        input: logo,
        left: 60,
        top: 280,
      },
      {
        input: await sharp(textOverlay).png().toBuffer(),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toFile(outputPath);

  console.log(`OG image generated: ${outputPath}`);
  console.log(`Dimensions: ${WIDTH}x${HEIGHT}`);
}

generateOGImage().catch(console.error);
