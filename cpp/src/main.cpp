#include "../include/BusinessData.h"
#include "../include/GameEngine.h"
#include "../include/Types.h"
#include <algorithm>
#include <cassert>
#include <iostream>
#include <memory>
#include <optional>
#include <set>
#include <sstream>
#include <utility>
#include <vector>

using namespace Crownfall;

void runDataValidationTests() {
  std::cout << "========================================\n";
  std::cout << "[CROWNFALL C++ ENGINE] Validating Master Dataset...\n";
  std::cout << "========================================\n";

  std::vector<std::string> errors;
  bool ok = BusinessData::validateAllData(errors);

  if (!ok) {
    std::cerr << "VALIDATION FAILED with " << errors.size() << " errors:\n";
    for (const auto &err : errors) {
      std::cerr << "  - " << err << "\n";
    }
    std::exit(1);
  }

  std::cout << "SUCCESS: All 20 city properties validated.\n";
  std::cout << "SUCCESS: All 6 special properties validated.\n";
  std::cout << "SUCCESS: Chance & Chest dice sums (2-12) validated.\n";
  std::cout << "SUCCESS: All monetary values are multiples of Rs. 100.\n";
  std::cout << "SUCCESS: 36 Board spaces match physical board layout.\n";
}

void runEngineRulesTests() {
  std::cout << "\n========================================\n";
  std::cout << "[CROWNFALL C++ ENGINE] Running Rule Engine Tests...\n";
  std::cout << "========================================\n";

  GameRules rules;
  rules.defaultStartingMoney = 25000;
  rules.doublesRuleEnabled = true;

  GameEngine engine(rules);
  engine.addPlayer("You", "saffron", "C");
  engine.addPlayer("Kavya", "teal", "L");
  engine.startGame();

  // 1. Initial State: Starting cash timing check (Rule 5: Starts with 0)
  assert(engine.getPlayers()[0].money == 0);
  assert(engine.getPlayers()[1].money == 0);
  std::cout
      << "  \u2713 Rule 5: Players start with Rs. 0 before first rotation.\n";

  // 2. First Rotation: No purchase allowed
  TurnResult tr1 =
      engine.rollAndMove(std::make_pair(1, 2)); // 3 spaces -> Railway (space 3)
  assert(tr1.newPosition == 3);
  assert(!tr1.eligibleToBuy);
  assert(engine.getPlayers()[0].money == 0);
  std::cout << "  \u2713 Rule 15: Property purchase disallowed during first "
               "rotation.\n";

  // 3. Complete first rotation: awards starting capital (Rs. 25,000)
  TurnResult tr2 = engine.rollAndMove(
      std::make_pair(5, 6)); // Player 2 moves to 11 (not doubles)
  TurnResult tr3 = engine.rollAndMove(
      std::make_pair(6, 6)); // Player 1 moves to 15 (doubles, roll 1)
  TurnResult tr4 = engine.rollAndMove(
      std::make_pair(6, 6)); // Player 1 moves to 27 (doubles, roll 2)
  TurnResult tr5 = engine.rollAndMove(std::make_pair(
      4, 6)); // Player 1 crosses start (27 + 10 = 37 -> space 1: Bombay)

  assert(engine.getPlayers()[0].rotationsCompleted == 1);
  assert(engine.getPlayers()[0].money == 25000);
  std::cout << "  \u2713 Rule 5: Awarded Rs. 25,000 starting capital upon "
               "completing first rotation!\n";

  // 4. Second rotation: can buy property
  // Player 1 is on space 1 (Bombay, price 8500)
  bool bought = engine.buyCurrentProperty(0);
  assert(bought);
  assert(engine.getPlayers()[0].money == 25000 - 8500);
  std::cout
      << "  \u2713 Rule 21: Successfully purchased Bombay for Rs. 8,500!\n";

  // 5. Special Property rent test
  auto railway = BusinessData::getSpecialPropertyByName("Railway");
  assert(railway.has_value());
  assert(railway->purchasePrice == 9500);
  assert(railway->aloneMultiplierOrFixed == 600);
  assert(railway->pairMultiplierOrFixed == 1200);
  std::cout << "  \u2713 Special Property: Railway rent is Rs. 600 alone, Rs. "
               "1,200 with Roadways.\n";

  std::cout << "\nALL C++ ENGINE TESTS PASSED PERFECTLY!\n";
}

// ============================================================
// REGRESSION TESTS - Fixed Bugs
// ============================================================

