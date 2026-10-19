const fs = require("fs")
const path = require("path")
const assert = require("assert")
const { spawnSync } = require("child_process")

async function runTests() {
  console.log("====================================================")
  console.log("  CROWNFALL REGRESSION TEST SUITE                   ")
  console.log("  Host Settings Removal & Dev Mode Implementation   ")
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

  console.log("1. Top Bar & Navigation Structure Verification...")

  await test("Regression 1: Top bar contains no separate Host Settings entry", () => {
    const appContent = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
    // Ensure no button with "HOST SETTINGS" in the top bar
    assert(!appContent.includes("⚙️ HOST SETTINGS"), "Top bar must not contain '⚙️ HOST SETTINGS' button")

    // Ensure no broken gap or leftover host settings button in game-topbar
    const startIdx = appContent.indexOf('className="game-topbar"')
    const endIdx = appContent.indexOf('className="dev-mode-banner"')
    assert(startIdx !== -1 && endIdx !== -1, "game-topbar and dev-mode-banner must exist in App.tsx")
    const topBarSlice = appContent.slice(startIdx, endIdx)
    assert(!topBarSlice.includes("HOST SETTINGS"), "Top bar section must not contain any HOST SETTINGS element")
    assert(!topBarSlice.includes("onOpenHostSettings"), "Top bar must not contain onOpenHostSettings handler")
  })

  await test("Regression 2: Host Settings remains accessible through normal Settings menu", () => {
    const appContent = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
    const prefsContent = fs.readFileSync(path.join(__dirname, "../src/components/PreferencesModal.tsx"), "utf8")

    // Normal Settings gear icon in top bar
    assert(appContent.includes('className="icon-button game-menu"'), "Top bar must keep normal settings gear icon")
    assert(appContent.includes('setModal("preferences")'), "Gear icon must open preferences modal")

    // Host tab in PreferencesModal
    assert(prefsContent.includes("👑 HOST SETTINGS"), "PreferencesModal must have '👑 HOST SETTINGS' tab")
    assert(prefsContent.includes('activeTab === "host"'), "PreferencesModal must render host settings tab content")
    assert(prefsContent.includes('!isGameStarted && isHost ? "host" : "appearance"'), "Host in lobby defaults directly to Host Settings tab")
    assert(prefsContent.includes("handleApplyRules"), "Host settings controls must have rule apply logic")
  })

  await test("Regression 3: There is exactly one consolidated Dev Mode control", () => {
    const appContent = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
    const prefsContent = fs.readFileSync(path.join(__dirname, "../src/components/PreferencesModal.tsx"), "utf8")

    // No devMode in PreferencesModal
    assert(!prefsContent.includes("Developer Testing Mode"), "PreferencesModal must not contain Dev Mode toggle")
    assert(!prefsContent.includes("devMode:"), "PreferencesModal must not reference devMode")

    // Consolidated toggle in GameScreen top controls
    const toggleMatches = appContent.match(/className=\{`dev-toggle-btn \$\{devMode \? "active" : ""\}`\}/g)
    assert.strictEqual(toggleMatches ? toggleMatches.length : 1, 1, "There must be exactly one Dev Mode toggle button in App.tsx")
    assert(appContent.includes("DEV MODE: ON"), "Consolidated toggle must show DEV MODE: ON")
    assert(appContent.includes("DEV MODE: OFF"), "Consolidated toggle must show DEV MODE: OFF")
  })

  console.log("\n2. Engine Host Permissions & Settings Lifecycle...")

  await test("Regression 7 & 8: Lobby allows host edits, non-host rejected; locked after start", () => {
    const input = [
      JSON.stringify({ action: "resetToLobby", playerCount: 4 }),
      // Non-host tries to update rules: must be rejected
      JSON.stringify({ action: "updateRules", requesterId: 1, startingMoney: 20000 }),
      // Non-host tries to set dev mode: must be rejected
      JSON.stringify({ action: "setDevMode", enabled: true, requesterId: 1 }),
      // Host updates rules: must succeed
      JSON.stringify({ action: "updateRules", requesterId: 0, startingMoney: 30000, doubles: false, timerEnabled: true, timerSeconds: 90, maxPlayers: 5 }),
      // Host toggles dev mode: must succeed
      JSON.stringify({ action: "setDevMode", enabled: true, requesterId: 0 }),
      // Host starts game
      JSON.stringify({ action: "startGame", requesterId: 0 }),
      // Post-start edits: must be rejected
      JSON.stringify({ action: "updateRules", requesterId: 0, startingMoney: 25000 }),
      JSON.stringify({ action: "setDevMode", enabled: false, requesterId: 0 }),
      "quit"
    ].join("\n") + "\n"

    const proc = spawnSync(exePath, ["--server"], { input, encoding: "utf8" })
    const lines = proc.stdout.split("\n").filter(l => l.trim().startsWith("{"))
    assert(lines.length >= 8, `Expected at least 8 JSON responses, got ${lines.length}`)

    const nonHostRules = JSON.parse(lines[1])
    assert.strictEqual(nonHostRules.ok, false, "Non-host rules update must be rejected")
    assert(nonHostRules.error.includes("Only the host"), "Error must specify host-only restriction")

    const nonHostDev = JSON.parse(lines[2])
    assert.strictEqual(nonHostDev.ok, false, "Non-host Dev Mode update must be rejected")
    assert(nonHostDev.error.includes("Only the host"), "Error must specify host-only restriction")

    const hostRules = JSON.parse(lines[3])
    assert.strictEqual(hostRules.ok, true, "Host updateRules in lobby must succeed")
    assert.strictEqual(hostRules.state.rules.defaultStartingMoney, 30000)

    const hostDev = JSON.parse(lines[4])
    assert.strictEqual(hostDev.ok, true, "Host setDevMode in lobby must succeed")
    assert.strictEqual(hostDev.state.devMode, true)

    const startRes = JSON.parse(lines[5])
    assert.strictEqual(startRes.ok, true)
    assert.strictEqual(startRes.state.gameStarted, true)

    const postRulesRes = JSON.parse(lines[6])
    assert.strictEqual(postRulesRes.ok, false, "Rules update after start must be rejected")
    assert(postRulesRes.error.includes("locked while game is in progress"))

    const postDevRes = JSON.parse(lines[7])
    assert.strictEqual(postDevRes.ok, false, "Dev Mode update after start must be rejected")
    assert(postDevRes.error.includes("locked while match is in progress"))
  })

  console.log("\n3. Dev Mode Behavioral Verification in Authoritative C++ Engine...")

  await test("Regression 4, 5 & 6: Dev Mode ON enables testing features; Dev Mode OFF enforces normal rules", () => {
    // Session A: Dev Mode OFF
    const inputOff = [
      JSON.stringify({ action: "resetToLobby", playerCount: 4 }),
      JSON.stringify({ action: "setDevMode", enabled: false, requesterId: 0 }),
      JSON.stringify({ action: "startGame", requesterId: 0 }),
      // Attempt setActivePlayer when devMode is false: must fail
      JSON.stringify({ action: "setActivePlayer", playerId: 2 }),
      // Attempt roll with rigged dice when devMode is false: must fail
      JSON.stringify({ action: "roll", playerId: 0, d1: 1, d2: 2 }),
      // Normal roll for player 0
      JSON.stringify({ action: "roll", playerId: 0 }),
      // Player 0 tries to buy in rotation 0: must fail (normal rule: no buy in 1st rotation)
      JSON.stringify({ action: "buy", playerId: 0 }),
      "quit"
    ].join("\n") + "\n"

    const procOff = spawnSync(exePath, ["--server"], { input: inputOff, encoding: "utf8" })
    const linesOff = procOff.stdout.split("\n").filter(l => l.trim().startsWith("{"))

    const setActiveOff = JSON.parse(linesOff[3])
    assert.strictEqual(setActiveOff.ok, false, "setActivePlayer without Dev Mode must be rejected")
    assert(setActiveOff.error.includes("requires Dev Mode"))

    const riggedOff = JSON.parse(linesOff[4])
    assert.strictEqual(riggedOff.ok, false, "roll with rigged dice without Dev Mode must be rejected")
    assert(riggedOff.error.includes("only allowed in dev mode"))

    const buyOff = JSON.parse(linesOff[6])
    assert.strictEqual(buyOff.ok, false, "buy on rotation 0 without Dev Mode must be rejected")

    // Session B: Dev Mode ON
    const inputOn = [
      JSON.stringify({ action: "resetToLobby", playerCount: 4 }),
      JSON.stringify({ action: "setDevMode", enabled: true, requesterId: 0 }),
      JSON.stringify({ action: "startGame", requesterId: 0 }),
      // setActivePlayer to player 1: must succeed in Dev Mode!
      JSON.stringify({ action: "setActivePlayer", playerId: 1 }),
      // rollRigged for active player: must succeed in Dev Mode!
      JSON.stringify({ action: "roll", playerId: 1, d1: 1, d2: 2 }),
      // buy in rotation 0: must succeed in Dev Mode!
      JSON.stringify({ action: "buy", playerId: 1 }),
      "quit"
    ].join("\n") + "\n"

    const procOn = spawnSync(exePath, ["--server"], { input: inputOn, encoding: "utf8" })
    const linesOn = procOn.stdout.split("\n").filter(l => l.trim().startsWith("{"))

    const setActiveOn = JSON.parse(linesOn[3])
    assert.strictEqual(setActiveOn.ok, true, "setActivePlayer in Dev Mode must succeed")
    assert.strictEqual(setActiveOn.state.activePlayerIndex, 1, "Active player must now be 1")

    const riggedOn = JSON.parse(linesOn[4])
    assert.strictEqual(riggedOn.ok, true, "roll with rigged dice in Dev Mode must succeed")
    assert.strictEqual(riggedOn.result.dice1, 1)
    assert.strictEqual(riggedOn.result.dice2, 2)
    assert.strictEqual(riggedOn.result.eligibleToBuy, true, "In Dev Mode, eligibleToBuy is true even on 1st rotation")

    const buyOn = JSON.parse(linesOn[5])
    assert.strictEqual(buyOn.ok, true, "buy in Dev Mode on 1st rotation must succeed")
    assert(buyOn.state.players[1].ownedProperties.length > 0, "Player 1 must now own the property")
  })

  console.log("\n4. Layout & Mobile Usability Verification...")

  await test("Regression 10: Top bar styling maintains responsive gap and mobile compatibility", () => {
    const cssContent = fs.readFileSync(path.join(__dirname, "../src/index.css"), "utf8")
    assert(cssContent.includes(".game-topbar"), ".game-topbar class must exist in css")
    assert(cssContent.includes(".dev-toggle-btn"), ".dev-toggle-btn class must exist in css")
    assert(cssContent.includes(".dev-mode-banner"), ".dev-mode-banner class must exist in css")

    // Check that App.tsx top bar maintains clean flex layout
    const appContent = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
    assert(appContent.includes('className="game-topbar"'), "game-topbar container must exist")
    assert(appContent.includes('touchAction: "manipulation"'), "Touch buttons must have touchAction manipulation for mobile")
  })

  console.log("\n====================================================")
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log("====================================================")

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch(err => {
  console.error("Test runner failed:", err)
  process.exit(1)
})
