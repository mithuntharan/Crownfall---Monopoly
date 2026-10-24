/**
 * Cross-platform C++ Engine Compiler for Production Deployments (Render, Railway, Linux, Docker, Windows)
 *
 * Checks if g++ is available, creates bin directory if missing,
 * and compiles the native authoritative C++ engine binary.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const binDir = path.join(rootDir, 'bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

const isWin = process.platform === 'win32';
const targetBin = path.join(binDir, isWin ? 'monopoly_engine.exe' : 'monopoly_engine');

// If already built for this platform, check if source files were modified
if (fs.existsSync(targetBin)) {
  const binMtime = fs.statSync(targetBin).mtimeMs;
  const srcFiles = [
    'cpp/src/main.cpp',
    'cpp/src/GameEngine.cpp',
    'cpp/src/BusinessData.cpp',
    'cpp/include/GameEngine.h',
    'cpp/include/BusinessData.h',
    'cpp/include/Types.h',
  ];
  let needsRecompile = false;
  for (const src of srcFiles) {
    const fullPath = path.join(rootDir, src);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).mtimeMs > binMtime) {
      needsRecompile = true;
      break;
    }
  }
  if (!needsRecompile) {
    console.log(`[BUILD] C++ engine binary is up to date: ${targetBin}`);
    process.exit(0);
  }
  console.log('[BUILD] Source files modified. Recompiling C++ engine binary...');
}

console.log('[BUILD] Compiling C++ native engine for platform:', process.platform);

const args = [
  '-O3',
  '-std=c++17',
  '-Icpp/include',
  'cpp/src/main.cpp',
  'cpp/src/GameEngine.cpp',
  'cpp/src/BusinessData.cpp',
  '-o',
  targetBin,
];

try {
  const result = spawnSync('g++', args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  });

  if (result.status === 0 && fs.existsSync(targetBin)) {
    console.log(`[BUILD] C++ engine compiled successfully to: ${targetBin}`);
    // Ensure Linux execute permissions
    if (!isWin) {
      try { fs.chmodSync(targetBin, 0o755); } catch (_) {}
    }
  } else {
    console.warn('[BUILD] g++ compilation ended with code:', result.status, '- Fallback TypeScript engine will be active.');
  }
} catch (err) {
  console.warn('[BUILD] Note: g++ not detected on host system. Fallback TypeScript engine will be used.');
}
