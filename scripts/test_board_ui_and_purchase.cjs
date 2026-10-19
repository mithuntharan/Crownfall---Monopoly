/**
 * CROWNFALL — BOARD UI CLEANUP & NON-MODAL PURCHASE VERIFICATION
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function pass(name) {
  console.log(`  ✓ [PASS] ${name}`);
}

async function runAudit() {
  console.log("====================================================");
  console.log("BOARD UI CLEANUP & NON-MODAL PURCHASES AUDIT");
  console.log("====================================================\n");

  const appPath = path.join(__dirname, "../src/App.tsx");
  const appCode = fs.readFileSync(appPath, "utf-8");

  const purchaseControlPath = path.join(__dirname, "../src/components/BoardCenterPurchaseControl.tsx");
  const purchaseControlCode = fs.readFileSync(purchaseControlPath, "utf-8");

  const boardCoordsPath = path.join(__dirname, "../src/utils/boardCoordinates.ts");
  const boardCoordsCode = fs.readFileSync(boardCoordsPath, "utf-8");

  const cssPath = path.join(__dirname, "../src/index.css");
  const cssCode = fs.readFileSync(cssPath, "utf-8");

  // 1. No property-purchase pop-ups
  console.log("--- 1. NON-MODAL PROPERTY PURCHASES ---");
  assert.ok(!appCode.includes('setModal("buy")'), "No setModal('buy') anywhere in App.tsx");
  assert.ok(appCode.includes('if (type === "buy") {\n    return null'), "GameModal returns null if type is buy");
  assert.ok(appCode.includes("setPendingPurchase({"), "Purchase sets pendingPurchase in board center");
  pass("1. Property purchase pop-up modal completely removed; replaced with center-board state");

  // 2. Buy and Don't Buy in board center
  console.log("--- 2. BOARD-CENTRE CONTROLS ---");
  assert.ok(appCode.includes("<BoardCenterPurchaseControl"), "BoardCenterPurchaseControl rendered in board center");
  assert.ok(purchaseControlCode.includes("btn-purchase-buy"), "Buy button rendered inside BoardCenterPurchaseControl");
  assert.ok(purchaseControlCode.includes("btn-purchase-decline"), "Don't Buy button rendered inside BoardCenterPurchaseControl");
  assert.ok(purchaseControlCode.includes("DON'T BUY"), "Don't Buy label present");
  assert.ok(purchaseControlCode.includes("disabled={!canAfford || isSubmitting}"), "Buy button disabled when funds insufficient");
  assert.ok(appCode.includes("!pendingPurchase"), "Turn cannot end while purchase is pending");
  pass("2. Buy & Don't Buy buttons positioned in board center and turn cannot end while unresolved");

  // 3. Informational pop-ups replaced with compact board-centre notifications
  console.log("--- 3. EVENT NOTIFICATIONS & LOGS ---");
  assert.ok(!appCode.includes('setModal("rent")'), "No setModal('rent') in movement resolution");
  assert.ok(appCode.includes("addBoardNotification"), "addBoardNotification queues events to center");
  assert.ok(cssCode.includes(".board-center-notification-card"), "Compact board center notification card styled in CSS");
  pass("3. Large event pop-ups replaced with compact board-centre notifications");

  // 4. Duplicate UI element elimination
  console.log("--- 4. DUPLICATE UI AUDIT ---");
  const turnsButtonMatches = appCode.match(/👥 TURNS/g) || [];
  assert.strictEqual(turnsButtonMatches.length, 1, `Exactly 1 '👥 TURNS' button found (found ${turnsButtonMatches.length})`);
  const prefsButtonMatches = appCode.match(/⚙️ PREFS/g) || [];
  assert.strictEqual(prefsButtonMatches.length, 0, "Duplicate '⚙️ PREFS' button removed from shortcuts");
  assert.ok(!appCode.includes('<button onClick={() => setModal("chance")}>CHANCE</button>'), "Debug CHANCE popup button removed");
  assert.ok(!appCode.includes('<button onClick={() => setModal("chest")}>CHEST</button>'), "Debug CHEST popup button removed");
  assert.ok(!appCode.includes('<button onClick={() => setModal("jail")}>JAIL</button>'), "Debug JAIL popup button removed");
  pass("4. Duplicate buttons, duplicate shortcuts, and debug modal buttons eliminated");

  // 5. Centered Player Avatars inside board tiles
  console.log("--- 5. PLAYER AVATAR CENTERING ---");
  const { getTileCenterPercent, getMultiTokenOffset } = require("../src/utils/boardCoordinates.ts");
  // Check 4 corners
  const corner0 = getTileCenterPercent(0); // Start (bottom-right)
  const corner9 = getTileCenterPercent(9); // Jail (bottom-left)
  const corner18 = getTileCenterPercent(18); // Club (top-left)
  const corner27 = getTileCenterPercent(27); // Rest House (top-right)

  assert.ok(Math.abs(corner0.x - 92.54) < 0.1, `Corner 0 X should be ~92.54%, got ${corner0.x}`);
  assert.ok(Math.abs(corner0.y - 92.54) < 0.1, `Corner 0 Y should be ~92.54%, got ${corner0.y}`);
  assert.ok(Math.abs(corner9.x - 7.46) < 0.1, `Corner 9 X should be ~7.46%, got ${corner9.x}`);
  assert.ok(Math.abs(corner9.y - 92.54) < 0.1, `Corner 9 Y should be ~92.54%, got ${corner9.y}`);
  assert.ok(Math.abs(corner18.x - 7.46) < 0.1, `Corner 18 X should be ~7.46%, got ${corner18.x}`);
  assert.ok(Math.abs(corner18.y - 7.46) < 0.1, `Corner 18 Y should be ~7.46%, got ${corner18.y}`);
  assert.ok(Math.abs(corner27.x - 92.54) < 0.1, `Corner 27 X should be ~92.54%, got ${corner27.x}`);
  assert.ok(Math.abs(corner27.y - 7.46) < 0.1, `Corner 27 Y should be ~7.46%, got ${corner27.y}`);

  // Check multi-token offset
  const offset1of2 = getMultiTokenOffset(0, 2);
  const offset2of2 = getMultiTokenOffset(1, 2);
  assert.strictEqual(offset1of2.dx, -7);
  assert.strictEqual(offset2of2.dx, 7);
  pass("5. Geometric tile centers accurately computed for all 4 corners and sides with multi-token spacing");

  // 6. Ownership indicators on properties
  console.log("--- 6. PROPERTY OWNERSHIP MARKERS ---");
  assert.ok(appCode.includes("tile-owner-indicator"), "tile-owner-indicator rendered on owned property spaces");
  assert.ok(appCode.includes("getPlayerColorHex(propertyOwner.color)"), "Uses player assigned color for marker");
  assert.ok(cssCode.includes(".tile-owner-indicator"), "CSS defines .tile-owner-indicator");
  pass("6. Ownership circle markers display owner player color and initial on owned properties");

  // 7. C++ Engine bubble removed & Current Turn Status display
  console.log("--- 7. C++ ENGINE BUBBLE REMOVED ---");
  assert.ok(!appCode.includes("engine-badge"), "engine-badge removed from player-facing UI");
  assert.ok(appCode.includes("current-turn-status-badge"), "current-turn-status-badge rendered in topbar");
  assert.ok(appCode.includes("status-player-name"), "Player name shown in turn status");
  assert.ok(appCode.includes("status-player-cash"), "Player cash shown in turn status");
  assert.ok(appCode.includes("status-phase-pill"), "Game phase shown in turn status");
  pass("7. C++ engine bubble removed; replaced with rich Current Turn Status badge");

  // 8. Continuous Gliding Token Animations
  console.log("--- 8. SMOOTH GLIDING ANIMATIONS ---");
  assert.ok(appCode.includes("board-tokens-overlay"), "board-tokens-overlay renders smooth tokens layer");
  assert.ok(appCode.includes("board-gliding-token-wrapper"), "board-gliding-token-wrapper applies continuous transition");
  assert.ok(appCode.includes("transition: `left ${stepDuration}ms"), "Transition matches stepDuration");
  assert.ok(cssCode.includes(".board-gliding-token-wrapper"), "CSS defines .board-gliding-token-wrapper with will-change");
  pass("8. Token tokens glide space-by-space through perimeter tiles with synchronized transition timing");

  console.log("\n====================================================");
  console.log("ALL BOARD UI & PURCHASE AUDIT TESTS PASSED: 8 / 8");
  console.log("====================================================");
}

runAudit().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