void runRegressionTests() {
  std::cout << "\n========================================\n";
  std::cout << "[CROWNFALL C++ ENGINE] Running Regression Tests...\n";
  std::cout << "========================================\n";

  // --- REGRESSION 1: Board wraparound 35 -> 0/1 ---
  {
    GameRules r;
    r.doublesRuleEnabled = false;
    r.defaultStartingMoney = 25000;
    GameEngine eng(r);
    eng.addPlayer("Alpha", "red", "A");
    eng.startGame();
    // Complete first rotation
    eng.rollAndMove(std::make_pair(6, 6)); // pos 12
    eng.rollAndMove(std::make_pair(
        6, 5)); // pos 23 (crosses start if 12+11=23? No, 12+11=23 < 36)
    eng.rollAndMove(std::make_pair(6, 6)); // pos 35 (23+12=35)
    // rotationsCompleted still 0 (never crossed start, 35<36)
    assert(eng.getPlayers()[0].position == 35);
    assert(eng.getPlayers()[0].rotationsCompleted == 0);
    // Now roll 2 -> crosses start (35+2=37, 37%36=1), gets starting capital
    TurnResult wr = eng.rollAndMove(std::make_pair(1, 1));
    assert(wr.newPosition == 1);       // (35+2)%36 = 1
    assert(wr.startingCapitalAwarded); // First time crossing start = capital
    assert(eng.getPlayers()[0].rotationsCompleted == 1);
    assert(eng.getPlayers()[0].money == 25000);
    std::cout << "  \u2713 Board wraparound: pos 35 + 2 = space 1 (Bombay). "
                 "Starting capital awarded.\n";
  }

  // --- REGRESSION 2: Three-doubles -> Jail ---
  {
    GameRules r;
    r.doublesRuleEnabled = true;
    r.defaultStartingMoney = 25000;
    GameEngine eng(r);
    eng.addPlayer("Beta", "blue", "B");
    eng.startGame();

    // Roll three consecutive doubles -> should go to Jail
    TurnResult d1 =
        eng.rollAndMove(std::make_pair(3, 3)); // double -> pos 6, extra turn
    assert(!eng.getPlayers()[0].inJail);
    TurnResult d2 =
        eng.rollAndMove(std::make_pair(4, 4)); // double -> pos 14, extra turn
    assert(!eng.getPlayers()[0].inJail);
    TurnResult d3 = eng.rollAndMove(
        std::make_pair(5, 5)); // Third double -> Jail! No movement.
    assert(eng.getPlayers()[0].inJail);
    assert(eng.getPlayers()[0].position == 9); // Jail space index
    assert(d3.mustGoToJail);
    std::cout << "  \u2713 Three-doubles rule: Third double sends player to "
                 "Jail (pos 9), no movement.\n";
  }

  // --- REGRESSION 3: Jail no-double-roll bug ---
  {
    GameRules r;
    r.doublesRuleEnabled = true;
    r.defaultStartingMoney = 25000;
    GameEngine eng(r);
    eng.addPlayer("Beta", "blue", "B");
    eng.startGame();

    // Send to jail via three doubles
    eng.rollAndMove(std::make_pair(3, 3));
    eng.rollAndMove(std::make_pair(4, 4));
    eng.rollAndMove(std::make_pair(5, 5)); // in Jail now
    assert(eng.getPlayers()[0].inJail);

    // Jail turn 1: non-doubles -> stays
    TurnResult jr1 = eng.rollAndMove(std::make_pair(1, 2));
    assert(eng.getPlayers()[0].inJail);
    assert(jr1.dice1 == 1 &&
           jr1.dice2 == 2); // Dice are the jail-roll dice (no extra roll)
    assert(jr1.diceTotal == 3);
    std::cout << "  \u2713 Jail turn 1: Stays in jail, dice correctly those of "
                 "jail-roll.\n";

    // Jail turn 2: non-doubles -> stays
    TurnResult jr2 = eng.rollAndMove(std::make_pair(2, 3));
    assert(eng.getPlayers()[0].inJail);
    assert(eng.getPlayers()[0].inJail);
    assert(eng.getPlayers()[0].jailTurns == 2); // jailTurns incremented
    std::cout << "  \u2713 Jail turn 2: Still in jail.\n";

    // Jail turn 3: non-doubles -> released, moves with SAME dice
    TurnResult jr3 = eng.rollAndMove(std::make_pair(2, 4)); // dice=6
    assert(!eng.getPlayers()[0].inJail);
    assert(jr3.dice1 == 2 && jr3.dice2 == 4); // SAME jail dice, not re-rolled
    assert(jr3.diceTotal == 6);
    assert(jr3.newPosition == (9 + 6) % 36); // 15 = Amritsar
    std::cout << "  \u2713 Jail turn 3 (released by time): Moves with jail "
                 "dice (pos 9+6=15). No double-roll.\n";
  }

  // --- REGRESSION 4: Board data - Bombay=1, Darjeeling=23 ---
  {
    const auto &spaces = BusinessData::getBoardSpaces();
    assert(spaces[0].name == "START");
    assert(spaces[1].name == "Bombay");
    assert(spaces[9].name == "JAIL");
    assert(spaces[18].name == "CLUB");
    assert(spaces[23].name == "Darjeeling");
    assert(spaces[27].name == "REST HOUSE");
    assert(spaces[35].name == "Margoa");
    std::cout << "  \u2713 Board indices: START=0, Bombay=1, JAIL=9, CLUB=18, "
                 "Darjeeling=23, REST HOUSE=27, Margoa=35.\n";
  }

  // --- REGRESSION 5: Build requires ownership of the specific property ---
  {
    GameRules r;
    r.doublesRuleEnabled = false;
    r.defaultStartingMoney = 25000;
    r.requireLandingToBuild =
        false; // Turn off landing requirement to test ownership check only
    GameEngine eng(r);
    eng.addPlayer("Gamma", "green", "G");
    eng.startGame();

    // Complete first rotation (pos 0 -> 11 -> 36 = passed 36)
    eng.rollAndMove(std::make_pair(6, 5)); // pos 11
    eng.rollAndMove(
        std::make_pair(12, 13)); // pos (11+25)=36 -> 0 (passed start)
    assert(eng.getPlayers()[0].rotationsCompleted == 1);
    assert(eng.getPlayers()[0].money == 25000);

    // Try to build on Bombay which Gamma doesn't own
    bool builtUnowned = eng.buildHouseOrHotel(0, "bombay");
    assert(!builtUnowned); // Should fail - doesn't own it
    std::cout << "  \u2713 Build blocked: Player doesn't own the property.\n";
  }

  // --- REGRESSION 6: Per-player first rotation independence ---
  {
    GameRules r;
    r.doublesRuleEnabled = false;
    r.defaultStartingMoney = 20000;
    GameEngine eng(r);
    eng.addPlayer("P1", "red", "1");
    eng.addPlayer("P2", "blue", "2");
    eng.startGame();

    // Alternate turns: P1 gets past start, P2 does not

    eng.rollAndMove(std::make_pair(6, 6)); // P1: pos 12
    eng.rollAndMove(std::make_pair(3, 4)); // P2: pos 7
    eng.rollAndMove(std::make_pair(6, 6)); // P1: pos 24
    eng.rollAndMove(std::make_pair(1, 1)); // P2: pos 9
    eng.rollAndMove(
        std::make_pair(6, 5)); // P1: pos 35 (24+11=35, no start crossing)
    eng.rollAndMove(std::make_pair(2, 2)); // P2: pos 13 (9+4=13)
    eng.rollAndMove(
        std::make_pair(1, 2)); // P1: pos 2  (35+3=38%36=2, crosses start)

    assert(eng.getPlayers()[0].rotationsCompleted == 1);
    assert(eng.getPlayers()[0].money == 20000); // P1 got starting capital
    assert(eng.getPlayers()[1].rotationsCompleted ==
           0);                              // P2 still in first rotation
    assert(eng.getPlayers()[1].money == 0); // P2 gets nothing yet
    std::cout << "  \u2713 Per-player first rotation: P1 completed "
                 "(Rs.20,000), P2 still in rotation (Rs.0).\n";
  }

  // --- REGRESSION 7: Turn ownership enforcement ---
  {
    GameRules r;
    GameEngine eng(r);
    eng.addPlayer("P1", "red", "1");
    eng.addPlayer("P2", "blue", "2");
    eng.startGame();

    assert(eng.getActivePlayerIndex() == 0);
    // Player 1 tries to buy or decline when Player 0 is active
    assert(!eng.buyCurrentProperty(1));
    assert(!eng.declinePropertyPurchase(1));

    // In dev mode, can control any player
    eng.setDevMode(true);
    assert(eng.isDevMode());
    eng.setDevMode(false);
    assert(!eng.isDevMode());
    std::cout << "  \u2713 Turn ownership: Out-of-turn actions rejected unless "
                 "devMode.\n";
  }

  // --- REGRESSION 8: Bankruptcy, property transfer and Game Over ---
  {
    GameRules r;
    r.doublesRuleEnabled = false;
    GameEngine eng(r);
    eng.addPlayer("Rich", "red", "R");
    eng.addPlayer("Poor", "blue", "P");
    eng.startGame();

    auto &p1 = const_cast<Player &>(eng.getPlayers()[0]);
    auto &p2 = const_cast<Player &>(eng.getPlayers()[1]);
    p1.money = 50000;
    p1.rotationsCompleted = 1;
    p2.money = 10; // Only Rs.10
    p2.rotationsCompleted = 1;

    // Rich owns Bombay (pos 1, rent is 50-100)
    p1.ownedProperties.push_back("bombay");
    p2.ownedProperties.push_back("indore");

    // P1 moves first (e.g. 2, 3 -> pos 5), ending turn and advancing to P2
    eng.rollAndMove(std::make_pair(2, 3));
    assert(eng.getActivePlayerIndex() == 1);

    // P2 rolls 1 -> lands on Bombay (pos 1), owes rent, goes bankrupt
    eng.rollAndMove(std::make_pair(1, 0));
    assert(p2.isBankrupt);
    assert(eng.isGameOver());
    // Poor's property 'indore' transferred to Rich
    bool richGotIndore = false;
    for (const auto &prop : p1.ownedProperties) {
      if (prop == "indore")
        richGotIndore = true;
    }
    assert(richGotIndore);
    std::cout << "  \u2713 Bankruptcy: Debt eliminated player, transferred "
                 "properties, declared GAME_OVER.\n";
  }

  // --- REGRESSION 9: Activity log records chronological events ---
  {
    GameRules r;
    GameEngine eng(r);
    eng.addPlayer("Alice", "red", "A");
    eng.addPlayer("Bob", "blue", "B");
    eng.startGame();

    const auto &log = eng.getActivityLog();
    assert(!log.empty()); // turn_start logged
    assert(log[0].type == "turn_start");
    size_t initialLogSize = log.size();

    eng.rollAndMove(std::make_pair(1, 2));
    assert(eng.getActivityLog().size() > initialLogSize);
    // Monotonic IDs
    for (size_t i = 1; i < eng.getActivityLog().size(); ++i) {
      assert(eng.getActivityLog()[i].id > eng.getActivityLog()[i - 1].id);
    }
    std::cout << "  \u2713 Activity Log: Events recorded chronologically with "
                 "monotonic IDs.\n";
  }

  // --- REGRESSION 10: Turn timer timeout handling ---
  {
    GameRules r;
    r.timerEnabled = true;
    r.timerSeconds = 60;
    GameEngine eng(r);
    eng.addPlayer("T1", "red", "1");
    eng.addPlayer("T2", "blue", "2");
    eng.startGame();

    assert(eng.getActivePlayerIndex() == 0);
    // Early timeout without devMode should be rejected (remainingSeconds > 0)
    assert(!eng.handleTimeout(0));
    assert(eng.getActivePlayerIndex() == 0);

    // Forced timeout with devMode
    eng.setDevMode(true);
    bool timeoutSuccess = eng.handleTimeout(0);
    assert(timeoutSuccess);
    // Turn advanced to T2
    assert(eng.getActivePlayerIndex() == 1);
    std::cout << "  ✓ Turn timer: Early timeouts rejected authoritatively; "
                 "timeouts skip turn.\n";
  }

  // --- REGRESSION 11: Anywhere-building rule & 50% Destroy refund ---
  {
    GameRules r;
    r.requireLandingToBuild = false; // New rule: build from anywhere
    r.buildingRefundPercentage = 50; // 50% refund on destroy
    GameEngine eng(r);
    eng.addPlayer("Builder", "blue", "B");
    eng.addPlayer("Other", "red", "O");
    eng.startGame();

    // Give Builder the full Blue group: agra, kanpur, patna, indore, jaipur
    eng.getPlayersMutable()[0].rotationsCompleted = 1;
    eng.getPlayersMutable()[0].money = 50000;
    eng.getPlayersMutable()[0].ownedProperties.push_back("agra");
    eng.getPlayersMutable()[0].ownedProperties.push_back("kanpur");
    eng.getPlayersMutable()[0].ownedProperties.push_back("patna");
    eng.getPlayersMutable()[0].ownedProperties.push_back("indore");
    eng.getPlayersMutable()[0].ownedProperties.push_back("jaipur");
    eng.getPlayersMutable()[0].position =
        0; // Builder is at Start, NOT on agra/kanpur/patna!

    // Anywhere building: should succeed even while at Start (pos 0)
    auto patna = BusinessData::getCityPropertyById("patna");
    assert(patna.has_value());
    int patnaBuildCost = patna->buildingCost;
    int cashBefore = eng.getPlayers()[0].money;

    bool buildSuccess = eng.buildHouseOrHotel(0, "patna");
    assert(buildSuccess);
    assert(eng.getPlayersMutable()[0].buildings["patna"] == 1);
    assert(eng.getPlayers()[0].money == cashBefore - patnaBuildCost);

    // Build second house from anywhere
    buildSuccess = eng.buildHouseOrHotel(0, "patna");
    assert(buildSuccess);
    assert(eng.getPlayersMutable()[0].buildings["patna"] == 2);

    // Now destroy one house: 50% refund
    int cashBeforeDestroy = eng.getPlayers()[0].money;
    int expectedRefund = ((patnaBuildCost * 50 / 100 + 99) / 100) * 100;
    bool destroySuccess = eng.sellHouseOrHotel(0, "patna");
    assert(destroySuccess);
    assert(eng.getPlayersMutable()[0].buildings["patna"] == 1);
    assert(eng.getPlayers()[0].money == cashBeforeDestroy + expectedRefund);

    // Cannot destroy when 0 buildings remain
    eng.sellHouseOrHotel(0, "patna"); // now 0
    assert(eng.getPlayersMutable()[0].buildings["patna"] == 0);
    bool invalidDestroy = eng.sellHouseOrHotel(0, "patna"); // already 0!
    assert(!invalidDestroy);

    std::cout << "  ✓ Anywhere-building: Constructed from space 0; Destroy "
                 "refunded 50% of cost.\n";
  }

  // --- REGRESSION: Building without full color group & 3-property rent bonus ---
  {
    GameEngine eng;
    eng.addPlayer("Builder", "blue", "B");
    eng.addPlayer("Tenant", "red", "T");
    eng.startGame();
    eng.setDevMode(true);

    auto& p0 = eng.getPlayersMutable()[0];
    p0.rotationsCompleted = 1;
    p0.money = 50000;
    // Own only 1 property in Blue group ("patna")
    p0.ownedProperties.push_back("patna");

    auto patna = BusinessData::getCityPropertyById("patna");
    assert(patna.has_value());
    int baseRent = patna->baseRent;

    // 1. Rent with only 1 property owned: base rent
    assert(eng.calculateRent("patna", 7) == baseRent);

    // 2. Build on "patna" even though complete group is NOT owned
    bool build1 = eng.buildHouseOrHotel(0, "patna");
    assert(build1);
    assert(p0.buildings["patna"] == 1);
    assert(eng.calculateRent("patna", 7) == patna->rentOneHouse);

    // Sell building back to test undeveloped rent bonus
    eng.sellHouseOrHotel(0, "patna");
    assert(p0.buildings["patna"] == 0);

    // Add 2nd property in Blue group ("agra") -> 2 owned
    p0.ownedProperties.push_back("agra");
    assert(eng.playerOwnedCountInGroup(0, ColorGroup::Blue) == 2);
    assert(eng.calculateRent("patna", 7) == baseRent); // Still base rent

    // Add 3rd property in Blue group ("kanpur") -> 3 owned!
    p0.ownedProperties.push_back("kanpur");
    assert(eng.playerOwnedCountInGroup(0, ColorGroup::Blue) == 3);
    assert(eng.calculateRent("patna", 7) == baseRent * 2); // Doubled undeveloped rent!

    // Mortgaged property cannot be built on
    p0.mortgages["patna"] = true;
    bool buildMortgaged = eng.buildHouseOrHotel(0, "patna");
    assert(!buildMortgaged); // Rejected!
    p0.mortgages["patna"] = false;

    std::cout << "  ✓ Rule Verified: Building allowed without full color group; "
                 "Rent doubled when owning 3 properties in group.\n";
  }

  // --- REGRESSION 12: Feature 1: Property Trading & Negotiation ---
  {
    GameEngine eng;
    eng.addPlayer("Alice", "saffron", "A");
    eng.addPlayer("Bob", "teal", "B");
    eng.addPlayer("Charlie", "plum", "C");
    eng.startGame();
    eng.setDevMode(true);

    auto& pAlice = eng.getPlayersMutable()[0];
    auto& pBob = eng.getPlayersMutable()[1];
    auto& pCharlie = eng.getPlayersMutable()[2];

    pAlice.money = 10000;
    pBob.money = 5000;
    pCharlie.money = 8000;
    pAlice.ownedProperties = {"bombay", "madras"};
    pBob.ownedProperties = {"delhi"};
    pCharlie.ownedProperties = {"agra"};

    // 1. Rejected if sender does not own property
    std::string err;
    std::string fakeTrade = eng.createTradeOffer(0, 1, {"delhi"}, 0, {"delhi"}, 0, err);
    assert(fakeTrade.empty());
    assert(!err.empty());

    // 2. Rejected if sender has insufficient cash
    std::string brokeTrade = eng.createTradeOffer(0, 1, {"bombay"}, 50000, {"delhi"}, 0, err);
    assert(brokeTrade.empty());

    // 3. Valid trade: Alice gives bombay + 1000 cash for Bob's delhi + 500 cash
    std::string trade1 = eng.createTradeOffer(0, 1, {"bombay"}, 1000, {"delhi"}, 500, err);
    assert(!trade1.empty());

    // Create a simultaneous conflicting trade: Alice offers bombay to Charlie too!
    std::string tradeConflict = eng.createTradeOffer(0, 2, {"bombay"}, 0, {"agra"}, 0, err);
    assert(!tradeConflict.empty());

    // Bob accepts trade1
    bool acceptOk = eng.acceptTradeOffer(1, trade1, err);
    assert(acceptOk);

    // Verify atomic ownership swap
    assert(std::find(pAlice.ownedProperties.begin(), pAlice.ownedProperties.end(), "delhi") != pAlice.ownedProperties.end());
    assert(std::find(pAlice.ownedProperties.begin(), pAlice.ownedProperties.end(), "bombay") == pAlice.ownedProperties.end());
    assert(std::find(pBob.ownedProperties.begin(), pBob.ownedProperties.end(), "bombay") != pBob.ownedProperties.end());
    assert(std::find(pBob.ownedProperties.begin(), pBob.ownedProperties.end(), "delhi") == pBob.ownedProperties.end());

    // Verify cash swap: Alice gave 1000, got 500 (net -500: 10000 -> 9500)
    // Bob gave 500, got 1000 (net +500: 5000 -> 5500)
    assert(pAlice.money == 9500);
    assert(pBob.money == 5500);

    // Verify conflicting trade was automatically INVALIDATED because Alice no longer owns bombay
    const auto& trades = eng.getTradeOffers();
    auto conflictIt = std::find_if(trades.begin(), trades.end(),
                                  [&tradeConflict](const TradeOffer& o) { return o.id == tradeConflict; });
    assert(conflictIt != trades.end());
    assert(conflictIt->status == "INVALIDATED");

    std::cout << "  ✓ Feature 1: Property trading validated, applied atomically, and conflicting offers invalidated.\n";
  }

  // --- REGRESSION 13: Feature 4: Dedicated Mortgage & Redemption validation ---
  {
    GameEngine eng;
    eng.addPlayer("Owner", "saffron", "O");
    eng.addPlayer("Opponent", "teal", "P");
    eng.startGame();
    eng.setDevMode(true);

    auto& p = eng.getPlayersMutable()[0];
    p.money = 1000;
    p.ownedProperties = {"bombay"};

    auto bombay = BusinessData::getCityPropertyById("bombay");
    assert(bombay.has_value());
    int mVal = bombay->mortgageValue; // 4300
    int redemption = ((mVal + (mVal * 10 / 100) + 99) / 100) * 100; // 4300 + 430 = 4730 -> rounded to 4800

    // Mortgage Bombay
    bool mOk = eng.mortgageProperty(0, "bombay");
    assert(mOk);
    assert(p.mortgages["bombay"]);
    assert(p.money == 1000 + mVal); // 5300

    // Try to unmortgage when cash is less than redemption:
    p.money = 2000; // Less than 4800
    bool unOkFail = eng.unmortgageProperty(0, "bombay");
    assert(!unOkFail);
    assert(p.mortgages["bombay"]);

    // Give sufficient cash and unmortgage
    p.money = 5000;
    bool unOkPass = eng.unmortgageProperty(0, "bombay");
    assert(unOkPass);
    assert(!p.mortgages["bombay"]);
    assert(p.money == 5000 - redemption);

    std::cout << "  ✓ Feature 4: Mortgage and redemption values, 10% fee, and fund validation verified.\n";
  }

  // --- REGRESSION 14: Feature 3: Host Session End ---
  {
    GameEngine eng;
    eng.addPlayer("Host", "saffron", "H");
    eng.addPlayer("Guest", "teal", "G");
    eng.startGame();
    assert(!eng.isGameOver());

    eng.endSession();
    assert(eng.isGameOver());
    assert(eng.getTurnState() == TurnState::GAME_OVER);
    std::cout << "  ✓ Feature 3: Host controls endSession terminates session authoritatively.\n";
  }

  std::cout << "\nALL REGRESSION TESTS PASSED!\n";
}

