#!/usr/bin/env node
/**
 * Generate PNG icons from SVG files
 */

import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const iconsDir = join(__dirname, '../public/icons');

const sizes = [16, 32, 48, 128];

async function generateIcons() {
  console.log('Generating PNG icons from SVG files...');
  
  for (const size of sizes) {
    const svgPath = join(iconsDir, `icon-${size}.svg`);
    const pngPath = join(iconsDir, `icon-${size}.png`);
    
    try {
      const svg = readFileSync(svgPath, 'utf8');
      
      const resvg = new Resvg(svg, {
        fitTo: {
          mode: 'width',
          value: size,
        },
      });
      
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();
      
      writeFileSync(pngPath, pngBuffer);
      console.log(`✓ Generated icon-${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to generate icon-${size}.png:`, error.message);
    }
  }
  
  console.log('Icon generation complete!');
}

generateIcons();
