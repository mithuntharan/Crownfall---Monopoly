const { CppEngineProcess } = require('./engine_bridge.cjs');
const assert = require('assert');

async function runTests() {
  console.log("====================================================");
  console.log("TESTING BUILD MODES & TURN PURCHASE RESTRICTIONS");
  console.log("====================================================\n");

  const engine = new CppEngineProcess();

  // --- TEST SUITE 1: MODE B (Build from anywhere) ---
  console.log("--- TEST SUITE 1: MODE B (Build from anywhere) ---");
  await engine.sendCommand({
    action: "init",
    startingMoney: 50000,
    doubles: false,
    playerCount: 2,
    requireLandingToBuild: false,
    devMode: true,
  });

  // P0 is at 0. Move around the board to complete rotation.
  // Board has 36 spaces (0 to 35).
  // P0 rolls 6+6=12 -> pos 12
  await engine.sendCommand({ action: "roll", playerId: 0, d1: 6, d2: 6 });
  await engine.sendCommand({ action: "endTurn", playerId: 0 });
  await engine.sendCommand({ action: "endTurn", playerId: 1 });

  // P0 rolls 6+6=12 -> pos 24
  await engine.sendCommand({ action: "roll", playerId: 0, d1: 6, d2: 6 });
  await engine.sendCommand({ action: "endTurn", playerId: 0 });
  await engine.sendCommand({ action: "endTurn", playerId: 1 });

  // P0 rolls 5+6=11 -> pos 35 (one before Start)
  await engine.sendCommand({ action: "roll", playerId: 0, d1: 5, d2: 6 });
  await engine.sendCommand({ action: "endTurn", playerId: 0 });
  await engine.sendCommand({ action: "endTurn", playerId: 1 });

  // P0 rolls 1+1=2 -> wraps 35 -> 0 (Start) -> 1 (BOMBAY!). Completed rotation 1!
  const rollToBombay = await engine.sendCommand({ action: "roll", playerId: 0, d1: 1, d2: 1 });
  console.log(`  P0 rolled [1,1] from 35 -> Pos #${rollToBombay.result.newPosition} (${rollToBombay.result.spaceName})`);
  assert.strictEqual(rollToBombay.result.newPosition, 1, "P0 must land on space 1 (Bombay)");
  assert.strictEqual(rollToBombay.result.eligibleToBuy, true, "Bombay must be eligible to buy");

  // P0 buys Bombay
  const buyRes = await engine.sendCommand({ action: "buy", playerId: 0 });
  assert.strictEqual(buyRes.ok, true, "P0 successfully bought Bombay");
  console.log("  ✓ P0 successfully purchased Bombay");

  // Attempt building on Bombay during same turn (Turn T)
  const sameTurnBuild = await engine.sendCommand({ action: "build", playerId: 0, propertyId: "bombay" });
  assert.strictEqual(sameTurnBuild.ok, false, "Same turn build must be rejected");
  assert.strictEqual(sameTurnBuild.reason, "PROPERTY_PURCHASED_THIS_TURN", "Reason must be PROPERTY_PURCHASED_THIS_TURN");
  console.log("  ✓ Building on purchase turn correctly blocked with PROPERTY_PURCHASED_THIS_TURN");

  // P0 ends turn
  await engine.sendCommand({ action: "endTurn", playerId: 0 });
  // P1 ends turn
  await engine.sendCommand({ action: "endTurn", playerId: 1 });

  // Now it is P0's NEXT turn!
  // In Mode B: P0 can build on Bombay from anywhere (e.g. before rolling or while on Bombay):
  const nextTurnBuild = await engine.sendCommand({ action: "build", playerId: 0, propertyId: "bombay" });
  console.log("  Next turn Mode B build result:", nextTurnBuild.ok, nextTurnBuild.error || "SUCCESS");
  assert.strictEqual(nextTurnBuild.ok, true, "P0 can build on Bombay on next turn in Mode B");
  assert.notStrictEqual(nextTurnBuild.reason, "PROPERTY_PURCHASED_THIS_TURN", "Must NOT be blocked by purchase turn on next turn");
  console.log("  ✓ Mode B: P0 successfully built on next turn without wait message!");

  // --- TEST SUITE 2: MODE A (Require landing to build) ---
  console.log("\n--- TEST SUITE 2: MODE A (Require landing to build) ---");
  await engine.sendCommand({
    action: "init",
    startingMoney: 50000,
    doubles: false,
    playerCount: 2,
    requireLandingToBuild: true,
    devMode: true,
  });

  // Move P0 around board to complete rotation
  await engine.sendCommand({ action: "roll", playerId: 0, d1: 6, d2: 6 }); // 12
  await engine.sendCommand({ action: "endTurn", playerId: 0 });
  await engine.sendCommand({ action: "endTurn", playerId: 1 });

  await engine.sendCommand({ action: "roll", playerId: 0, d1: 6, d2: 6 }); // 24
  await engine.sendCommand({ action: "endTurn", playerId: 0 });
  await engine.sendCommand({ action: "endTurn", playerId: 1 });

  await engine.sendCommand({ action: "roll", playerId: 0, d1: 5, d2: 6 }); // 35
  await engine.sendCommand({ action: "endTurn", playerId: 0 });
  await engine.sendCommand({ action: "endTurn", playerId: 1 });

  // P0 lands on Bombay (pos 1)
  const rollToBombayA = await engine.sendCommand({ action: "roll", playerId: 0, d1: 1, d2: 1 });
  assert.strictEqual(rollToBombayA.result.newPosition, 1, "P0 landed on Bombay in Mode A");

  // P0 buys Bombay
  const buyResA = await engine.sendCommand({ action: "buy", playerId: 0 });
  assert.strictEqual(buyResA.ok, true, "P0 bought Bombay in Mode A");
  console.log("  ✓ P0 purchased Bombay in Mode A");

  // Attempt building on Bombay on purchase turn
  const sameTurnBuildA = await engine.sendCommand({ action: "build", playerId: 0, propertyId: "bombay" });
  assert.strictEqual(sameTurnBuildA.ok, false, "Same turn build rejected in Mode A");
  assert.strictEqual(sameTurnBuildA.reason, "PROPERTY_PURCHASED_THIS_TURN", "Reason must be PROPERTY_PURCHASED_THIS_TURN");
  console.log("  ✓ Mode A: Building on purchase turn correctly blocked with PROPERTY_PURCHASED_THIS_TURN");

  // P0 ends turn, P1 ends turn -> Back to P0's next turn
  await engine.sendCommand({ action: "endTurn", playerId: 0 });
  await engine.sendCommand({ action: "endTurn", playerId: 1 });

  // P0 is standing at 1 from previous turn, but HAS NOT LANDED THIS TURN!
  // In Mode A, building before landing this turn must be rejected with MODE_A_MUST_LAND_HERE:
  const buildWithoutLandingA = await engine.sendCommand({ action: "build", playerId: 0, propertyId: "bombay" });
  assert.strictEqual(buildWithoutLandingA.ok, false);
  assert.strictEqual(buildWithoutLandingA.reason, "MODE_A_MUST_LAND_HERE", "Mode A requires landing this turn");
  console.log("  ✓ Mode A: Building without landing this turn correctly rejected with MODE_A_MUST_LAND_HERE (not purchase turn!)");

  // Now move around the board and land on Bombay during current turn
  // P0 rolls 6+6=12 -> pos 13
  await engine.sendCommand({ action: "roll", playerId: 0, d1: 6, d2: 6 });
  await engine.sendCommand({ action: "endTurn", playerId: 0 });
  await engine.sendCommand({ action: "endTurn", playerId: 1 });

  // P0 rolls 6+5=11 -> pos 24
  await engine.sendCommand({ action: "roll", playerId: 0, d1: 6, d2: 5 });
  await engine.sendCommand({ action: "endTurn", playerId: 0 });
  await engine.sendCommand({ action: "endTurn", playerId: 1 });

  // P0 rolls 6+5=11 -> pos 35
  await engine.sendCommand({ action: "roll", playerId: 0, d1: 6, d2: 5 });
  await engine.sendCommand({ action: "endTurn", playerId: 0 });
  await engine.sendCommand({ action: "endTurn", playerId: 1 });

  // P0 rolls 1+1=2 from 35 -> lands on pos 1 (Bombay!)
  const landOnOwnedBombay = await engine.sendCommand({ action: "roll", playerId: 0, d1: 1, d2: 1 });
  assert.strictEqual(landOnOwnedBombay.result.newPosition, 1, "P0 landed on Bombay again");

  // Now P0 builds on Bombay while landed on it:
  const landedBuildA = await engine.sendCommand({ action: "build", playerId: 0, propertyId: "bombay" });
  console.log("  Mode A landed build result:", landedBuildA.ok, landedBuildA.error || "SUCCESS");
  assert.strictEqual(landedBuildA.ok, true, "Mode A: Can build when landed on owned property during current turn");
  console.log("  ✓ Mode A: Successfully built upon landing on owned property!");

  console.log("\n====================================================");
  console.log("ALL BUILD MODE & TURN PURCHASE TESTS PASSED!");
  console.log("====================================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