// ============================================================
// JSON UTILITIES & SERVER MODE
// ============================================================

static std::string turnResultToJson(const TurnResult &r) {
  std::ostringstream ss;
  ss << "{"
     << "\"playerId\":" << r.playerId << ","
     << "\"dice1\":" << r.dice1 << ","
     << "\"dice2\":" << r.dice2 << ","
     << "\"diceTotal\":" << r.diceTotal << ","
     << "\"isDouble\":" << (r.isDouble ? "true" : "false") << ","
     << "\"extraTurnGranted\":" << (r.extraTurnGranted ? "true" : "false") << ","
     << "\"previousPosition\":" << r.previousPosition << ","
     << "\"newPosition\":" << r.newPosition << ","
     << "\"spaceName\":\"" << escapeJson(r.spaceName) << "\","
     << "\"spaceType\":\"" << spaceTypeToString(r.spaceType) << "\","
     << "\"eventDescription\":\"" << escapeJson(r.eventDescription) << "\","
     << "\"moneyChange\":" << r.moneyChange << ","
     << "\"passStartBonusAwarded\":"
     << (r.passStartBonusAwarded ? "true" : "false") << ","
     << "\"startingCapitalAwarded\":"
     << (r.startingCapitalAwarded ? "true" : "false") << ","
     << "\"mustGoToJail\":" << (r.mustGoToJail ? "true" : "false") << ","
     << "\"mustGoToRestHouse\":" << (r.mustGoToRestHouse ? "true" : "false")
     << ","
     << "\"eligibleToBuy\":" << (r.eligibleToBuy ? "true" : "false") << ","
     << "\"purchasablePropertyId\":\"" << escapeJson(r.purchasablePropertyId)
     << "\","
     << "\"purchasePrice\":" << r.purchasePrice << ","
     << "\"rentPaid\":" << (r.rentPaid ? "true" : "false") << ","
     << "\"rentAmount\":" << r.rentAmount << ","
     << "\"rentRecipientId\":" << r.rentRecipientId << "}";
  return ss.str();
}

