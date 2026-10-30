import {
  CITY_PROPERTIES,
  SPECIAL_PROPERTIES,
  COLOR_GROUPS,
  type PropertyDefinition,
  type SpecialPropertyDefinition,
  type ColorGroup,
} from "../data/businessData"
import type { EnginePlayer } from "./GameEngineInterface"

export interface PropertyValuationDetail {
  id: string
  name: string
  type: "city" | "special"
  colorGroup?: ColorGroup
  purchasePrice: number
  currentRent: number
  rentNote: string
  houses: number
  isHotel: boolean
  constructionInvestment: number
  isMortgaged: boolean
  mortgageValue: number
  repaymentLiability: number
  rawProperty: PropertyDefinition | SpecialPropertyDefinition
}

export interface PlayerPortfolioSummary {
  playerId: number
  playerName: string
  playerColor: string
  cash: number
  realEstateValue: number
  constructionInvestment: number
  liabilities: number
  totalAssetValue: number
  netWorth: number
  housesCount: number
  hotelsCount: number
  cityCount: number
  specialCount: number
  totalPropertiesCount: number
  mortgagedCount: number
  properties: PropertyValuationDetail[]
  formulaExplanation: string
}

export function playerOwnsFullGroup(player: EnginePlayer, group: ColorGroup): boolean {
  if (group === "NONE") return false
  const groupData = COLOR_GROUPS[group]
  if (!groupData) return false

  const owned = player.ownedProperties || []
  for (const cityName of groupData.properties) {
    const city = Object.values(CITY_PROPERTIES).find(
      (c) => c.name.toLowerCase() === cityName.toLowerCase(),
    )
    if (!city || !owned.includes(city.id)) return false
  }
  return true
}

export function playerOwnedCountInGroup(player: EnginePlayer, group: ColorGroup): number {
  if (group === "NONE") return 0
  const groupData = COLOR_GROUPS[group]
  if (!groupData) return 0
  const owned = player.ownedProperties || []
  let count = 0
  for (const cityName of groupData.properties) {
    const city = Object.values(CITY_PROPERTIES).find(
      (c) => c.name.toLowerCase() === cityName.toLowerCase(),
    )
    if (city && owned.includes(city.id)) {
      count++
    }
  }
  return count
}

export function playerOwnsSpecialPair(player: EnginePlayer, specialId: string): boolean {
  const sp = SPECIAL_PROPERTIES[specialId]
  if (!sp) return false
  const owned = player.ownedProperties || []
  const pairSp = Object.values(SPECIAL_PROPERTIES).find(
    (s) => s.id !== sp.id && s.pair === sp.pair,
  )
  if (!pairSp) return false
  return owned.includes(sp.id) && owned.includes(pairSp.id)
}

export function calculatePropertyRent(
  propId: string,
  player: EnginePlayer,
): { rent: number; note: string } {
  const isMortgaged = !!player.mortgages?.[propId]
  if (isMortgaged) {
    return { rent: 0, note: "Mortgaged (No Rent)" }
  }

  const city = CITY_PROPERTIES[propId]
  if (city) {
    const bCount = player.buildings?.[propId] || 0
    if (bCount === 1) return { rent: city.rentOneHouse, note: "1 House" }
    if (bCount === 2) return { rent: city.rentTwoHouses, note: "2 Houses" }
    if (bCount === 3) return { rent: city.rentThreeHouses, note: "3 Houses" }
    if (bCount >= 4) return { rent: city.hotelRent, note: "Hotel (Max Level)" }

    if (playerOwnedCountInGroup(player, city.colorGroup) >= 3) {
      return { rent: city.baseRent * 2, note: "Group Bonus (3+ Owned: 2x Base Rent)" }
    }
    return { rent: city.baseRent, note: "Base Rent" }
  }

  const sp = SPECIAL_PROPERTIES[propId]
  if (sp) {
    const hasPair = playerOwnsSpecialPair(player, propId)
    if (sp.isDiceMultiplier) {
      const mult = hasPair ? 100 : 50
      return { rent: mult * 7, note: hasPair ? "Paired Multiplier (Avg ~₹700)" : "Single Multiplier (Avg ~₹350)" }
    } else {
      if (propId === "railway") {
        return hasPair ? { rent: 1200, note: "With Roadways (₹1,200)" } : { rent: 600, note: "Alone (₹600)" }
      }
      return hasPair ? { rent: 1500, note: "With Pair (₹1,500)" } : { rent: 800, note: "Alone (₹800)" }
    }
  }

  return { rent: 0, note: "N/A" }
}

