#include "../include/BusinessData.h"
#include <algorithm>
#include <set>
#include <optional>

namespace Crownfall {

static const std::vector<PropertyDefinition> s_cityProperties = {
    // GREEN GROUP
    { "margoa", "Margoa", ColorGroup::Green, 4000, 400, 2000, 3400, 4800, 6400, 5000, 2000, "E" },
    { "cochin", "Cochin", ColorGroup::Green, 3000, 300, 1500, 2600, 3600, 4800, 3500, 1500, "E" },
    { "ootacamund", "Ootacamund", ColorGroup::Green, 2500, 300, 1200, 2100, 3000, 4000, 3000, 1300, "E" },
    { "chandigadh", "Chandigadh", ColorGroup::Green, 2500, 200, 900, 1600, 2500, 3500, 3000, 1300, "Sourced" },
    { "delhi", "Delhi", ColorGroup::Green, 6000, 800, 3000, 4300, 5500, 7500, 5000, 3000, "Sourced" },

    // YELLOW GROUP
    { "simla", "Simla", ColorGroup::Yellow, 2200, 200, 1100, 1900, 2600, 3500, 2500, 1100, "E" },
    { "amritsar", "Amritsar", ColorGroup::Yellow, 3300, 300, 1600, 2800, 4000, 5300, 4000, 1700, "E" },
    { "srinagar", "Srinagar", ColorGroup::Yellow, 5000, 600, 3500, 5000, 7000, 8000, 6000, 2500, "Sourced" },
    { "madras", "Madras", ColorGroup::Yellow, 7000, 700, 3500, 6000, 8400, 11200, 6000, 3500, "E" },
    { "bangalore", "Bangalore", ColorGroup::Yellow, 4000, 400, 2000, 3400, 4800, 6400, 5000, 2000, "E" },

    // RED GROUP
    { "darjeeling", "Darjeeling", ColorGroup::Red, 2500, 200, 1200, 2600, 3500, 5000, 3000, 1300, "Sourced" },
    { "ahmedabad", "Ahmedabad", ColorGroup::Red, 4000, 400, 2000, 3400, 4800, 6400, 5000, 2000, "E" },
    { "bombay", "Bombay", ColorGroup::Red, 8500, 1200, 4000, 7200, 10200, 13600, 7000, 4300, "Partial source" },
    { "hyderabad", "Hyderabad", ColorGroup::Red, 3500, 400, 1800, 3000, 4200, 5600, 4000, 1800, "E" },
    { "kolkatta", "Kolkatta", ColorGroup::Red, 6500, 700, 3200, 5500, 7800, 10400, 5500, 3300, "E" },

    // BLUE GROUP
    { "patna", "Patna", ColorGroup::Blue, 2000, 200, 1000, 1700, 2400, 3200, 2500, 1000, "E" },
    { "indore", "Indore", ColorGroup::Blue, 1500, 200, 800, 1300, 1800, 2400, 2000, 800, "E" },
    { "jaipur", "Jaipur", ColorGroup::Blue, 3000, 300, 1500, 2600, 3600, 4800, 3500, 1500, "E" },
    { "agra", "Agra", ColorGroup::Blue, 2500, 300, 1200, 2100, 3000, 4000, 3000, 1300, "E" },
    { "kanpur", "Kanpur", ColorGroup::Blue, 4000, 400, 2000, 3400, 4800, 6400, 5000, 2000, "E" }
};

static const std::vector<SpecialPropertyDefinition> s_specialProperties = {
    { "railway", "Railway", 9500, 4800, "₹600 fixed", "₹1,200 fixed", "Roadways", false, 600, 1200 },
    { "roadways", "Roadways", 3200, 1600, "₹50 × dice", "₹100 × dice", "Railway", true, 50, 100 },
    { "electrical_company", "Electrical Company", 2500, 1300, "₹25 × dice", "₹75 × dice", "Air India", true, 25, 75 },
    { "air_india", "Air India", 10500, 5300, "₹800 fixed", "₹1,500 fixed", "Electrical Company", false, 800, 1500 },
    { "water_works", "Water Works", 3200, 1600, "₹50 × dice", "₹100 × dice", "Motor Boat", true, 50, 100 },
    { "motor_boat", "Motor Boat", 5500, 2800, "₹75 × dice", "₹150 × dice", "Water Works", true, 75, 150 }
};

static const std::vector<ChanceDeclaration> s_chanceDeclarations = {
    { 2, "Even", "Loss in Share Market", "Loss in share market, Rs. 2000", "pay", "- ₹2,000", "YOU → BANK" },
    { 3, "Odd", "Lottery Prize", "Lottery prize, Rs. 2500", "receive", "+ ₹2,500", "BANK → YOU" },
    { 4, "Even", "Accident Fine", "Fine for accident due to driving under liquor influence, Rs. 1000", "pay", "- ₹1,000", "FINE · YOU → BANK" },
    { 5, "Odd", "Consolation Prize", "You have won consolation competition prize of Rs. 1000", "receive", "+ ₹1,000", "BANK → YOU" },
    { 6, "Even", "House Renovating", "House Renovating, Rs. 1500", "pay", "- ₹1,500", "YOU → BANK" },
    { 7, "Odd", "Jack Pot", "You have won Jack Pot of Rs. 2000", "receive", "+ ₹2,000", "BANK → YOU" },
    { 8, "Even", "Fire Loss", "Loss due to fire in godown, Rs. 3000", "pay", "- ₹3,000", "LOSS IN GODOWN · YOU → BANK" },
    { 9, "Odd", "Go Back to Bombay", "Go back to Bombay. If you have to pass starting point, collect Rs. 1500 & go to Darjeeling.", "move", "MOVE TO BOMBAY", "PASS START: + ₹1,500 · THEN DARJEELING" },
    { 10, "Even", "Go to Jail", "Go to Jail", "jail", "GO TO JAIL", "MOVE DIRECTLY · DO NOT PASS START" },
    { 11, "Odd", "Export Performance Prize", "Prize for best performance in export, Rs. 3000", "receive", "+ ₹3,000", "BANK → YOU" },
    { 12, "Even", "Rest House", "Go to Rest House. You cannot play next turn.", "rest", "REST HOUSE", "MISS YOUR NEXT TURN" }
};

static const std::vector<ChestDeclaration> s_chestDeclarations = {
    { 2, "Even", "Birthday Celebration", "If it is your Birthday. Collect from each player Rs. 500", "players", "+ ₹500 EACH", "EACH PLAYER → YOU" },
    { 3, "Odd", "Go to Jail", "Go to Jail", "jail", "GO TO JAIL", "MOVE DIRECTLY · DO NOT PASS START" },
    { 4, "Even", "Beauty Contest", "1st Prize in Beauty contest, Rs. 2500", "receive", "+ ₹2,500", "1ST PRIZE · BANK → YOU" },
    { 5, "Odd", "School & Medical Fees", "School and medical fees, Rs. 1000", "pay", "- ₹1,000", "YOU → BANK" },
    { 6, "Even", "Income Tax Refund", "Income tax refund, Rs. 2000", "receive", "+ ₹2,000", "BANK → YOU" },
    { 7, "Odd", "Marriage Celebration", "Marriage celebration, Rs. 2000", "pay", "- ₹2,000", "YOU → BANK" },
    { 8, "Even", "Rest House", "Go to Rest House. You cannot play next turn.", "rest", "REST HOUSE", "MISS YOUR NEXT TURN" },
    { 9, "Odd", "General Repairs", "Make general repair on all your houses. Each house pay Rs. 50. Each hotel pay Rs. 100.", "buildings", "₹50 · ₹100", "EACH HOUSE · EACH HOTEL" },
    { 10, "Even", "Interest on Shares", "Receive interest on shares, Rs. 1500", "receive", "+ ₹1,500", "BANK → YOU" },
    { 11, "Odd", "Insurance Premium", "Pay insurance premium, Rs. 1500", "pay", "- ₹1,500", "YOU → BANK" },
    { 12, "Even", "Sale of Stocks", "Sale of stocks, collect Rs. 3000", "receive", "+ ₹3,000", "BANK → YOU" }
};

static const std::vector<BoardSpaceDefinition> s_boardSpaces = {
    // Side 1: Bottom Edge (0 at Bottom-Right -> 9 at Bottom-Left)
    { 0, "START", SpaceType::Corner, ColorGroup::None, "" },
    { 1, "Bombay", SpaceType::City, ColorGroup::Red, "bombay" },
    { 2, "Water Works", SpaceType::Special, ColorGroup::None, "water_works" },
    { 3, "Railway", SpaceType::Special, ColorGroup::None, "railway" },
    { 4, "Ahmedabad", SpaceType::City, ColorGroup::Red, "ahmedabad" },
    { 5, "INCOME TAX", SpaceType::Tax, ColorGroup::None, "" },
    { 6, "Indore", SpaceType::City, ColorGroup::Blue, "indore" },
    { 7, "CHANCE", SpaceType::Chance, ColorGroup::None, "" },
    { 8, "Jaipur", SpaceType::City, ColorGroup::Blue, "jaipur" },

    // Corner 2: Bottom-Left
    { 9, "JAIL", SpaceType::Corner, ColorGroup::None, "" },

    // Side 2: Left Edge (9 at Bottom-Left -> 18 at Top-Left)
    { 10, "Delhi", SpaceType::City, ColorGroup::Green, "delhi" },
    { 11, "Chandigadh", SpaceType::City, ColorGroup::Green, "chandigadh" },
    { 12, "Electrical Company", SpaceType::Special, ColorGroup::None, "electrical_company" },
    { 13, "Roadways", SpaceType::Special, ColorGroup::None, "roadways" },
    { 14, "Simla", SpaceType::City, ColorGroup::Yellow, "simla" },
    { 15, "Amritsar", SpaceType::City, ColorGroup::Yellow, "amritsar" },
    { 16, "COMMUNITY CHEST", SpaceType::Chest, ColorGroup::None, "" },
    { 17, "Srinagar", SpaceType::City, ColorGroup::Yellow, "srinagar" },

    // Corner 3: Top-Left
    { 18, "CLUB", SpaceType::Corner, ColorGroup::None, "" },

    // Side 3: Top Edge (18 at Top-Left -> 27 at Top-Right)
    { 19, "Agra", SpaceType::City, ColorGroup::Blue, "agra" },
    { 20, "CHANCE", SpaceType::Chance, ColorGroup::None, "" },
    { 21, "Kanpur", SpaceType::City, ColorGroup::Blue, "kanpur" },
    { 22, "Patna", SpaceType::City, ColorGroup::Blue, "patna" },
    { 23, "Darjeeling", SpaceType::City, ColorGroup::Red, "darjeeling" },
    { 24, "Air India", SpaceType::Special, ColorGroup::None, "air_india" },
    { 25, "Kolkatta", SpaceType::City, ColorGroup::Red, "kolkatta" },
    { 26, "Hyderabad", SpaceType::City, ColorGroup::Red, "hyderabad" },

    // Corner 4: Top-Right
    { 27, "REST HOUSE", SpaceType::Corner, ColorGroup::None, "" },

    // Side 4: Right Edge (27 at Top-Right -> 0 at Bottom-Right)
    { 28, "Madras", SpaceType::City, ColorGroup::Yellow, "madras" },
    { 29, "COMMUNITY CHEST", SpaceType::Chest, ColorGroup::None, "" },
    { 30, "Bangalore", SpaceType::City, ColorGroup::Yellow, "bangalore" },
    { 31, "WEALTH TAX", SpaceType::Tax, ColorGroup::None, "" },
    { 32, "Ootacamund", SpaceType::City, ColorGroup::Green, "ootacamund" },
    { 33, "Cochin", SpaceType::City, ColorGroup::Green, "cochin" },
    { 34, "Motor Boat", SpaceType::Special, ColorGroup::None, "motor_boat" },
    { 35, "Margoa", SpaceType::City, ColorGroup::Green, "margoa" }
};

static const std::vector<std::string> s_greenCities = { "Margoa", "Cochin", "Ootacamund", "Chandigadh", "Delhi" };
static const std::vector<std::string> s_yellowCities = { "Simla", "Amritsar", "Srinagar", "Madras", "Bangalore" };
static const std::vector<std::string> s_redCities = { "Darjeeling", "Ahmedabad", "Bombay", "Hyderabad", "Kolkatta" };
static const std::vector<std::string> s_blueCities = { "Patna", "Indore", "Jaipur", "Agra", "Kanpur" };
static const std::vector<std::string> s_emptyCities = {};

const std::vector<PropertyDefinition>& BusinessData::getCityProperties() {
    return s_cityProperties;
}

const std::vector<SpecialPropertyDefinition>& BusinessData::getSpecialProperties() {
    return s_specialProperties;
}

const std::vector<ChanceDeclaration>& BusinessData::getChanceDeclarations() {
    return s_chanceDeclarations;
}

const std::vector<ChestDeclaration>& BusinessData::getChestDeclarations() {
    return s_chestDeclarations;
}

const std::vector<BoardSpaceDefinition>& BusinessData::getBoardSpaces() {
    return s_boardSpaces;
}

const std::vector<std::string>& BusinessData::getCitiesInGroup(ColorGroup group) {
    switch (group) {
        case ColorGroup::Green: return s_greenCities;
        case ColorGroup::Yellow: return s_yellowCities;
        case ColorGroup::Red: return s_redCities;
        case ColorGroup::Blue: return s_blueCities;
        default: return s_emptyCities;
    }
}

std::optional<PropertyDefinition> BusinessData::getCityPropertyById(const std::string& id) {
    for (const auto& prop : s_cityProperties) {
        if (prop.id == id) return prop;
    }
    return std::nullopt;
}

std::optional<PropertyDefinition> BusinessData::getCityPropertyByName(const std::string& name) {
    for (const auto& prop : s_cityProperties) {
        if (prop.name == name) return prop;
    }
    return std::nullopt;
}

std::optional<SpecialPropertyDefinition> BusinessData::getSpecialPropertyById(const std::string& id) {
    for (const auto& prop : s_specialProperties) {
        if (prop.id == id) return prop;
    }
    return std::nullopt;
}

std::optional<SpecialPropertyDefinition> BusinessData::getSpecialPropertyByName(const std::string& name) {
    for (const auto& prop : s_specialProperties) {
        if (prop.name == name) return prop;
    }
    return std::nullopt;
}

const ChanceDeclaration* BusinessData::getChanceDeclarationByDice(int diceSum) {
    for (const auto& item : s_chanceDeclarations) {
        if (item.diceSum == diceSum) return &item;
    }
    return nullptr;
}

const ChestDeclaration* BusinessData::getChestDeclarationByDice(int diceSum) {
    for (const auto& item : s_chestDeclarations) {
        if (item.diceSum == diceSum) return &item;
    }
    return nullptr;
}

bool BusinessData::validateAllData(std::vector<std::string>& outErrors) {
    outErrors.clear();

    // 1. Every city has a color group & valid monetary values & multiple of 100
    std::set<std::string> cityIds;
    std::set<std::string> cityNames;
    for (const auto& prop : s_cityProperties) {
        if (prop.colorGroup == ColorGroup::None) {
            outErrors.push_back("City " + prop.name + " has no color group.");
        }
        if (cityIds.count(prop.id)) {
            outErrors.push_back("Duplicate city id: " + prop.id);
        }
        if (cityNames.count(prop.name)) {
            outErrors.push_back("Duplicate city name: " + prop.name);
        }
        cityIds.insert(prop.id);
        cityNames.insert(prop.name);

        auto check100 = [&](int val, const std::string& field) {
            if (val <= 0) outErrors.push_back(prop.name + " has non-positive " + field + ": " + std::to_string(val));
            if (val % 100 != 0) outErrors.push_back(prop.name + " " + field + " is not a multiple of 100: " + std::to_string(val));
        };

        check100(prop.purchasePrice, "purchasePrice");
        check100(prop.baseRent, "baseRent");
        check100(prop.rentOneHouse, "rentOneHouse");
        check100(prop.rentTwoHouses, "rentTwoHouses");
        check100(prop.rentThreeHouses, "rentThreeHouses");
        check100(prop.hotelRent, "hotelRent");
        check100(prop.buildingCost, "buildingCost");
        check100(prop.mortgageValue, "mortgageValue");
    }

    if (s_cityProperties.size() != 20) {
        outErrors.push_back("Expected 20 city properties, found " + std::to_string(s_cityProperties.size()));
    }

    // 2. All 6 special properties exist
    std::vector<std::string> expectedSpecials = { "Railway", "Roadways", "Electrical Company", "Air India", "Water Works", "Motor Boat" };
    if (s_specialProperties.size() != 6) {
        outErrors.push_back("Expected 6 special properties, found " + std::to_string(s_specialProperties.size()));
    }
    for (const auto& exp : expectedSpecials) {
        bool found = false;
        for (const auto& sp : s_specialProperties) {
            if (sp.name == exp) {
                found = true;
                if (sp.purchasePrice % 100 != 0) outErrors.push_back(sp.name + " price not multiple of 100.");
                if (sp.mortgageValue % 100 != 0) outErrors.push_back(sp.name + " mortgage not multiple of 100.");
                break;
            }
        }
        if (!found) outErrors.push_back("Missing special property: " + exp);
    }

    // 3. Chance sums 2-12
    for (int sum = 2; sum <= 12; ++sum) {
        if (!getChanceDeclarationByDice(sum)) {
            outErrors.push_back("Missing Chance declaration for dice sum " + std::to_string(sum));
        }
    }

    // 4. Community chest sums 2-12
    for (int sum = 2; sum <= 12; ++sum) {
        if (!getChestDeclarationByDice(sum)) {
            outErrors.push_back("Missing Community Chest declaration for dice sum " + std::to_string(sum));
        }
    }

    // 5. Board spaces count
    if (s_boardSpaces.size() != 36) {
        outErrors.push_back("Expected 36 board spaces, found " + std::to_string(s_boardSpaces.size()));
    }

    return outErrors.empty();
}

} // namespace Crownfall
