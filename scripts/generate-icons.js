const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outputDir = path.join(__dirname, '../frontend/public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient (blue)
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#3b82f6'); // blue-500
  gradient.addColorStop(1, '#1d4ed8'); // blue-700
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Add a subtle pattern or icon
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.arc(size * 0.3, size * 0.3, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(size * 0.7, size * 0.7, size * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Add text
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.2}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MDRRMO', size / 2, size / 2 - size * 0.05);
  
  ctx.font = `${size * 0.12}px Arial, sans-serif`;
  ctx.fillText('Pio Duran', size / 2, size / 2 + size * 0.12);

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  const filename = `icon-${size}x${size}.png`;
  fs.writeFileSync(path.join(outputDir, filename), buffer);
  console.log(`Generated ${filename}`);
});

// Generate shortcut icons
const shortcutIcons = [
  { name: 'dashboard', emoji: '📊' },
  { name: 'maps', emoji: '🗺️' },
  { name: 'documents', emoji: '📄' }
];

shortcutIcons.forEach(({ name, emoji }) => {
  const size = 96;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#3b82f6');
  gradient.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Emoji (simplified with text)
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.5}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2);

  const buffer = canvas.toBuffer('image/png');
  const filename = `${name}-icon.png`;
  fs.writeFileSync(path.join(outputDir, filename), buffer);
  console.log(`Generated ${filename}`);
});

console.log('All icons generated successfully!');
