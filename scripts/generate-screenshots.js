const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const screenshots = [
  { name: 'dashboard', title: 'Dashboard Overview' },
  { name: 'maps', title: 'Maps and Documentation' },
  { name: 'documents', title: 'Document Management' }
];

const outputDir = path.join(__dirname, '../frontend/public/screenshots');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

screenshots.forEach(({ name, title }) => {
  const width = 1280;
  const height = 720;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f8fafc'); // gray-50
  gradient.addColorStop(1, '#e2e8f0'); // gray-200
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add header bar
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(0, 0, width, 60);

  // Header text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('MDRRMO Pio Duran', 30, 30);

  // Main title
  ctx.fillStyle = '#1e293b'; // gray-800
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, width / 2, height / 2 - 50);

  // Subtitle
  ctx.fillStyle = '#64748b'; // gray-500
  ctx.font = '24px Arial, sans-serif';
  ctx.fillText('Disaster Risk Reduction and Management', width / 2, height / 2 + 20);

  // Add decorative elements
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 4;
  ctx.strokeRect(100, 150, 200, 150);
  ctx.strokeRect(width - 300, 150, 200, 150);
  ctx.strokeRect(width / 2 - 100, height - 250, 200, 150);

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  const filename = `${name}.png`;
  fs.writeFileSync(path.join(outputDir, filename), buffer);
  console.log(`Generated ${filename}`);
});

console.log('All screenshots generated successfully!');