static std::string getJsonStringField(const std::string &json,
                                      const std::string &field) {
  std::string key = "\"" + field + "\"";
  size_t pos = json.find(key);
  if (pos == std::string::npos)
    return "";
  pos = json.find(':', pos + key.length());
  if (pos == std::string::npos)
    return "";
  pos = json.find('"', pos);
  if (pos == std::string::npos)
    return "";
  size_t end = json.find('"', pos + 1);
  if (end == std::string::npos)
    return "";
  return json.substr(pos + 1, end - pos - 1);
}

static int getJsonIntField(const std::string &json, const std::string &field,
                           int defaultVal = 0) {
  std::string key = "\"" + field + "\"";
  size_t pos = json.find(key);
  if (pos == std::string::npos)
    return defaultVal;
  pos = json.find(':', pos + key.length());
  if (pos == std::string::npos)
    return defaultVal;
  size_t start = json.find_first_of("-0123456789", pos);
  if (start == std::string::npos)
    return defaultVal;
  size_t end = json.find_first_not_of("-0123456789", start);
  return std::stoi(json.substr(start, end - start));
}

static bool getJsonBoolField(const std::string &json, const std::string &field,
                             bool defaultVal = false) {
  std::string key = "\"" + field + "\"";
  size_t pos = json.find(key);
  if (pos == std::string::npos)
    return defaultVal;
  pos = json.find(':', pos + key.length());
  if (pos == std::string::npos)
    return defaultVal;
  if (json.find("true", pos) != std::string::npos &&
      json.find("true", pos) < pos + 10)
    return true;
  if (json.find("false", pos) != std::string::npos &&
      json.find("false", pos) < pos + 10)
    return false;
  return defaultVal;
}

