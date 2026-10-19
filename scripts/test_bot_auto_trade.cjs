const assert = require("assert");
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

const exePath = path.join(__dirname, "../bin/monopoly_engine.exe");
assert(fs.existsSync(exePath), "monopoly_engine.exe must exist");

const cmds = [
  { action: "resetToLobby", playerCount: 4 },
  { action: "setDevMode", enabled: true, requesterId: 0 },
  { action: "startGame", requesterId: 0 },
  // P0 rolls 1+3=4 (Ahmedabad) and buys it
  { action: "roll", playerId: 0, d1: 1, d2: 3 },
  { action: "buy", playerId: 0 },
  { action: "endTurn", playerId: 0 },
  // P1 (Bot) rolls 1+2=3 (Railway) and buys it
  { action: "roll", playerId: 1, d1: 1, d2: 2 },
  { action: "buy", playerId: 1 },
  { action: "endTurn", playerId: 1 },
  // P0 proposes trade with P1: give Ahmedabad, take Railway
  { action: "tradeCreate", senderId: 0, receiverId: 1, senderProps: ["ahmedabad"], senderCash: 0, receiverProps: ["railway"], receiverCash: 0 },
  { action: "getState" }
];

const input = cmds.map(c => JSON.stringify(c)).join("\n") + "\nquit\n";
const proc = spawnSync(exePath, ["--server"], { input, encoding: "utf8" });
const lines = proc.stdout.split("\n").filter(l => l.trim().startsWith("{"));
const state = JSON.parse(lines[lines.length - 1]).state;
const p0 = state.players[0];
const p1 = state.players[1];

console.log("P0 properties:", p0.ownedProperties);
console.log("P1 properties:", p1.ownedProperties);
console.log("Trade offers count:", state.tradeOffers.length);
console.log("Trade status:", state.tradeOffers[0]?.status);

assert(p0.ownedProperties.includes("railway"), "P0 should now own railway");
assert(p1.ownedProperties.includes("ahmedabad"), "P1 should now own ahmedabad");
assert.strictEqual(state.tradeOffers[0].status, "ACCEPTED", "Trade offer should be auto-accepted");
console.log("SUCCESS: Bot auto-accepted trade immediately!");
