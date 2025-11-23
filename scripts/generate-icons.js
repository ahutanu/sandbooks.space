#!/usr/bin/env node
/**
 * Generate PWA icons from SVG using sharp (better color support)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, '../public/logo-icon.svg');
const sizes = [192, 512];

async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath);
  
  for (const size of sizes) {
    const outputPath = path.join(__dirname, `../public/pwa-${size}x${size}.png`);
    
    try {
      await sharp(svgBuffer)
        .resize(size, size, {
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .png({
          quality: 100,
          compressionLevel: 9,
          force: true // Force PNG output
        })
        .toFile(outputPath);
      
      console.log(`✓ Generated ${outputPath} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${outputPath}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('\n✓ All icons generated successfully!');
}

generateIcons().catch(error => {
  console.error('Error generating icons:', error);
  process.exit(1);
});