static std::vector<std::string> getJsonStringArrayField(const std::string &json,
                                                        const std::string &field) {
  std::vector<std::string> result;
  std::string key = "\"" + field + "\"";
  size_t pos = json.find(key);
  if (pos == std::string::npos)
    return result;
  size_t openBracket = json.find('[', pos + key.length());
  if (openBracket == std::string::npos)
    return result;
  size_t closeBracket = json.find(']', openBracket);
  if (closeBracket == std::string::npos)
    return result;

  size_t curr = openBracket + 1;
  while (curr < closeBracket) {
    size_t q1 = json.find('"', curr);
    if (q1 == std::string::npos || q1 >= closeBracket)
      break;
    size_t q2 = json.find('"', q1 + 1);
    if (q2 == std::string::npos || q2 > closeBracket)
      break;
    result.push_back(json.substr(q1 + 1, q2 - q1 - 1));
    curr = q2 + 1;
  }
  return result;
}

static std::string toCompactJson(const std::string &input) {
  std::string out;
  bool inQuotes = false;
  for (size_t i = 0; i < input.size(); ++i) {
    char c = input[i];
    if (c == '"' && (i == 0 || input[i - 1] != '\\')) {
      inQuotes = !inQuotes;
      out += c;
    } else if (inQuotes) {
      out += c;
    } else {
      if (c != '\n' && c != '\r' && c != '\t') {
        out += c;
      }
    }
  }
  return out;
}

