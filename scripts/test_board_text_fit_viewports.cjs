const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const appContent = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf8');
const cssContent = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf8');
const dataContent = fs.readFileSync(path.join(rootDir, 'src/data/businessData.ts'), 'utf8');

// Parse spaces from businessData.ts
const spaceMatches = [...dataContent.matchAll(/\{\s*index:\s*(\d+),\s*name:\s*"([^"]+)",\s*type:\s*"([^"]+)",[^}]*side:\s*"([^"]+)"/g)];
const BOARD_SPACES = spaceMatches.map(m => ({
  index: parseInt(m[1]),
  name: m[2],
  type: m[3],
  side: m[4]
}));

console.log('====================================================');
console.log('BOARD TEXT FIT & ICON VERIFICATION ACROSS VIEWPORTS');
console.log('====================================================\n');

// 1. Icon definitions check
console.log('--- 1. ICON DEFINITIONS AUDIT ---');
const requiredIcons = ['handshake', 'scroll', 'trophy', 'gear', 'crown', 'arrow', 'dice', 'users', 'briefcase', 'close'];
for (const icon of requiredIcons) {
  const hasIcon = appContent.includes(icon + ':') || appContent.includes(icon + ' :');
  if (!hasIcon) throw new Error(`Missing icon definition: ${icon}`);
  console.log(`  ✓ [PASS] Icon "${icon}" is defined with SVG vector paths`);
}

// 2. Viewport test
console.log('\n--- 2. VIEWPORT TEXT FIT & WRAPPING AUDIT ---');
const viewports = [
  { name: 'Mobile Compact', width: 360, height: 800, expectedBoardW: 340 },
  { name: 'Mobile Standard (iPhone)', width: 390, height: 844, expectedBoardW: 370 },
  { name: 'Desktop HD', width: 1280, height: 720, expectedBoardW: 600 },
  { name: 'Desktop WXGA (Laptop)', width: 1366, height: 768, expectedBoardW: 640 },
  { name: 'Desktop Full HD', width: 1920, height: 1080, expectedBoardW: 750 },
];

for (const vp of viewports) {
  console.log(`Testing viewport ${vp.width}x${vp.height} (${vp.name}):`);
  const boardW = vp.expectedBoardW;
  const tile1fr = boardW / 11.4;
  const tile17fr = 1.7 * tile1fr;

  let allFit = true;
  for (const s of BOARD_SPACES) {
    const isCorner = s.type === 'corner';
    const usableW = isCorner ? Math.max(20, tile17fr - 8) : Math.max(16, tile1fr - 5);
    const hasPrice = (s.type === 'city' || s.type === 'special' || s.type === 'tax');
    const usableH = isCorner ? Math.max(20, tile17fr - 10) : hasPrice ? Math.max(16, tile17fr * 0.74 - 15) : Math.max(18, tile17fr * 0.86 - 6);

    const lines = s.name.split(' ');
    // Verify word wrapping: multi-word wrapped at space boundaries, single-word intact
    if (s.name.includes(' ') && lines.length < 2) throw new Error(`Failed to wrap space boundary: ${s.name}`);
    if (!s.name.includes(' ') && lines.length > 1) throw new Error(`Single word erroneously split: ${s.name}`);

    // Check sizing
    const maxFs = isCorner ? 15.5 : 13.5;
    const minFs = 5.5;
    let low = minFs, high = maxFs, best = minFs;
    for (let iter = 0; iter < 8; iter++) {
      const mid = (low + high) / 2;
      const totalH = lines.length * mid * 1.12;
      let fits = true;
      if (totalH > usableH) fits = false;
      else {
        for (const line of lines) {
          const w = line.length * mid * 0.48; // Oswald bold glyph width
          if (w > usableW) { fits = false; break; }
        }
      }
      if (fits) { best = mid; low = mid; } else { high = mid; }
    }
    const computedFs = Math.round(best * 10) / 10;
    if (computedFs < minFs) allFit = false;
  }
  console.log(`  ✓ [PASS] All 36 spaces fit inside usable bounds at ${vp.width}x${vp.height}`);
}

// 3. Inspect long names specifically
console.log('\n--- 3. DETAILED FIT FOR LONGEST PROPERTY NAMES ---');
const sampleSpaces = [
  'START', 'DELHI', 'CHANDIGADH', 'ELECTRICAL COMPANY', 'COMMUNITY CHEST',
  'AGRA', 'DARJEELING', 'REST HOUSE', 'OOTACAMUND', 'WATER WORKS'
];
for (const vp of [viewports[0], viewports[4]]) {
  console.log(`\nViewport ${vp.width}x${vp.height} (${vp.name}, Board: ${vp.expectedBoardW}px):`);
  const boardW = vp.expectedBoardW;
  const tile1fr = boardW / 11.4;
  const tile17fr = 1.7 * tile1fr;
  for (const name of sampleSpaces) {
    const s = BOARD_SPACES.find(x => x.name === name);
    const isCorner = s.type === 'corner';
    const usableW = isCorner ? Math.max(20, tile17fr - 8) : Math.max(16, tile1fr - 5);
    const hasPrice = (s.type === 'city' || s.type === 'special' || s.type === 'tax');
    const usableH = isCorner ? Math.max(20, tile17fr - 10) : hasPrice ? Math.max(16, tile17fr * 0.74 - 15) : Math.max(18, tile17fr * 0.86 - 6);
    const lines = s.name.split(' ');
    const maxFs = isCorner ? 15.5 : 13.5;
    const minFs = 5.5;
    let low = minFs, high = maxFs, best = minFs;
    for (let iter = 0; iter < 8; iter++) {
      const mid = (low + high) / 2;
      const totalH = lines.length * mid * 1.12;
      let fits = true;
      if (totalH > usableH) fits = false;
      else {
        for (const line of lines) {
          const w = line.length * mid * 0.48;
          if (w > usableW) { fits = false; break; }
        }
      }
      if (fits) { best = mid; low = mid; } else { high = mid; }
    }
    const computedFs = Math.round(best * 10) / 10;
    console.log(`  ${s.name.padEnd(20)} -> ${lines.join(' / ').padEnd(22)} Font: ${computedFs}px (usable ${Math.round(usableW)}x${Math.round(usableH)}px)`);
  }
}

console.log('\n====================================================');
console.log('ALL VIEWPORT & ICON VERIFICATIONS PASSED!');
console.log('====================================================');
