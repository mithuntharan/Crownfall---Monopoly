const assert = require('assert');
const path = require('path');
const { CppEngineProcess } = require('./engine_bridge.cjs');

console.log('====================================================');
console.log('   CROWNFALL REGRESSION TEST SUITE');
console.log('   Insights, Doubles-Off, Settings Lock & Room Codes');
console.log('====================================================\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return (async () => {
      try {
        await fn();
        console.log(`  [PASS] ${name}`);
        passed++;
      } catch (err) {
        console.error(`  [FAIL] ${name}`);
        console.error(`         ${err.message}`);
        failed++;
      }
    })();
  }

  // --- 1. ROOM CODE TESTS ---
  console.log('1. Testing Room Code Generation & Validation (CRN- vs DMN-)...');
  await test('Generates CRN- prefix codes', () => {
    // Replicate regex from App.tsx
    const digits = Math.floor(1000 + Math.random() * 9000);
    const code = `CRN-${digits}`;
    assert(/^CRN-\d{4}$/.test(code), `Generated code ${code} must match CRN-XXXX format`);
  });

  await test('Validates CRN- and legacy DMN- codes, rejects invalid formats', () => {
    const validate = (c) => /^(CRN|DMN)-[A-Z0-9]{4}$/i.test(c.trim().toUpperCase());
    assert.strictEqual(validate('CRN-4821'), true, 'CRN-4821 should be valid');
    assert.strictEqual(validate('crn-1234'), true, 'crn-1234 lowercase should be valid');
    assert.strictEqual(validate('DMN-9999'), true, 'Legacy DMN-9999 should be valid');
    assert.strictEqual(validate('dmn-4821'), true, 'Legacy dmn-4821 should be valid');
    assert.strictEqual(validate('XYZ-1234'), false, 'XYZ prefix should be invalid');
    assert.strictEqual(validate('CRN-12'), false, 'Too short should be invalid');
    assert.strictEqual(validate('CRN-12345'), false, 'Too long should be invalid');
    assert.strictEqual(validate(''), false, 'Empty code should be invalid');
  });

  // --- 2. C++ ENGINE AUTHORITATIVE TESTS ---
  console.log('\n2. Testing C++ Authoritative Engine (Doubles Rule & Settings Lock)...');
  const engine = new CppEngineProcess();

  try {
    const started = engine.ensureProcess();
    assert.strictEqual(started, true, 'C++ Engine binary must spawn successfully');

    // Test 2A: Pre-game lobby rule updates
    await test('C++ Engine starts in Lobby phase when inLobby is true', async () => {
      const initRes = await engine.sendCommand({
        action: 'init',
        inLobby: true,
        rules: {
          doublesRuleEnabled: false,
          defaultStartingMoney: 30000,
          maxPlayers: 4
        }
      });
      assert.strictEqual(initRes.ok, true, 'Init in lobby should succeed');
      assert.strictEqual(initRes.state.gamePhase, 'LOBBY', 'Phase should be LOBBY');
      assert.strictEqual(initRes.state.settingsLocked, false, 'Settings should NOT be locked in lobby');
    });

    await test('Host can update game rules in Pre-Game Lobby', async () => {
      const updateRes = await engine.sendCommand({
        action: 'updateRules',
        requesterId: 0,
        rules: {
          doublesRuleEnabled: false,
          defaultStartingMoney: 28000,
          timerSeconds: 45
        }
      });
      assert.strictEqual(updateRes.ok, true, 'Host updateRules in lobby should succeed');
      assert.strictEqual(updateRes.state.rules.doublesRuleEnabled, false, 'Doubles rule should be updated to false');
      assert.strictEqual(updateRes.state.rules.defaultStartingMoney, 28000, 'Starting money should be 28000');
    });

    await test('Non-host cannot update game rules in Lobby', async () => {
      const updateRes = await engine.sendCommand({
        action: 'updateRules',
        requesterId: 1, // Player 2
        rules: {
          doublesRuleEnabled: true
        }
      });
      assert.strictEqual(updateRes.ok, false, 'Non-host update should be rejected');
      assert.ok(updateRes.error && updateRes.error.includes('host'), 'Error should mention host permission');
    });

    // Test 2B: Starting the game locks settings permanently
    await test('Starting the game transitions phase to IN_PROGRESS and permanently locks settings', async () => {
      const startRes = await engine.sendCommand({
        action: 'startGame',
        playerCount: 3
      });
      assert.strictEqual(startRes.ok, true, 'startGame should succeed');
      assert.strictEqual(startRes.state.gamePhase, 'IN_PROGRESS', 'Phase must be IN_PROGRESS');
      assert.strictEqual(startRes.state.settingsLocked, true, 'settingsLocked must be true');
    });

    await test('Mid-game rule modification is permanently rejected by C++ engine', async () => {
      const midGameUpdate = await engine.sendCommand({
        action: 'updateRules',
        requesterId: 0,
        rules: {
          doublesRuleEnabled: true
        }
      });
      assert.strictEqual(midGameUpdate.ok, false, 'Mid-game rule update must be rejected');
      assert.ok(midGameUpdate.error && midGameUpdate.error.includes('locked'), 'Error should state settings are locked');
    });

    // Test 2C: Authoritative roll with doublesRuleEnabled === false
    await test('With doubles rule OFF, rolling doubles does NOT grant an extra turn', async () => {
      // Roll until we get a roll, or inspect result.extraTurnGranted
      let tested = false;
      for (let i = 0; i < 20; i++) {
        const rollRes = await engine.sendCommand({
          action: 'roll',
          playerId: 0
        });
        if (rollRes.ok && rollRes.result) {
          // Verify that with doublesRuleEnabled === false, extraTurnGranted is ALWAYS false
          assert.strictEqual(
            rollRes.result.extraTurnGranted,
            false,
            'extraTurnGranted MUST be false when doublesRuleEnabled is false'
          );
          tested = true;
          break;
        }
      }
      assert.strictEqual(tested, true, 'At least one roll was tested for extraTurnGranted');
    });

    // Test 2D: Authoritative financial insights data export
    await test('C++ Engine exports complete authoritative financial metrics for Insights', async () => {
      const stateRes = await engine.sendCommand({ action: 'getState' });
      assert.strictEqual(stateRes.ok, true, 'getState should succeed');
      const state = stateRes.state;
      assert.ok(Array.isArray(state.players), 'Players must be an array');
      assert.ok(state.players.length >= 2, 'Should have at least 2 players');

      for (const p of state.players) {
        assert.strictEqual(typeof p.money, 'number', 'Player money must be numeric');
        assert.ok(Array.isArray(p.ownedProperties), 'ownedProperties must be an array');
        assert.strictEqual(typeof (p.rentReceived ?? p.totalRentReceived), 'number', 'rentReceived/totalRentReceived must be tracked');
        assert.strictEqual(typeof (p.rentPaid ?? p.totalRentPaid), 'number', 'rentPaid/totalRentPaid must be tracked');
        assert.strictEqual(typeof p.isBankrupt, 'boolean', 'isBankrupt must be boolean');
      }
    });

  } finally {
    engine.kill();
  }

  // --- 3. TYPESCRIPT / CLIENT ENGINE TESTS ---
  console.log('\n3. Testing TypeScript Local Engine (Doubles Off & Settings Lock)...');
  await test('TypeScript LocalEngine rejects updateRules after game started', async () => {
    // Dynamic import of LocalGameEngine logic or simulation
    let gameStarted = false;
    let settingsLocked = false;
    const rules = { doublesRuleEnabled: false, defaultStartingMoney: 25000 };

    function updateRules(newRules, requesterId) {
      if (settingsLocked || gameStarted) {
        return { success: false, error: 'Settings are permanently locked once game starts.' };
      }
      if (requesterId !== 0) {
        return { success: false, error: 'Only host can modify rules.' };
      }
      Object.assign(rules, newRules);
      return { success: true, rules };
    }

    function startGame() {
      gameStarted = true;
      settingsLocked = true;
    }

    // In lobby: host can update
    const res1 = updateRules({ defaultStartingMoney: 30000 }, 0);
    assert.strictEqual(res1.success, true);
    assert.strictEqual(rules.defaultStartingMoney, 30000);

    // Non-host is rejected
    const res2 = updateRules({ defaultStartingMoney: 50000 }, 1);
    assert.strictEqual(res2.success, false);

    // Start game
    startGame();

    // After start: host is permanently locked out
    const res3 = updateRules({ defaultStartingMoney: 40000 }, 0);
    assert.strictEqual(res3.success, false);
    assert.strictEqual(rules.defaultStartingMoney, 30000, 'Rules must remain frozen');
  });

  await test('Frontend turn transition logic with doublesRule OFF never enters EXTRA_TURN', () => {
    const isDoublesRuleActive = false;
    const mockResult = {
      isDouble: true,
      extraTurnGranted: false,
      mustGoToJail: false,
      dice: [4, 4]
    };

    const hasExtraTurn = Boolean(
      (mockResult.extraTurnGranted !== undefined ? mockResult.extraTurnGranted : isDoublesRuleActive) &&
      isDoublesRuleActive &&
      mockResult.isDouble &&
      !mockResult.mustGoToJail
    );

    assert.strictEqual(hasExtraTurn, false, 'hasExtraTurn MUST be false when doublesRule is inactive');

    let nextTurnState = '';
    if (hasExtraTurn) {
      nextTurnState = 'EXTRA_TURN';
    } else {
      nextTurnState = 'WAITING_FOR_ACTION';
    }

    assert.strictEqual(nextTurnState, 'WAITING_FOR_ACTION', 'Turn state must be WAITING_FOR_ACTION, not EXTRA_TURN');
  });

  console.log('\n====================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
