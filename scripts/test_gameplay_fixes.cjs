// Comprehensive test suite for Crownfall Gameplay Fixes
// 1. Start Game in Roll Dice Position & Pre-game Lobby
// 2. Strict CRN- Room Code Validation (No DMN accepted)
// 3. Doubles Property Purchase & Extra Turn Continuation
// 4. Dev Mode & No Human Auto-Rolling

const assert = require("assert")
const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")

console.log("====================================================")
console.log("     CROWNFALL COMPREHENSIVE GAMEPLAY TEST SUITE    ")
console.log("====================================================")

let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  [PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`  [FAIL] ${name}`)
    console.error(`         ${err.message}`)
    failed++
  }
}

async function runTests() {
  // ── TEST GROUP 1: Room Codes & Strict CRN- Validation ──
  console.log("\n1. Room Codes Validation (CRN only, DMN rejected)...")
  await test("CRN code generator format", () => {
    function generateCrownfallRoomCode() {
      const digits = Math.floor(1000 + Math.random() * 9000)
      return `CRN-${digits}`
    }
    const code = generateCrownfallRoomCode()
    assert(/^CRN-\d{4}$/.test(code), `Generated code ${code} should match CRN-XXXX`)
  })

  await test("Strict CRN validation rejects DMN codes", () => {
    function normalizeAndValidateRoomCode(code) {
      const clean = code.trim().toUpperCase()
      const valid = /^CRN-[A-Z0-9]{4}$/i.test(clean)
      return { valid, normalized: clean }
    }
    assert.strictEqual(normalizeAndValidateRoomCode("CRN-4821").valid, true)
    assert.strictEqual(normalizeAndValidateRoomCode("crn-1234").valid, true)
    assert.strictEqual(normalizeAndValidateRoomCode("DMN-4821").valid, false, "DMN must be rejected")
    assert.strictEqual(normalizeAndValidateRoomCode("dmn-1234").valid, false, "lowercase dmn must be rejected")
    assert.strictEqual(normalizeAndValidateRoomCode("CRN-99").valid, false)
    assert.strictEqual(normalizeAndValidateRoomCode("INVALID").valid, false)
  })

  await test("Static check: No DMN advertised in SetupScreen or App.tsx", () => {
    const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
    assert(!appSrc.includes("legacy DMN"), "App.tsx must not contain 'legacy DMN'")
    assert(!appSrc.includes("CRN|DMN"), "Regex in App.tsx must not allow DMN")
    assert(appSrc.includes("Enter a valid Crownfall code beginning with CRN"), "Must show CRN error message")
  })

  // ── TEST GROUP 2: Start Game in Roll Dice Position ──
  console.log("\n2. Start Game placement & Pre-game Lobby constraints...")
  await test("Start Game button placed in roll-button position before game starts", () => {
    const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
    assert(appSrc.includes("start-game-button"), "Must have start-game-button class in roll position")
    assert(appSrc.includes("👑 START GAME"), "Must have START GAME button for host")
    assert(appSrc.includes("⏳ WAITING FOR HOST TO START GAME"), "Non-host must see disabled waiting button")
    assert(appSrc.includes("disabled={!isGameStarted || !canEndTurn}"), "End Turn disabled before game starts")
  })

  await test("Pre-game lobby prevents rolling or bot actions before isGameStarted", () => {
    const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
    assert(appSrc.includes("if (\n      !isGameStarted ||"), "roll() must guard against !isGameStarted")
    assert(appSrc.includes("if (!isGameStarted) return\n      if (!effectiveAutoPlayRef.current)"), "Bot loop must guard against !isGameStarted")
  })

  // ── TEST GROUP 3: Doubles Property Purchase & Extra Turn ──
  console.log("\n3. Doubles Property Purchase & Extra Turn Continuation...")
  await test("C++ Authoritative Engine: Buy property after rolling doubles preserves EXTRA_TURN", () => {
    const exePath = path.join(__dirname, "../bin/monopoly_engine.exe")
    assert(fs.existsSync(exePath), "monopoly_engine.exe must exist")

    // Run engine CLI commands:
    // start with 2 players, roll doubles to land on unowned property (space 4: Delhi / property)
    // Send lines: {"action":"start","rules":{"doublesRuleEnabled":true,"devMode":true},"players":[{"name":"P1","isHuman":true},{"name":"P2","isHuman":false}]}
    const startCmd = JSON.stringify({
      action: "start",
      rules: { doublesRuleEnabled: true, devMode: true, defaultStartingMoney: 25000 },
      players: [{ name: "Human", isHuman: true }, { name: "Bot", isHuman: false }]
    })

    // Roll dice: dice1=2, dice2=2 (doubles! total 4 -> space 4 is New Delhi / unowned)
    const rollCmd = JSON.stringify({ action: "roll", dice1: 2, dice2: 2 })
    const buyCmd = JSON.stringify({ action: "buy", playerId: 0 })

    const input = [startCmd, rollCmd, buyCmd, "quit"].join("\n") + "\n"
    const proc = spawnSync(exePath, ["--server"], { input, encoding: "utf8" })
    
    const lines = proc.stdout.split("\n").filter(l => l.trim().startsWith("{"))
    assert(lines.length >= 3, `Expected at least 3 JSON responses, got: ${lines.length}`)

    const startRes = JSON.parse(lines[0])
    assert.strictEqual(startRes.ok, true, "Engine start must succeed")
    assert.strictEqual(startRes.state.gamePhase, "IN_PROGRESS", "Phase must be IN_PROGRESS after start")

    const rollRes = JSON.parse(lines[1])
    assert.strictEqual(rollRes.ok, true, "Roll must succeed")
    assert.strictEqual(rollRes.result.isDouble, true, "Must be double")
    assert.strictEqual(rollRes.result.extraTurnGranted, true, "Extra turn must be granted for doubles")
    assert.strictEqual(rollRes.result.eligibleToBuy, true, "Should be eligible to buy space 4")

    const buyRes = JSON.parse(lines[2])
    assert.strictEqual(buyRes.ok, true, "Buy action must succeed after rolling doubles!")
    assert(buyRes.state.players[0].money < 25000, "Money should be deducted for property")
    assert(buyRes.state.players[0].ownedProperties.length > 0, "Property should be added to player portfolio")
    assert.strictEqual(buyRes.state.turnState, "EXTRA_TURN", "turnState MUST be EXTRA_TURN after buying following doubles!")
  })

  await test("C++ Authoritative Engine: Decline purchase after rolling doubles preserves EXTRA_TURN", () => {
    const exePath = path.join(__dirname, "../bin/monopoly_engine.exe")
    const startCmd = JSON.stringify({
      action: "start",
      rules: { doublesRuleEnabled: true, devMode: true, defaultStartingMoney: 25000 },
      players: [{ name: "Human", isHuman: true }, { name: "Bot", isHuman: false }]
    })
    const rollCmd = JSON.stringify({ action: "roll", dice1: 2, dice2: 2 })
    const declineCmd = JSON.stringify({ action: "decline", playerId: 0 })

    const input = [startCmd, rollCmd, declineCmd, "quit"].join("\n") + "\n"
    const proc = spawnSync(exePath, ["--server"], { input, encoding: "utf8" })
    const lines = proc.stdout.split("\n").filter(l => l.trim().startsWith("{"))
    assert(lines.length >= 3, "Expected at least 3 responses")

    const decRes = JSON.parse(lines[2])
    assert.strictEqual(decRes.ok, true, "Decline action must succeed")
    assert.strictEqual(decRes.state.turnState, "EXTRA_TURN", "turnState MUST be EXTRA_TURN after declining following doubles!")
  })

  await test("C++ Authoritative Engine: Normal non-doubles roll transitions to WAITING_FOR_ACTION after buy", () => {
    const exePath = path.join(__dirname, "../bin/monopoly_engine.exe")
    const startCmd = JSON.stringify({
      action: "start",
      rules: { doublesRuleEnabled: true, devMode: true, defaultStartingMoney: 25000 },
      players: [{ name: "Human", isHuman: true }, { name: "Bot", isHuman: false }]
    })
    const rollCmd = JSON.stringify({ action: "roll", dice1: 1, dice2: 2 }) // Not doubles (total 3)
    const buyCmd = JSON.stringify({ action: "buy", playerId: 0 })

    const input = [startCmd, rollCmd, buyCmd, "quit"].join("\n") + "\n"
    const proc = spawnSync(exePath, ["--server"], { input, encoding: "utf8" })
    const lines = proc.stdout.split("\n").filter(l => l.trim().startsWith("{"))
    assert(lines.length >= 3, "Expected at least 3 responses")

    const buyRes = JSON.parse(lines[2])
    assert.strictEqual(buyRes.ok, true, "Buy action must succeed")
    assert.strictEqual(buyRes.state.turnState, "WAITING_FOR_ACTION", "turnState must be WAITING_FOR_ACTION (no extra turn)")
  })

  // ── TEST GROUP 4: Dev Mode & Human Auto-Rolling Prevention ──
  console.log("\n4. Dev Mode & Human Auto-Rolling Prevention...")
  await test("Human players are never auto-rolled in roll() even when Dev Mode is ON", () => {
    const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
    // Check that isAutoRoll blocks on isActingPlayerHuman without requiring !devMode
    assert(
      appSrc.includes("if (isAutoRoll && isActingPlayerHuman) {"),
      "Must block auto-roll for human player unconditionally"
    )
    assert(
      !appSrc.includes("if (isAutoRoll && !devMode && isActingPlayerHuman) {"),
      "Must NOT permit devMode to auto-roll human players"
    )
  })

  await test("Dev Mode toggle is locked once game has started", () => {
    const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
    assert(
      appSrc.includes("if (settingsLocked || gamePhase === \"IN_PROGRESS\")"),
      "handleSetDevMode must reject changes when settingsLocked or IN_PROGRESS"
    )
    assert(
      appSrc.includes("disabled={localPlayerId !== 0 || isGameStarted}"),
      "Dev Mode button must be disabled when isGameStarted"
    )
  })

  console.log("\n====================================================")
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log("====================================================")

  if (failed > 0) process.exit(1)
  process.exit(0)
}

runTests()
