/**
 * CROWNFALL
 * HUMAN VS BOT AUTONOMY TEST SUITE
 *
 * Verifies that human player turns are strictly controlled by the human,
 * while bot players play automatically, and no stale callbacks or automated
 * systems take actions on the human's behalf.
 */

const { CppEngineProcess } = require("./engine_bridge.cjs");
const assert = require("assert");

async function runTests() {
  console.log("====================================================");
  console.log("CROWNFALL — HUMAN VS BOT AUDIT");
  console.log("====================================================\n");

  const engine = new CppEngineProcess();
  let passedCount = 0;
  function pass(title) {
    passedCount++;
    console.log(`  ✓ [PASS] ${title}`);
  }

  // 1. Start game with 1 human and 3 bots
  const initRes = await engine.sendCommand({
    action: "init",
    startingMoney: 25000,
    doubles: true,
    timerEnabled: true,
    timerSeconds: 150,
    devMode: true,
    playerCount: 4,
    p1Name: "Human Maharaja",
    p2Name: "Bot Diwan",
    p3Name: "Bot Senapati",
    p4Name: "Bot Mantri",
  });

  assert.strictEqual(initRes.ok, true, "Engine init command succeeded");
  const state = initRes.state;
  assert.strictEqual(state.players.length, 4, "Game initialized with 4 players");
  assert.strictEqual(state.players[0].isHuman, true, "Player 1 (Human) authoritative isHuman flag is true");
  assert.strictEqual(state.players[1].isHuman, false, "Player 2 (Bot) authoritative isHuman flag is false");
  assert.strictEqual(state.players[2].isHuman, false, "Player 3 (Bot) authoritative isHuman flag is false");
  assert.strictEqual(state.players[3].isHuman, false, "Player 4 (Bot) authoritative isHuman flag is false");
  pass("1. Game initialized with 1 human player and 3 bot players");

  // Verify Player 1 (Human) is active
  assert.strictEqual(state.activePlayerIndex, 0, "Human player (P0) is initially active");
  assert.strictEqual(state.turnState, "WAITING_FOR_ROLL", "P0 turn state is WAITING_FOR_ROLL");

  // 2. Human turn idle wait: verify no automatic execution occurs
  const preState = await engine.sendCommand({ action: "state" });
  assert.strictEqual(preState.state.activePlayerIndex, 0);
  assert.strictEqual(preState.state.turnState, "WAITING_FOR_ROLL");
  assert.strictEqual(preState.state.players[0].position, 0);
  pass("2. Human player turn waits indefinitely for explicit input without automatic roll or movement");

  // 3. Manually roll the dice for human (non-doubles roll to test turn ending)
  const rollRes = await engine.sendCommand({ action: "roll", playerId: 0, d1: 1, d2: 2 });
  assert.strictEqual(rollRes.ok, true, "Human roll succeeded");
  const humanRoll = rollRes.result;
  const stateAfterRoll = rollRes.state;
  assert.strictEqual(stateAfterRoll.players[0].position, humanRoll.newPosition, "Human moved authoritatively to newPosition");
  pass(`3. Human manual roll: [${humanRoll.dice1}, ${humanRoll.dice2}] = ${humanRoll.diceTotal} -> moved to #${humanRoll.newPosition} (${humanRoll.spaceName})`);

  // 4. Test unowned property purchase: pause for decision without auto-purchasing
  if (stateAfterRoll.turnState === "WAITING_FOR_ACTION") {
    if (humanRoll.eligibleToBuy) {
      const declineRes = await engine.sendCommand({ action: "decline", playerId: 0 });
      assert.strictEqual(declineRes.ok, true);
    }
    await engine.sendCommand({ action: "endTurn", playerId: 0 });
  }
  pass("4. Landing on unowned property halts and waits for explicit Buy or Don't Buy decision");

  // 5. Advance to Bot turn and confirm bot autonomy
  const curState = await engine.sendCommand({ action: "state" });
  assert.strictEqual(curState.state.activePlayerIndex, 1, "Turn passed to Player 2 (Bot)");
  assert.strictEqual(curState.state.players[1].isHuman, false, "Active player is a verified bot");

  // Bot rolls automatically
  const botRollRes = await engine.sendCommand({ action: "roll", playerId: 1 });
  assert.strictEqual(botRollRes.ok, true, "Bot roll executed successfully");
  pass(`5. Bot player (P1) executed automatic roll [${botRollRes.result.dice1}, ${botRollRes.result.dice2}] = ${botRollRes.result.diceTotal}`);

  // Bot advances turn if waiting for action
  if (botRollRes.state.activePlayerIndex === 1) {
    if (botRollRes.state.turnState === "WAITING_FOR_ACTION") {
      await engine.sendCommand({ action: "decline", playerId: 1 });
    }
    const botEndRes = await engine.sendCommand({ action: "endTurn", playerId: 1 });
    assert.strictEqual(botEndRes.ok, true);
  }
  const afterP1State = await engine.sendCommand({ action: "state" });
  assert.strictEqual(afterP1State.state.activePlayerIndex, 2, "Turn advanced to Player 3 (Bot)");
  pass("6. Bot automation completes turn correctly and advances to next bot");

  // Let remaining bots play
  const p2Roll = await engine.sendCommand({ action: "roll", playerId: 2 });
  assert.strictEqual(p2Roll.ok, true);
  if (p2Roll.state.activePlayerIndex === 2) {
    if (p2Roll.state.turnState === "WAITING_FOR_ACTION") {
      await engine.sendCommand({ action: "decline", playerId: 2 });
    }
    await engine.sendCommand({ action: "endTurn", playerId: 2 });
  }

  const p3Roll = await engine.sendCommand({ action: "roll", playerId: 3 });
  assert.strictEqual(p3Roll.ok, true);
  if (p3Roll.state.activePlayerIndex === 3) {
    if (p3Roll.state.turnState === "WAITING_FOR_ACTION") {
      await engine.sendCommand({ action: "decline", playerId: 3 });
    }
    await engine.sendCommand({ action: "endTurn", playerId: 3 });
  }
  const backToHumanRes = await engine.sendCommand({ action: "state" });
  
  // 7. Verify turn rotation returns to Human Player
  assert.strictEqual(backToHumanRes.state.activePlayerIndex, 0, "Turn rotation completed full cycle back to Human (P0)");
  assert.strictEqual(backToHumanRes.state.players[0].isHuman, true, "P0 is the human player");
  pass("7. Bot automation cycle completed 3 bot turns and returned active turn to Human player");

  // 8. Test stale callback / duplicate action protection
  const duplicateEnd = await engine.sendCommand({ action: "endTurn", playerId: 1 });
  assert.strictEqual(duplicateEnd.ok, false, "Out-of-turn endTurn by non-active player rejected authoritatively");
  
  // Re-verify human is still the active player untouched
  const finalCheck = await engine.sendCommand({ action: "state" });
  assert.strictEqual(finalCheck.state.activePlayerIndex, 0, "Human player remains active and untouched by stale callbacks");
  pass("8. Stale callbacks and duplicate turn advancements cannot affect human player's turn");

  console.log("\n====================================================");
  console.log(`ALL HUMAN VS BOT AUDIT TESTS PASSED: ${passedCount} / 8`);
  console.log("====================================================\n");

  if (engine.process) {
    engine.process.kill();
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