/**
 * Authoritative Valuation Formula:
 * Net Worth = Liquid Cash Balance
 *           + Total Real Estate Acquisition Value (sum of original purchase prices)
 *           + Total Construction Investment (sum of houses & hotel construction costs)
 *           − Total Outstanding Liabilities (sum of mortgage redemption payoffs)
 *
 * Avoids double-counting: Cash received when mortgaging is already counted in Cash,
 * and the redemption debt is tracked exclusively in Liabilities.
 */
export function calculatePlayerPortfolio(
  player: EnginePlayer,
  unmortgageInterestRatePercent = 10,
): PlayerPortfolioSummary {
  const cash = player.money || 0
  const ownedIds = player.ownedProperties || []
  const effectiveRate = player.unmortgageInterestRatePercent ?? unmortgageInterestRatePercent

  let realEstateValue = 0
  let constructionInvestment = 0
  let liabilities = 0
  let housesCount = 0
  let hotelsCount = 0
  let cityCount = 0
  let specialCount = 0
  let mortgagedCount = 0

  const details: PropertyValuationDetail[] = []

  for (const propId of ownedIds) {
    const city = CITY_PROPERTIES[propId]
    if (city) {
      cityCount++
      realEstateValue += city.purchasePrice
      const bCount = player.buildings?.[propId] || 0
      const isHotel = bCount >= 4
      const houses = isHotel ? 0 : bCount
      if (isHotel) hotelsCount++
      else housesCount += houses

      const buildInvest = bCount * city.buildingCost
      constructionInvestment += buildInvest

      const isMortgaged = !!player.mortgages?.[propId]
      let repay = 0
      if (isMortgaged) {
        mortgagedCount++
        repay =
          Math.ceil(
            (city.mortgageValue +
              (city.mortgageValue * effectiveRate) / 100) /
              100,
          ) * 100
        liabilities += repay
      }

      const rentInfo = calculatePropertyRent(propId, player)

      details.push({
        id: city.id,
        name: city.name,
        type: "city",
        colorGroup: city.colorGroup,
        purchasePrice: city.purchasePrice,
        currentRent: rentInfo.rent,
        rentNote: rentInfo.note,
        houses,
        isHotel,
        constructionInvestment: buildInvest,
        isMortgaged,
        mortgageValue: city.mortgageValue,
        repaymentLiability: repay,
        rawProperty: city,
      })
    } else {
      const sp = SPECIAL_PROPERTIES[propId]
      if (sp) {
        specialCount++
        realEstateValue += sp.purchasePrice
        const isMortgaged = !!player.mortgages?.[propId]
        let repay = 0
        if (isMortgaged) {
          mortgagedCount++
          // Special properties have ZERO mortgage interest liability per Crownfall rules
          repay = sp.mortgageValue
          liabilities += repay
        }

        const rentInfo = calculatePropertyRent(propId, player)

        details.push({
          id: sp.id,
          name: sp.name,
          type: "special",
          purchasePrice: sp.purchasePrice,
          currentRent: rentInfo.rent,
          rentNote: rentInfo.note,
          houses: 0,
          isHotel: false,
          constructionInvestment: 0,
          isMortgaged,
          mortgageValue: sp.mortgageValue,
          repaymentLiability: repay,
          rawProperty: sp,
        })
      }
    }
  }

  const totalAssetValue = cash + realEstateValue + constructionInvestment
  const netWorth = player.isBankrupt ? 0 : Math.max(0, totalAssetValue - liabilities)

  return {
    playerId: player.id,
    playerName: player.name,
    playerColor: player.color,
    cash,
    realEstateValue,
    constructionInvestment,
    liabilities,
    totalAssetValue,
    netWorth,
    housesCount,
    hotelsCount,
    cityCount,
    specialCount,
    totalPropertiesCount: cityCount + specialCount,
    mortgagedCount,
    properties: details,
    formulaExplanation:
      "Net Worth = Cash Balance + Real Estate Value + Construction Investment − Mortgage Redemption Liabilities",
  }
}
