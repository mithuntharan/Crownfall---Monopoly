#pragma once

#include <string>
#include <vector>
#include <map>

namespace Crownfall {

enum class ColorGroup {
    Green,
    Yellow,
    Red,
    Blue,
    None
};

inline std::string colorGroupToString(ColorGroup group) {
    switch (group) {
        case ColorGroup::Green: return "GREEN";
        case ColorGroup::Yellow: return "YELLOW";
        case ColorGroup::Red: return "RED";
        case ColorGroup::Blue: return "BLUE";
        default: return "NONE";
    }
}

inline ColorGroup stringToColorGroup(const std::string& str) {
    if (str == "GREEN" || str == "Green" || str == "green") return ColorGroup::Green;
    if (str == "YELLOW" || str == "Yellow" || str == "yellow") return ColorGroup::Yellow;
    if (str == "RED" || str == "Red" || str == "red") return ColorGroup::Red;
    if (str == "BLUE" || str == "Blue" || str == "blue") return ColorGroup::Blue;
    return ColorGroup::None;
}

enum class SpaceType {
    Corner,
    City,
    Special,
    Chance,
    Chest,
    Tax
};

inline std::string spaceTypeToString(SpaceType type) {
    switch (type) {
        case SpaceType::Corner: return "corner";
        case SpaceType::City: return "city";
        case SpaceType::Special: return "special";
        case SpaceType::Chance: return "chance";
        case SpaceType::Chest: return "chest";
        case SpaceType::Tax: return "tax";
        default: return "unknown";
    }
}

// 6. C++ DATA ARCHITECTURE - PropertyDefinition
struct PropertyDefinition {
    std::string id;
    std::string name;
    ColorGroup colorGroup;

    int purchasePrice;
    int baseRent;
    int rentOneHouse;
    int rentTwoHouses;
    int rentThreeHouses;
    int hotelRent;

