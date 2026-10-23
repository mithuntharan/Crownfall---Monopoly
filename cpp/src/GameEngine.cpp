#include "../include/GameEngine.h"
#include <algorithm>
#include <sstream>
#include <chrono>
#include <optional>
#include <utility>

namespace Crownfall {

GameEngine::GameEngine(GameRules rules)
    : m_rules(rules), m_rng(std::random_device{}()) {}

void GameEngine::addPlayer(const std::string& name, const std::string& color, const std::string& token, bool isHuman) {
    Player p;
    p.id = static_cast<int>(m_players.size());
    p.name = name;
    p.color = color;
    p.token = token;
    p.isHuman = isHuman;
    p.money = 0; // Rule 5: Players begin with ₹0; receive selected starting capital after completing first rotation
    p.position = 0; // Start space
    p.rotationsCompleted = 0;
    p.inJail = false;
    p.jailTurns = 0;
    p.inRestHouse = false;
    p.isBankrupt = false;
    m_players.push_back(p);
}

void GameEngine::startGame() {
    m_gameStarted = true;
    m_activePlayerIndex = 0;
    m_roundNumber = 1;
    m_consecutiveDoubles = 0;
    m_turnState = TurnState::WAITING_FOR_ROLL;
    m_turnStartedAt = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    m_activityLog.clear();
    m_nextLogId = 1;
    m_transactionLedger.clear();
    m_nextTransactionId = 1;
    for (auto& p : m_players) {
        p.totalRentReceived = 0;
        p.totalRentPaid = 0;
        p.constructionCount = 0;
        p.destructionCount = 0;
        if (m_devMode && p.rotationsCompleted == 0 && p.money == 0) {
            p.money = m_rules.defaultStartingMoney > 0 ? m_rules.defaultStartingMoney : 25000;
        }
    }
    if (!m_players.empty()) {
        addLogEntry(0, "turn_start", "Game started! Round 1: " + m_players[0].name + "'s turn.");
    }
}

void GameEngine::addLogEntry(int playerId, const std::string& type, const std::string& description, int amount) {
    ActivityLogEntry entry;
    entry.id = m_nextLogId++;
    entry.timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    entry.playerId = playerId;
    if (playerId >= 0 && playerId < static_cast<int>(m_players.size())) {
        entry.playerName = m_players[playerId].name;
        entry.playerColor = m_players[playerId].color;
    } else {
        entry.playerName = "Bank / System";
        entry.playerColor = "gold";
    }
    entry.type = type;
    entry.description = description;
    entry.amount = amount;
    m_activityLog.push_back(entry);
    if (m_activityLog.size() > 150) {
        m_activityLog.erase(m_activityLog.begin());
    }
}

void GameEngine::recordTransaction(const std::string& type, const std::string& description, int amount,
                                   int primaryPlayerId, int counterpartyPlayerId,
                                   const std::string& propertyId) {
    TransactionRecord tx;
    tx.id = "tx_" + std::to_string(m_nextTransactionId++);
    tx.turnNumber = m_roundNumber;
    tx.timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    tx.type = type;
    tx.description = description;
    tx.amount = amount;
    tx.primaryPlayerId = primaryPlayerId;
    if (primaryPlayerId >= 0 && primaryPlayerId < static_cast<int>(m_players.size())) {
        tx.primaryPlayerName = m_players[primaryPlayerId].name;
    } else {
        tx.primaryPlayerName = "The Bank";
    }
    tx.counterpartyPlayerId = counterpartyPlayerId;
    if (counterpartyPlayerId >= 0 && counterpartyPlayerId < static_cast<int>(m_players.size())) {
        tx.counterpartyPlayerName = m_players[counterpartyPlayerId].name;
    } else {
        tx.counterpartyPlayerName = "The Bank";
    }
    tx.propertyId = propertyId;
    for (const auto& p : m_players) {
        tx.resultingBalances[p.id] = p.money;
    }
    m_transactionLedger.push_back(tx);
    if (m_transactionLedger.size() > 300) {
        m_transactionLedger.erase(m_transactionLedger.begin());
    }
}

int GameEngine::calculatePlayerNetWorth(int playerId) const {
    if (playerId < 0 || playerId >= static_cast<int>(m_players.size())) return 0;
    const Player& p = m_players[playerId];
    if (p.isBankrupt) return 0;

    int total = p.money; // Cash balance

    // Properties and construction investment minus mortgage liabilities
    for (const auto& propId : p.ownedProperties) {
        auto city = BusinessData::getCityPropertyById(propId);
        if (city) {
            total += city->purchasePrice; // Base property asset
            auto itB = p.buildings.find(propId);
            if (itB != p.buildings.end() && itB->second > 0) {
                total += itB->second * city->buildingCost; // Construction asset
            }
            auto itM = p.mortgages.find(propId);
            if (itM != p.mortgages.end() && itM->second) {
                // Outstanding liability for mortgaged property
                int repayment = city->mortgageValue + (city->mortgageValue * m_rules.unmortgageInterestRatePercent / 100);
                repayment = ((repayment + 99) / 100) * 100;
                total -= repayment;
            }
        } else {
            auto sp = BusinessData::getSpecialPropertyById(propId);
            if (sp) {
                total += sp->purchasePrice;
                auto itM = p.mortgages.find(propId);
                if (itM != p.mortgages.end() && itM->second) {
                    int repayment = sp->mortgageValue + (sp->mortgageValue * m_rules.unmortgageInterestRatePercent / 100);
                    repayment = ((repayment + 99) / 100) * 100;
                    total -= repayment;
                }
            }
        }
    }
    return total;
}

void GameEngine::setDevMode(bool enabled) {
    m_devMode = enabled;
    if (enabled) {
        for (auto& p : m_players) {
            if (p.rotationsCompleted == 0 && p.money == 0) {
                p.money = m_rules.defaultStartingMoney > 0 ? m_rules.defaultStartingMoney : 25000;
            }
        }
    }
    addLogEntry(-1, "dev_mode", enabled
        ? "Developer testing mode enabled (all players controllable)."
        : "Developer testing mode disabled (normal multiplayer turn permissions enforced).");
}

bool GameEngine::setActivePlayerIndex(int idx) {
    if (!m_devMode) return false;
    if (idx < 0 || idx >= static_cast<int>(m_players.size())) return false;
    m_activePlayerIndex = idx;
    m_turnState = TurnState::WAITING_FOR_ROLL;
    m_turnStartedAt = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    return true;
}

bool GameEngine::setTimerConfig(bool enabled, int seconds) {
    if (m_gameStarted) return false;
    m_rules.timerEnabled = enabled;
    m_rules.timerSeconds = seconds;
    return true;
}

bool GameEngine::checkGameOver() {
    if (m_players.size() <= 1) return false;
    int activeCount = 0;
    int lastAliveIdx = -1;
    for (size_t i = 0; i < m_players.size(); ++i) {
        if (!m_players[i].isBankrupt) {
            activeCount++;
            lastAliveIdx = static_cast<int>(i);
        }
    }
    if (activeCount <= 1 && lastAliveIdx != -1) {
        m_turnState = TurnState::GAME_OVER;
        addLogEntry(lastAliveIdx, "game_over", "GAME OVER! " + m_players[lastAliveIdx].name + " is the winner!", m_players[lastAliveIdx].money);
        return true;
    }
    return false;
}

void GameEngine::advanceTurn(bool extraTurn) {
    if (checkGameOver()) return;

    if (!extraTurn && m_activePlayerIndex >= 0 && m_activePlayerIndex < static_cast<int>(m_players.size())) {
        if (m_players[m_activePlayerIndex].money < 0 && !m_players[m_activePlayerIndex].isBankrupt) {
            if (!m_players[m_activePlayerIndex].isHuman) {
                // Bot attempts to mortgage properties to clear debt
                for (const auto& propId : m_players[m_activePlayerIndex].ownedProperties) {
                    if (!m_players[m_activePlayerIndex].mortgages[propId]) {
                        mortgageProperty(m_activePlayerIndex, propId);
                        if (m_players[m_activePlayerIndex].money >= 0) break;
                    }
                }
                if (m_players[m_activePlayerIndex].money < 0) {
                    std::string dummyErr;
                    resignPlayer(m_activePlayerIndex, dummyErr);
                    if (checkGameOver()) return;
                }
            } else {
                // Human player must resolve debt or resign
                m_turnState = TurnState::WAITING_FOR_ACTION;
                return;
            }
        }
    }

    if (extraTurn) {
        m_turnState = TurnState::EXTRA_TURN;
        m_turnStartedAt = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        addLogEntry(m_activePlayerIndex, "turn_start", m_players[m_activePlayerIndex].name + " rolled doubles and takes an extra turn!");
        return;
    }

    m_consecutiveDoubles = 0; // Reset consecutive doubles when switching players
    int startIdx = m_activePlayerIndex;
    int nextIdx = (m_activePlayerIndex + 1) % m_players.size();
    size_t attempts = 0;
    while (m_players[nextIdx].isBankrupt && attempts < m_players.size()) {
        nextIdx = (nextIdx + 1) % m_players.size();
        attempts++;
    }

    if (nextIdx <= startIdx) {
        m_roundNumber++;
    }
    m_activePlayerIndex = nextIdx;
    m_turnState = TurnState::WAITING_FOR_ROLL;
    m_turnStartedAt = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();

    if (!m_players[m_activePlayerIndex].isBankrupt) {
        addLogEntry(m_activePlayerIndex, "turn_start", m_players[m_activePlayerIndex].name + "'s turn began (Round " + std::to_string(m_roundNumber) + ").");
    }
}

bool GameEngine::handleTimeout(int playerId) {
    if (!m_gameStarted || m_turnState == TurnState::GAME_OVER) return false;
    if (playerId >= 0 && playerId != m_activePlayerIndex && !m_devMode) return false;

    // Authoritative timing verification: check if timer is enabled and actually expired
    if (!m_devMode && playerId != -2) {
        if (!m_rules.timerEnabled) return false;
        long long nowMs = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        int elapsedSec = static_cast<int>((nowMs - m_turnStartedAt) / 1000);
        if (elapsedSec < m_rules.timerSeconds) {
            return false; // Timer has not expired yet
        }
    }

    if (m_turnState == TurnState::WAITING_FOR_ACTION || m_turnState == TurnState::RESOLVING_LANDING) {
        if (m_lastTurnResult.eligibleToBuy) {
            declinePropertyPurchase(m_activePlayerIndex);
        }
        addLogEntry(m_activePlayerIndex, "timeout", m_players[m_activePlayerIndex].name + " timed out. Turn ended.");
        advanceTurn(false);
        return true;
    }

    if (m_turnState == TurnState::WAITING_FOR_ROLL || m_turnState == TurnState::EXTRA_TURN) {
        addLogEntry(m_activePlayerIndex, "timeout", m_players[m_activePlayerIndex].name + " timed out. Turn skipped.");
        advanceTurn(false);
        return true;
    }

    advanceTurn(false);
    return true;
}

std::string GameEngine::findOwnerOfProperty(const std::string& propertyId, int& outPlayerIndex) const {
    outPlayerIndex = -1;
    for (size_t i = 0; i < m_players.size(); ++i) {
        for (const auto& owned : m_players[i].ownedProperties) {
            if (owned == propertyId) {
                outPlayerIndex = static_cast<int>(i);
                return m_players[i].name;
            }
        }
    }
    return "";
}

bool GameEngine::playerOwnsCompleteGroup(int playerId, ColorGroup group) const {
    if (group == ColorGroup::None || playerId < 0 || playerId >= static_cast<int>(m_players.size())) {
        return false;
    }
    const auto& citiesInGroup = BusinessData::getCitiesInGroup(group);
    const auto& player = m_players[playerId];

    for (const auto& cityName : citiesInGroup) {
        auto prop = BusinessData::getCityPropertyByName(cityName);
        if (!prop) return false;
        bool hasCity = false;
        for (const auto& owned : player.ownedProperties) {
            if (owned == prop->id) {
                hasCity = true;
                break;
            }
        }
        if (!hasCity) return false;
    }
    return true;
}

int GameEngine::playerOwnedCountInGroup(int playerId, ColorGroup group) const {
    if (group == ColorGroup::None || playerId < 0 || playerId >= static_cast<int>(m_players.size())) {
        return 0;
    }
    const auto& citiesInGroup = BusinessData::getCitiesInGroup(group);
    const auto& player = m_players[playerId];
    int count = 0;
    for (const auto& cityName : citiesInGroup) {
        auto prop = BusinessData::getCityPropertyByName(cityName);
        if (!prop) continue;
        for (const auto& owned : player.ownedProperties) {
            if (owned == prop->id) {
                count++;
                break;
            }
        }
    }
    return count;
}

bool GameEngine::playerOwnsSpecialPair(int playerId, const std::string& specialId) const {
    if (playerId < 0 || playerId >= static_cast<int>(m_players.size())) return false;
    auto sp = BusinessData::getSpecialPropertyById(specialId);
    if (!sp) return false;

    auto pairSp = BusinessData::getSpecialPropertyByName(sp->pairProperty);
    if (!pairSp) return false;

    const auto& player = m_players[playerId];
    bool hasThis = false;
    bool hasPair = false;

    for (const auto& owned : player.ownedProperties) {
        if (owned == sp->id) hasThis = true;
        if (owned == pairSp->id) hasPair = true;
    }
    return hasThis && hasPair;
}

int GameEngine::calculateRent(const std::string& propertyId, int diceTotal) const {
    int ownerIdx = -1;
    findOwnerOfProperty(propertyId, ownerIdx);
    if (ownerIdx == -1) return 0; // Unowned

    const auto& owner = m_players[ownerIdx];
    auto mortIt = owner.mortgages.find(propertyId);
    if (mortIt != owner.mortgages.end() && mortIt->second) {
        return 0; // Mortgaged properties collect no rent
    }

    // City property
    auto city = BusinessData::getCityPropertyById(propertyId);
    if (city) {
        auto it = owner.buildings.find(propertyId);
        int houses = (it != owner.buildings.end()) ? it->second : 0;

        if (houses == 1) return city->rentOneHouse;
        if (houses == 2) return city->rentTwoHouses;
        if (houses == 3) return city->rentThreeHouses;
        if (houses >= 4) return city->hotelRent;

        // Undeveloped
        if (playerOwnedCountInGroup(ownerIdx, city->colorGroup) >= 3) {
            // Owning any 3 properties in the same color group doubles undeveloped/base rent
            return city->baseRent * 2;
        }
        return city->baseRent;
    }

    // Special property
    auto sp = BusinessData::getSpecialPropertyById(propertyId);
    if (sp) {
        bool hasPair = playerOwnsSpecialPair(ownerIdx, propertyId);
        if (sp->isDiceMultiplier) {
            int mult = hasPair ? sp->pairMultiplierOrFixed : sp->aloneMultiplierOrFixed;
            return mult * diceTotal;
        } else {
            return hasPair ? sp->pairMultiplierOrFixed : sp->aloneMultiplierOrFixed;
        }
    }

    return 0;
}

TurnResult GameEngine::rollAndMove(std::optional<std::pair<int, int>> riggedDice) {
    TurnResult result{};
    if (m_players.empty()) return result;
    if (m_turnState == TurnState::GAME_OVER) return result;

    Player& player = m_players[m_activePlayerIndex];
    if (player.isBankrupt) {
        advanceTurn(false);
        return result;
    }
    result.playerId = player.id;

    // Check rest house
    if (player.inRestHouse) {
        player.inRestHouse = false;
        result.eventDescription = player.name + " was resting in Rest House and skips this turn.";
        result.spaceName = "REST HOUSE";
        result.previousPosition = player.position;
        result.newPosition = player.position;
        m_lastDice1 = 0;
        m_lastDice2 = 0;
        m_lastTurnResult = result;
        addLogEntry(player.id, "rest", result.eventDescription);
        if (player.isHuman) {
            m_turnState = TurnState::WAITING_FOR_ACTION;
        } else {
            advanceTurn(false);
        }
        return result;
    }

    // Check Jail: roll dice HERE; if still in jail, return early.
    bool wasInJail = player.inJail;
    if (player.inJail) {
        player.jailTurns++;
        int d1 = (riggedDice && m_devMode) ? riggedDice->first : (std::uniform_int_distribution<int>(1, 6)(m_rng));
        int d2 = (riggedDice && m_devMode) ? riggedDice->second : (std::uniform_int_distribution<int>(1, 6)(m_rng));
        result.dice1 = d1;
        result.dice2 = d2;
        result.diceTotal = d1 + d2;
        result.isDouble = (d1 == d2);
        m_lastDice1 = d1;
        m_lastDice2 = d2;

        if (result.isDouble || player.jailTurns >= 3) {
            player.inJail = false;
            player.jailTurns = 0;
            std::string releaseMsg = player.name + (result.isDouble ? " rolled doubles and was released from Jail!" : " finished 3-turn jail sentence and is released!");
            result.eventDescription = releaseMsg;
            addLogEntry(player.id, "jail", releaseMsg);
        } else {
            result.previousPosition = player.position;
            result.newPosition = player.position;
            result.spaceName = "JAIL";
            result.spaceType = SpaceType::Corner;
            result.mustGoToJail = false;
            result.eventDescription = player.name + " remains in Jail (turn " + std::to_string(player.jailTurns) + "/3).";
            m_lastTurnResult = result;
            addLogEntry(player.id, "jail", result.eventDescription);
            if (player.isHuman) {
                m_turnState = TurnState::WAITING_FOR_ACTION;
            } else {
                advanceTurn(false);
            }
            return result;
        }
    } else {
        int d1 = (riggedDice && m_devMode) ? riggedDice->first : (std::uniform_int_distribution<int>(1, 6)(m_rng));
        int d2 = (riggedDice && m_devMode) ? riggedDice->second : (std::uniform_int_distribution<int>(1, 6)(m_rng));
        result.dice1 = d1;
        result.dice2 = d2;
        result.diceTotal = d1 + d2;
        result.isDouble = (d1 == d2);
        m_lastDice1 = d1;
        m_lastDice2 = d2;
    }

    if (m_rules.doublesRuleEnabled && result.isDouble && !wasInJail) {
        m_consecutiveDoubles++;
        if (m_consecutiveDoubles == 3) {
            player.inJail = true;
            player.jailTurns = 0;
            player.position = 9;
            result.mustGoToJail = true;
            result.newPosition = 9;
            result.eventDescription = player.name + " was sent to Jail after three consecutive doubles.";
            m_lastTurnResult = result;
            addLogEntry(player.id, "jail", result.eventDescription);
            m_consecutiveDoubles = 0;
            if (player.isHuman) {
                m_turnState = TurnState::WAITING_FOR_ACTION;
            } else {
                advanceTurn(false);
            }
            return result;
        }
    } else if (!wasInJail) {
        m_consecutiveDoubles = 0;
    }

    result.previousPosition = player.position;
    int nextPos = (player.position + result.diceTotal) % 36;

    // Check completion of rotation
    bool passedStart = (player.position + result.diceTotal >= 36);
    int startCrossings = (player.position + result.diceTotal) / 36;
    if (passedStart) {
        for (int c = 0; c < startCrossings; ++c) {
            m_rules.unmortgageInterestRatePercent = std::round(m_rules.unmortgageInterestRatePercent * 1.05 * 10000.0) / 10000.0;
        }
        if (player.rotationsCompleted == 0) {
            player.rotationsCompleted = 1;
            player.money += m_rules.defaultStartingMoney;
            result.startingCapitalAwarded = true;
            addLogEntry(player.id, "capital", player.name + " completed first rotation and received ₹" + std::to_string(m_rules.defaultStartingMoney) + " starting capital!", m_rules.defaultStartingMoney);
            recordTransaction("CAPITAL_REWARD", player.name + " completed first rotation and received ₹" + std::to_string(m_rules.defaultStartingMoney) + " starting capital.", m_rules.defaultStartingMoney, player.id, -1);
        } else {
            player.money += m_rules.passStartBonus;
            result.passStartBonusAwarded = true;
            addLogEntry(player.id, "start_bonus", player.name + " passed Start and collected ₹" + std::to_string(m_rules.passStartBonus) + " bonus.", m_rules.passStartBonus);
            recordTransaction("START_REWARD", player.name + " passed Start and collected ₹" + std::to_string(m_rules.passStartBonus) + " bonus.", m_rules.passStartBonus, player.id, -1);
        }
    }

    player.position = nextPos;
    result.newPosition = nextPos;

    const auto& spaces = BusinessData::getBoardSpaces();
    const auto& space = spaces[nextPos];
    result.spaceName = space.name;
    result.spaceType = space.type;

    addLogEntry(player.id, "roll", player.name + " rolled " + std::to_string(result.dice1) + " + " + std::to_string(result.dice2) + " = " + std::to_string(result.diceTotal) + (result.isDouble ? " (DOUBLES!)" : "") + " and moved to " + space.name + ".");

    bool isFirstRotation = (player.rotationsCompleted == 0 && !m_devMode);

    if (isFirstRotation) {
        result.eventDescription = player.name + " moved to " + space.name + " (First rotation: no purchases or payments).";
    } else {
        if (space.type == SpaceType::City || space.type == SpaceType::Special) {
            int ownerIdx = -1;
            std::string ownerName = findOwnerOfProperty(space.propertyId, ownerIdx);

            if (ownerIdx == -1) {
                result.eligibleToBuy = true;
                result.purchasablePropertyId = space.propertyId;
                if (space.type == SpaceType::City) {
                    auto c = BusinessData::getCityPropertyById(space.propertyId);
                    result.purchasePrice = c ? c->purchasePrice : 0;
                } else {
                    auto sp = BusinessData::getSpecialPropertyById(space.propertyId);
                    result.purchasePrice = sp ? sp->purchasePrice : 0;
                }
                result.eventDescription = player.name + " landed on unowned " + space.name + " (Price: ₹" + std::to_string(result.purchasePrice) + ").";
            } else if (ownerIdx == player.id) {
                result.eventDescription = player.name + " landed on their own property: " + space.name + ".";
            } else {
                int rent = calculateRent(space.propertyId, result.diceTotal);
                player.money -= rent;
                m_players[ownerIdx].money += rent;
                player.totalRentPaid += rent;
                m_players[ownerIdx].totalRentReceived += rent;
                result.rentPaid = true;
                result.rentAmount = rent;
                result.rentRecipientId = ownerIdx;
                recordTransaction("RENT", player.name + " paid ₹" + std::to_string(rent) + " rent to " + ownerName + " for " + space.name + ".", rent, player.id, ownerIdx, space.propertyId);
                if (player.money < 0) {
                    result.eventDescription = player.name + " owes ₹" + std::to_string(rent) + " rent to " + ownerName + " for " + space.name + " (Shortfall / Debt: ₹" + std::to_string(-player.money) + "). Must settle debt or resign.";
                    addLogEntry(player.id, "debt", player.name + " incurred debt paying rent to " + ownerName + ". Balance: -₹" + std::to_string(-player.money), -rent);
                } else {
                    result.eventDescription = player.name + " paid ₹" + std::to_string(rent) + " rent to " + ownerName + " for " + space.name + ".";
                    addLogEntry(player.id, "rent", player.name + " paid ₹" + std::to_string(rent) + " rent to " + ownerName + " for " + space.name + ".", -rent);
                }
            }
        } else if (space.type == SpaceType::Chance) {
            const auto* decl = BusinessData::getChanceDeclarationByDice(result.diceTotal);
            if (decl) {
                result.eventDescription = "CHANCE (Dice " + std::to_string(result.diceTotal) + "): " + decl->declaration;
                if (decl->kind == "receive") {
                    if (result.diceTotal == 3) { player.money += 2500; result.moneyChange = 2500; }
                    else if (result.diceTotal == 5) { player.money += 1000; result.moneyChange = 1000; }
                    else if (result.diceTotal == 7) { player.money += 2000; result.moneyChange = 2000; }
                    else if (result.diceTotal == 11) { player.money += 3000; result.moneyChange = 3000; }
                } else if (decl->kind == "pay") {
                    if (result.diceTotal == 2) { player.money -= 2000; result.moneyChange = -2000; }
                    else if (result.diceTotal == 4) { player.money -= 1000; result.moneyChange = -1000; }
                    else if (result.diceTotal == 6) { player.money -= 1500; result.moneyChange = -1500; }
                    else if (result.diceTotal == 8) { player.money -= 3000; result.moneyChange = -3000; }
                } else if (decl->kind == "jail") {
                    player.inJail = true;
                    player.jailTurns = 0;
                    player.position = 9;
                    result.mustGoToJail = true;
                    result.newPosition = 9;
                    result.spaceName = "JAIL";
                    result.spaceType = SpaceType::Corner;
                    result.eventDescription = player.name + " drew Chance: Go to Jail.";
                } else if (decl->kind == "rest") {
                    player.inRestHouse = true;
                    player.position = 27;
                    result.mustGoToRestHouse = true;
                    result.newPosition = 27;
                    result.spaceName = "REST HOUSE";
                    result.spaceType = SpaceType::Corner;
                    result.eventDescription = player.name + " drew Chance: Rest House (skips next turn).";
                } else if (decl->kind == "move" && result.diceTotal == 9) {
                    if (player.position > 1) {
                        m_rules.unmortgageInterestRatePercent = std::round(m_rules.unmortgageInterestRatePercent * 1.05 * 10000.0) / 10000.0;
                        player.position = 1;
                    } else {
                        player.money += 1500;
                        result.moneyChange = 1500;
                        player.position = 23;
                    }
                    result.newPosition = player.position;
                }
                addLogEntry(player.id, "chance", result.eventDescription, result.moneyChange);
                if (result.moneyChange > 0) {
                    recordTransaction("START_REWARD", player.name + " received ₹" + std::to_string(result.moneyChange) + " from Chance (" + decl->title + ").", result.moneyChange, player.id, -1);
                } else if (result.moneyChange < 0) {
                    recordTransaction("FEE", player.name + " paid ₹" + std::to_string(-result.moneyChange) + " for Chance (" + decl->title + ").", -result.moneyChange, player.id, -1);
                }
            }
        } else if (space.type == SpaceType::Chest) {
            const auto* decl = BusinessData::getChestDeclarationByDice(result.diceTotal);
            if (decl) {
                result.eventDescription = "COMMUNITY CHEST (Dice " + std::to_string(result.diceTotal) + "): " + decl->declaration;
                if (decl->kind == "receive") {
                    if (result.diceTotal == 4) { player.money += 2500; result.moneyChange = 2500; }
                    else if (result.diceTotal == 6) { player.money += 2000; result.moneyChange = 2000; }
                    else if (result.diceTotal == 10) { player.money += 1500; result.moneyChange = 1500; }
                    else if (result.diceTotal == 12) { player.money += 3000; result.moneyChange = 3000; }
                } else if (decl->kind == "pay") {
                    if (result.diceTotal == 5) { player.money -= 1000; result.moneyChange = -1000; }
                    else if (result.diceTotal == 7) { player.money -= 2000; result.moneyChange = -2000; }
                    else if (result.diceTotal == 11) { player.money -= 1500; result.moneyChange = -1500; }
                } else if (decl->kind == "jail") {
                    player.inJail = true;
                    player.jailTurns = 0;
                    player.position = 9;
                    result.mustGoToJail = true;
                    result.newPosition = 9;
                    result.spaceName = "JAIL";
                    result.spaceType = SpaceType::Corner;
                    result.eventDescription = player.name + " drew Community Chest: Go to Jail.";
                } else if (decl->kind == "rest") {
                    player.inRestHouse = true;
                    player.position = 27;
                    result.mustGoToRestHouse = true;
                    result.newPosition = 27;
                    result.spaceName = "REST HOUSE";
                    result.spaceType = SpaceType::Corner;
                    result.eventDescription = player.name + " drew Community Chest: Rest House (skips next turn).";
                } else if (decl->kind == "players" && result.diceTotal == 2) {
                    int collected = 0;
                    for (auto& other : m_players) {
                        if (other.id != player.id && !other.isBankrupt) {
                            other.money -= 500;
                            player.money += 500;
                            collected += 500;
                        }
                    }
                    result.moneyChange = collected;
                } else if (decl->kind == "buildings" && result.diceTotal == 9) {
                    int repairCost = 0;
                    for (const auto& kv : player.buildings) {
                        if (kv.second >= 4) repairCost += 100;
                        else repairCost += kv.second * 50;
                    }
                    player.money -= repairCost;
                    result.moneyChange = -repairCost;
                    result.eventDescription = player.name + " paid ₹" + std::to_string(repairCost) + " for property repairs (₹50/house, ₹100/hotel).";
                }
                addLogEntry(player.id, "chest", result.eventDescription, result.moneyChange);
                if (result.moneyChange > 0) {
                    recordTransaction("START_REWARD", player.name + " received ₹" + std::to_string(result.moneyChange) + " from Community Chest (" + decl->title + ").", result.moneyChange, player.id, -1);
                } else if (result.moneyChange < 0) {
                    recordTransaction("FEE", player.name + " paid ₹" + std::to_string(-result.moneyChange) + " for Community Chest (" + decl->title + ").", -result.moneyChange, player.id, -1);
                }
            }
        } else if (space.type == SpaceType::Corner) {
            if (nextPos == 9) {
                result.eventDescription = player.name + " is just visiting Jail.";
            } else if (nextPos == 18) {
                result.eventDescription = player.name + " entered the Royal Club.";
            } else if (nextPos == 27) {
                player.inRestHouse = true;
                result.mustGoToRestHouse = true;
                result.eventDescription = player.name + " stopped at the Rest House (must skip next turn).";
            }
        } else if (space.type == SpaceType::Tax) {
            int tax = 500;
            player.money -= tax;
            result.moneyChange = -tax;
            result.eventDescription = player.name + " paid ₹" + std::to_string(tax) + " " + space.name + " to the Bank.";
            addLogEntry(player.id, "tax", result.eventDescription, -tax);
            recordTransaction("TAX", player.name + " paid ₹" + std::to_string(tax) + " " + space.name + " to the Bank.", tax, player.id, -1);
        }
    }

    bool extra = (m_rules.doublesRuleEnabled && result.isDouble && !player.inJail && !wasInJail);
    result.extraTurnGranted = extra;
    m_lastTurnResult = result;

    if (result.eligibleToBuy) {
        m_turnState = TurnState::WAITING_FOR_ACTION;
    } else if (player.money < 0) {
        m_turnState = TurnState::WAITING_FOR_ACTION;
    } else if (extra) {
        advanceTurn(true);
    } else if (player.isHuman) {
        m_turnState = TurnState::WAITING_FOR_ACTION;
    } else {
        advanceTurn(false);
    }

    return result;
}

bool GameEngine::updateRules(const GameRules& newRules, int requesterId, std::string& outError) {
    if (m_gameStarted) {
        outError = "Settings are permanently locked while game is in progress.";
        return false;
    }
    if (requesterId != 0) {
        outError = "Only the host (Player 1) can edit game settings.";
        return false;
    }
    if (newRules.minPlayers < 2 || newRules.maxPlayers > 6 || newRules.minPlayers > newRules.maxPlayers) {
        outError = "Player limit must be between 2 and 6.";
        return false;
    }
    m_rules = newRules;
    return true;
}

void GameEngine::updatePlayerName(int playerId, const std::string& newName) {
    if (playerId < 0 || playerId >= static_cast<int>(m_players.size())) return;
    std::string trimmed = newName;
    size_t start = trimmed.find_first_not_of(" \t\n\r");
    if (start == std::string::npos) return;
    size_t end = trimmed.find_last_not_of(" \t\n\r");
    trimmed = trimmed.substr(start, end - start + 1);
    if (trimmed.empty()) return;
    if (trimmed.length() > 20) trimmed = trimmed.substr(0, 20);
    m_players[playerId].name = trimmed;
}

bool GameEngine::updatePlayerColor(int playerId, const std::string& newColor, std::string& outError) {
    if (playerId < 0 || playerId >= static_cast<int>(m_players.size())) {
        outError = "Invalid player ID.";
        return false;
    }
    std::string clean = newColor;
    size_t first = clean.find_first_not_of(" \t\r\n");
    if (first == std::string::npos) {
        outError = "Color cannot be empty.";
        return false;
    }
    size_t last = clean.find_last_not_of(" \t\r\n");
    clean = clean.substr(first, (last - first + 1));
    std::transform(clean.begin(), clean.end(), clean.begin(), ::tolower);
    for (size_t i = 0; i < m_players.size(); ++i) {
        if (static_cast<int>(i) == playerId) continue;
        std::string existing = m_players[i].color;
        std::transform(existing.begin(), existing.end(), existing.begin(), ::tolower);
        if (existing == clean) {
            outError = "Color '" + newColor + "' is already chosen by another player.";
            return false;
        }
    }
    m_players[playerId].color = clean;
    return true;
}

void GameEngine::endTurn(int playerId) {
    std::string err;
    endTurn(playerId, err);
}

bool GameEngine::endTurn(int playerId, std::string& outError) {
    if (!m_devMode && playerId != m_activePlayerIndex) {
        outError = "Not your turn";
        return false;
    }
    if (playerId >= 0 && playerId < static_cast<int>(m_players.size())) {
        if (m_players[playerId].money < 0 && !m_players[playerId].isBankrupt) {
            if (!m_players[playerId].isHuman) {
                for (const auto& propId : m_players[playerId].ownedProperties) {
                    if (!m_players[playerId].mortgages[propId]) {
                        mortgageProperty(playerId, propId);
                        if (m_players[playerId].money >= 0) break;
                    }
                }
                if (m_players[playerId].money < 0) {
                    std::string dummyErr;
                    resignPlayer(playerId, dummyErr);
                    return true;
                }
            } else {
                outError = "Cannot end turn with negative balance. Player must settle debt or declare bankruptcy.";
                return false;
            }
        }
    }
    advanceTurn(false);
    return true;
}

bool GameEngine::buyCurrentProperty(int playerId) {
    if (playerId < 0 || playerId >= static_cast<int>(m_players.size())) return false;
    if (!m_devMode && playerId != m_activePlayerIndex) return false;
    if (!m_lastTurnResult.eligibleToBuy) return false;
    Player& player = m_players[playerId];
    if (player.rotationsCompleted == 0 && !m_devMode) return false;

    const auto& spaces = BusinessData::getBoardSpaces();
    const auto& space = spaces[player.position];
    if (space.type != SpaceType::City && space.type != SpaceType::Special) return false;

    int ownerIdx = -1;
    findOwnerOfProperty(space.propertyId, ownerIdx);
    if (ownerIdx != -1) return false; // Already owned

    int price = 0;
    if (space.type == SpaceType::City) {
        auto c = BusinessData::getCityPropertyById(space.propertyId);
        price = c ? c->purchasePrice : 0;
    } else {
        auto sp = BusinessData::getSpecialPropertyById(space.propertyId);
        price = sp ? sp->purchasePrice : 0;
    }

    if (player.money < price) return false;

    player.money -= price;
    player.ownedProperties.push_back(space.propertyId);
    m_lastTurnResult.eligibleToBuy = false;
    addLogEntry(playerId, "buy", player.name + " purchased " + space.name + " for ₹" + std::to_string(price) + ".", -price);
    recordTransaction("PURCHASE", player.name + " purchased " + space.name + " for ₹" + std::to_string(price) + ".", price, playerId, -1, space.propertyId);

    bool extra = (m_rules.doublesRuleEnabled && m_lastTurnResult.isDouble && !player.inJail);
    if (player.isHuman) {
        m_turnState = extra ? TurnState::EXTRA_TURN : TurnState::WAITING_FOR_ACTION;
    } else {
        advanceTurn(extra);
    }
    return true;
}

bool GameEngine::declinePropertyPurchase(int playerId) {
    if (playerId < 0 || playerId >= static_cast<int>(m_players.size())) return false;
    if (!m_devMode && playerId != m_activePlayerIndex) return false;
    if (!m_lastTurnResult.eligibleToBuy) return false;

    m_lastTurnResult.eligibleToBuy = false;
    const auto& spaces = BusinessData::getBoardSpaces();
    const auto& space = spaces[m_players[playerId].position];
    addLogEntry(playerId, "decline", m_players[playerId].name + " declined to buy " + space.name + ".");

    bool extra = (m_rules.doublesRuleEnabled && m_lastTurnResult.isDouble && !m_players[playerId].inJail);
    if (m_players[playerId].isHuman) {
        m_turnState = extra ? TurnState::EXTRA_TURN : TurnState::WAITING_FOR_ACTION;
    } else {
        advanceTurn(extra);
    }
    return true;
}

bool GameEngine::buildHouseOrHotel(int playerId, const std::string& propertyId) {
    if (playerId < 0 || playerId >= static_cast<int>(m_players.size())) return false;
    if (!m_devMode && playerId != m_activePlayerIndex) return false;
    Player& player = m_players[playerId];

    // Check requireLandingToBuild (false by default for anywhere-building)
    const auto& spaces = BusinessData::getBoardSpaces();
    const auto& space = spaces[player.position];
    if (m_rules.requireLandingToBuild && space.propertyId != propertyId) return false;

    auto city = BusinessData::getCityPropertyById(propertyId);
    if (!city) return false;

    // Player must actually own this specific property
    bool ownsProperty = false;
    for (const auto& owned : player.ownedProperties) {
        if (owned == propertyId) { ownsProperty = true; break; }
    }
    if (!ownsProperty) return false;

    int currentBuildings = player.buildings[propertyId];
    if (currentBuildings >= 4) return false; // Already hotel

    // Check affordability
    if (player.money < city->buildingCost) return false;

    // A mortgaged property must never be eligible for construction
    if (player.mortgages[propertyId]) return false;

    player.money -= city->buildingCost;
    player.buildings[propertyId]++;
    player.constructionCount++;
    std::string bLabel = (player.buildings[propertyId] == 4) ? "Hotel" : (std::to_string(player.buildings[propertyId]) + " House(s)");
    addLogEntry(playerId, "build", player.name + " built on " + city->name + " (" + bLabel + ") for ₹" + std::to_string(city->buildingCost) + ".", -city->buildingCost);
    recordTransaction("CONSTRUCTION", player.name + " built " + bLabel + " on " + city->name + " for ₹" + std::to_string(city->buildingCost) + ".", city->buildingCost, playerId, -1, propertyId);
    return true;
}

bool GameEngine::sellHouseOrHotel(int playerId, const std::string& propertyId) {
    if (playerId < 0 || playerId >= static_cast<int>(m_players.size())) return false;
    if (!m_devMode && playerId != m_activePlayerIndex) return false;
    Player& player = m_players[playerId];

    // Ownership check
    bool ownsProperty = false;
    for (const auto& owned : player.ownedProperties) {
        if (owned == propertyId) { ownsProperty = true; break; }
    }
    if (!ownsProperty) return false;

    auto city = BusinessData::getCityPropertyById(propertyId);
    if (!city) return false;

    int currentBuildings = player.buildings[propertyId];
    if (currentBuildings <= 0) return false; // No buildings to sell

    // Calculate refund using configured buildingRefundPercentage (e.g. 50%)
    int rawRefund = (city->buildingCost * m_rules.buildingRefundPercentage) / 100;
    // Round UP to next ₹100 multiple if needed (Rule 29)
    int refund = ((rawRefund + 99) / 100) * 100;

    player.buildings[propertyId]--;
    player.money += refund;
    player.destructionCount++;
    addLogEntry(playerId, "sell", player.name + " sold a building on " + city->name + " for ₹" + std::to_string(refund) + ".", refund);
    recordTransaction("DESTRUCTION_REFUND", player.name + " destroyed a building on " + city->name + " for ₹" + std::to_string(refund) + " refund.", refund, playerId, -1, propertyId);
    return true;
}

bool GameEngine::sellProperty(int playerId, const std::string& propertyId, int& outSellPrice) {
    outSellPrice = 0;
    if (playerId < 0 || playerId >= static_cast<int>(m_players.size())) return false;
    Player& player = m_players[playerId];

    // Ownership check
    bool ownsProperty = false;
    for (const auto& owned : player.ownedProperties) {
        if (owned == propertyId) { ownsProperty = true; break; }
    }
    if (!ownsProperty) return false;

    int basePrice = 0;
    int mortgageVal = 0;
    std::string propName = propertyId;
    auto city = BusinessData::getCityPropertyById(propertyId);
    if (city) {
        basePrice = city->purchasePrice;
        mortgageVal = city->mortgageValue;
        propName = city->name;
    } else {
        auto sp = BusinessData::getSpecialPropertyById(propertyId);
        if (sp) {
            basePrice = sp->purchasePrice;
            mortgageVal = sp->mortgageValue;
            propName = sp->name;
        }
    }
    if (basePrice <= 0) return false;

    // Calculate building refund separately if any buildings exist
    int buildingRefund = 0;
    int currentBuildings = 0;
    auto bIt = player.buildings.find(propertyId);
    if (bIt != player.buildings.end()) {
        currentBuildings = bIt->second;
    }
    if (currentBuildings > 0 && city) {
        int rawRefund = (city->buildingCost * currentBuildings * m_rules.buildingRefundPercentage) / 100;
        buildingRefund = ((rawRefund + 99) / 100) * 100;
        player.destructionCount += currentBuildings;
    }

    int boughtRound = 1;
    for (const auto& tx : m_transactionLedger) {
        if (tx.propertyId == propertyId && tx.type == "PURCHASE") {
            boughtRound = tx.turnNumber;
            break;
        }
    }

    int roundsElapsed = std::max(0, m_roundNumber - boughtRound);
    int depreciationPercent = std::min(90, roundsElapsed * 5);
    int depreciatedValue = std::max(
        static_cast<int>(std::round(basePrice * 0.1)),
        static_cast<int>(std::round(basePrice * (1.0 - depreciationPercent / 100.0)))
    );
    // Currency multiple of 100 rounding
    depreciatedValue = (depreciatedValue / 100) * 100;

    bool isMortgaged = (player.mortgages.find(propertyId) != player.mortgages.end() && player.mortgages[propertyId]);
    int mortgageDeduction = isMortgaged ? (mortgageVal > 0 ? mortgageVal : static_cast<int>(std::round(basePrice * 0.5))) : 0;
    mortgageDeduction = (mortgageDeduction / 100) * 100;

    int totalProceedsBeforeMortgage = depreciatedValue + buildingRefund;
    int netCashProceeds = std::max(0, totalProceedsBeforeMortgage - mortgageDeduction);

    // Atomically update state
    player.ownedProperties.erase(
        std::remove(player.ownedProperties.begin(), player.ownedProperties.end(), propertyId),
        player.ownedProperties.end()
    );
    player.mortgages.erase(propertyId);
    player.buildings.erase(propertyId);
    player.money += netCashProceeds;
    outSellPrice = netCashProceeds;

    std::string desc = player.name + " sold " + propName + " back to the bank for ₹" + std::to_string(netCashProceeds);
    if (isMortgaged) {
        desc += " (depreciated ₹" + std::to_string(depreciatedValue) + (buildingRefund > 0 ? (" + building refund ₹" + std::to_string(buildingRefund)) : "") + " minus mortgage payoff ₹" + std::to_string(mortgageDeduction) + ").";
    } else {
        desc += " (" + std::to_string(depreciationPercent) + "% depreciation over " + std::to_string(roundsElapsed) + " round(s)" + (buildingRefund > 0 ? (", building refund ₹" + std::to_string(buildingRefund)) : "") + ").";
    }

    addLogEntry(playerId, "sell_property", desc, netCashProceeds);
    recordTransaction("PROPERTY_SALE", desc, netCashProceeds, playerId, -1, propertyId);
    return true;
}

bool GameEngine::mortgageProperty(int playerId, const std::string& propertyId) {
    if (playerId < 0 || playerId >= static_cast<int>(m_players.size())) return false;
    Player& player = m_players[playerId];

    // Ownership check
    bool ownsProperty = false;
    for (const auto& owned : player.ownedProperties) {
        if (owned == propertyId) { ownsProperty = true; break; }
    }
    if (!ownsProperty) return false;

    // Check if already mortgaged
    if (player.mortgages[propertyId]) return false;

    // Check building restriction: cannot mortgage if buildings exist on property
    if (player.buildings[propertyId] > 0) return false;

    int mortgageVal = 0;
    auto city = BusinessData::getCityPropertyById(propertyId);
    if (city) {
        mortgageVal = city->mortgageValue;
    } else {
        auto sp = BusinessData::getSpecialPropertyById(propertyId);
        if (sp) mortgageVal = sp->mortgageValue;
    }

    if (mortgageVal <= 0) return false;

    player.mortgages[propertyId] = true;
    player.money += mortgageVal;
    addLogEntry(playerId, "mortgage", player.name + " mortgaged " + propertyId + " and received ₹" + std::to_string(mortgageVal) + ".", mortgageVal);
    recordTransaction("MORTGAGE", player.name + " mortgaged " + propertyId + " and received ₹" + std::to_string(mortgageVal) + ".", mortgageVal, playerId, -1, propertyId);
    return true;
}

bool GameEngine::unmortgageProperty(int playerId, const std::string& propertyId) {
    if (playerId < 0 || playerId >= static_cast<int>(m_players.size())) return false;
    Player& player = m_players[playerId];

    // Ownership check
    bool ownsProperty = false;
    for (const auto& owned : player.ownedProperties) {
        if (owned == propertyId) { ownsProperty = true; break; }
    }
    if (!ownsProperty) return false;

    // Check if actually mortgaged
    if (!player.mortgages[propertyId]) return false;

    int mortgageVal = 0;
    auto city = BusinessData::getCityPropertyById(propertyId);
    if (city) {
        mortgageVal = city->mortgageValue;
    } else {
        auto sp = BusinessData::getSpecialPropertyById(propertyId);
        if (sp) mortgageVal = sp->mortgageValue;
    }

    if (mortgageVal <= 0) return false;

    // Repayment total = principal + configured interest percentage (e.g. 10%) rounded to ₹100
    double rawInterest = (mortgageVal * m_rules.unmortgageInterestRatePercent) / 100.0;
    int fee = static_cast<int>(std::ceil(rawInterest / 100.0)) * 100;
    int repayment = mortgageVal + fee;

    if (player.money < repayment) return false; // Cannot afford

    player.money -= repayment;
    player.mortgages[propertyId] = false;
    addLogEntry(playerId, "unmortgage", player.name + " unmortgaged " + propertyId + " for ₹" + std::to_string(repayment) + ".", -repayment);
    recordTransaction("UNMORTGAGE", player.name + " unmortgaged " + propertyId + " for ₹" + std::to_string(repayment) + ".", repayment, playerId, -1, propertyId);
    return true;
}

std::string GameEngine::createTradeOffer(int senderId, int receiverId,
                                        const std::vector<std::string>& senderProps, int senderCash,
                                        const std::vector<std::string>& receiverProps, int receiverCash,
                                        std::string& outError) {
    if (senderId < 0 || senderId >= static_cast<int>(m_players.size()) ||
        receiverId < 0 || receiverId >= static_cast<int>(m_players.size())) {
        outError = "Invalid player ID.";
        return "";
    }
    if (senderId == receiverId) {
        outError = "Cannot trade with oneself.";
        return "";
    }
    const Player& sender = m_players[senderId];
    const Player& receiver = m_players[receiverId];

    if (sender.isBankrupt || receiver.isBankrupt) {
        outError = "Bankrupt players cannot trade.";
        return "";
    }
    if (senderCash < 0 || receiverCash < 0) {
        outError = "Trade cash amounts cannot be negative.";
        return "";
    }
    if (sender.money < senderCash) {
        outError = "Sender has insufficient cash for this offer.";
        return "";
    }
    if (receiver.money < receiverCash) {
        outError = "Receiver has insufficient cash for this request.";
        return "";
    }
    if (senderProps.empty() && senderCash == 0 && receiverProps.empty() && receiverCash == 0) {
        outError = "Trade offer cannot be completely empty.";
        return "";
    }

    // Validate sender properties
    for (const auto& propId : senderProps) {
        bool owns = false;
        for (const auto& op : sender.ownedProperties) {
            if (op == propId) { owns = true; break; }
        }
        if (!owns) {
            outError = sender.name + " does not own property: " + propId;
            return "";
        }
        auto bIt = sender.buildings.find(propId);
        if (bIt != sender.buildings.end() && bIt->second > 0) {
            outError = "Cannot trade property " + propId + " with active buildings. Demolish first.";
            return "";
        }
    }

    // Validate receiver properties
    for (const auto& propId : receiverProps) {
        bool owns = false;
        for (const auto& op : receiver.ownedProperties) {
            if (op == propId) { owns = true; break; }
        }
        if (!owns) {
            outError = receiver.name + " does not own property: " + propId;
            return "";
        }
        auto bIt = receiver.buildings.find(propId);
        if (bIt != receiver.buildings.end() && bIt->second > 0) {
            outError = "Cannot trade property " + propId + " with active buildings. Demolish first.";
            return "";
        }
    }

    TradeOffer offer;
    offer.id = "trade_" + std::to_string(m_nextTradeId++);
    offer.senderId = senderId;
    offer.senderName = sender.name;
    offer.receiverId = receiverId;
    offer.receiverName = receiver.name;
    offer.senderPropertyIds = senderProps;
    offer.senderCash = senderCash;
    offer.receiverPropertyIds = receiverProps;
    offer.receiverCash = receiverCash;
    offer.status = "PENDING";
    offer.timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();

    m_tradeOffers.push_back(offer);
    addLogEntry(senderId, "trade_offer", sender.name + " proposed trade " + offer.id + " to " + receiver.name + ".");

    // Make bots accept trades given to them for time's sake
    bool isReceiverBot = !receiver.isHuman;
    if (isReceiverBot) {
        std::string acceptErr;
        acceptTradeOffer(receiverId, offer.id, acceptErr);
    }

    return offer.id;
}

void GameEngine::invalidateConflictingTrades() {
    for (auto& trade : m_tradeOffers) {
        if (trade.status != "PENDING") continue;
        if (trade.senderId < 0 || trade.senderId >= static_cast<int>(m_players.size()) ||
            trade.receiverId < 0 || trade.receiverId >= static_cast<int>(m_players.size())) {
            trade.status = "INVALIDATED";
            continue;
        }
        const Player& s = m_players[trade.senderId];
        const Player& r = m_players[trade.receiverId];
        if (s.isBankrupt || r.isBankrupt || s.money < trade.senderCash || r.money < trade.receiverCash) {
            trade.status = "INVALIDATED";
            continue;
        }
        bool validProps = true;
        for (const auto& p : trade.senderPropertyIds) {
            bool found = false;
            for (const auto& op : s.ownedProperties) { if (op == p) { found = true; break; } }
            if (!found) { validProps = false; break; }
        }
        if (!validProps) { trade.status = "INVALIDATED"; continue; }
        for (const auto& p : trade.receiverPropertyIds) {
            bool found = false;
            for (const auto& op : r.ownedProperties) { if (op == p) { found = true; break; } }
            if (!found) { validProps = false; break; }
        }
        if (!validProps) { trade.status = "INVALIDATED"; continue; }
    }
}

bool GameEngine::acceptTradeOffer(int playerId, const std::string& tradeId, std::string& outError) {
    auto it = std::find_if(m_tradeOffers.begin(), m_tradeOffers.end(),
                          [&tradeId](const TradeOffer& o) { return o.id == tradeId; });
    if (it == m_tradeOffers.end()) {
        outError = "Trade offer not found.";
        return false;
    }
    TradeOffer& trade = *it;
    if (trade.status != "PENDING") {
        outError = "Trade is no longer pending (status: " + trade.status + ").";
        return false;
    }
    if (!m_devMode && playerId != trade.receiverId) {
        outError = "Only the recipient may accept this trade offer.";
        return false;
    }

    Player& sender = m_players[trade.senderId];
    Player& receiver = m_players[trade.receiverId];

    if (sender.isBankrupt || receiver.isBankrupt) {
        trade.status = "INVALIDATED";
        outError = "Trade invalidated: one or more parties are bankrupt.";
        return false;
    }
    if (sender.money < trade.senderCash || receiver.money < trade.receiverCash) {
        trade.status = "INVALIDATED";
        outError = "Trade invalidated: insufficient funds.";
        return false;
    }

    // Check sender properties ownership and no buildings
    for (const auto& propId : trade.senderPropertyIds) {
        bool owns = false;
        for (const auto& op : sender.ownedProperties) { if (op == propId) { owns = true; break; } }
        if (!owns) {
            trade.status = "INVALIDATED";
            outError = "Trade invalidated: property " + propId + " no longer owned by " + sender.name;
            return false;
        }
        auto bIt = sender.buildings.find(propId);
        if (bIt != sender.buildings.end() && bIt->second > 0) {
            trade.status = "INVALIDATED";
            outError = "Trade invalidated: property " + propId + " has buildings.";
            return false;
        }
    }

    // Check receiver properties ownership and no buildings
    for (const auto& propId : trade.receiverPropertyIds) {
        bool owns = false;
        for (const auto& op : receiver.ownedProperties) { if (op == propId) { owns = true; break; } }
        if (!owns) {
            trade.status = "INVALIDATED";
            outError = "Trade invalidated: property " + propId + " no longer owned by " + receiver.name;
            return false;
        }
        auto bIt = receiver.buildings.find(propId);
        if (bIt != receiver.buildings.end() && bIt->second > 0) {
            trade.status = "INVALIDATED";
            outError = "Trade invalidated: property " + propId + " has buildings.";
            return false;
        }
    }

    // Atomic execution:
    // 1. Transfer sender properties to receiver
    for (const auto& propId : trade.senderPropertyIds) {
        sender.ownedProperties.erase(
            std::remove(sender.ownedProperties.begin(), sender.ownedProperties.end(), propId),
            sender.ownedProperties.end());
        receiver.ownedProperties.push_back(propId);
        if (sender.mortgages[propId]) {
            receiver.mortgages[propId] = true;
            sender.mortgages.erase(propId);
        }
    }

    // 2. Transfer receiver properties to sender
    for (const auto& propId : trade.receiverPropertyIds) {
        receiver.ownedProperties.erase(
            std::remove(receiver.ownedProperties.begin(), receiver.ownedProperties.end(), propId),
            receiver.ownedProperties.end());
        sender.ownedProperties.push_back(propId);
        if (receiver.mortgages[propId]) {
            sender.mortgages[propId] = true;
            receiver.mortgages.erase(propId);
        }
    }

    // 3. Transfer cash
    sender.money -= trade.senderCash;
    receiver.money += trade.senderCash;
    receiver.money -= trade.receiverCash;
    sender.money += trade.receiverCash;

    trade.status = "ACCEPTED";

    // 4. Invalidate any conflicting pending trades
    invalidateConflictingTrades();

    // 5. Record in transaction ledger and activity log
    std::string desc = sender.name + " and " + receiver.name + " completed trade (" +
                       std::to_string(trade.senderPropertyIds.size()) + " props + ₹" + std::to_string(trade.senderCash) +
                       " ⇄ " + std::to_string(trade.receiverPropertyIds.size()) + " props + ₹" + std::to_string(trade.receiverCash) + ").";
    recordTransaction("TRADE", desc, trade.senderCash + trade.receiverCash, trade.senderId, trade.receiverId);
    addLogEntry(playerId, "trade_accept", receiver.name + " accepted trade offer " + trade.id + " from " + sender.name + ".");

    return true;
}

bool GameEngine::rejectTradeOffer(int playerId, const std::string& tradeId) {
    auto it = std::find_if(m_tradeOffers.begin(), m_tradeOffers.end(),
                          [&tradeId](const TradeOffer& o) { return o.id == tradeId; });
    if (it == m_tradeOffers.end() || it->status != "PENDING") return false;
    if (!m_devMode && playerId != it->receiverId) return false;

    it->status = "REJECTED";
    addLogEntry(playerId, "trade_reject", m_players[it->receiverId].name + " rejected trade offer from " + m_players[it->senderId].name + ".");
    return true;
}

bool GameEngine::cancelTradeOffer(int playerId, const std::string& tradeId) {
    auto it = std::find_if(m_tradeOffers.begin(), m_tradeOffers.end(),
                          [&tradeId](const TradeOffer& o) { return o.id == tradeId; });
    if (it == m_tradeOffers.end() || it->status != "PENDING") return false;
    if (!m_devMode && playerId != it->senderId) return false;

    it->status = "CANCELLED";
    addLogEntry(playerId, "trade_cancel", m_players[it->senderId].name + " cancelled trade offer " + it->id + ".");
    return true;
}

void GameEngine::endSession() {
    m_turnState = TurnState::GAME_OVER;
    addLogEntry(-1, "session_ended", "The host ended the game session.");
}

bool GameEngine::resignPlayer(int playerId, std::string& outError) {
    if (playerId < 0 || playerId >= static_cast<int>(m_players.size())) {
        outError = "Invalid player ID.";
        return false;
    }
    Player& player = m_players[playerId];
    if (player.isBankrupt) {
        outError = "Player has already resigned or been eliminated.";
        return false;
    }

    player.isBankrupt = true;
    int remainingCash = std::max(0, player.money);
    player.money = 0;

    // Return properties to the Bank / free pool (clear buildings and mortgages)
    for (const auto& prop : player.ownedProperties) {
        player.buildings[prop] = 0;
        player.mortgages[prop] = false;
    }
    player.ownedProperties.clear();
    player.buildings.clear();
    player.mortgages.clear();

    addLogEntry(playerId, "resignation", player.name + " resigned from the match.", -remainingCash);
    recordTransaction("RESIGNATION", player.name + " resigned. Assets and properties liquidated to bank.", remainingCash, playerId, -1);

    // Cancel any pending trade offers involving this player
    for (auto& trade : m_tradeOffers) {
        if (trade.status == "PENDING" && (trade.senderId == playerId || trade.receiverId == playerId)) {
            trade.status = "CANCELLED";
        }
    }

    // Check if resignation triggers GAME_OVER
    bool gameOver = checkGameOver();
    if (!gameOver && m_activePlayerIndex == playerId) {
        advanceTurn(false);
    }
    return true;
}

std::string GameEngine::exportStateJson() const {
    std::ostringstream ss;
    long long now = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    int remaining = 0;
    if (m_rules.timerEnabled && m_turnStartedAt > 0) {
        int elapsed = static_cast<int>((now - m_turnStartedAt) / 1000);
        remaining = std::max(0, m_rules.timerSeconds - elapsed);
    }

    ss << "{\n";
    ss << "  \"roundNumber\": " << m_roundNumber << ",\n";
    ss << "  \"activePlayerIndex\": " << m_activePlayerIndex << ",\n";
    ss << "  \"turnState\": \"" << turnStateToString(m_turnState) << "\",\n";
    ss << "  \"gameStarted\": " << (m_gameStarted ? "true" : "false") << ",\n";
    ss << "  \"gamePhase\": \"" << (m_gameStarted ? "IN_PROGRESS" : "LOBBY") << "\",\n";
    ss << "  \"settingsLocked\": " << (m_gameStarted ? "true" : "false") << ",\n";
    ss << "  \"consecutiveDoubles\": " << m_consecutiveDoubles << ",\n";
    ss << "  \"devMode\": " << (m_devMode ? "true" : "false") << ",\n";
    ss << "  \"lastDice\": [" << m_lastDice1 << ", " << m_lastDice2 << "],\n";
    ss << "  \"rules\": {\n";
    ss << "    \"doublesRuleEnabled\": " << (m_rules.doublesRuleEnabled ? "true" : "false") << ",\n";
    ss << "    \"maxPlayers\": " << m_rules.maxPlayers << ",\n";
    ss << "    \"minPlayers\": " << m_rules.minPlayers << ",\n";
    ss << "    \"unmortgageInterestRatePercent\": " << m_rules.unmortgageInterestRatePercent << ",\n";
    ss << "    \"buildingRefundPercentage\": " << m_rules.buildingRefundPercentage << ",\n";
    ss << "    \"passStartBonus\": " << m_rules.passStartBonus << ",\n";
    ss << "    \"defaultStartingMoney\": " << m_rules.defaultStartingMoney << "\n";
    ss << "  },\n";
    ss << "  \"turnTimer\": {\n";
    ss << "    \"enabled\": " << (m_rules.timerEnabled ? "true" : "false") << ",\n";
    ss << "    \"duration\": " << m_rules.timerSeconds << ",\n";
    ss << "    \"durationSeconds\": " << m_rules.timerSeconds << ",\n";
    ss << "    \"startedAt\": " << m_turnStartedAt << ",\n";
    ss << "    \"remaining\": " << remaining << ",\n";
    ss << "    \"remainingSeconds\": " << remaining << "\n";
    ss << "  },\n";
    ss << "  \"activityLog\": [\n";
    for (size_t i = 0; i < m_activityLog.size(); ++i) {
        const auto& item = m_activityLog[i];
        ss << "    {\n";
        ss << "      \"id\": " << item.id << ",\n";
        ss << "      \"timestamp\": " << item.timestamp << ",\n";
        ss << "      \"playerId\": " << item.playerId << ",\n";
        ss << "      \"playerName\": \"" << escapeJson(item.playerName) << "\",\n";
        ss << "      \"playerColor\": \"" << escapeJson(item.playerColor) << "\",\n";
        ss << "      \"type\": \"" << escapeJson(item.type) << "\",\n";
        ss << "      \"description\": \"" << escapeJson(item.description) << "\",\n";
        ss << "      \"amount\": " << item.amount << "\n";
        ss << "    }" << (i + 1 < m_activityLog.size() ? "," : "") << "\n";
    }
    ss << "  ],\n";
    ss << "  \"transactionLedger\": [\n";
    for (size_t i = 0; i < m_transactionLedger.size(); ++i) {
        const auto& tx = m_transactionLedger[i];
        ss << "    {\n";
        ss << "      \"id\": \"" << escapeJson(tx.id) << "\",\n";
        ss << "      \"turnNumber\": " << tx.turnNumber << ",\n";
        ss << "      \"timestamp\": " << tx.timestamp << ",\n";
        ss << "      \"type\": \"" << escapeJson(tx.type) << "\",\n";
        ss << "      \"description\": \"" << escapeJson(tx.description) << "\",\n";
        ss << "      \"amount\": " << tx.amount << ",\n";
        ss << "      \"primaryPlayerId\": " << tx.primaryPlayerId << ",\n";
        ss << "      \"primaryPlayerName\": \"" << escapeJson(tx.primaryPlayerName) << "\",\n";
        ss << "      \"counterpartyPlayerId\": " << tx.counterpartyPlayerId << ",\n";
        ss << "      \"counterpartyPlayerName\": \"" << escapeJson(tx.counterpartyPlayerName) << "\",\n";
        ss << "      \"propertyId\": \"" << escapeJson(tx.propertyId) << "\",\n";
        ss << "      \"resultingBalances\": {";
        size_t bCount = 0;
        for (const auto& [pid, bal] : tx.resultingBalances) {
            ss << "\"" << pid << "\": " << bal << (++bCount < tx.resultingBalances.size() ? ", " : "");
        }
        ss << "}\n";
        ss << "    }" << (i + 1 < m_transactionLedger.size() ? "," : "") << "\n";
    }
    ss << "  ],\n";
    ss << "  \"tradeOffers\": [\n";
    for (size_t i = 0; i < m_tradeOffers.size(); ++i) {
        const auto& t = m_tradeOffers[i];
        ss << "    {\n";
        ss << "      \"id\": \"" << escapeJson(t.id) << "\",\n";
        ss << "      \"senderId\": " << t.senderId << ",\n";
        ss << "      \"senderName\": \"" << escapeJson(t.senderName) << "\",\n";
        ss << "      \"receiverId\": " << t.receiverId << ",\n";
        ss << "      \"receiverName\": \"" << escapeJson(t.receiverName) << "\",\n";
        ss << "      \"senderCash\": " << t.senderCash << ",\n";
        ss << "      \"receiverCash\": " << t.receiverCash << ",\n";
        ss << "      \"status\": \"" << escapeJson(t.status) << "\",\n";
        ss << "      \"timestamp\": " << t.timestamp << ",\n";
        ss << "      \"senderPropertyIds\": [";
        for (size_t j = 0; j < t.senderPropertyIds.size(); ++j) {
            ss << "\"" << escapeJson(t.senderPropertyIds[j]) << "\"" << (j + 1 < t.senderPropertyIds.size() ? ", " : "");
        }
        ss << "],\n";
        ss << "      \"receiverPropertyIds\": [";
        for (size_t j = 0; j < t.receiverPropertyIds.size(); ++j) {
            ss << "\"" << escapeJson(t.receiverPropertyIds[j]) << "\"" << (j + 1 < t.receiverPropertyIds.size() ? ", " : "");
        }
        ss << "]\n";
        ss << "    }" << (i + 1 < m_tradeOffers.size() ? "," : "") << "\n";
    }
    ss << "  ],\n";
    ss << "  \"players\": [\n";
    for (size_t i = 0; i < m_players.size(); ++i) {
        const auto& p = m_players[i];
        ss << "    {\n";
        ss << "      \"id\": " << p.id << ",\n";
        ss << "      \"name\": \"" << escapeJson(p.name) << "\",\n";
        ss << "      \"color\": \"" << escapeJson(p.color) << "\",\n";
        ss << "      \"token\": \"" << escapeJson(p.token) << "\",\n";
        ss << "      \"isHuman\": " << (p.isHuman ? "true" : "false") << ",\n";
        ss << "      \"money\": " << p.money << ",\n";
        ss << "      \"position\": " << p.position << ",\n";
        ss << "      \"rotationsCompleted\": " << p.rotationsCompleted << ",\n";
        ss << "      \"inJail\": " << (p.inJail ? "true" : "false") << ",\n";
        ss << "      \"jailTurns\": " << p.jailTurns << ",\n";
        ss << "      \"inRestHouse\": " << (p.inRestHouse ? "true" : "false") << ",\n";
        ss << "      \"isBankrupt\": " << (p.isBankrupt ? "true" : "false") << ",\n";
        ss << "      \"totalRentReceived\": " << p.totalRentReceived << ",\n";
        ss << "      \"rentReceived\": " << p.totalRentReceived << ",\n";
        ss << "      \"totalRentPaid\": " << p.totalRentPaid << ",\n";
        ss << "      \"rentPaid\": " << p.totalRentPaid << ",\n";
        ss << "      \"constructionCount\": " << p.constructionCount << ",\n";
        ss << "      \"destructionCount\": " << p.destructionCount << ",\n";
        ss << "      \"netWorth\": " << calculatePlayerNetWorth(p.id) << ",\n";
        ss << "      \"ownedProperties\": [";
        for (size_t j = 0; j < p.ownedProperties.size(); ++j) {
            ss << "\"" << escapeJson(p.ownedProperties[j]) << "\"" << (j + 1 < p.ownedProperties.size() ? ", " : "");
        }
        ss << "],\n";
        ss << "      \"buildings\": {";
        size_t bCount = 0;
        for (const auto& [propId, count] : p.buildings) {
            ss << "\"" << escapeJson(propId) << "\": " << count << (++bCount < p.buildings.size() ? ", " : "");
        }
        ss << "},\n";
        ss << "      \"mortgages\": {";
        size_t mCount = 0;
        for (const auto& [propId, isMortgaged] : p.mortgages) {
            ss << "\"" << escapeJson(propId) << "\": " << (isMortgaged ? "true" : "false") << (++mCount < p.mortgages.size() ? ", " : "");
        }
        ss << "}\n";
        ss << "    }" << (i + 1 < m_players.size() ? "," : "") << "\n";
    }
    ss << "  ]\n";
    ss << "}\n";
    return ss.str();
}

} // namespace Crownfall

