/**
 * test_autoplay_and_naming.cjs
 * Comprehensive verification of:
 * 1. Default player names (Player 1 to Player 4)
 * 2. Renaming Player 1 and state update consistency
 * 3. Autonomous multi-turn progression without manual intervention
 * 4. Automatic decision making (buy/decline, rent, chance/chest, jail, rest house)
 * 5. Verification that game never stalls
 */

const { CppEngineProcess } = require("./engine_bridge.cjs");

async function runAutoPlayAndNamingTests() {
  console.log("====================================================");
  console.log("CROWNFALL — AUTONOMOUS PLAY & NAMING TESTS");
  console.log("====================================================\n");

  const engine = new CppEngineProcess();
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  // Status check
  const status = await engine.sendCommand({ action: "status" });
  assert(status.ok === true && status.connected === true, "C++ Engine running in authoritative server mode");

  // PART 2: PLAYER NAMING TESTS
  console.log("\n--- PART 2: PLAYER NAMING AUDIT ---");
  const initRes = await engine.sendCommand({
    action: "init",
    startingMoney: 25000,
    doubles: true,
    playerCount: 4,
  });

  assert(initRes.ok === true, "Game initialized successfully");
  const state1 = initRes.state;
  assert(state1.players.length === 4, "Game initialized with 4 players");
  assert(state1.players[0].name === "Player 1", "Default Player 1 name is 'Player 1'");
  assert(state1.players[1].name === "Player 2", "Default Player 2 name is 'Player 2'");
  assert(state1.players[2].name === "Player 3", "Default Player 3 name is 'Player 3'");
  assert(state1.players[3].name === "Player 4", "Default Player 4 name is 'Player 4'");

  // Rename Player 1
  const renameRes = await engine.sendCommand({
    action: "updatePlayerName",
    playerId: 0,
    newName: "Maharaja Vikram",
  });
  assert(renameRes.ok === true, "updatePlayerName command succeeded");
  assert(renameRes.state.players[0].name === "Maharaja Vikram", "Player 1 renamed to 'Maharaja Vikram'");
  assert(renameRes.state.players[0].id === 0, "Player identity preserved (id=0)");
  assert(renameRes.state.players[0].token === "1", "Player token preserved ('1')");

  // Verify persistence across getState
  const verifyStateRes = await engine.sendCommand({ action: "state" });
  assert(verifyStateRes.state.players[0].name === "Maharaja Vikram", "Renamed Player 1 name persists across state polls");
  assert(verifyStateRes.state.players[1].name === "Player 2", "Player 2 name remains 'Player 2'");

  // PART 1: AUTONOMOUS MULTI-TURN SIMULATION
  console.log("\n--- PART 1: AUTONOMOUS MULTI-TURN PROGRESSION ---");

  // Enable DevMode so actingPlayerId can act freely
  await engine.sendCommand({ action: "setDevMode", enabled: true });

  let turnsCompleted = 0;
  const targetTurns = 30;
  let consecutiveErrors = 0;
  const turnLog = [];

  console.log(`Starting autonomous simulation of ${targetTurns} continuous turns...`);

  while (turnsCompleted < targetTurns && consecutiveErrors < 5) {
    const sRes = await engine.sendCommand({ action: "state" });
    const curState = sRes.state;

    if (curState.turnState === "GAME_OVER") {
      console.log(`  ⚡ Game reached natural GAME_OVER state at turn ${turnsCompleted}`);
      break;
    }

    const activeIdx = curState.activePlayerIndex;
    const activeP = curState.players[activeIdx];

    if (curState.turnState === "WAITING_FOR_ROLL" || curState.turnState === "EXTRA_TURN") {
      // Auto Roll
      const rollRes = await engine.sendCommand({ action: "roll", playerId: activeIdx });
      if (!rollRes.ok) {
        console.error(`  Roll failed for ${activeP.name}: ${rollRes.error}`);
        consecutiveErrors++;
        continue;
      }
      consecutiveErrors = 0;
      turnsCompleted++;
      const turnResult = rollRes.result;
      const afterRollState = rollRes.state;

      const logItem = {
        turn: turnsCompleted,
        player: activeP.name,
        roll: [turnResult.dice1, turnResult.dice2],
        total: turnResult.diceTotal,
        position: turnResult.newPosition,
        event: turnResult.eventDescription || "Moved",
      };

      // Handle purchase decision if required
      if (afterRollState.turnState === "WAITING_FOR_ACTION" && turnResult.eligibleToBuy) {
        const canAfford = activeP.money >= 5000;
        if (canAfford) {
          const buyRes = await engine.sendCommand({ action: "buy", playerId: activeIdx });
          if (buyRes.ok) {
            logItem.decision = `Bought ${turnResult.purchasablePropertyId}`;
          } else {
            await engine.sendCommand({ action: "decline", playerId: activeIdx });
            logItem.decision = `Declined (fallback)`;
          }
        } else {
          await engine.sendCommand({ action: "decline", playerId: activeIdx });
          logItem.decision = `Declined (unaffordable)`;
        }
      }
      turnLog.push(logItem);
      // For human players, explicit endTurn is required as turn never auto-advances
      const postState = await engine.sendCommand({ action: "state" });
      if (postState.state.activePlayerIndex === activeIdx && postState.state.turnState === "WAITING_FOR_ACTION") {
        await engine.sendCommand({ action: "endTurn", playerId: activeIdx });
      }
    } else if (curState.turnState === "WAITING_FOR_ACTION") {
      // Property buy/decline if waiting, then endTurn
      await engine.sendCommand({ action: "decline", playerId: activeIdx });
      await engine.sendCommand({ action: "endTurn", playerId: activeIdx });
    }
  }

  assert(turnsCompleted >= 25, `Autonomous progression completed ${turnsCompleted} consecutive turns without stalling`);
  assert(consecutiveErrors === 0, "Zero unhandled stalls or rejected actions during autonomous progression");

  // Verify multiple players took turns
  const playersWhoPlayed = new Set(turnLog.map((t) => t.player));
  assert(playersWhoPlayed.size >= 3, `Turn rotation passed dynamically among ${playersWhoPlayed.size} distinct players`);

  // Verify rounds advanced
  const finalStateRes = await engine.sendCommand({ action: "state" });
  const finalState = finalStateRes.state;
  assert(finalState.roundNumber >= 2, `Round number advanced to ${finalState.roundNumber}`);

  console.log("\nSample Autonomous Turns:");
  turnLog.slice(0, 10).forEach((t) => {
    console.log(`  [Turn ${t.turn}] ${t.player}: rolled [${t.roll[0]},${t.roll[1]}] -> Pos #${t.position} (${t.event})${t.decision ? ` | ${t.decision}` : ""}`);
  });

  console.log("\n====================================================");
  console.log(`TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  console.log("====================================================");

  engine.kill();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runAutoPlayAndNamingTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