    int buildingCost;
    int mortgageValue;
    std::string sourceStatus; // "Sourced", "E" (estimated), "Partial source"
};

// 7. SPECIAL PROPERTIES
struct SpecialPropertyDefinition {
    std::string id;
    std::string name;
    int purchasePrice;
    int mortgageValue;
    std::string rentFormulaAlone;
    std::string rentFormulaPair;
    std::string pairProperty; // e.g., "Roadways" for Railway
    bool isDiceMultiplier;
    int aloneMultiplierOrFixed;
    int pairMultiplierOrFixed;
};

// 8. CHANCE DECLARATION (Dice-sum 2-12)
struct ChanceDeclaration {
    int diceSum;
    std::string section; // "Odd" or "Even"
    std::string title;
    std::string declaration;
    std::string kind; // "pay", "receive", "move", "jail", "rest"
    std::string effect;
    std::string effectNote;
};

// 9. COMMUNITY CHEST DECLARATION (Dice-sum 2-12)
struct ChestDeclaration {
    int diceSum;
    std::string section; // "Odd" or "Even"
    std::string title;
    std::string declaration;
    std::string kind; // "pay", "receive", "jail", "rest", "players", "buildings"
    std::string effect;
    std::string effectNote;
};

// Board Space Definition (36 spaces)
struct BoardSpaceDefinition {
    int index;
    std::string name;
    SpaceType type;
    ColorGroup colorGroup;
    std::string propertyId;
};

// 10. RULES
struct GameRules {
    int minPlayers = 2;
    int maxPlayers = 6;
    int defaultStartingMoney = 25000;
    std::vector<int> startingMoneyOptions = { 20000, 25000, 30000 };
    bool doublesRuleEnabled = true;
    int passStartBonus = 1500;
    bool requireLandingToBuild = false; // New rule: Players can build on eligible properties from anywhere during their turn
    bool baseRentDoublesForSet = true;  // Rule 27: Complete group doubles undeveloped base rent
    double unmortgageInterestRatePercent = 10.0; // Default 10% interest/repayment addition upon unmortgaging
    int buildingRefundPercentage = 50;     // Default 50% refund on voluntary building sale/destruction
    bool timerEnabled = false;             // Optional turn timer
    int timerSeconds = 60;                 // Turn timer duration: 30, 60, 90 seconds
};

// Authoritative Activity Log Entry
struct ActivityLogEntry {
    int id = 0;
    long long timestamp = 0;
    int playerId = 0;
    std::string playerName;
    std::string playerColor;
    std::string type; // "turn_start", "roll", "buy", "decline", "rent", "chance", "chest", "tax", "build", "jail", "rest", "bankruptcy", "timeout"
    std::string description;
    int amount = 0;
};

// Authoritative Financial Transaction Ledger Entry (Feature 2)
struct TransactionRecord {
    std::string id;
    int turnNumber = 0;
    long long timestamp = 0;
    std::string type; // "PURCHASE", "RENT", "TAX", "FEE", "CONSTRUCTION", "DESTRUCTION_REFUND", "START_REWARD", "CAPITAL_REWARD", "MORTGAGE", "UNMORTGAGE", "BANKRUPTCY_TRANSFER", "TRADE"
    std::string description;
    int amount = 0;
    int primaryPlayerId = -1;
    std::string primaryPlayerName;
    int counterpartyPlayerId = -1; // -1 for Bank
    std::string counterpartyPlayerName;
    std::string propertyId;
    std::map<int, int> resultingBalances; // playerId -> balance after tx
};

// Authoritative Property Trade Offer (Feature 1)
struct TradeOffer {
    std::string id;
    int senderId = -1;
    std::string senderName;
    int receiverId = -1;
    std::string receiverName;
    std::vector<std::string> senderPropertyIds;
    int senderCash = 0;
    std::vector<std::string> receiverPropertyIds;
    int receiverCash = 0;
    std::string status = "PENDING"; // "PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "INVALIDATED"
    long long timestamp = 0;
};

// 11. TURN STATE MACHINE
enum class TurnState {
    WAITING_FOR_ROLL,
    ROLLING,
    MOVING,
    RESOLVING_LANDING,
    WAITING_FOR_ACTION,
    EXTRA_TURN,
    TURN_COMPLETE,
    GAME_OVER
};

inline std::string turnStateToString(TurnState state) {
    switch (state) {
        case TurnState::WAITING_FOR_ROLL: return "WAITING_FOR_ROLL";
        case TurnState::ROLLING: return "ROLLING";
        case TurnState::MOVING: return "MOVING";
        case TurnState::RESOLVING_LANDING: return "RESOLVING_LANDING";
        case TurnState::WAITING_FOR_ACTION: return "WAITING_FOR_ACTION";
        case TurnState::EXTRA_TURN: return "EXTRA_TURN";
        case TurnState::TURN_COMPLETE: return "TURN_COMPLETE";
        case TurnState::GAME_OVER: return "GAME_OVER";
        default: return "UNKNOWN";
    }
}

inline std::string escapeJson(const std::string& s) {
    std::string out;
    for (char c : s) {
        if (c == '"') out += "\\\"";
        else if (c == '\\') out += "\\\\";
        else if (c == '\b') out += "\\b";
        else if (c == '\f') out += "\\f";
        else if (c == '\n') out += "\\n";
        else if (c == '\r') out += "\\r";
        else if (c == '\t') out += "\\t";
        else out += c;
    }
    return out;
}

// Player State
struct Player {
    int id;
    std::string name;
    std::string color;
    std::string token;
    bool isHuman = false; // Authoritative player type: true = human, false = bot
    int money = 0; // Starts at 0, awarded after completing first rotation
    int position = 0; // 0 = Start
    int rotationsCompleted = 0;
    bool inJail = false;
    int jailTurns = 0;
    bool inRestHouse = false;
    bool isBankrupt = false;
    std::vector<std::string> ownedProperties; // city IDs or special IDs
    std::map<std::string, int> buildings;     // propertyId -> count (1-3 houses, 4 = hotel)
    std::map<std::string, bool> mortgages;    // propertyId -> isMortgaged

    // Live Statistics (Feature 3)
    int totalRentReceived = 0;
    int totalRentPaid = 0;
    int constructionCount = 0;
    int destructionCount = 0;
};

} // namespace Crownfall