static void dispatchServerCommand(std::unique_ptr<GameEngine> &engine,
                                  const std::string &line) {
  if (line.empty())
    return;
  std::string action = getJsonStringField(line, "action");
  if (action.empty()) {
    size_t spacePos = line.find(' ');
    if (spacePos != std::string::npos)
      action = line.substr(0, spacePos);
    else
      action = line;
  }

  if (action == "status") {
    std::cout << "{\"ok\":true,\"connected\":true,\"version\":\"1.0.0\","
                 "\"engine\":\"Crownfall C++ Native Engine\"}\n"
              << std::flush;
    return;
  }

  if (action == "init" || action == "reset" || action == "start" || action == "resetToLobby") {
    int startingMoney = getJsonIntField(line, "startingMoney", 25000);
    if (line.find("\"defaultStartingMoney\"") != std::string::npos) {
      startingMoney = getJsonIntField(line, "defaultStartingMoney", startingMoney);
    }
    bool doubles = getJsonBoolField(line, "doubles", true);
    if (line.find("\"doublesRuleEnabled\"") != std::string::npos) {
      doubles = getJsonBoolField(line, "doublesRuleEnabled", doubles);
    }
    bool timerEnabled = getJsonBoolField(line, "timerEnabled", false);
    int timerSeconds = getJsonIntField(line, "timerSeconds", 60);
    bool devMode = getJsonBoolField(line, "devMode", false);

    GameRules r;
    r.defaultStartingMoney = startingMoney;
    r.doublesRuleEnabled = doubles;
    r.timerEnabled = timerEnabled;
    r.timerSeconds = timerSeconds;
    engine = std::make_unique<GameEngine>(r);

    int playerCount = getJsonIntField(line, "playerCount", 4);
    if (playerCount < 2)
      playerCount = 2;
    if (playerCount > 6)
      playerCount = 6;
    bool isMp = getJsonBoolField(line, "isMultiplayer", false) || (line.find("\"multiplayer\"") != std::string::npos);

    // Check if players array exists
    size_t playersPos = line.find("\"players\"");
    std::vector<std::tuple<std::string, std::string, std::string, bool>> parsedPlayers;

    if (playersPos != std::string::npos) {
      size_t openBracket = line.find('[', playersPos);
      size_t closeBracket = (openBracket != std::string::npos) ? line.find(']', openBracket) : std::string::npos;
      if (openBracket != std::string::npos && closeBracket != std::string::npos) {
        size_t curr = openBracket + 1;
        while (curr < closeBracket) {
          size_t objStart = line.find('{', curr);
          if (objStart == std::string::npos || objStart >= closeBracket) break;
          size_t objEnd = line.find('}', objStart);
          if (objEnd == std::string::npos || objEnd > closeBracket) break;
          std::string objStr = line.substr(objStart, objEnd - objStart + 1);

          std::string name = getJsonStringField(objStr, "name");
          std::string color = getJsonStringField(objStr, "color");
          std::string token = getJsonStringField(objStr, "token");
          bool isHuman = getJsonBoolField(objStr, "isHuman", true);

          parsedPlayers.push_back(std::make_tuple(name, color, token, isHuman));
          curr = objEnd + 1;
        }
      }
    }

    if (!parsedPlayers.empty()) {
      for (size_t i = 0; i < parsedPlayers.size() && i < 6; ++i) {
        const auto& [name, color, token, isHuman] = parsedPlayers[i];
        std::string finalName = name.empty() ? ("Player " + std::to_string(i + 1)) : name;
        std::string finalColor = color.empty() ? ((i == 0) ? "saffron" : (i == 1) ? "teal" : (i == 2) ? "plum" : (i == 3) ? "blue" : (i == 4) ? "gold" : "purple") : color;
        std::string finalToken = token.empty() ? std::to_string(i + 1) : token;
        engine->addPlayer(finalName, finalColor, finalToken, isHuman);
      }
    } else {
      for (int i = 0; i < playerCount; ++i) {
        std::string nameField = "p" + std::to_string(i + 1) + "Name";
        std::string colorField = "p" + std::to_string(i + 1) + "Color";
        std::string humanField = "p" + std::to_string(i + 1) + "IsHuman";

        std::string name = getJsonStringField(line, nameField);
        if (name.empty() && i == 0) name = getJsonStringField(line, "playerName");
        if (name.empty()) name = "Player " + std::to_string(i + 1);

        std::string defColor = (i == 0) ? "saffron" : (i == 1) ? "teal" : (i == 2) ? "plum" : (i == 3) ? "blue" : (i == 4) ? "gold" : "purple";
        std::string color = getJsonStringField(line, colorField);
        if (color.empty()) color = defColor;

        bool isHuman = true;
        if (line.find("\"" + humanField + "\"") != std::string::npos) {
          isHuman = getJsonBoolField(line, humanField, true);
        } else if (isMp) {
          isHuman = true;
        } else {
          if (name.find("Bot") != std::string::npos || name.find("bot") != std::string::npos) {
            isHuman = false;
          } else if (i == 0) {
            isHuman = true;
          } else {
            isHuman = false;
          }
        }
        engine->addPlayer(name, color, std::to_string(i + 1), isHuman);
      }
    }
    bool inLobby = getJsonBoolField(line, "inLobby", true);
    if (action == "start") {
      inLobby = false;
    }
    if (action == "resetToLobby") {
      inLobby = true;
    }
    if (line.find("\"startGame\"") != std::string::npos && getJsonBoolField(line, "startGame", false)) {
      inLobby = false;
    }
    if (!inLobby) {
      engine->startGame();
    }
    engine->setDevMode(devMode);

    std::cout << "{\"ok\":true,\"state\":"
              << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
    return;
  }

  if (!engine) {
    std::cout << "{\"ok\":false,\"error\":\"Engine not initialized\"}\n"
              << std::flush;
    return;
  }

  if (action == "updateRules") {
    int requesterId = getJsonIntField(line, "requesterId", 0);
    if (engine->isGameStarted()) {
      std::cout << "{\"ok\":false,\"error\":\"Cannot modify game rules: Settings are permanently locked while game is in progress.\"}\n"
                << std::flush;
      return;
    }
    if (requesterId != 0) {
      std::cout << "{\"ok\":false,\"error\":\"Only the host (Player 1) can configure game rules.\"}\n"
                << std::flush;
      return;
    }
    GameRules r = engine->getRules();
    if (line.find("\"defaultStartingMoney\"") != std::string::npos) {
      r.defaultStartingMoney = getJsonIntField(line, "defaultStartingMoney", r.defaultStartingMoney);
    } else if (line.find("\"startingMoney\"") != std::string::npos) {
      r.defaultStartingMoney = getJsonIntField(line, "startingMoney", r.defaultStartingMoney);
    }
    if (line.find("\"doublesRuleEnabled\"") != std::string::npos) {
      r.doublesRuleEnabled = getJsonBoolField(line, "doublesRuleEnabled", r.doublesRuleEnabled);
    } else if (line.find("\"doubles\"") != std::string::npos) {
      r.doublesRuleEnabled = getJsonBoolField(line, "doubles", r.doublesRuleEnabled);
    }
    if (line.find("\"timerEnabled\"") != std::string::npos) {
      r.timerEnabled = getJsonBoolField(line, "timerEnabled", r.timerEnabled);
    }
    if (line.find("\"timerSeconds\"") != std::string::npos) {
      r.timerSeconds = getJsonIntField(line, "timerSeconds", r.timerSeconds);
    }
    if (line.find("\"maxPlayers\"") != std::string::npos) {
      r.maxPlayers = getJsonIntField(line, "maxPlayers", r.maxPlayers);
    }
    std::string err;
    if (!engine->updateRules(r, requesterId, err)) {
      std::cout << "{\"ok\":false,\"error\":\"" << escapeJson(err) << "\"}\n"
                << std::flush;
      return;
    }
    std::cout << "{\"ok\":true,\"state\":" << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
    return;
  }

  if (action == "startGame") {
    int requesterId = getJsonIntField(line, "requesterId", 0);
    if (requesterId != 0) {
      std::cout << "{\"ok\":false,\"error\":\"Only the host (Player 1) can start the game.\"}\n"
                << std::flush;
      return;
    }
    if (engine->isGameStarted()) {
      std::cout << "{\"ok\":true,\"alreadyStarted\":true,\"state\":" << toCompactJson(engine->exportStateJson()) << "}\n"
                << std::flush;
      return;
    }
    int pCount = getJsonIntField(line, "playerCount", 0);
    if (pCount >= 2 && pCount <= 6 && static_cast<int>(engine->getPlayers().size()) != pCount) {
      GameRules curRules = engine->getRules();
      auto newEngine = std::make_unique<GameEngine>(curRules);
      for (int i = 0; i < pCount; ++i) {
        std::string pName = (i == 0) ? "Player 1" : "Player " + std::to_string(i + 1);
        std::string pColor = (i == 0) ? "saffron" : (i == 1) ? "teal" : (i == 2) ? "plum" : (i == 3) ? "blue" : (i == 4) ? "gold" : "purple";
        bool isH = (i < static_cast<int>(engine->getPlayers().size())) ? engine->getPlayers()[i].isHuman : true;
        newEngine->addPlayer(pName, pColor, std::to_string(i + 1), isH);
      }
      engine = std::move(newEngine);
    }
    std::set<std::string> seenColors;
    for (const auto& p : engine->getPlayers()) {
      std::string c = p.color;
      std::transform(c.begin(), c.end(), c.begin(), ::tolower);
      if (c.empty() || seenColors.count(c)) {
        std::cout << "{\"ok\":false,\"error\":\"Cannot start game: Duplicate player color '"
                  << escapeJson(c) << "' detected. All participating players must have distinct colors.\"}\n"
                  << std::flush;
        return;
      }
      seenColors.insert(c);
    }
    engine->startGame();
    std::cout << "{\"ok\":true,\"state\":" << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
    return;
  }

  if (action == "updatePlayerColor") {
    int playerId = getJsonIntField(line, "playerId", -1);
    std::string color = getJsonStringField(line, "newColor");
    if (color.empty()) {
      color = getJsonStringField(line, "color");
    }
    std::string err;
    if (!engine->updatePlayerColor(playerId, color, err)) {
      std::cout << "{\"ok\":false,\"error\":\"" << escapeJson(err) << "\"}\n"
                << std::flush;
      return;
    }
    std::cout << "{\"ok\":true,\"state\":" << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
    return;
  }

  if (action == "updatePlayerName") {
    int playerId = getJsonIntField(line, "playerId", -1);
    std::string name = getJsonStringField(line, "newName");
    if (name.empty()) {
      name = getJsonStringField(line, "name");
    }
    engine->updatePlayerName(playerId, name);
    std::cout << "{\"ok\":true,\"state\":" << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
    return;
  }

  if (action == "roll" || action == "rollRigged") {
    int playerId = getJsonIntField(line, "playerId", -1);
    if (!engine->isDevMode() && playerId >= 0 &&
        playerId != engine->getActivePlayerIndex()) {
      std::cout << "{\"ok\":false,\"error\":\"Not your turn. Active player is "
                << engine->getActivePlayerIndex()
                << "\",\"state\":" << toCompactJson(engine->exportStateJson())
                << "}\n"
                << std::flush;
      return;
    }
    if (engine->getTurnState() != TurnState::WAITING_FOR_ROLL &&
        engine->getTurnState() != TurnState::EXTRA_TURN) {
      std::cout << "{\"ok\":false,\"error\":\"Cannot roll in current "
                   "state\",\"state\":"
                << toCompactJson(engine->exportStateJson()) << "}\n"
                << std::flush;
      return;
    }
    int d1 = getJsonIntField(line, "d1", 0);
    if (d1 == 0 && line.find("\"dice1\"") != std::string::npos) {
      d1 = getJsonIntField(line, "dice1", 0);
    }
    int d2 = getJsonIntField(line, "d2", 0);
    if (d2 == 0 && line.find("\"dice2\"") != std::string::npos) {
      d2 = getJsonIntField(line, "dice2", 0);
    }
    bool hasRiggedDice = (d1 >= 1 && d1 <= 6 && d2 >= 1 && d2 <= 6);
    if (hasRiggedDice && !engine->isDevMode()) {
      std::cout << "{\"ok\":false,\"error\":\"Rigged dice only allowed in dev mode\",\"state\":"
                << toCompactJson(engine->exportStateJson()) << "}\n"
                << std::flush;
      return;
    }
    TurnResult tr = hasRiggedDice
                        ? engine->rollAndMove(std::make_pair(d1, d2))
                        : engine->rollAndMove();
    std::cout << "{\"ok\":true,\"result\":" << turnResultToJson(tr)
              << ",\"state\":" << toCompactJson(engine->exportStateJson())
              << "}\n"
              << std::flush;
  } else if (action == "buy" || action == "buyCurrentProperty") {
    int playerId =
        getJsonIntField(line, "playerId", engine->getActivePlayerIndex());
    if (!engine->isDevMode() && playerId != engine->getActivePlayerIndex()) {
      std::cout << "{\"ok\":false,\"error\":\"Not your turn\",\"state\":"
                << toCompactJson(engine->exportStateJson()) << "}\n"
                << std::flush;
      return;
    }
    if (!engine->getLastTurnResult().eligibleToBuy) {
      std::cout
          << "{\"ok\":false,\"error\":\"No pending purchase action\",\"state\":"
          << toCompactJson(engine->exportStateJson()) << "}\n"
          << std::flush;
      return;
    }
    bool success = engine->buyCurrentProperty(playerId);
    std::cout << "{\"ok\":" << (success ? "true" : "false")
              << ",\"state\":" << toCompactJson(engine->exportStateJson())
              << "}\n"
              << std::flush;
  } else if (action == "decline" || action == "declinePropertyPurchase") {
    int playerId =
        getJsonIntField(line, "playerId", engine->getActivePlayerIndex());
    if (!engine->isDevMode() && playerId != engine->getActivePlayerIndex()) {
      std::cout << "{\"ok\":false,\"error\":\"Not your turn\",\"state\":"
                << toCompactJson(engine->exportStateJson()) << "}\n"
                << std::flush;
      return;
    }
    if (!engine->getLastTurnResult().eligibleToBuy) {
      std::cout
          << "{\"ok\":false,\"error\":\"No pending purchase action\",\"state\":"
          << toCompactJson(engine->exportStateJson()) << "}\n"
          << std::flush;
      return;
    }
    bool success = engine->declinePropertyPurchase(playerId);
    std::cout << "{\"ok\":" << (success ? "true" : "false")
              << ",\"state\":" << toCompactJson(engine->exportStateJson())
              << "}\n"
              << std::flush;
  } else if (action == "endTurn") {
    int playerId =
        getJsonIntField(line, "playerId", engine->getActivePlayerIndex());
    if (!engine->isDevMode() && playerId != engine->getActivePlayerIndex()) {
      std::cout << "{\"ok\":false,\"error\":\"Not your turn\",\"state\":"
                << toCompactJson(engine->exportStateJson()) << "}\n"
                << std::flush;
      return;
    }
    std::string err;
    bool ok = engine->endTurn(playerId, err);
    std::cout << "{\"ok\":" << (ok ? "true" : "false")
              << (ok ? "" : ",\"error\":\"" + escapeJson(err) + "\"")
              << ",\"state\":"
              << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
  } else if (action == "timeout") {
    int playerId = getJsonIntField(line, "playerId", -1);
    bool success = engine->handleTimeout(playerId);
    std::cout << "{\"ok\":" << (success ? "true" : "false")
              << ",\"state\":" << toCompactJson(engine->exportStateJson())
              << "}\n"
              << std::flush;
  } else if (action == "setDevMode") {
    int requesterId = getJsonIntField(line, "requesterId", 0);
    if (requesterId != 0) {
      std::cout << "{\"ok\":false,\"error\":\"Only the host (Player 0) can modify Dev Mode setting.\"}\n"
                << std::flush;
      return;
    }
    if (engine->isGameStarted()) {
      std::cout << "{\"ok\":false,\"error\":\"Cannot modify Dev Mode: Game settings are permanently locked while match is in progress.\",\"state\":"
                << toCompactJson(engine->exportStateJson()) << "}\n"
                << std::flush;
      return;
    }
    bool enabled = getJsonBoolField(line, "enabled", false);
    engine->setDevMode(enabled);
    std::cout << "{\"ok\":true,\"devMode\":" << (enabled ? "true" : "false")
              << ",\"state\":" << toCompactJson(engine->exportStateJson())
              << "}\n"
              << std::flush;
  } else if (action == "setActivePlayer") {
    if (!engine->isDevMode()) {
      std::cout << "{\"ok\":false,\"error\":\"Setting active player requires Dev Mode.\"}\n"
                << std::flush;
      return;
    }
    int playerId = getJsonIntField(line, "playerId", 0);
    bool ok = engine->setActivePlayerIndex(playerId);
    std::cout << "{\"ok\":" << (ok ? "true" : "false")
              << ",\"state\":" << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
  } else if (action == "setTimer") {
    bool enabled = getJsonBoolField(line, "enabled", false);
    int seconds = getJsonIntField(line, "seconds", 60);
    engine->setTimerConfig(enabled, seconds);
    std::cout << "{\"ok\":true,\"state\":"
              << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
  } else if (action == "build") {
    int playerId =
        getJsonIntField(line, "playerId", engine->getActivePlayerIndex());
    std::string propId = getJsonStringField(line, "propertyId");
    bool success = engine->buildHouseOrHotel(playerId, propId);
    std::cout << "{\"ok\":" << (success ? "true" : "false")
              << ",\"state\":" << toCompactJson(engine->exportStateJson())
              << "}\n"
              << std::flush;
  } else if (action == "sell") {
    int playerId =
        getJsonIntField(line, "playerId", engine->getActivePlayerIndex());
    std::string propId = getJsonStringField(line, "propertyId");
    bool success = engine->sellHouseOrHotel(playerId, propId);
    std::cout << "{\"ok\":" << (success ? "true" : "false")
              << ",\"state\":" << toCompactJson(engine->exportStateJson())
              << "}\n"
              << std::flush;
  } else if (action == "sellProperty") {
    int playerId =
        getJsonIntField(line, "playerId", engine->getActivePlayerIndex());
    std::string propId = getJsonStringField(line, "propertyId");
    int sellPrice = 0;
    bool success = engine->sellProperty(playerId, propId, sellPrice);
    std::cout << "{\"ok\":" << (success ? "true" : "false")
              << ",\"sellPrice\":" << sellPrice
              << (success ? "" : ",\"error\":\"Transaction rejected: property not owned, invalid property ID, or sale conditions unmet.\"")
              << ",\"state\":" << toCompactJson(engine->exportStateJson())
              << "}\n"
              << std::flush;
  } else if (action == "mortgage") {
    int playerId =
        getJsonIntField(line, "playerId", engine->getActivePlayerIndex());
    std::string propId = getJsonStringField(line, "propertyId");
    bool success = engine->mortgageProperty(playerId, propId);
    std::cout << "{\"ok\":" << (success ? "true" : "false")
              << ",\"state\":" << toCompactJson(engine->exportStateJson())
              << "}\n"
              << std::flush;
  } else if (action == "unmortgage") {
    int playerId =
        getJsonIntField(line, "playerId", engine->getActivePlayerIndex());
    std::string propId = getJsonStringField(line, "propertyId");
    bool success = engine->unmortgageProperty(playerId, propId);
    std::cout << "{\"ok\":" << (success ? "true" : "false")
              << ",\"state\":" << toCompactJson(engine->exportStateJson())
              << "}\n"
              << std::flush;
  } else if (action == "tradeCreate") {
    int senderId = getJsonIntField(line, "senderId", engine->getActivePlayerIndex());
    int receiverId = getJsonIntField(line, "receiverId", -1);
    int senderCash = getJsonIntField(line, "senderCash", 0);
    int receiverCash = getJsonIntField(line, "receiverCash", 0);
    auto senderProps = getJsonStringArrayField(line, "senderProps");
    if (senderProps.empty()) senderProps = getJsonStringArrayField(line, "senderPropertyIds");
    auto receiverProps = getJsonStringArrayField(line, "receiverProps");
    if (receiverProps.empty()) receiverProps = getJsonStringArrayField(line, "receiverPropertyIds");
    std::string err;
    std::string tradeId = engine->createTradeOffer(senderId, receiverId, senderProps, senderCash, receiverProps, receiverCash, err);
    bool ok = !tradeId.empty();
    std::cout << "{\"ok\":" << (ok ? "true" : "false")
              << ",\"tradeId\":\"" << escapeJson(tradeId) << "\""
              << (ok ? "" : ",\"error\":\"" + escapeJson(err) + "\"")
              << ",\"state\":" << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
  } else if (action == "tradeAccept") {
    int playerId = getJsonIntField(line, "playerId", engine->getActivePlayerIndex());
    std::string tradeId = getJsonStringField(line, "tradeId");
    std::string err;
    bool ok = engine->acceptTradeOffer(playerId, tradeId, err);
    std::cout << "{\"ok\":" << (ok ? "true" : "false")
              << (ok ? "" : ",\"error\":\"" + escapeJson(err) + "\"")
              << ",\"state\":" << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
  } else if (action == "tradeReject") {
    int playerId = getJsonIntField(line, "playerId", engine->getActivePlayerIndex());
    std::string tradeId = getJsonStringField(line, "tradeId");
    bool ok = engine->rejectTradeOffer(playerId, tradeId);
    std::cout << "{\"ok\":" << (ok ? "true" : "false")
              << ",\"state\":" << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
  } else if (action == "tradeCancel") {
    int playerId = getJsonIntField(line, "playerId", engine->getActivePlayerIndex());
    std::string tradeId = getJsonStringField(line, "tradeId");
    bool ok = engine->cancelTradeOffer(playerId, tradeId);
    std::cout << "{\"ok\":" << (ok ? "true" : "false")
              << ",\"state\":" << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
  } else if (action == "updatePlayerName") {
    int playerId = getJsonIntField(line, "playerId", 0);
    std::string newName = getJsonStringField(line, "newName");
    if (!newName.empty()) {
      engine->updatePlayerName(playerId, newName);
    }
    std::cout << "{\"ok\":true,\"state\":"
              << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
  } else if (action == "updatePlayerColor") {
    int playerId = getJsonIntField(line, "playerId", 0);
    std::string newColor = getJsonStringField(line, "newColor");
    if (newColor.empty()) newColor = getJsonStringField(line, "color");
    std::string err;
    bool ok = engine->updatePlayerColor(playerId, newColor, err);
    std::cout << "{\"ok\":" << (ok ? "true" : "false")
              << (ok ? "" : ",\"error\":\"" + escapeJson(err) + "\"")
              << ",\"state\":" << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
  } else if (action == "endSession") {
    engine->endSession();
    std::cout << "{\"ok\":true,\"state\":"
              << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
  } else if (action == "resign" || action == "resignPlayer") {
    int playerId = getJsonIntField(line, "playerId", engine->getActivePlayerIndex());
    std::string err;
    bool ok = engine->resignPlayer(playerId, err);
    std::cout << "{\"ok\":" << (ok ? "true" : "false")
              << (ok ? "" : ",\"error\":\"" + escapeJson(err) + "\"")
              << ",\"state\":" << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
  } else if (action == "state" || action == "getState") {
    std::cout << "{\"ok\":true,\"state\":"
              << toCompactJson(engine->exportStateJson()) << "}\n"
              << std::flush;
  } else if (action == "exit" || action == "quit") {
    std::cout << "{\"ok\":true,\"exit\":true}\n" << std::flush;
  } else {
    std::cout << "{\"ok\":false,\"error\":\"Unknown action: "
              << escapeJson(action) << "\"}\n"
              << std::flush;
  }
}

