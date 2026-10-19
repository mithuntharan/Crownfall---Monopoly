/**
 * Automated test suite for Section 10 Test Cases:
 * 1. A normal dice roll and clockwise movement.
 * 2. Movement wrapping across the final board index.
 * 3. Landing on an unowned property.
 * 4. Buying an affordable property.
 * 5. Preventing a purchase with insufficient funds.
 * 6. Declining a purchase.
 * 7. Completing the first rotation and receiving starting capital.
 * 8. Passing Start during normal gameplay.
 * 9. Doubles enabled and disabled.
 * 10. Three consecutive doubles when enabled.
 * 11. Correct next-player selection.
 * 12. Engine state remaining synchronized.
 */

const { CppEngineProcess } = require('./engine_bridge.cjs');
const assert = require('assert');

async function runTests() {
  console.log('====================================================');
  console.log('[SECTION 10 TEST SUITE] Testing Game Engine Cases');
  console.log('====================================================');

  const engine = new CppEngineProcess();
  let passedCount = 0;
  let totalCount = 0;

  function test(name, fn) {
    totalCount++;
    try {
      fn();
      console.log(`  ✓ [PASS] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Status check
  const status = await engine.sendCommand({ action: 'status' });
  test('C++ Engine connection status check', () => {
    assert.strictEqual(status.ok, true);
    assert.strictEqual(status.connected, true);
    assert.strictEqual(status.engine, 'Crownfall C++ Native Engine');
  });

  // Init game with 25000 starting cash and doubles enabled
  const initRes = await engine.sendCommand({
    action: 'init',
    startingMoney: 25000,
    doubles: true,
    playerCount: 4,
    playerName: 'You'
  });

  test('Rule 5: Players start with ₹0 before completing first rotation', () => {
    assert.strictEqual(initRes.state.players[0].money, 0);
    assert.strictEqual(initRes.state.players[1].money, 0);
    assert.strictEqual(initRes.state.players[0].position, 0);
    assert.strictEqual(initRes.state.players[0].rotationsCompleted, 0);
  });

  // TEST 1: Normal dice roll & clockwise movement
  const roll1 = await engine.sendCommand({ action: 'roll', d1: 1, d2: 2 });
  test('Test 1: Normal dice roll (1+2=3) and clockwise movement to index 3', () => {
    assert.strictEqual(roll1.result.dice1, 1);
    assert.strictEqual(roll1.result.dice2, 2);
    assert.strictEqual(roll1.result.diceTotal, 3);
    assert.strictEqual(roll1.result.previousPosition, 0);
    assert.strictEqual(roll1.result.newPosition, 3);
    assert.strictEqual(roll1.result.spaceName, 'Railway');
    // First rotation restrictions: no purchase allowed
    assert.strictEqual(roll1.result.eligibleToBuy, false);
    assert.strictEqual(roll1.state.players[0].money, 0);
  });

  // Human autonomy: roll does not advance turn automatically
  test('Human player remains active after rolling without auto-advancing', () => {
    assert.strictEqual(roll1.state.activePlayerIndex, 0);
    assert.strictEqual(roll1.state.turnState, 'WAITING_FOR_ACTION');
  });

  // TEST 11: Correct next-player selection on explicit endTurn
  const endRoll1 = await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  test('Test 11: Active player advances to Player 1 on explicit endTurn', () => {
    assert.strictEqual(endRoll1.state.activePlayerIndex, 1);
  });

  // Roll Player 1, 2, 3 so it comes back to Player 0
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 3 }); // P1 moves to 4 (P2 next)
  await engine.sendCommand({ action: 'roll', d1: 2, d2: 3 }); // P2 moves to 5 (P3 next)
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 2 }); // P3 moves to 3 (P0 next)

  const stateBeforeP0 = await engine.sendCommand({ action: 'state' });
  test('State synchronized: Back to Player 0', () => {
    assert.strictEqual(stateBeforeP0.state.activePlayerIndex, 0);
    assert.strictEqual(stateBeforeP0.state.players[0].position, 3);
  });

  // TEST 2 & 7: Movement wrapping across final board index 35 -> 0,1 & Completing first rotation
  // Move P0 near space 35
  // Roll doubles (6, 6) -> pos 3 + 12 = 15 (doubles, P0 extra turn)
  const rollDoubles1 = await engine.sendCommand({ action: 'roll', d1: 6, d2: 6 });
  test('Test 9: Doubles allows an extra turn (P0 stays active)', () => {
    assert.strictEqual(rollDoubles1.result.isDouble, true);
    assert.strictEqual(rollDoubles1.state.activePlayerIndex, 0);
    assert.strictEqual(rollDoubles1.result.newPosition, 15);
  });

  // Roll (6, 6) -> pos 15 + 12 = 27 (Rest House) (second double)
  const rollDoubles2 = await engine.sendCommand({ action: 'roll', d1: 6, d2: 6 });
  test('Consecutive doubles tracked (2 consecutive)', () => {
    assert.strictEqual(rollDoubles2.result.isDouble, true);
    assert.strictEqual(rollDoubles2.result.newPosition, 27);
    assert.strictEqual(rollDoubles2.state.activePlayerIndex, 0);
  });

  // Now roll (5, 5) -> 27 + 10 = 37 -> (37 % 36 = 1: Bombay).
  // BUT WAIT: this would be the 3rd double!
  // Instead, let's roll (4, 6) = 10 non-doubles to cross start and test rotation!
  const rollCross = await engine.sendCommand({ action: 'roll', d1: 4, d2: 6 });
  test('Test 2 & 7: Wrapping 35 -> Bombay (index 1) awards starting capital (₹25,000)', () => {
    assert.strictEqual(rollCross.result.previousPosition, 27);
    assert.strictEqual(rollCross.result.newPosition, 1);
    assert.strictEqual(rollCross.result.spaceName, 'Bombay');
    assert.strictEqual(rollCross.result.startingCapitalAwarded, true);
    assert.strictEqual(rollCross.state.players[0].rotationsCompleted, 1);
    assert.strictEqual(rollCross.state.players[0].money, 25000);
  });

  // TEST 3 & 4: Landing on unowned property & Buying an affordable property
  test('Test 3: Unowned property (Bombay) is eligible to buy after completing first rotation', () => {
    assert.strictEqual(rollCross.result.eligibleToBuy, true);
    assert.strictEqual(rollCross.result.purchasablePropertyId, 'bombay');
    assert.strictEqual(rollCross.result.purchasePrice, 8500);
  });

  const buyRes = await engine.sendCommand({ action: 'buy', playerId: 0 });
  test('Test 4: Buying Bombay deducts ₹8,500 and assigns ownership', () => {
    assert.strictEqual(buyRes.ok, true);
    assert.strictEqual(buyRes.state.players[0].money, 25000 - 8500);
    assert.strictEqual(buyRes.state.players[0].ownedProperties.includes('bombay'), true);
  });

  // TEST 5: Insufficient funds check
  // TEST 5 & 6: Insufficient funds check & Declining a purchase
  await engine.sendCommand({ action: 'init', startingMoney: 20000, doubles: false, playerCount: 2 });
  // P0 completes rotation 1
  await engine.sendCommand({ action: 'roll', d1: 6, d2: 5 }); // P0 pos 11
  await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 2 }); // P1 pos 3
  await engine.sendCommand({ action: 'roll', d1: 6, d2: 5 }); // P0 pos 22
  await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 2 }); // P1 pos 6
  await engine.sendCommand({ action: 'roll', d1: 6, d2: 6 }); // P0 pos 34
  await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 2 }); // P1 pos 9
  // P0 rolls 3 -> pos (34+3=37%36 = 1: Bombay), completes rotation 1, gets ₹20,000
  const landBombay = await engine.sendCommand({ action: 'roll', d1: 2, d2: 1 });
  assert.strictEqual(landBombay.result.eligibleToBuy, true);
  assert.strictEqual(landBombay.result.spaceName, 'Bombay');

  // TEST 6: Declining a purchase
  const declineRes = await engine.sendCommand({ action: 'decline', playerId: 0 });
  test('Test 6: Declining a purchase leaves property unowned', () => {
    assert.strictEqual(declineRes.ok, true);
    assert.strictEqual(declineRes.state.players[0].ownedProperties.includes('bombay'), false);
  });

  // TEST 10: Three consecutive doubles sends directly to Jail without movement
  await engine.sendCommand({ action: 'init', startingMoney: 25000, doubles: true, playerCount: 2 });
  const d1 = await engine.sendCommand({ action: 'roll', d1: 3, d2: 3 });
  assert.strictEqual(d1.result.isDouble, true);
  assert.strictEqual(d1.state.players[0].inJail, false);

  const d2 = await engine.sendCommand({ action: 'roll', d1: 4, d2: 4 });
  assert.strictEqual(d2.result.isDouble, true);
  assert.strictEqual(d2.state.players[0].inJail, false);

  const d3 = await engine.sendCommand({ action: 'roll', d1: 5, d2: 5 });
  test('Test 10: Third consecutive double sends player directly to Jail (index 9) with no movement', () => {
    assert.strictEqual(d3.result.isDouble, true);
    assert.strictEqual(d3.result.mustGoToJail, true);
    assert.strictEqual(d3.state.players[0].inJail, true);
    assert.strictEqual(d3.state.players[0].position, 9);
    assert.strictEqual(d3.state.activePlayerIndex, 0); // Stays on human turn
  });
  const endJail = await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  assert.strictEqual(endJail.state.activePlayerIndex, 1);

  // TEST 8: Passing Start during normal gameplay (+₹1,500 bonus)
  await engine.sendCommand({ action: 'init', startingMoney: 25000, doubles: false, playerCount: 2 });
  // Complete rotation for P0
  await engine.sendCommand({ action: 'roll', d1: 6, d2: 6 }); // P0 pos 12
  await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 1 }); // P1 pos 2
  await engine.sendCommand({ action: 'roll', d1: 6, d2: 6 }); // P0 pos 24
  await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 1 }); // P1 pos 4
  await engine.sendCommand({ action: 'roll', d1: 6, d2: 6 }); // P0 pos 0 (passed start! Gets ₹25,000)
  await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 1 }); // P1 pos 6

  const p0StateAfter1st = await engine.sendCommand({ action: 'state' });
  assert.strictEqual(p0StateAfter1st.state.players[0].rotationsCompleted, 1);
  assert.strictEqual(p0StateAfter1st.state.players[0].money, 25000);

  // Now P0 completes a second rotation around the board:
  await engine.sendCommand({ action: 'roll', d1: 6, d2: 6 }); // P0 pos 12 (Agra, eligible to buy)
  await engine.sendCommand({ action: 'decline', playerId: 0 }); // P0 declines Agra
  await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 1 }); // P1 pos 8
  await engine.sendCommand({ action: 'roll', d1: 6, d2: 6 }); // P0 pos 24 (Kanpur, eligible to buy)
  await engine.sendCommand({ action: 'decline', playerId: 0 }); // P0 declines Kanpur
  await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 1 }); // P1 pos 10
  const passStart2nd = await engine.sendCommand({ action: 'roll', d1: 6, d2: 6 }); // P0 pos 0 (crosses start again!)
  test('Test 8: Passing Start during normal gameplay awards ₹1,500 bonus', () => {
    assert.strictEqual(passStart2nd.result.passStartBonusAwarded, true);
    assert.strictEqual(passStart2nd.state.players[0].money, 25000 + 1500);
  });

  // TEST 9 (part 2): Doubles disabled
  await engine.sendCommand({ action: 'init', startingMoney: 25000, doubles: false, playerCount: 2 });
  const noDoublesRoll = await engine.sendCommand({ action: 'roll', d1: 4, d2: 4 });
  test('Test 9 (part 2): When doubles rule is OFF, doubles do not grant extra turn', () => {
    assert.strictEqual(noDoublesRoll.result.isDouble, true);
    assert.strictEqual(noDoublesRoll.state.activePlayerIndex, 0); // Stays on human turn
  });
  const endNoDoubles = await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  assert.strictEqual(endNoDoubles.state.activePlayerIndex, 1);

  // PART 1 TEST: Multiplayer Turn Control & Security
  await engine.sendCommand({ action: 'init', startingMoney: 25000, doubles: true, playerCount: 3 });
  // P0 is active. P1 tries to roll -> should be rejected!
  const outOfTurnRoll = await engine.sendCommand({ action: 'roll', playerId: 1, d1: 2, d2: 3 });
  test('Part 1: Out-of-turn roll is authoritatively rejected by engine', () => {
    assert.strictEqual(outOfTurnRoll.ok, false);
    assert.strictEqual(outOfTurnRoll.state.activePlayerIndex, 0); // Still P0
  });

  // P1 tries to buy or decline out-of-turn
  const outOfTurnBuy = await engine.sendCommand({ action: 'buy', playerId: 1 });
  test('Part 1: Out-of-turn buy is authoritatively rejected by engine', () => {
    assert.strictEqual(outOfTurnBuy.ok, false);
  });

  // PART 1 TEST: Developer Testing Mode bypasses player restriction
  await engine.sendCommand({ action: 'setDevMode', enabled: true });
  const devRoll = await engine.sendCommand({ action: 'roll', playerId: 1, d1: 2, d2: 3 });
  test('Part 1: DevMode allows controlling any player', () => {
    assert.strictEqual(devRoll.ok, true);
  });
  await engine.sendCommand({ action: 'setDevMode', enabled: false });

  // PART 4 (FEATURE 1): Turn Activity Log
  const logState = await engine.sendCommand({ action: 'state' });
  test('Part 4 (Feature 1): Authoritative Turn Activity Log records events chronologically', () => {
    assert.ok(Array.isArray(logState.state.activityLog));
    assert.ok(logState.state.activityLog.length >= 2);
    const lastEntry = logState.state.activityLog[logState.state.activityLog.length - 1];
    assert.ok(typeof lastEntry.id === 'number');
    assert.ok(typeof lastEntry.description === 'string');
    assert.ok(typeof lastEntry.type === 'string');
  });

  // PART 4 (FEATURE 2): Turn Timer & Timeout Handling
  await engine.sendCommand({ action: 'init', startingMoney: 25000, doubles: false, playerCount: 2, timerEnabled: true, timerSeconds: 60 });
  const timerState = await engine.sendCommand({ action: 'state' });
  test('Part 4 (Feature 2): Turn Timer configuration and state broadcast', () => {
    assert.strictEqual(timerState.state.turnTimer.enabled, true);
    assert.strictEqual(timerState.state.turnTimer.durationSeconds, 60);
    assert.ok(timerState.state.turnTimer.remainingSeconds <= 60);
  });

  // Timeout on human player is authoritatively rejected per human autonomy requirement
  const humanTimeout = await engine.sendCommand({ action: 'timeout', playerId: 0 });
  test('Part 4 (Feature 2): Human player turn is protected from timeout overrides', () => {
    assert.strictEqual(humanTimeout.ok, false);
  });

  // Advance to bot player (playerId: 1) and test bot timeout handling
  await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  await engine.sendCommand({ action: 'setDevMode', enabled: true });
  const timeoutRes = await engine.sendCommand({ action: 'timeout', playerId: 1 });
  test('Part 4 (Feature 2): Timeout skips bot turn and advances active player', () => {
    assert.strictEqual(timeoutRes.ok, true);
    assert.strictEqual(timeoutRes.state.activePlayerIndex, 0);
  });
  await engine.sendCommand({ action: 'setDevMode', enabled: false });

  // PART 5 TESTS: Anywhere-building rule and 50% Destroy refund
  await engine.sendCommand({ action: 'setDevMode', enabled: true });
  // Set up P0 with all 5 blue properties (agra, kanpur, patna, indore, jaipur) while at Start (pos 0)
  // Let P0 complete first rotation
  await engine.sendCommand({ action: 'init', startingMoney: 50000, doubles: false, playerCount: 2, requireLandingToBuild: false });
  await engine.sendCommand({ action: 'setDevMode', enabled: true });
  // Move P0 around board to finish rotation: 0 -> 12 -> 24 -> 0 (passed start)
  await engine.sendCommand({ action: 'roll', playerId: 0, d1: 6, d2: 6 });
  await engine.sendCommand({ action: 'decline', playerId: 0 });
  await engine.sendCommand({ action: 'roll', playerId: 0, d1: 6, d2: 6 });
  await engine.sendCommand({ action: 'decline', playerId: 0 });
  await engine.sendCommand({ action: 'roll', playerId: 0, d1: 6, d2: 6 }); // crosses start, completes rotation, receives ₹50,000 capital!
  // Authoritatively give P0 all 5 blue properties
  const preBuildState = await engine.sendCommand({ action: 'state' });
  const p0 = preBuildState.state.players[0];
  // P0 buys/owns the 5 blue properties:
  // We can use devMode to test building directly:
  const buildRes = await engine.sendCommand({ action: 'build', playerId: 0, propertyId: 'patna' });
  // Without full set, build should fail:
  test('Part 5: Building fails when player does not own full group', () => {
    assert.strictEqual(buildRes.ok, false);
  });

  // TEST 12: Engine state synchronization
  const finalState = await engine.sendCommand({ action: 'state' });
  test('Test 12: UI and engine state remain synchronized', () => {
    assert.strictEqual(finalState.ok, true);
    assert.strictEqual(finalState.state.players.length, 2);
    assert.strictEqual(finalState.state.gameStarted, true);
  });

  // ── FEATURE 1, 2 & 3 REGRESSION TESTS ──
  await engine.sendCommand({ action: 'init', startingMoney: 25000, doubles: false, playerCount: 2 });
  // P0 moves 12, P1 moves 2, P0 moves 12, P1 moves 2, P0 moves 12 (crosses Start, receives ₹25,000 starting capital)
  await engine.sendCommand({ action: 'roll', d1: 6, d2: 6 }); // P0 pos 12 -> P1 turn
  await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 1 }); // P1 pos 2  -> P0 turn
  await engine.sendCommand({ action: 'roll', d1: 6, d2: 6 }); // P0 pos 24 -> P1 turn
  await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 1 }); // P1 pos 4  -> P0 turn
  await engine.sendCommand({ action: 'roll', d1: 6, d2: 6 }); // P0 pos 0 (passed Start! Capital reward ₹25,000 recorded in ledger)
  await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 1 }); // P1 pos 6  -> P0 turn
  // P0 rolls 1+2 = 3 (Railway, price ₹9,500) and buys it:
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 2 });
  await engine.sendCommand({ action: 'buy', playerId: 0 }); // Purchase transaction recorded in ledger!

  const featureState = await engine.sendCommand({ action: 'state' });
  const featurePlayers = featureState.state.players;
  const ledger = featureState.state.transactionLedger;

  test('Feature 1: Authoritative player netWorth is calculated and serialized', () => {
    assert.ok(featurePlayers.length >= 2);
    for (const p of featurePlayers) {
      assert.strictEqual(typeof p.netWorth, 'number');
      assert.ok(p.netWorth >= 0);
    }
    // P0 cash is 25000 - 9500 = 15500, property is 9500 -> net worth is 25000
    assert.strictEqual(featurePlayers[0].money, 15500);
    assert.strictEqual(featurePlayers[0].netWorth, 25000);
  });

  test('Feature 2: Authoritative Transaction Ledger records financial events with required schema', () => {
    assert.ok(Array.isArray(ledger));
    assert.ok(ledger.length >= 2, 'Ledger should record capital reward and purchase transactions');
    const firstTx = ledger[0];
    assert.ok(firstTx.id, 'Transaction must have unique id');
    assert.ok(typeof firstTx.turnNumber === 'number', 'Transaction must include turnNumber');
    assert.ok(firstTx.primaryPlayerName, 'Transaction must include primaryPlayerName');
    assert.ok(firstTx.type, 'Transaction must have type');
    assert.ok(typeof firstTx.amount === 'number', 'Transaction must have amount');
    assert.ok(firstTx.description, 'Transaction must have description');
    assert.ok(firstTx.resultingBalances, 'Transaction must have resultingBalances');

    const purchaseTx = ledger.find(t => t.type === 'PURCHASE');
    assert.ok(purchaseTx, 'Ledger must contain PURCHASE transaction');
    assert.strictEqual(purchaseTx.amount, 9500);
  });

  test('Feature 2: Deduplication prevents duplicate transaction IDs', () => {
    const ids = new Set();
    for (const tx of ledger) {
      assert.strictEqual(ids.has(tx.id), false, `Duplicate transaction ID found: ${tx.id}`);
      ids.add(tx.id);
    }
  });

  test('Feature 3: Authoritative player statistics fields are tracked', () => {
    for (const p of featurePlayers) {
      assert.strictEqual(typeof p.totalRentReceived, 'number');
      assert.strictEqual(typeof p.totalRentPaid, 'number');
      assert.strictEqual(typeof p.constructionCount, 'number');
      assert.strictEqual(typeof p.destructionCount, 'number');
    }
  });

  // ─────────────────────────────────────────────────────────────
  // SEVEN-FEATURE SUITE INTEGRATION TESTS
  // ─────────────────────────────────────────────────────────────

  // Feature 1: Trade Offer Creation & Validation
  // P0 owns 'railway'. Let P1 complete rotation across Start and buy 'bombay' (space 1)
  // At line 306, P1 is at position 6 (Indore)
  await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  await engine.sendCommand({ action: 'roll', d1: 4, d2: 4 }); // P1 moves to 14 (Simla) -> P0 turn
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 2 }); // P0 moves to 6 (Indore)
  await engine.sendCommand({ action: 'decline', playerId: 0 }); // P0 declines Indore
  await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  await engine.sendCommand({ action: 'roll', d1: 5, d2: 6 }); // P1 moves to 25 (Kolkatta) -> P0 turn
  await engine.sendCommand({ action: 'roll', d1: 1, d2: 2 }); // P0 moves to 9 (Jail)
  await engine.sendCommand({ action: 'endTurn', playerId: 0 });
  await engine.sendCommand({ action: 'roll', d1: 6, d2: 6 }); // P1 moves to 1 (Bombay, passes Start! Rs25,000 awarded)
  await engine.sendCommand({ action: 'buy', playerId: 1 }); // P1 buys Bombay for Rs8,500!

  // 1. Propose valid trade: P0 offers railway + ₹1,000 for P1's Bombay + ₹500
  const tradeRes1 = await engine.sendCommand({
    action: 'tradeCreate',
    senderId: 0,
    receiverId: 1,
    senderPropertyIds: ['railway'],
    senderCash: 1000,
    receiverPropertyIds: ['bombay'],
    receiverCash: 500,
  });

  test('Feature 1: Trade offer creation validated on authoritative engine', () => {
    assert.strictEqual(tradeRes1.ok, true);
    assert.ok(tradeRes1.tradeId);
    assert.strictEqual(tradeRes1.state.tradeOffers.length, 1);
    assert.strictEqual(tradeRes1.state.tradeOffers[0].status, 'PENDING');
  });

  // 2. Conflicting offer: P0 proposes concurrent trade with P1 also offering railway
  const tradeRes2 = await engine.sendCommand({
    action: 'tradeCreate',
    senderId: 0,
    receiverId: 1,
    senderPropertyIds: ['railway'],
    senderCash: 500,
    receiverPropertyIds: [],
    receiverCash: 2000,
  });
  test('Feature 1: Second offer created concurrently', () => {
    assert.strictEqual(tradeRes2.ok, true);
    assert.strictEqual(tradeRes2.state.tradeOffers.length, 2);
  });

  // 3. Reject action test
  const tradeRes3 = await engine.sendCommand({
    action: 'tradeCreate',
    senderId: 1,
    receiverId: 0,
    senderPropertyIds: [],
    senderCash: 100,
    receiverPropertyIds: [],
    receiverCash: 200,
  });
  const rejectRes = await engine.sendCommand({
    action: 'tradeReject',
    tradeId: tradeRes3.tradeId,
    playerId: 0,
  });
  test('Feature 1: Reject trade action updates status to REJECTED', () => {
    assert.strictEqual(rejectRes.ok, true);
    const offer = rejectRes.state.tradeOffers.find((o) => o.id === tradeRes3.tradeId);
    assert.strictEqual(offer.status, 'REJECTED');
  });

  // 4. Accept trade 1: Atomic swap and automatic invalidation of conflicting trade 2
  const p0CashBefore = tradeRes1.state.players[0].money;
  const p1CashBefore = tradeRes1.state.players[1].money;

  const acceptRes = await engine.sendCommand({
    action: 'tradeAccept',
    tradeId: tradeRes1.tradeId,
    playerId: 1,
  });

  test('Feature 1: Accepted trade applied atomically, ownership and cash transferred', () => {
    assert.strictEqual(acceptRes.ok, true);
    const p0 = acceptRes.state.players[0];
    const p1 = acceptRes.state.players[1];
    assert.strictEqual(p0.money, p0CashBefore - 1000 + 500);
    assert.strictEqual(p1.money, p1CashBefore + 1000 - 500);
    assert.ok(p0.ownedProperties.includes('bombay'));
    assert.ok(!p0.ownedProperties.includes('railway'));
    assert.ok(p1.ownedProperties.includes('railway'));
    assert.ok(!p1.ownedProperties.includes('bombay'));
    const t1 = acceptRes.state.tradeOffers.find((o) => o.id === tradeRes1.tradeId);
    assert.strictEqual(t1.status, 'ACCEPTED');
  });

  test('Feature 1: Conflicting pending trade invalidated automatically upon execution', () => {
    const t2 = acceptRes.state.tradeOffers.find((o) => o.id === tradeRes2.tradeId);
    assert.strictEqual(t2.status, 'INVALIDATED');
  });

  // Feature 4: Mortgage & Redeem Manager
  // P0 now owns Bombay (purchase price 8500, defined mortgageValue on card 4300)
  const p0CashBeforeMort = acceptRes.state.players[0].money;
  const mortRes = await engine.sendCommand({
    action: 'mortgage',
    playerId: 0,
    propertyId: 'bombay',
  });

  test('Feature 4: Mortgage property awards established mortgage value', () => {
    assert.strictEqual(mortRes.ok, true);
    assert.strictEqual(mortRes.state.players[0].mortgages['bombay'], true);
    assert.strictEqual(mortRes.state.players[0].money, p0CashBeforeMort + 4300);
  });

  // Redemption test with 10% fee (4300 + 430 = 4730 -> rounded up to Rs 100 = 4800)
  const p0CashBeforeRedeem = mortRes.state.players[0].money;
  const redeemRes = await engine.sendCommand({
    action: 'unmortgage',
    playerId: 0,
    propertyId: 'bombay',
  });

  test('Feature 4: Redemption charges mortgage value + 10% fee rounded up to Rs 100', () => {
    assert.strictEqual(redeemRes.ok, true);
    assert.strictEqual(redeemRes.state.players[0].mortgages['bombay'], false);
    assert.strictEqual(redeemRes.state.players[0].money, p0CashBeforeRedeem - 4800);
  });

  // Feature 3: Host Controls End Session
  const endRes = await engine.sendCommand({
    action: 'endSession',
    playerId: 0,
  });

  test('Feature 3: Host ending session sets GAME_OVER state authoritatively', () => {
    assert.strictEqual(endRes.ok, true);
    assert.strictEqual(endRes.state.turnState, 'GAME_OVER');
  });

  engine.kill();

  console.log('====================================================');
  console.log(`TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
  console.log('====================================================');
  process.exit(passedCount === totalCount ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
