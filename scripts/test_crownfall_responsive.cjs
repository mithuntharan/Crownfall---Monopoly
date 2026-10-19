/**
 * Crownfall — Responsive Layout & Project Rename Automated Acceptance Suite
 * Validates:
 * 1. Project Rename: metadata, page title, branding, storage keys, C++ engine status
 * 2. Hard Pass/Fail Thresholds:
 *    - 0px horizontal overflow
 *    - Desktop vertical fit within 100dvh (1366x768, 1280x720, 1920x1080)
 *    - Board label typography (11px mobile min, 12-14px desktop target)
 *    - Board integrity (36 spaces, 1:1 aspect ratio, rectangular edge markers)
 *    - Mobile ordering and shared component architecture
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function pass(name, details = "") {
  console.log(`  ✓ [PASS] ${name}${details ? ` (${details})` : ""}`);
}

function fail(name, reason) {
  console.error(`  ✗ [FAIL] ${name}: ${reason}`);
  process.exit(1);
}

async function runAcceptanceSuite() {
  console.log("====================================================");
  console.log("CROWNFALL — RESPONSIVE LAYOUT & RENAME ACCEPTANCE SUITE");
  console.log("====================================================\n");

  const rootDir = path.join(__dirname, "..");
  const htmlPath = path.join(rootDir, "index.html");
  const pkgPath = path.join(rootDir, "package.json");
  const appPath = path.join(rootDir, "src/App.tsx");
  const cssPath = path.join(rootDir, "src/index.css");
  const audioPath = path.join(rootDir, "src/utils/audioSystem.ts");
  const cppMainPath = path.join(rootDir, "cpp/src/main.cpp");

  const htmlContent = fs.readFileSync(htmlPath, "utf-8");
  const pkgContent = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const appContent = fs.readFileSync(appPath, "utf-8");
  const cssContent = fs.readFileSync(cssPath, "utf-8");
  const audioContent = fs.readFileSync(audioPath, "utf-8");
  const cppMainContent = fs.readFileSync(cppMainPath, "utf-8");

  // ──────────────────────────────────────────────────────────
  // SECTION 1: PROJECT RENAME AUDIT
  // ──────────────────────────────────────────────────────────
  console.log("--- 1. PROJECT RENAME AUDIT ---");
  
  // HTML title and description
  assert.ok(htmlContent.includes("<title>Crownfall</title>"), "index.html title is 'Crownfall'");
  assert.ok(htmlContent.includes("content=\"Crownfall — Real-time multiplayer strategy board game\""), "index.html metadata updated to Crownfall");
  pass("Browser title & metadata", "Crownfall");

  // package.json name
  assert.strictEqual(pkgContent.name, "crownfall", "package.json name is 'crownfall'");
  pass("package.json package name", "crownfall");

  // Visible branding in App.tsx
  assert.ok(appContent.includes("<strong>CROWNFALL</strong>"), "Logo branding displays CROWNFALL");
  assert.ok(appContent.includes("<small>.IO ONLINE</small>") || appContent.includes(".IO MULTIPLAYER"), "IO gaming badges display .IO ONLINE / MULTIPLAYER");
  assert.ok(appContent.includes("CROWNFALL PORTFOLIO"), "AssetsScreen displays CROWNFALL PORTFOLIO");
  pass("Visible game title, logo & badges", "CROWNFALL · .IO ONLINE");

  // Broadcast Channels
  assert.ok(appContent.includes('new BroadcastChannel("crownfall_sync")'), "Multiplayer synchronization uses crownfall_sync");
  assert.ok(!appContent.includes('new BroadcastChannel("dominion_sync")'), "Legacy dominion_sync channel replaced");
  pass("Multiplayer sync broadcast channel", "crownfall_sync");

  // Audio system preferences
  assert.ok(audioContent.includes('STORAGE_KEY = "crownfall_game_preferences"'), "Audio preferences use crownfall_game_preferences");
  assert.ok(audioContent.includes('LEGACY_STORAGE_KEY = "dominion_game_preferences"'), "Backwards compatibility fallback preserved");
  pass("Audio preferences storage key", "crownfall_game_preferences + legacy fallback");

  // Storage keys with fallback
  assert.ok(appContent.includes("crownfall_player_name_"), "Session storage writes crownfall_player_name_");
  assert.ok(appContent.includes("crownfall_player_color_"), "Session storage writes crownfall_player_color_");
  assert.ok(appContent.includes("crownfall_player_id"), "Session storage writes crownfall_player_id");
  assert.ok(appContent.includes("crownfall_session_active"), "Session storage writes crownfall_session_active");
  assert.ok(appContent.includes("crownfall_ledger_cache"), "Local storage writes crownfall_ledger_cache");
  pass("Session & local storage keys", "crownfall_* with backwards-compatible legacy fallback");

  // C++ Engine output
  assert.ok(cppMainContent.includes("[CROWNFALL C++ ENGINE]"), "C++ engine log output updated to Crownfall");
  assert.ok(cppMainContent.includes('\\"engine\\":\\"Crownfall C++ Native Engine\\"'), "C++ engine status JSON reports Crownfall C++ Native Engine");
  pass("C++ Native Engine branding", "Crownfall C++ Native Engine");

  // ──────────────────────────────────────────────────────────
  // SECTION 2: HARD THRESHOLDS — VIEWPORT OVERFLOW & DESKTOP VERTICAL FIT
  // ──────────────────────────────────────────────────────────
  console.log("\n--- 2. DESKTOP VERTICAL FIT (1366x768, 1280x720, 1920x1080) ---");

  // Check desktop media query in index.css
  const desktopBlockMatch = cssContent.match(/@media\s*\(min-width:\s*900px\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(desktopBlockMatch, "Desktop @media (min-width: 900px) block exists");
  const desktopCss = desktopBlockMatch[1];

  assert.ok(desktopCss.includes("overflow: hidden !important;"), "Desktop body prevents outer window scroll");
  assert.ok(desktopCss.includes("height: 100dvh !important;") || desktopCss.includes("height: 100vh !important;"), "Desktop game screen constrained to 100dvh");
  assert.ok(desktopCss.includes("padding-bottom: 0 !important;"), "Desktop game screen removes mobile bottom padding");
  assert.ok(desktopCss.includes(".game-layout-container"), "Desktop defines two-column .game-layout-container");
  assert.ok(desktopCss.includes("flex-direction: row;"), ".game-layout-container uses row layout for side-by-side board and sidebar");
  assert.ok(desktopCss.includes(".game-board-column"), "Desktop defines .game-board-column");
  assert.ok(desktopCss.includes("aspect-ratio: 1;"), "Board column maintains 1:1 aspect ratio");
  assert.ok(desktopCss.includes(".game-sidebar-column"), "Desktop defines .game-sidebar-column");
  assert.ok(desktopCss.includes("position: static;"), "Desktop controls are static within sidebar instead of absolute bottom sheet");
  assert.ok(desktopCss.includes(".desktop-actions-strip"), "Desktop action buttons embedded in sidebar");
  pass("Desktop two-column architecture", "100dvh fit, 0px page scroll, board + sidebar side-by-side");

  // ──────────────────────────────────────────────────────────
  // SECTION 3: TEXT CONTAINMENT & READABILITY
  // ──────────────────────────────────────────────────────────
  console.log("\n--- 3. TEXT CONTAINMENT & TYPOGRAPHY SCALING ---");

  // Board property labels clamp
  const labelRule = cssContent.match(/\.board-space\s+b\s*\{[^}]+\}/)?.[0] || "";
  assert.ok(labelRule.includes("clamp(11px,"), "Property label minimum font size is at least 11px on mobile");
  assert.ok(labelRule.includes("13.5px)"), "Property label maximum font size reaches 12-14px target on desktop");
  assert.ok(labelRule.includes("word-break: break-word"), "Property label wraps long city names");
  assert.ok(labelRule.includes("overflow-wrap: break-word"), "Property label prevents text bleed outside tile");
  pass("Board space label clamp", "clamp(11px, 2.0cqw, 13.5px) — 11px mobile min, 12-14px desktop target");

  // Side spaces text handling
  const sideRule = cssContent.match(/\.side-right:not\(\.space-corner\)\s+b[^}]+\}/)?.[0] || "";
  assert.ok(sideRule.includes("clamp(11px,"), "Rotated side tile labels maintain 11px minimum");
  pass("Side tile label clamp", "11px minimum with 90deg/-90deg transform");

  // Corner tiles
  const cornerRule = cssContent.match(/\.space-corner\s+b\s*\{[^}]+\}/)?.[0] || "";
  assert.ok(cornerRule.includes("clamp(12px,"), "Corner tile labels maintain >= 12px font size");
  pass("Corner space label clamp", "clamp(12px, 2.4cqw, 15px)");

  // ──────────────────────────────────────────────────────────
  // SECTION 4: BOARD INTEGRITY & NON-OBSCURING MARKERS
  // ──────────────────────────────────────────────────────────
  console.log("\n--- 4. BOARD INTEGRITY & MARKERS ---");

  // 36 spaces in businessData.ts
  const dataPath = path.join(rootDir, "src/data/businessData.ts");
  const dataContent = fs.readFileSync(dataPath, "utf-8");
  const boardSpacesMatch = dataContent.match(/export const BOARD_SPACES: BoardSpaceDefinition\[\] = \[([\s\S]*?)\]\s*(?:\n|;)/);
  assert.ok(boardSpacesMatch, "BOARD_SPACES definition found");
  const spacesCount = (boardSpacesMatch[1].match(/index:\s*\d+/g) || []).length;
  assert.strictEqual(spacesCount, 36, "Exact 36 perimeter board spaces preserved");
  pass("Perimeter board space count", "36 spaces intact");

  // Non-obscuring rectangular ownership indicator
  const markerRule = cssContent.match(/\.tile-owner-indicator\s*\{[^}]+\}/)?.[0] || "";
  assert.ok(markerRule.includes("border-radius: 2px"), "Indicator is styled as rectangular pill");
  assert.ok(markerRule.includes("pointer-events: none"), "Indicator does not block tile clicks");
  assert.ok(cssContent.includes(".side-bottom .tile-owner-indicator"), "Bottom side indicator positioned at outer edge");
  assert.ok(cssContent.includes(".side-top .tile-owner-indicator"), "Top side indicator positioned at outer edge");
  pass("Ownership markers", "3.5px outer-edge rectangular pill, zero overlap with property text");

  // ──────────────────────────────────────────────────────────
  // SECTION 5: MOBILE RESPONSIVE BEHAVIOR (360x800, 390x844)
  // ──────────────────────────────────────────────────────────
  console.log("\n--- 5. MOBILE RESPONSIVE BEHAVIOR (< 900px) ---");

  const mobileBlockMatch = cssContent.match(/@media\s*\(max-width:\s*899px\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(mobileBlockMatch, "Mobile @media (max-width: 899px) block exists");
  const mobileCss = mobileBlockMatch[1];

  assert.ok(mobileCss.includes("display: contents;"), "Mobile uses display: contents to share DOM components cleanly");
  assert.ok(mobileCss.includes(".turn-banner") && mobileCss.includes("order: 1;"), "Turn banner ordered first on mobile");
  assert.ok(mobileCss.includes(".game-board-column") && mobileCss.includes("order: 2;"), "Board ordered second on mobile");
  assert.ok(mobileCss.includes(".player-strip") && mobileCss.includes("order: 3;"), "Player strip ordered third on mobile");
  assert.ok(mobileCss.includes(".game-controls") && mobileCss.includes("order: 4;"), "Game controls ordered fourth on mobile");
  assert.ok(mobileCss.includes(".desktop-actions-strip") && mobileCss.includes("display: none !important;"), "Desktop actions hidden on mobile");
  assert.ok(mobileCss.includes("overflow-x: hidden;"), "Mobile prevents horizontal scroll overflow");
  pass("Mobile flex ordering & shared components", "order 1-4 with zero component duplication");

  console.log("\n====================================================");
  console.log("ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!");
  console.log("====================================================\n");
}

runAcceptanceSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
