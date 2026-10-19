/**
 * Regression Test Suite for:
 * 1. Dev Mode Piece Shuffling & Teleporting prevention
 * 2. Solid & Stable Player Colors (No transparency, uniqueness, safe fallbacks)
 * 3. Authoritative Token Position Lifecycle & Movement Animations
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function runTests() {
  console.log("====================================================");
  console.log("  CROWNFALL REGRESSION TEST SUITE                   ");
  console.log("  Token Movement, Dev Mode & Player Color Integrity ");
  console.log("====================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  const exePath = path.join(__dirname, "../bin/monopoly_engine.exe");
  assert(fs.existsSync(exePath), "monopoly_engine.exe must exist in bin/");

  function runEngineCommands(cmds) {
    const input = cmds.map((c) => JSON.stringify(c)).join("\n") + "\nquit\n";
    const proc = spawnSync(exePath, ["--server"], { input, encoding: "utf8" });
    const lines = proc.stdout.split("\n").filter((l) => l.trim().startsWith("{"));
    return lines.map((l) => JSON.parse(l));
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Static Verification of Codebase Root Causes
  // ─────────────────────────────────────────────────────────────
  console.log("1. Static Analysis: Root Cause Fixes in Frontend & Styles...");

  const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf-8");
  const cssSrc = fs.readFileSync(path.join(__dirname, "../src/index.css"), "utf-8");
  const coordsSrc = fs.readFileSync(path.join(__dirname, "../src/utils/boardCoordinates.ts"), "utf-8");

  test("Root Cause 1: Stationary tokens do not have continuous CSS transition (no drift/slide)", () => {
    assert(
      appSrc.includes("transition: isGliding"),
      "Board tokens overlay must conditionally apply transition only when isGliding is true"
    );
    assert(
      appSrc.includes(': "none"'),
      "Board tokens overlay must apply transition 'none' when stationary to prevent re-render drift"
    );
  });

  test("Root Cause 2: Bot scheduler is disabled during Dev Mode", () => {
    assert(
      appSrc.includes("if (devMode) return") || appSrc.includes("if (devMode) {"),
      "Bot automation scheduler must check devMode and return early to prevent turn hijacking"
    );
  });

  test("Root Cause 3: Zero-gap transition from rolling to moving with isMovementInProgressRef", () => {
    assert(
      appSrc.includes("isMovementInProgressRef.current = true"),
      "isMovementInProgressRef must guard movement across rolling and moving lifecycle"
    );
    assert(
      appSrc.includes("if (rollingRef.current || movingRef.current || isMovementInProgressRef.current"),
      "syncAuthoritativeState must check movement refs before proceeding"
    );
  });

  test("Root Cause 4: Solid opacity and explicit background for all 8 player colors in CSS", () => {
    const colors = ["saffron", "teal", "plum", "blue", "gold", "burgundy", "emerald", "purple"];
    for (const c of colors) {
      assert(
        cssSrc.includes(`.token-${c}`),
        `index.css must define .token-${c}`
      );
    }
    assert(
      cssSrc.includes("opacity: 1 !important") && cssSrc.includes("visibility: visible !important"),
      "index.css .token must enforce solid opacity: 1 !important and visibility: visible !important"
    );
  });

  test("Root Cause 5: Token component applies solid inline color and safe fallback", () => {
    assert(
      appSrc.includes("getPlayerColorHex(safeColor)"),
      "Token component must resolve hex via getPlayerColorHex"
    );
    assert(
      coordsSrc.includes('return "#d97706"'),
      "getPlayerColorHex must return safe non-transparent fallback hex for missing or unknown colors"
    );
  });

  test("Root Cause 6: Duplicate color selection is strictly rejected", () => {
    assert(
      appSrc.includes("isTaken = players.some"),
      "Color selection must check whether chosen color is already taken by another player"
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Authoritative Engine Tests: Dev Mode & Positions
  // ─────────────────────────────────────────────────────────────
  console.log("\n2. Authoritative Engine: Token Position & Dev Mode Lifecycle...");

  test("Case 1: Toggling Dev Mode on and off repeatedly preserves token positions", () => {
    const responses = runEngineCommands([
      { action: "resetToLobby", playerCount: 4 },
      { action: "getState" },
      { action: "setDevMode", enabled: true, requesterId: 0 },
      { action: "getState" },
      { action: "setDevMode", enabled: false, requesterId: 0 },
      { action: "getState" },
      { action: "setDevMode", enabled: true, requesterId: 0 },
      { action: "getState" },
      { action: "startGame", requesterId: 0 },
      { action: "getState" },
    ]);

    // Check lobby positions at 0
    const lobbyState = responses[1].state;
    assert.strictEqual(lobbyState.players[0].position, 0);
    assert.strictEqual(lobbyState.players[1].position, 0);

    // After devMode ON
    const devOnState = responses[3].state;
    assert.strictEqual(devOnState.devMode, true);
    assert.strictEqual(devOnState.players[0].position, 0);
    assert.strictEqual(devOnState.players[1].position, 0);

    // After devMode OFF
    const devOffState = responses[5].state;
    assert.strictEqual(devOffState.devMode, false);
    assert.strictEqual(devOffState.players[0].position, 0);
    assert.strictEqual(devOffState.players[1].position, 0);

    // After devMode back ON and start
    const startState = responses[9].state;
    assert.strictEqual(startState.devMode, true);
    assert.strictEqual(startState.players[0].position, 0);
    assert.strictEqual(startState.players[1].position, 0);
  });

  test("Case 2: Legitimate movement reaches destination and stays there", () => {
    const responses = runEngineCommands([
      { action: "resetToLobby", playerCount: 2 },
      { action: "startGame", requesterId: 0 },
      { action: "roll", playerId: 0 },
      { action: "getState" },
    ]);

    const moveRes = responses[2];
    assert.strictEqual(moveRes.ok, true);
    const dest = moveRes.result.newPosition;
    assert(dest > 0, "Player 0 must advance from 0");

    const stateAfter = responses[3].state;
    assert.strictEqual(stateAfter.players[0].position, dest, "Player position must match roll result");
  });

  test("Case 3 & 4: Stale or repeated state updates never revert token positions", () => {
    const responses = runEngineCommands([
      { action: "resetToLobby", playerCount: 2 },
      { action: "startGame", requesterId: 0 },
      { action: "roll", playerId: 0 },
      { action: "getState" },
      { action: "getState" },
      { action: "getState" },
      { action: "getState" },
    ]);

    const dest = responses[2].result.newPosition;
    for (let i = 3; i <= 6; i++) {
      const snap = responses[i].state;
      assert.strictEqual(
        snap.players[0].position,
        dest,
        `Snapshot ${i} must preserve position ${dest}`
      );
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Player Color Stability & Uniqueness Tests
  // ─────────────────────────────────────────────────────────────
  console.log("\n3. Authoritative Engine: Player Color Stability & Uniqueness...");

  test("Case 5: Multiple players retain distinct, assigned colors", () => {
    const responses = runEngineCommands([
      { action: "resetToLobby", playerCount: 4 },
      { action: "updatePlayerColor", playerId: 0, color: "emerald" },
      { action: "updatePlayerColor", playerId: 1, color: "gold" },
      { action: "updatePlayerColor", playerId: 2, color: "burgundy" },
      { action: "updatePlayerColor", playerId: 3, color: "purple" },
      { action: "startGame", requesterId: 0 },
      { action: "getState" },
    ]);

    assert.strictEqual(responses[1].ok, true);
    assert.strictEqual(responses[2].ok, true);
    assert.strictEqual(responses[3].ok, true);
    assert.strictEqual(responses[4].ok, true);

    const state = responses[6].state;
    assert.strictEqual(state.players[0].color, "emerald");
    assert.strictEqual(state.players[1].color, "gold");
    assert.strictEqual(state.players[2].color, "burgundy");
    assert.strictEqual(state.players[3].color, "purple");
  });

  test("Case 6: Duplicate color selection is rejected by C++ engine", () => {
    const responses = runEngineCommands([
      { action: "resetToLobby", playerCount: 2 },
      { action: "updatePlayerColor", playerId: 0, color: "saffron" },
      { action: "updatePlayerColor", playerId: 1, color: "saffron" },
      { action: "getState" },
    ]);

    assert.strictEqual(responses[1].ok, true, "Player 0 selects saffron");
    assert.strictEqual(responses[2].ok, false, "Player 1 duplicate selection of saffron must be rejected");
    assert(
      responses[2].error.includes("already chosen"),
      `Expected error about duplicate color, got: ${responses[2].error}`
    );

    // Verify Player 1 was not changed to saffron
    const state = responses[3].state;
    assert.notStrictEqual(state.players[1].color, "saffron");
  });

  test("Case 7: Empty or invalid color selection is rejected", () => {
    const responses = runEngineCommands([
      { action: "resetToLobby", playerCount: 2 },
      { action: "updatePlayerColor", playerId: 0, color: "   " },
    ]);

    assert.strictEqual(responses[1].ok, false, "Empty color string must be rejected");
  });

  test("Case 8 & 9: Turns change and repeated polls preserve player colors & positions", () => {
    const responses = runEngineCommands([
      { action: "resetToLobby", playerCount: 2 },
      { action: "updatePlayerColor", playerId: 0, color: "emerald" },
      { action: "updatePlayerColor", playerId: 1, color: "gold" },
      { action: "startGame", requesterId: 0 },
      { action: "roll", playerId: 0 },
      { action: "getState" },
      { action: "getState" },
      { action: "getState" },
    ]);

    assert.strictEqual(responses[1].ok, true, "Player 0 updates to emerald");
    assert.strictEqual(responses[2].ok, true, "Player 1 updates to gold");
    assert.strictEqual(responses[3].ok, true, "Start game");
    assert.strictEqual(responses[4].ok, true, "Roll and move");

    const p0Dest = responses[4].result.newPosition;

    for (let i = 5; i <= 7; i++) {
      const snap = responses[i].state;
      assert.strictEqual(snap.players[0].color, "emerald");
      assert.strictEqual(snap.players[1].color, "gold");
      assert.strictEqual(snap.players[0].position, p0Dest);
    }
  });

  test("Case 10: Normal gameplay works with Dev Mode both enabled and disabled", () => {
    // 1. Normal match (devMode = false)
    const normResponses = runEngineCommands([
      { action: "resetToLobby", playerCount: 2 },
      { action: "setDevMode", enabled: false, requesterId: 0 },
      { action: "startGame", requesterId: 0 },
      { action: "roll", playerId: 0 },
      { action: "getState" },
    ]);
    assert.strictEqual(normResponses[3].ok, true);
    assert(normResponses[3].result.diceTotal >= 2);
    assert.strictEqual(normResponses[4].state.devMode, false);

    // 2. Dev Mode match (devMode = true)
    const devResponses = runEngineCommands([
      { action: "resetToLobby", playerCount: 2 },
      { action: "setDevMode", enabled: true, requesterId: 0 },
      { action: "startGame", requesterId: 0 },
      { action: "roll", playerId: 0 },
      { action: "getState" },
    ]);
    assert.strictEqual(devResponses[3].ok, true);
    assert(devResponses[3].result.diceTotal >= 2);
    assert.strictEqual(devResponses[4].state.devMode, true);
  });

  console.log("\n====================================================");
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("====================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

try {
  runTests();
} catch (err) {
  console.error("Unhandled test runner exception:", err);
  process.exit(1);
}
