#pragma once

#include "Types.h"
#include "BusinessData.h"
#include <string>
#include <vector>
#include <memory>
#include <random>
#include <optional>
#include <utility>

namespace Crownfall {

struct TurnResult {
    int playerId;
    int dice1;
    int dice2;
    int diceTotal;
    bool isDouble;
    bool extraTurnGranted = false;
    int previousPosition;
    int newPosition;
    std::string spaceName;
    SpaceType spaceType;
    std::string eventDescription;
    int moneyChange;
    bool passStartBonusAwarded;
    bool startingCapitalAwarded;
    bool mustGoToJail;
    bool mustGoToRestHouse;
    bool eligibleToBuy;
    std::string purchasablePropertyId;
    int purchasePrice;
    bool rentPaid;
    int rentAmount;
    int rentRecipientId; // -1 for bank
};

class GameEngine {
public:
    GameEngine(GameRules rules = GameRules());

    void addPlayer(const std::string& name, const std::string& color, const std::string& token, bool isHuman = true);
    void startGame();
    bool updateRules(const GameRules& newRules, int requesterId, std::string& outError);
    bool isSettingsLocked() const { return m_gameStarted; }

    // Turn Actions
    TurnResult rollAndMove(std::optional<std::pair<int, int>> riggedDice = std::nullopt);
    bool buyCurrentProperty(int playerId);
    bool declinePropertyPurchase(int playerId);
    bool buildHouseOrHotel(int playerId, const std::string& propertyId);
    bool sellHouseOrHotel(int playerId, const std::string& propertyId);
    bool sellProperty(int playerId, const std::string& propertyId, int& outSellPrice);
    bool mortgageProperty(int playerId, const std::string& propertyId);
    bool unmortgageProperty(int playerId, const std::string& propertyId);

    // Rent & Calculations
    int calculateRent(const std::string& propertyId, int diceTotal) const;
    bool playerOwnsCompleteGroup(int playerId, ColorGroup group) const;
    int playerOwnedCountInGroup(int playerId, ColorGroup group) const;
    bool playerOwnsSpecialPair(int playerId, const std::string& specialId) const;
    int calculatePlayerNetWorth(int playerId) const;

    void updatePlayerName(int playerId, const std::string& newName);
    bool updatePlayerColor(int playerId, const std::string& newColor, std::string& outError);
    TurnState getTurnState() const { return m_turnState; }
    bool isGameOver() const { return m_turnState == TurnState::GAME_OVER; }
    void endTurn(int playerId);
    bool endTurn(int playerId, std::string& outError);

    // Developer Testing Mode
    bool isDevMode() const { return m_devMode; }
    void setDevMode(bool enabled);

    // Property Trading (Feature 1)
    std::string createTradeOffer(int senderId, int receiverId,
                                const std::vector<std::string>& senderProps, int senderCash,
                                const std::vector<std::string>& receiverProps, int receiverCash,
                                std::string& outError);
    bool acceptTradeOffer(int playerId, const std::string& tradeId, std::string& outError);
    bool rejectTradeOffer(int playerId, const std::string& tradeId);
    bool cancelTradeOffer(int playerId, const std::string& tradeId);
    const std::vector<TradeOffer>& getTradeOffers() const { return m_tradeOffers; }

    // Host Controls & Session Management (Feature 3)
    void endSession();
    bool resignPlayer(int playerId, std::string& outError);

    // Turn Activity Log & Transaction Ledger
    const std::vector<ActivityLogEntry>& getActivityLog() const { return m_activityLog; }
    void addLogEntry(int playerId, const std::string& type, const std::string& description, int amount = 0);
    const std::vector<TransactionRecord>& getTransactionLedger() const { return m_transactionLedger; }
    void recordTransaction(const std::string& type, const std::string& description, int amount,
                           int primaryPlayerId, int counterpartyPlayerId = -1,
                           const std::string& propertyId = "");

    // Turn Timer & Timeout Handling
    long long getTurnStartedAt() const { return m_turnStartedAt; }
    void setTurnStartedAt(long long ts) { m_turnStartedAt = ts; }
    bool handleTimeout(int playerId = -1);
    bool setTimerConfig(bool enabled, int seconds);

    // Turn advancement & game over check
    void advanceTurn(bool extraTurn = false);
    bool checkGameOver();

    // State Queries
    const std::vector<Player>& getPlayers() const { return m_players; }
    std::vector<Player>& getPlayersMutable() { return m_players; }
    const Player& getActivePlayer() const { return m_players[m_activePlayerIndex]; }
    int getActivePlayerIndex() const { return m_activePlayerIndex; }
    bool setActivePlayerIndex(int idx);
    int getRoundNumber() const { return m_roundNumber; }
    bool isGameStarted() const { return m_gameStarted; }
    const GameRules& getRules() const { return m_rules; }
    int getLastDice1() const { return m_lastDice1; }
    int getLastDice2() const { return m_lastDice2; }
    const TurnResult& getLastTurnResult() const { return m_lastTurnResult; }

    // Serialization
    std::string exportStateJson() const;

private:
    GameRules m_rules;
    std::vector<Player> m_players;
    int m_activePlayerIndex = 0;
    int m_roundNumber = 1;
    int m_consecutiveDoubles = 0;
    bool m_gameStarted = false;
    TurnState m_turnState = TurnState::WAITING_FOR_ROLL;
    std::mt19937 m_rng;

    bool m_devMode = false;
    std::vector<ActivityLogEntry> m_activityLog;
    int m_nextLogId = 1;
    std::vector<TransactionRecord> m_transactionLedger;
    int m_nextTransactionId = 1;
    std::vector<TradeOffer> m_tradeOffers;
    int m_nextTradeId = 1;
    void invalidateConflictingTrades();

    long long m_turnStartedAt = 0;
    int m_lastDice1 = 1;
    int m_lastDice2 = 1;
    TurnResult m_lastTurnResult{};

    std::string findOwnerOfProperty(const std::string& propertyId, int& outPlayerIndex) const;
};

} // namespace Crownfall
