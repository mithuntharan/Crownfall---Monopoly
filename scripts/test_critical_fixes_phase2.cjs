const fs = require("fs")
const path = require("path")
const assert = require("assert")
const { spawnSync } = require("child_process")

async function runTests() {
  console.log("====================================================")
  console.log("  CROWNFALL PHASE 2 CRITICAL FIXES VERIFICATION     ")
  console.log("  Colors, Host Settings, Dev Mode, Buildings & Log  ")
  console.log("====================================================\n")

  let passed = 0
  let failed = 0

  async function test(name, fn) {
    try {
      await fn()
      console.log(`  [PASS] ${name}`)
      passed++
    } catch (err) {
      console.error(`  [FAIL] ${name}`)
      console.error(`         ${err.message}\n`)
      failed++
    }
  }

  const exePath = path.join(__dirname, "../bin/monopoly_engine.exe")
  assert(fs.existsSync(exePath), "monopoly_engine.exe must exist")

  // ── GROUP 1: PLAYER COLORS ──
  console.log("1. Player Colors (Uniqueness, Synchronization, Stability)...")

  await test("C++ Engine: updatePlayerColor assigns unique color and rejects duplicate", () => {
    const input = [
      JSON.stringify({ action: "start", playerCount: 2, p1Color: "saffron", p2Color: "teal" }),
      JSON.stringify({ action: "updatePlayerColor", playerId: 0, newColor: "plum" }),
      JSON.stringify({ action: "updatePlayerColor", playerId: 0, newColor: "teal" }), // duplicate with player 1!
      "quit"
    ].join("\n") + "\n"

    const proc = spawnSync(exePath, ["--server"], { input, encoding: "utf8" })
    const lines = proc.stdout.split("\n").filter(l => l.trim().startsWith("{"))
    assert(lines.length >= 3, `Expected at least 3 JSON responses, got ${lines.length}`)

    const startRes = JSON.parse(lines[0])
    assert.strictEqual(startRes.ok, true)
    assert.strictEqual(startRes.state.players[0].color, "saffron")
    assert.strictEqual(startRes.state.players[1].color, "teal")

    const updateRes = JSON.parse(lines[1])
    assert.strictEqual(updateRes.ok, true, "Valid color change to plum must succeed")
    assert.strictEqual(updateRes.state.players[0].color, "plum")

    const dupRes = JSON.parse(lines[2])
    assert.strictEqual(dupRes.ok, false, "Duplicate color claim must be rejected")
    assert(dupRes.error.includes("already chosen"), "Error must mention already chosen")
    assert.strictEqual(dupRes.state.players[0].color, "plum", "Player color must not be corrupted")
  })

  await test("Static check: No random color reassignment in App.tsx or engine", () => {
    const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
    assert(!appSrc.includes("Math.random()") || !appSrc.includes("color = AVAILABLE_PLAYER_COLORS[Math.floor"), "Must not assign random colors")
    assert(appSrc.includes("handleUpdatePlayerColor"), "handleUpdatePlayerColor must exist")
    assert(appSrc.includes("defaultEngine.updatePlayerColor"), "Engine updatePlayerColor must be invoked")
  })

  // ── GROUP 2: HOST SETTINGS ──
  console.log("\n2. Host Settings (Editable in Lobby, Locked in Match)...")

  await test("C++ Engine: Host can update rules in Lobby, permanently rejected once started", () => {
    const input = [
      JSON.stringify({ action: "init", inLobby: true }), // Start in Lobby phase
      JSON.stringify({ action: "updateRules", requesterId: 0, startingMoney: 30000, doubles: false }),
      JSON.stringify({ action: "updateRules", requesterId: 1, startingMoney: 15000 }), // Non-host rejected
      JSON.stringify({ action: "startGame", requesterId: 0 }), // Transition to IN_PROGRESS
      JSON.stringify({ action: "updateRules", requesterId: 0, startingMoney: 50000 }), // Rejected mid-game
      "quit"
    ].join("\n") + "\n"

    const proc = spawnSync(exePath, ["--server"], { input, encoding: "utf8" })
    const lines = proc.stdout.split("\n").filter(l => l.trim().startsWith("{"))
    assert(lines.length >= 5, `Expected at least 5 JSON responses, got ${lines.length}`)

    const initRes = JSON.parse(lines[0])
    assert.strictEqual(initRes.ok, true)
    assert.strictEqual(initRes.state.gamePhase, "LOBBY", "Must start in LOBBY phase")

    const updateRes = JSON.parse(lines[1])
    assert.strictEqual(updateRes.ok, true, "Host rule update in lobby must succeed")
    assert.strictEqual(updateRes.state.rules.defaultStartingMoney, 30000)
    assert.strictEqual(updateRes.state.rules.doublesRuleEnabled, false)

    const nonHostRes = JSON.parse(lines[2])
    assert.strictEqual(nonHostRes.ok, false, "Non-host rule update must be rejected")

    const startRes = JSON.parse(lines[3])
    assert.strictEqual(startRes.ok, true)
    assert.strictEqual(startRes.state.gamePhase, "IN_PROGRESS", "Must transition to IN_PROGRESS")

    const midGameRes = JSON.parse(lines[4])
    assert.strictEqual(midGameRes.ok, false, "Mid-game rule update must be rejected")
    assert(midGameRes.error.includes("permanently locked"), "Error must state settings permanently locked")
  })

  // ── GROUP 3: DEV MODE ──
  console.log("\n3. Dev Mode (Responsiveness, First Rotation Buys, Human Roll Control)...")

  await test("C++ Engine: Dev Mode ON allows first-rotation purchase, locked once started", () => {
    const input = [
      JSON.stringify({ action: "init", inLobby: true, devMode: true }),
      JSON.stringify({ action: "setDevMode", enabled: true }),
      JSON.stringify({ action: "startGame", requesterId: 0 }),
      JSON.stringify({ action: "setDevMode", enabled: false }), // Mid-game toggle rejected
      "quit"
    ].join("\n") + "\n"

    const proc = spawnSync(exePath, ["--server"], { input, encoding: "utf8" })
    const lines = proc.stdout.split("\n").filter(l => l.trim().startsWith("{"))
    assert(lines.length >= 4, `Expected at least 4 responses`)

    const setRes = JSON.parse(lines[1])
    assert.strictEqual(setRes.ok, true, "Dev Mode toggle in lobby must succeed")
    assert.strictEqual(setRes.state.devMode, true)

    const midDevRes = JSON.parse(lines[3])
    assert.strictEqual(midDevRes.ok, false, "Dev Mode toggle mid-game must be rejected")
  })

  await test("UI check: Dev Mode toggle does not auto-roll human player", () => {
    const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
    assert(
      appSrc.includes("if (isAutoRoll && isActingPlayerHuman)"),
      "Auto-roll must be blocked for human player"
    )
    assert(
      !appSrc.includes("if (isAutoRoll && !devMode && isActingPlayerHuman)"),
      "Dev Mode must NOT bypass human auto-roll protection"
    )
  })

  // ── GROUP 4: BUILDING RULES (NO FULL COLOR GROUP REQUIRED) ──
  console.log("\n4. Building Rules (No full color group required, mortgaged check)...")

  await test("C++ Engine: Building allowed on single owned property without owning full color group", () => {
    const input = [
      JSON.stringify({ action: "start", rules: { devMode: true, defaultStartingMoney: 50000 } }),
      // Land on Ahmedabad (space 4, buildCost: 1800, Red group) and buy it
      JSON.stringify({ action: "roll", dice1: 2, dice2: 2 }), // moves to Ahmedabad (space 4)
      JSON.stringify({ action: "buy", playerId: 0 }),
      // Build a house on Ahmedabad without owning the other 4 Red properties!
      JSON.stringify({ action: "build", playerId: 0, propertyId: "ahmedabad" }),
      "quit"
    ].join("\n") + "\n"

    const proc = spawnSync(exePath, ["--server"], { input, encoding: "utf8" })
    const lines = proc.stdout.split("\n").filter(l => l.trim().startsWith("{"))
    assert(lines.length >= 4, `Expected at least 4 responses, got ${lines.length}`)

    const buyRes = JSON.parse(lines[2])
    assert.strictEqual(buyRes.ok, true, "Purchase of Ahmedabad must succeed")

    const buildRes = JSON.parse(lines[3])
    assert.strictEqual(buildRes.ok, true, "Building house on Ahmedabad must succeed without full group!")
    assert.strictEqual(buildRes.state.players[0].buildings["ahmedabad"], 1, "House count must be 1")
  })

  await test("Static check: No full color group required in Property deed UI", () => {
    const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
    assert(!appSrc.includes("OWN FULL COLOR GROUP TO BUILD"), "Must not display OWN FULL COLOR GROUP TO BUILD")
    assert(!appSrc.includes("MORTGAGED GROUP (CANNOT BUILD)"), "Must not display MORTGAGED GROUP (CANNOT BUILD)")
  })

  // ── GROUP 5: EVENT LOG REDESIGN ──
  console.log("\n5. Event Log Redesign (8 Categories, Category Matcher, Full Log)...")

  await test("TransactionLedgerModal & App exports 8 event categories", () => {
    // Static check of EVENT_LOG_CATEGORIES
    const ledgerSrc = fs.readFileSync(path.join(__dirname, "../src/components/TransactionLedgerModal.tsx"), "utf8")
    const categories = [
      "ALL",
      "TURNS_DICE",
      "RENT_PAYMENTS",
      "PROPERTIES",
      "CONSTRUCTION",
      "CHANCE_CHEST",
      "MOVEMENT_LOCATIONS",
      "SYSTEM_ERRORS"
    ]
    for (const cat of categories) {
      assert(ledgerSrc.includes(cat), `Must support category ${cat}`)
    }
  })

  console.log("\n====================================================")
  console.log(`   PHASE 2 RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log("====================================================")

  if (failed > 0) process.exit(1)
  process.exit(0)
}

runTests().catch(e => {
  console.error("FATAL ERROR:", e)
  process.exit(1)
})
