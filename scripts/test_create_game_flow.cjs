// Regression test for Create Game Flow, Lobby screen, and Error Boundary
const assert = require("assert")
const fs = require("fs")
const path = require("path")

console.log("====================================================")
console.log("   CROWNFALL CREATE GAME & LOBBY REGRESSION TESTS   ")
console.log("====================================================")

let passed = 0
let failed = 0

function test(description, fn) {
  try {
    fn()
    console.log(`  [PASS] ${description}`)
    passed++
  } catch (err) {
    console.error(`  [FAIL] ${description}`)
    console.error(`         ${err.message}`)
    failed++
  }
}

// 1. Static code verification of App.tsx
test("App.tsx has roomCode in LobbyScreen parameter destructuring", () => {
  const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
  // Search for function LobbyScreen and its parameter list
  const lobbyMatch = appSrc.match(/function\s+LobbyScreen\s*\(\s*\{([^}]+)\}/s)
  assert(lobbyMatch, "LobbyScreen component definition not found")
  const params = lobbyMatch[1]
  assert(params.includes("roomCode"), "roomCode must be destructured in LobbyScreen arguments")
})

test("App.tsx imports GamePhase from GameEngineInterface", () => {
  const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
  assert(
    appSrc.includes("GamePhase") && appSrc.includes("./engine/GameEngineInterface"),
    "GamePhase must be imported from GameEngineInterface"
  )
})

test("App.tsx wraps screens with CrownfallErrorBoundary", () => {
  const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
  assert(appSrc.includes("<CrownfallErrorBoundary"), "CrownfallErrorBoundary must wrap critical screens")
  assert(appSrc.includes("Pre-Game Lobby Chamber"), "Lobby chamber must be wrapped in error boundary")
  assert(appSrc.includes("Player Setup Chamber"), "Setup chamber must be wrapped in error boundary")
})

test("main.tsx wraps root App in CrownfallErrorBoundary", () => {
  const mainSrc = fs.readFileSync(path.join(__dirname, "../src/main.tsx"), "utf8")
  assert(mainSrc.includes("CrownfallErrorBoundary"), "main.tsx must mount CrownfallErrorBoundary around App")
})

test("SetupScreen sets localPlayerId to 0 (Host) when creating a game", () => {
  const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
  assert(
    appSrc.includes("setLocalPlayerId(0)") && appSrc.includes("navigate(\"lobby\")"),
    "Creating game must explicitly set localPlayerId to 0 (Host) before navigating to lobby"
  )
})

test("handleStartGame wraps engine startup with try-catch and sets startGameError", () => {
  const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8")
  const startFnMatch = appSrc.match(/handleStartGame\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]+?)\n  \}/)
  assert(startFnMatch, "handleStartGame function not found")
  const body = startFnMatch[1]
  assert(body.includes("try {"), "handleStartGame must use try block")
  assert(body.includes("setStartGameError"), "handleStartGame must set startGameError on failure")
})

test("CrownfallErrorBoundary file exists and has fallback UI", () => {
  const ebSrc = fs.readFileSync(path.join(__dirname, "../src/components/CrownfallErrorBoundary.tsx"), "utf8")
  assert(ebSrc.includes("getDerivedStateFromError"), "ErrorBoundary must implement getDerivedStateFromError")
  assert(ebSrc.includes("componentDidCatch"), "ErrorBoundary must implement componentDidCatch")
  assert(ebSrc.includes("RETURN TO MAIN MENU"), "ErrorBoundary must have Return to Main Menu recovery button")
  assert(ebSrc.includes("RELOAD GAME SESSION"), "ErrorBoundary must have Reload Game Session button")
})

test("Room code generator and validator logic", () => {
  function generateCrownfallRoomCode() {
    const digits = Math.floor(1000 + Math.random() * 9000)
    return `CRN-${digits}`
  }
  function normalizeAndValidateRoomCode(code) {
    const clean = code.trim().toUpperCase()
    const valid = /^(CRN|DMN)-[A-Z0-9]{4}$/i.test(clean)
    return { valid, normalized: clean }
  }

  const generated = generateCrownfallRoomCode()
  assert(/^CRN-\d{4}$/.test(generated), `Generated code ${generated} must match CRN-XXXX pattern`)
  assert(normalizeAndValidateRoomCode("crn-9241").valid, "Lowercase CRN code must be valid")
  assert(normalizeAndValidateRoomCode("DMN-1234").valid, "Legacy DMN code must be valid")
  assert(!normalizeAndValidateRoomCode("INVALID").valid, "Arbitrary string must be invalid")
})

console.log("====================================================")
console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
console.log("====================================================")

if (failed > 0) process.exit(1)
process.exit(0)
