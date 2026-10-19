#pragma once

#include "Types.h"
#include <vector>
#include <string>
#include <optional>

namespace Crownfall {

class BusinessData {
public:
    static const std::vector<PropertyDefinition>& getCityProperties();
    static const std::vector<SpecialPropertyDefinition>& getSpecialProperties();
    static const std::vector<ChanceDeclaration>& getChanceDeclarations();
    static const std::vector<ChestDeclaration>& getChestDeclarations();
    static const std::vector<BoardSpaceDefinition>& getBoardSpaces();
    static const std::vector<std::string>& getCitiesInGroup(ColorGroup group);

    static std::optional<PropertyDefinition> getCityPropertyById(const std::string& id);
    static std::optional<PropertyDefinition> getCityPropertyByName(const std::string& name);

    static std::optional<SpecialPropertyDefinition> getSpecialPropertyById(const std::string& id);
    static std::optional<SpecialPropertyDefinition> getSpecialPropertyByName(const std::string& name);

    static const ChanceDeclaration* getChanceDeclarationByDice(int diceSum);
    static const ChestDeclaration* getChestDeclarationByDice(int diceSum);

    static bool validateAllData(std::vector<std::string>& outErrors);
};

} // namespace Crownfall
