const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Generate app icon
function generateIcon(size, filename, backgroundColor = '#007AFF', showEmoji = true) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background with rounded corners effect (solid color for PNG)
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, size, size);

  // Draw fork and knife icon
  ctx.fillStyle = '#FFFFFF';

  const centerX = size / 2;
  const centerY = size / 2;
  const scale = size / 1024;

  // Fork (left side)
  const forkX = centerX - 120 * scale;
  ctx.beginPath();
  // Fork handle
  ctx.roundRect(forkX - 25 * scale, centerY - 50 * scale, 50 * scale, 350 * scale, 25 * scale);
  ctx.fill();

  // Fork prongs
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.roundRect(forkX + i * 35 * scale - 12 * scale, centerY - 280 * scale, 24 * scale, 250 * scale, 12 * scale);
    ctx.fill();
  }

  // Knife (right side)
  const knifeX = centerX + 120 * scale;
  ctx.beginPath();
  // Knife handle
  ctx.roundRect(knifeX - 30 * scale, centerY - 50 * scale, 60 * scale, 350 * scale, 30 * scale);
  ctx.fill();

  // Knife blade
  ctx.beginPath();
  ctx.moveTo(knifeX - 30 * scale, centerY - 50 * scale);
  ctx.lineTo(knifeX - 30 * scale, centerY - 300 * scale);
  ctx.quadraticCurveTo(knifeX, centerY - 350 * scale, knifeX + 30 * scale, centerY - 300 * scale);
  ctx.lineTo(knifeX + 30 * scale, centerY - 50 * scale);
  ctx.fill();

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, '..', 'assets', filename), buffer);
  console.log(`Generated ${filename} (${size}x${size})`);
}

// Generate splash icon (simpler, just text)
function generateSplash(width, height, filename) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Draw a plate with fork and knife
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = Math.min(width, height) / 1024;

  // Plate circle
  ctx.fillStyle = '#F0F0F0';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 200 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#E0E0E0';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 150 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 120 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Blue accent
  ctx.fillStyle = '#007AFF';

  // Fork
  const forkX = centerX - 80 * scale;
  ctx.beginPath();
  ctx.roundRect(forkX - 15 * scale, centerY - 30 * scale, 30 * scale, 180 * scale, 15 * scale);
  ctx.fill();
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.roundRect(forkX + i * 20 * scale - 7 * scale, centerY - 150 * scale, 14 * scale, 130 * scale, 7 * scale);
    ctx.fill();
  }

  // Knife
  const knifeX = centerX + 80 * scale;
  ctx.beginPath();
  ctx.roundRect(knifeX - 18 * scale, centerY - 30 * scale, 36 * scale, 180 * scale, 18 * scale);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(knifeX - 18 * scale, centerY - 30 * scale);
  ctx.lineTo(knifeX - 18 * scale, centerY - 160 * scale);
  ctx.quadraticCurveTo(knifeX, centerY - 200 * scale, knifeX + 18 * scale, centerY - 160 * scale);
  ctx.lineTo(knifeX + 18 * scale, centerY - 30 * scale);
  ctx.fill();

  // App name
  ctx.fillStyle = '#333333';
  ctx.font = `bold ${48 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Meal Tracker', centerX, centerY + 300 * scale);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, '..', 'assets', filename), buffer);
  console.log(`Generated ${filename} (${width}x${height})`);
}

// Ensure assets directory exists
const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Generate all icons
generateIcon(1024, 'icon.png', '#007AFF');
generateIcon(1024, 'adaptive-icon.png', '#007AFF');
generateSplash(1284, 2778, 'splash-icon.png');
generateIcon(48, 'favicon.png', '#007AFF');

console.log('\nAll icons generated successfully!');