void runServerMode() {
  GameRules rules;
  std::unique_ptr<GameEngine> engine = std::make_unique<GameEngine>(rules);
  engine->addPlayer("Player 1", "saffron", "1", true);
  engine->addPlayer("Player 2", "teal", "2", true);
  // In server mode, start in LOBBY phase so host can configure settings before startGame!

  std::string line;
  while (std::getline(std::cin, line)) {
    if (line.empty())
      continue;
    if (line == "exit" || line == "quit")
      break;
    dispatchServerCommand(engine, line);
  }
}

int main(int argc, char *argv[]) {
  if (argc > 1 && std::string(argv[1]) == "--server") {
    runServerMode();
    return 0;
  }

  if (argc > 2 && std::string(argv[1]) == "--cmd") {
    GameRules rules;
    std::unique_ptr<GameEngine> engine = std::make_unique<GameEngine>(rules);
    engine->addPlayer("Player 1", "saffron", "1");
    engine->addPlayer("Player 2", "teal", "2");
    engine->addPlayer("Player 3", "plum", "3");
    engine->addPlayer("Player 4", "blue", "4");
    engine->startGame();
    dispatchServerCommand(engine, argv[2]);
    return 0;
  }

  runDataValidationTests();
  runEngineRulesTests();
  runRegressionTests();

  if (argc > 1 && std::string(argv[1]) == "--json") {
    GameEngine engine;
    engine.addPlayer("Player 1", "saffron", "1");
    engine.addPlayer("Player 2", "teal", "2");
    engine.startGame();
    std::cout << engine.exportStateJson() << std::endl;
  }

  return 0;
}
